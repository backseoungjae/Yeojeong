import type { Place } from '../../../shared/models/place.ts';
import type { ResolvedTheme } from '../../../shared/theme/tokens.ts';
import type { LibraryRepository } from '../repositories/libraryRepository.ts';
import type { SettingsRepository, Preferences } from '../../settings/repositories/settingsRepository.ts';
import { emptyLibrary, type LibraryData } from './library.ts';
import { StorageError } from '../../../shared/database/database.ts';
export interface LibraryState extends LibraryData {
  status: 'loading' | 'ready' | 'error'; preferences: Preferences;
  pendingIds: ReadonlySet<string>; settingsBusy: boolean; historyBusy: boolean;
  saveErrors: ReadonlySet<string>; historyError: boolean; settingsError: boolean;
  initializationError?: StorageError['kind'];
}
export class LibraryStore {
  private repository: LibraryRepository;
  private settings: SettingsRepository;
  private listeners = new Set<() => void>();
  private state: LibraryState = { ...emptyLibrary, status: 'loading', preferences: {}, pendingIds: new Set(), settingsBusy: false, historyBusy: false, saveErrors: new Set(), historyError: false, settingsError: false };
  private initializing?: Promise<void>;
  private historyTail: Promise<void> = Promise.resolve();
  constructor(repository: LibraryRepository, settings: SettingsRepository) { this.repository = repository; this.settings = settings; }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(value: Partial<LibraryState>) { this.state = { ...this.state, ...value }; this.listeners.forEach(listener => listener()); }
  initialize = (): Promise<void> => {
    if (this.state.status === 'ready') return Promise.resolve();
    if (this.initializing) return this.initializing;
    this.update({ status: 'loading' });
    this.initializing = Promise.all([this.repository.load(), this.settings.load()]).then(([data, preferences]) => this.update({ ...data, preferences, status: 'ready', initializationError: undefined }), error => this.update({ status: 'error', initializationError: error instanceof StorageError ? error.kind : 'initialization' })).finally(() => { this.initializing = undefined; });
    return this.initializing;
  };
  isSaved = (id: string) => this.state.saved.some(value => value.place.id === id);
  toggleSaved = async (place: Place) => {
    if (this.state.status !== 'ready' || this.state.pendingIds.has(place.id)) return;
    const pendingIds = new Set(this.state.pendingIds); pendingIds.add(place.id);
    const errors = new Set(this.state.saveErrors); errors.delete(place.id);
    const saved = this.isSaved(place.id);
    this.update({ pendingIds, saveErrors: errors });
    try { this.update(await (saved ? this.repository.unsave(place.id) : this.repository.save(place))); }
    catch { const failures = new Set(this.state.saveErrors); failures.add(place.id); this.update({ saveErrors: failures }); }
    finally { const pending = new Set(this.state.pendingIds); pending.delete(place.id); this.update({ pendingIds: pending }); }
  };
  setLanguage = async (language: 'ko' | 'en') => this.setPreference(() => this.settings.setLanguage(language));
  setTheme = async (theme: ResolvedTheme) => this.setPreference(() => this.settings.setTheme(theme));
  private async setPreference(write: () => Promise<Preferences>) {
    if (this.state.status !== 'ready' || this.state.settingsBusy) return;
    this.update({ settingsBusy: true, settingsError: false });
    try { this.update({ preferences: await write() }); } catch { this.update({ settingsError: true }); }
    finally { this.update({ settingsBusy: false }); }
  }
  private history(write: () => Promise<LibraryData>): Promise<void> {
    if (this.state.status !== 'ready') return Promise.resolve();
    const task = this.historyTail.then(async () => {
      this.update({ historyBusy: true, historyError: false });
      try { this.update(await write()); } catch { this.update({ historyError: true }); }
      finally { this.update({ historyBusy: false }); }
    });
    this.historyTail = task;
    return task;
  }
  recordPlace = (place: Place) => this.history(() => this.repository.recordPlace(place));
  recordSearch = (keyword: string) => this.history(() => this.repository.recordSearch(keyword));
  removeRecent = (id: string) => this.history(() => this.repository.removeRecent(id));
  removeSearch = (keyword: string) => this.history(() => this.repository.removeSearch(keyword));
  clearRecent = () => this.history(this.repository.clearRecent);
  clearSearches = () => this.history(this.repository.clearSearches);
}

import { TripError, type TripData, type TripInput, type PeriodResolutions } from './trip.ts';
import type { Place } from '../../../shared/models/place.ts';
import type { TripRepository } from '../repositories/tripRepository.ts';
export interface TripState extends TripData { status: 'loading' | 'ready' | 'error'; busy: boolean; error?: TripError['kind']; createdSelection?: { flowId: string; tripId: string } }
export class TripStore {
  private state: TripState = { trips: [], items: [], status: 'loading', busy: false };
  private listeners = new Set<() => void>();
  private repository: TripRepository;
  private loading?: Promise<void>;
  constructor(repository: TripRepository) { this.repository = repository; }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(value: Partial<TripState>) { this.state = { ...this.state, ...value }; this.listeners.forEach(listener => listener()); }
  selectCreatedTrip = (flowId: string, tripId: string) => this.update({ createdSelection: { flowId, tripId } });
  clearError = () => this.update({ error: undefined });
  initialize = (): Promise<void> => {
    if (this.loading) return this.loading;
    this.loading = this.repository.load().then(data => this.update({ ...data, status: 'ready', error: undefined }), () => this.update({ status: 'error', error: 'storage' })).finally(() => { this.loading = undefined; });
    return this.loading;
  };
  private async write<T>(work: () => Promise<{ data: TripData; result: T }>): Promise<T | undefined> {
    if (this.state.busy || this.state.status !== 'ready') return undefined;
    this.update({ busy: true, error: undefined });
    try { const value = await work(); this.update(value.data); return value.result; }
    catch (error) {
      const kind = error instanceof TripError ? error.kind : 'storage';
      if (kind === 'conflict' || kind === 'missing') {
        try { this.update(await this.repository.load()); } catch { /* 기존 화면 데이터와 편집값은 유지한다. */ }
      }
      this.update({ error: kind }); return undefined;
    }
    finally { this.update({ busy: false }); }
  }
  private change(work: () => Promise<TripData>) { return this.write(async () => ({ data: await work(), result: true })); }
  create = (input: TripInput) => this.write(async () => { const value = await this.repository.create(input); return { data: value.data, result: value.id }; });
  updateTrip = (id: string, input: TripInput, revision: number, resolutions?: PeriodResolutions) => this.change(() => this.repository.update(id, input, revision, resolutions));
  deleteTrip = (id: string) => this.change(() => this.repository.remove(id));
  add = (tripId: string, date: string, place: Place) => this.change(() => this.repository.add(tripId, date, place));
  reorder = (id: string, direction: -1 | 1) => this.change(() => this.repository.reorder(id, direction));
  saveMemo = (id: string, memo: string, previous: string) => this.change(() => this.repository.saveMemo(id, memo, previous));
  removeItem = (id: string) => this.change(() => this.repository.removeItem(id));
}

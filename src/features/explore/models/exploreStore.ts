import type { ContentLanguage, Place } from '../../../shared/models/place.ts';
import { TourError } from '../../../shared/api/tour/tourError.ts';
import type { PlaceRepository } from '../repositories/placeRepository.ts';
import { defaultConditions, normalizeConditions, queryKey, type ExploreConditions } from './exploreQuery.ts';
export interface ExploreState {
  language: ContentLanguage; conditions: ExploreConditions; keywordInput: string;
  places: Place[]; page: number; totalCount: number; hasNext: boolean;
  loading: boolean; loadingNext: boolean; error?: TourError; nextError?: TourError; scrollOffset: number;
}
export class ExploreStore {
  private repository: PlaceRepository;
  private listeners = new Set<() => void>();
  private controller?: AbortController;
  private generation = 0;
  private initialized = false;
  private snapshots = new Map<string, ExploreState>();
  private state: ExploreState;
  constructor(repository: PlaceRepository, language: ContentLanguage) {
    this.repository = repository;
    this.state = this.empty(language, defaultConditions, '');
  }
  private empty(language: ContentLanguage, conditions: ExploreConditions, keywordInput: string): ExploreState {
    return { language, conditions, keywordInput, places: [], page: 0, totalCount: 0, hasNext: false, loading: false, loadingNext: false, scrollOffset: 0 };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(value: Partial<ExploreState>) { this.state = { ...this.state, ...value }; this.listeners.forEach(listener => listener()); }
  setKeywordInput = (keywordInput: string) => this.update({ keywordInput });
  setScrollOffset = (scrollOffset: number) => { this.state = { ...this.state, scrollOffset }; };
  ensureLoaded = () => { this.initialized = true; if (!this.state.page && !this.state.loading && !this.state.error) void this.load(false); };
  setLanguage = (language: ContentLanguage) => {
    if (language !== this.state.language) {
      if (this.initialized) this.change(language, this.state.conditions);
      else this.update({ language });
    }
  };
  apply = (conditions: ExploreConditions) => this.change(this.state.language, normalizeConditions(conditions));
  submit = () => this.apply({ ...this.state.conditions, keyword: this.state.keywordInput, type: 'all' });
  reset = () => { this.setKeywordInput(''); this.apply(defaultConditions); };
  private change(language: ContentLanguage, conditions: ExploreConditions) {
    if (queryKey(language, conditions) === queryKey(this.state.language, this.state.conditions)) { this.ensureLoaded(); return; }
    if (this.state.page) {
      this.snapshots.set(queryKey(this.state.language, this.state.conditions), { ...this.state, loadingNext: false, nextError: undefined });
      while (this.snapshots.size > 12) {
        const oldest = this.snapshots.keys().next().value;
        if (oldest !== undefined) this.snapshots.delete(oldest);
      }
    }
    this.generation++; this.controller?.abort();
    const previous = this.snapshots.get(queryKey(language, conditions));
    // 스크롤 복원용 스냅샷도 캐시 만료 후에는 다시 사용하지 않는다.
    const reusable = language !== this.state.language && previous && this.repository.cachedPage(language, conditions, 1) && this.repository.cachedPage(language, conditions, previous.page);
    this.state = reusable ? { ...previous, keywordInput: this.state.keywordInput } : this.empty(language, conditions, this.state.keywordInput);
    this.listeners.forEach(listener => listener());
    this.ensureLoaded();
  }
  retry = () => { if (!this.state.loading && !this.state.loadingNext) void this.load(this.state.page > 0); };
  loadNext = () => {
    if (this.state.hasNext && !this.state.loading && !this.state.loadingNext && !this.state.nextError) void this.load(true);
  };
  private async load(next: boolean) {
    const { language, conditions } = this.state;
    const generation = this.generation;
    const page = next ? this.state.page + 1 : 1;
    const controller = new AbortController(); this.controller = controller;
    this.update(next ? { loadingNext: true, nextError: undefined } : { loading: true, error: undefined });
    try {
      const result = await this.repository.page(language, conditions, page, controller.signal);
      if (generation !== this.generation || controller.signal.aborted) return;
      const places = [...new Map((next ? [...this.state.places, ...result.places] : result.places).map(place => [place.id, place])).values()];
      this.update({ places, page: result.page, totalCount: result.totalCount, hasNext: result.hasNext, loading: false, loadingNext: false });
    } catch (error) {
      if (generation !== this.generation || controller.signal.aborted) return;
      const failure = error instanceof TourError ? error : new TourError('network');
      this.update(next ? { loadingNext: false, nextError: failure } : { loading: false, error: failure });
    }
  }
}

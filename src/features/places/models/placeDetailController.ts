import { TourError } from '../../../shared/api/tour/tourError.ts';
import type { PlaceDetailRepository } from '../repositories/placeDetailRepository.ts';
import { parsePlaceIdentifier, type PlaceDetail, type PlaceIdentifier, type PlaceInfo, type PlacePhoto } from '../../../shared/models/placeDetail.ts';
export interface DetailSection<T> { status: 'idle' | 'loading' | 'success' | 'error' | 'blocked'; data?: T; error?: TourError }
export interface DetailState { identifier?: PlaceIdentifier; basic: DetailSection<PlaceDetail>; info: DetailSection<PlaceInfo[]>; photos: DetailSection<PlacePhoto[]> }
export type DetailArea = 'basic' | 'info' | 'photos';
export class PlaceDetailController {
  private repository: PlaceDetailRepository;
  private state: DetailState;
  private listeners = new Set<() => void>();
  private controllers = new Map<DetailArea, AbortController>();
  private generation = 0;
  constructor(repository: PlaceDetailRepository, value: string) {
    this.repository = repository;
    try { this.state = { identifier: parsePlaceIdentifier(value), basic: { status: 'idle' }, info: { status: 'blocked' }, photos: { status: 'idle' } }; }
    catch { this.state = { basic: { status: 'error', error: new TourError('parameters') }, info: { status: 'blocked' }, photos: { status: 'blocked' } }; }
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(value: Partial<DetailState>) { this.state = { ...this.state, ...value }; this.listeners.forEach(listener => listener()); }
  start = () => {
    if (this.state.basic.status === 'idle') this.load('basic');
    if (this.state.photos.status === 'idle') this.load('photos');
    if (this.state.basic.data && ['idle', 'blocked'].includes(this.state.info.status)) this.load('info');
  };
  retry = (area: DetailArea) => { if (this.state[area].status === 'error' && !['authentication','quota','configuration','parameters'].includes(this.state[area].error?.kind ?? '')) this.load(area); };
  dispose = () => {
    this.generation++; this.controllers.forEach(controller => controller.abort()); this.controllers.clear();
    const interrupted = <T>(section: DetailSection<T>): DetailSection<T> => section.status === 'loading' ? { status: 'idle' } : section;
    this.update({ basic: interrupted(this.state.basic), info: interrupted(this.state.info), photos: interrupted(this.state.photos) });
  };
  private load(area: DetailArea) {
    const id = this.state.identifier;
    if (!id || this.controllers.has(area) || area === 'info' && !this.state.basic.data) return;
    const controller = new AbortController(); this.controllers.set(area, controller);
    const generation = this.generation;
    const current = () => generation === this.generation && !controller.signal.aborted;
    this.update({ [area]: { status: 'loading' } });
    const request = area === 'basic' ? this.repository.basic(id, controller.signal).then(data => {
      if (current()) { this.update({ basic: { status: 'success', data } }); this.load('info'); }
    }) : area === 'info' && this.state.basic.data ? this.repository.info(id, this.state.basic.data, controller.signal).then(data => {
      if (current()) this.update({ info: { status: 'success', data } });
    }) : this.repository.photos(id, controller.signal).then(data => {
      if (current()) this.update({ photos: { status: 'success', data } });
    });
    void request.catch(error => {
      if (current()) this.update({ [area]: { status: 'error', error: error instanceof TourError ? error : new TourError('network') } });
    }).finally(() => { if (this.controllers.get(area) === controller) this.controllers.delete(area); });
  }
}

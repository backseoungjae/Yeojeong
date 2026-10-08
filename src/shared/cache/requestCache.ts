import { TourError } from '../api/tour/tourError.ts';
interface Pending<T> { controller: AbortController; promise: Promise<T>; consumers: number }
// 값 캐시와 동일 요청 공유를 한곳에서 관리하며 모든 이용자의 취소 후에만 통신을 중단한다.
export class RequestCache<T> {
  private values = new Map<string, { value: T; expires: number }>();
  private pending = new Map<string, Pending<T>>();
  private ttl: number;
  private limit: number;
  private now: () => number;
  constructor(ttl = 5 * 60 * 1000, limit = 50, now = Date.now) { this.ttl = ttl; this.limit = limit; this.now = now; }
  read(key: string): T | undefined {
    const entry = this.values.get(key);
    if (!entry) return undefined;
    if (entry.expires <= this.now()) { this.values.delete(key); return undefined; }
    this.values.delete(key); this.values.set(key, entry);
    return entry.value;
  }
  get(key: string, load: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) return Promise.reject(new TourError('cancelled'));
    const cached = this.read(key);
    if (cached !== undefined) return Promise.resolve(cached);
    let entry = this.pending.get(key);
    if (!entry) {
      const controller = new AbortController();
      const promise = Promise.resolve().then(() => load(controller.signal)).then(value => {
        if (controller.signal.aborted) throw new TourError('cancelled');
        this.values.set(key, { value, expires: this.now() + this.ttl });
        while (this.values.size > this.limit) {
          const oldest = this.values.keys().next().value;
          if (oldest !== undefined) this.values.delete(oldest);
        }
        return value;
      }).finally(() => { if (this.pending.get(key)?.controller === controller) this.pending.delete(key); });
      entry = { controller, promise, consumers: 0 }; this.pending.set(key, entry);
    }
    const request = entry; request.consumers++;
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const finish = () => {
        if (settled) return false;
        settled = true; signal?.removeEventListener('abort', cancel); request.consumers--;
        if (request.consumers === 0 && this.pending.get(key) === request) {
          this.pending.delete(key); request.controller.abort();
        }
        return true;
      };
      const cancel = () => { if (finish()) reject(new TourError('cancelled')); };
      signal?.addEventListener('abort', cancel, { once: true });
      request.promise.then(value => { if (finish()) resolve(value); }, error => { if (finish()) reject(error); });
    });
  }
}

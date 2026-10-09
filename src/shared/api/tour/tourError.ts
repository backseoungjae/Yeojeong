export type TourErrorKind = 'configuration' | 'parameters' | 'network' | 'timeout' | 'cancelled' | 'http' | 'authentication' | 'quota' | 'api' | 'format' | 'missing';
export class TourError extends Error {
  readonly kind: TourErrorKind;
  readonly code?: string;
  readonly status?: number;
  constructor(kind: TourErrorKind, code?: string, status?: number) {
    // 공급자 메시지·URL·원래 오류는 키를 포함할 수 있으므로 보존하지 않는다.
    super(`TourAPI: ${kind}`);
    this.name = 'TourError';
    this.kind = kind; this.code = code; this.status = status;
  }
}
export function errorForCode(code: string, status?: number) {
  const kind = ['20', '29', '30', '31', '32'].includes(code) ? 'authentication'
    : ['22', '23'].includes(code) ? 'quota' : 'api';
  return new TourError(kind, code, status);
}

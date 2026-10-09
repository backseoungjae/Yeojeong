export type LogEvent = 'render_failure' | 'api_failure' | 'storage_failure' | 'recovery_retry';
export type LogScope = 'root' | 'tour' | 'database';
export interface SafeLog { event: LogEvent; scope: LogScope; kind: string; at: number }
const events: readonly string[] = ['render_failure','api_failure','storage_failure','recovery_retry'];
const scopes: readonly string[] = ['root','tour','database'];
const kinds: readonly string[] = ['render','configuration','parameters','network','timeout','cancelled','http','authentication','quota','api','format','missing','initialization','locked','version','read','write','data'];
// 입력 객체/원본 오류/스택/URL/콘텐츠/사용자 이름은 전달하지 않는다. 미등록 값도 고정 분류로 바꾼다.
export function safeLog(event: LogEvent, scope: LogScope, kind: unknown, now = Date.now): SafeLog {
  return { event: events.includes(event) ? event : 'render_failure', scope: scopes.includes(scope) ? scope : 'root', kind: typeof kind === 'string' && kinds.includes(kind) ? kind : 'render', at: now() };
}
export function createLogger(write: (record: SafeLog) => void, now = Date.now) {
  return (event: LogEvent, scope: LogScope, kind: unknown) => { try { write(safeLog(event,scope,kind,now)); } catch { /* 진단 실패가 사용자 동작을 실패시키지 않는다. */ } };
}
// 로컬 구조화 로그이며 외부 오류 추적 서비스로 전송하지 않는다.
export const logEvent = createLogger(record => console.warn(JSON.stringify(record)));

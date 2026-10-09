import { StorageError, type SqlConnection } from './database';
function acquireDocumentLease(): Promise<void> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    void navigator.locks.request('yeojeong.sqlite', { mode: 'exclusive', signal: controller.signal }, async () => {
      clearTimeout(timer);
      resolve();
      // Expo 웹 VFS는 연결을 닫아도 Worker의 파일 핸들 풀을 유지한다. 문서가 끝날 때까지 소유권을 유지한다.
      await new Promise<void>(() => {});
    }).catch(() => { clearTimeout(timer); reject(new StorageError('locked')); });
  });
}
export function createDatabaseOpener(): () => Promise<SqlConnection> {
  let lease: Promise<void> | undefined;
  return async () => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.locks) {
      lease ??= acquireDocumentLease().catch(error => { lease = undefined; throw error; });
      await lease;
    }
    const sqlite = await import('expo-sqlite');
    return sqlite.openDatabaseAsync('yeojeong.db', { useNewConnection: true });
  };
}

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { AppDatabase } from './database';
import { createDatabaseOpener } from './openDatabase';
// 루트 오류 복구로 Provider가 다시 마운트돼도 같은 연결과 웹 문서 소유권을 재사용한다.
const sharedDatabase = new AppDatabase(createDatabaseOpener());
const DatabaseContext = createContext<AppDatabase | null>(null);
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const database = sharedDatabase;
  useEffect(() => {
    if (typeof window === 'undefined' || !window.addEventListener) return;
    window.addEventListener('pagehide', database.releaseForPageExit);
    return () => window.removeEventListener('pagehide', database.releaseForPageExit);
  }, [database]);
  return <DatabaseContext.Provider value={database}>{children}</DatabaseContext.Provider>;
}
export function useAppDatabase() {
  const database = useContext(DatabaseContext);
  if (!database) throw new Error('DatabaseProvider is required');
  return database;
}

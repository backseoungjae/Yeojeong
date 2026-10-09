import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppDatabase } from './database';
import { createDatabaseOpener } from './openDatabase';
const DatabaseContext = createContext<AppDatabase | null>(null);
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [database] = useState(() => new AppDatabase(createDatabaseOpener()));
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

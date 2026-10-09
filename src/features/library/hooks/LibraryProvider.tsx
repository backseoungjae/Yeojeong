import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppDatabase } from '@/shared/database/database';
import { createLibraryRepository } from '../repositories/libraryRepository';
import { createSettingsRepository } from '@/features/settings/repositories/settingsRepository';
import { LibraryStore } from '../models/libraryStore';
const LibraryContext = createContext<LibraryStore | null>(null);
export function LibraryProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => {
    const database = new AppDatabase(async () => {
      const sqlite = await import('expo-sqlite');
      return sqlite.openDatabaseAsync('yeojeong.db', { useNewConnection: true });
    });
    return new LibraryStore(createLibraryRepository(database), createSettingsRepository(database));
  });
  useEffect(() => { void store.initialize(); }, [store]);
  return <LibraryContext.Provider value={store}>{children}</LibraryContext.Provider>;
}
export function useLibraryStore() {
  const store = useContext(LibraryContext);
  if (!store) throw new Error('LibraryProvider is required');
  return store;
}
export function useLibrary() {
  const store = useLibraryStore();
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { ...state, store };
}

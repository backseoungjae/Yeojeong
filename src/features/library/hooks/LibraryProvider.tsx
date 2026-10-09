import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useAppDatabase } from '@/shared/database/DatabaseProvider';
import { createLibraryRepository } from '../repositories/libraryRepository';
import { createSettingsRepository } from '@/features/settings/repositories/settingsRepository';
import { LibraryStore } from '../models/libraryStore';
const LibraryContext = createContext<LibraryStore | null>(null);
export function LibraryProvider({ children }: { children: ReactNode }) {
  const database = useAppDatabase();
  const [store] = useState(() => new LibraryStore(createLibraryRepository(database.forSession()), createSettingsRepository(database.forSession())));
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

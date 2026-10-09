import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useAppDatabase } from '@/shared/database/DatabaseProvider';
import { createTripRepository } from '../repositories/tripRepository';
import { TripStore } from '../models/tripStore';
const TripsContext = createContext<TripStore | null>(null);
export function TripsProvider({ children }: { children: ReactNode }) {
  const database = useAppDatabase();
  const [store] = useState(() => new TripStore(createTripRepository(database.forSession())));
  useEffect(() => { void store.initialize(); }, [store]);
  return <TripsContext.Provider value={store}>{children}</TripsContext.Provider>;
}
export function useTrips() {
  const store = useContext(TripsContext);
  if (!store) throw new Error('TripsProvider is required');
  return { ...useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot), store };
}

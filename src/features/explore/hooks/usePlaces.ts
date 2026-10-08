import { useEffect, useSyncExternalStore } from 'react';
import { useExploreContext } from './ExploreProvider';
export function usePlaces() {
  const { store } = useExploreContext();
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => { store.ensureLoaded(); }, [store]);
  return { ...state, store };
}

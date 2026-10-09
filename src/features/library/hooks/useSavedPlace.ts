import type { Place } from '@/shared/models/place';
import { useLibrary } from './LibraryProvider';
export function useSavedPlace(place: Place) {
  const { saved, pendingIds, saveErrors, store } = useLibrary();
  return { saved: saved.some(item => item.place.id === place.id), busy: pendingIds.has(place.id), error: saveErrors.has(place.id), toggle: () => void store.toggleSaved(place) };
}

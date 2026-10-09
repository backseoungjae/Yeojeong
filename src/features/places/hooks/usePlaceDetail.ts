import { useFocusEffect } from 'expo-router';
import { useLibrary } from '@/features/library/hooks/LibraryProvider';
import { useTrips } from '@/features/trips/hooks/TripsProvider';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { galleryPhotos } from '../models/galleryPhotos';
import { PlaceDetailController } from '../models/placeDetailController';
import { usePlaceDetailRepository } from './PlaceDetailProvider';
export function usePlaceDetail(identifier: string) {
  const repository = usePlaceDetailRepository();
  const { saved, recent, store: library, historyError } = useLibrary();
  const { items, store: trips } = useTrips();
  const controller = useMemo(() => new PlaceDetailController(repository, identifier), [repository, identifier]);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => { controller.start(); return controller.dispose; }, [controller]);
  useFocusEffect(useCallback(() => {
    let recorded = false;
    const record = () => {
      const basic = controller.getSnapshot().basic;
      const local = library.getSnapshot();
      const place = basic.data?.place ?? (basic.status === 'error' ? [...local.saved, ...local.recent, ...trips.getSnapshot().items].find(item => item.place.id === identifier)?.place : undefined);
      if (place && !recorded) { recorded = true; void library.recordPlace(place); }
    };
    record();
    return controller.subscribe(record);
  }, [controller, library, trips, identifier]));
  const snapshot = [...saved, ...recent, ...items].find(item => item.place.id === identifier);
  return { ...state, snapshot, historyError, gallery: galleryPhotos(state.photos.data ?? [], state.basic.data), retry: controller.retry };
}

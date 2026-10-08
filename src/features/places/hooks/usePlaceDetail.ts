import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { galleryPhotos } from '../models/galleryPhotos';
import { PlaceDetailController } from '../models/placeDetailController';
import { usePlaceDetailRepository } from './PlaceDetailProvider';
export function usePlaceDetail(identifier: string) {
  const repository = usePlaceDetailRepository();
  const controller = useMemo(() => new PlaceDetailController(repository, identifier), [repository, identifier]);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => { controller.start(); return controller.dispose; }, [controller]);
  return { ...state, gallery: galleryPhotos(state.photos.data ?? [], state.basic.data), retry: controller.retry };
}

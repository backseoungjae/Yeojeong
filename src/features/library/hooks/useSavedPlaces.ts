import { useState } from 'react';
import type { PlaceType } from '@/shared/models/place';
import { useLibrary } from './LibraryProvider';
export function useSavedPlaces() {
  const { saved } = useLibrary();
  const [region, setRegion] = useState<string | undefined>();
  const [type, setType] = useState<PlaceType | 'all'>('all');
  const regions = [...new Set(saved.map(item => item.place.regionCode).filter(code => code !== undefined))];
  return { places: saved.filter(item => (!region || item.place.regionCode === region) && (type === 'all' || item.place.type === type)), regions, region, type, setRegion, setType, reset: () => { setRegion(undefined); setType('all'); } };
}

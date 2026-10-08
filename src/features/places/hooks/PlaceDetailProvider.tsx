import { createContext, useContext, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { createTourClient } from '@/shared/api/tour/tourClient';
import { getTourEnvironment } from '@/shared/api/tour/tourConfig';
import { createPlaceDetailRepository, type PlaceDetailRepository } from '../repositories/placeDetailRepository';
const DetailContext = createContext<PlaceDetailRepository | null>(null);
export function PlaceDetailProvider({ children }: { children: ReactNode }) {
  const [repository] = useState(() => createPlaceDetailRepository(createTourClient(getTourEnvironment(), undefined, Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'AND' : 'ETC')));
  return <DetailContext.Provider value={repository}>{children}</DetailContext.Provider>;
}
export function usePlaceDetailRepository() {
  const repository = useContext(DetailContext);
  if (!repository) throw new Error('PlaceDetailProvider is required');
  return repository;
}

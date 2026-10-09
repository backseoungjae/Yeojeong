import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { createTourClient } from '@/shared/api/tour/tourClient';
import { getTourEnvironment } from '@/shared/api/tour/tourConfig';
import { useAppSettings } from '@/shared/settings/AppSettingsProvider';
import { createPlaceRepository, type PlaceRepository } from '../repositories/placeRepository';
import { ExploreStore } from '../models/exploreStore';
const ExploreContext = createContext<{ store: ExploreStore; repository: PlaceRepository } | null>(null);
export function ExploreProvider({ children }: { children: ReactNode }) {
  const { language } = useAppSettings();
  const [value] = useState(() => {
    const repository = createPlaceRepository(createTourClient(getTourEnvironment(), undefined, Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'AND' : 'ETC'));
    return { repository, store: new ExploreStore(repository, language) };
  });
  useEffect(() => { value.store.setLanguage(language); }, [value, language]);
  useEffect(() => () => { value.store.dispose(); value.repository.dispose(); }, [value]);
  return <ExploreContext.Provider value={value}>{children}</ExploreContext.Provider>;
}
export function useExploreContext() {
  const value = useContext(ExploreContext);
  if (!value) throw new Error('ExploreProvider is required');
  return value;
}

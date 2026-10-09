import { useLocalData } from '@/features/settings/hooks/LocalDataProvider';
import { useState } from 'react';
import { router } from 'expo-router';
import { useExploreContext } from '@/features/explore/hooks/ExploreProvider';
import { defaultConditions, type ExploreConditions } from '@/features/explore/models/exploreQuery';
import { useTrips } from '@/features/trips/hooks/TripsProvider';
import { useTripToday } from '@/features/trips/hooks/useTripToday';
import { useI18n } from '@/shared/i18n/useI18n';
import { homeTrip } from '../models/homeTrip';
import { curations } from '../models/curations';
export function useHome() {
  const { language } = useI18n();
  const localData = useLocalData();
  const { trips, items } = useTrips();
  const today = useTripToday();
  const { store } = useExploreContext();
  const [region, setRegion] = useState<ExploreConditions>(defaultConditions);
  const trip = homeTrip(trips, today);
  return { dataResetError: localData.error, dataResetCompleted: localData.completed, region, setRegion, trip, itemCount: items.filter(item => item.tripId === trip?.id).length,
    curations: curations.filter(item => item.place.language === language),
    browseRegion: () => { store.setKeywordInput(''); store.apply(region); router.navigate('/explore'); },
    openSearch: () => router.navigate('/explore'),
  };
}

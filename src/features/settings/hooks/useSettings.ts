import { useState } from 'react';
import { useLibrary } from '@/features/library/hooks/LibraryProvider';
import { useTrips } from '@/features/trips/hooks/TripsProvider';
import { useI18n } from '@/shared/i18n/useI18n';
import { useTheme } from '@/shared/theme/useTheme';
import { useLocalData } from './LocalDataProvider';
import { appVersion, openInformation } from '../services/appInformation';
export function useSettings() {
  const { t } = useI18n();
  const { resolvedTheme } = useTheme();
  const library = useLibrary();
  const trips = useTrips();
  const local = useLocalData();
  const [confirming, setConfirming] = useState(false);
  const [linkError, setLinkError] = useState(false);
  return { ...local, confirming, setConfirming, linkError, version: appVersion ?? t('settings.versionUnknown'),
    counts: { trips: trips.trips.length, items: trips.items.length, saved: library.saved.length, recent: library.recent.length, searches: library.searches.length },
    deleteData: () => { setConfirming(false); void local.reset(t('settings.deleting'), resolvedTheme); },
    openInformation: async (kind: 'source' | 'images') => { setLinkError(false); try { await openInformation(kind); } catch { setLinkError(true); } },
  };
}

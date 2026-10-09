import type { ReactNode } from 'react';
import { Screen } from '@/shared/ui/Screen';
import { Loading } from '@/shared/ui/Loading';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useI18n } from '@/shared/i18n/useI18n';
import { useTrips } from '../hooks/TripsProvider';
export function TripsGate({ children }: { children: ReactNode }) {
  const { status, store } = useTrips();
  const { t } = useI18n();
  if (status === 'loading') return <Screen><Loading /></Screen>;
  if (status === 'error') return <Screen><ErrorState title={t('trip.loadError')} description={t('trip.error.storage')} onRetry={() => void store.initialize()} /></Screen>;
  return children;
}

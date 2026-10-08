import { useI18n } from '@/shared/i18n/useI18n';
import { Screen } from '@/shared/ui/Screen';
import { EmptyState } from '@/shared/ui/EmptyState';
export default function TripDetailScreen() {
  const { t } = useI18n();
  return <Screen><EmptyState title={t('trip.emptyTitle')} description={t('trip.emptyDescription')} /></Screen>;
}

import { useI18n } from '@/shared/i18n/useI18n';
import { Screen } from '@/shared/ui/Screen';
import { EmptyState } from '@/shared/ui/EmptyState';
export default function PlaceDetailScreen() {
  const { t } = useI18n();
  return <Screen><EmptyState title={t('place.emptyTitle')} description={t('place.emptyDescription')} /></Screen>;
}

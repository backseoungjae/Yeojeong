import type { TourError } from '@/shared/api/tour/tourError';
import { useTourError } from '@/shared/hooks/useTourError';
import { useI18n } from '@/shared/i18n/useI18n';
import { ErrorState } from '@/shared/ui/ErrorState';
export function DetailAreaError({ error, onRetry }: { error?: TourError; onRetry: () => void }) {
  const { t } = useI18n();
  const presentation = useTourError(error);
  return <ErrorState description={error?.kind === 'parameters' ? t('place.invalidIdentifier') : presentation?.description} onRetry={presentation?.retryable ? onRetry : undefined} />;
}

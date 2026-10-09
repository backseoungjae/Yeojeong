import { Text } from '@/shared/ui/Text';
import { useI18n } from '@/shared/i18n/useI18n';
import type { TripError } from '../models/trip';
export function TripFeedback({ error }: { error?: TripError['kind'] }) {
  const { t } = useI18n();
  return error ? <Text tone="danger" accessibilityRole="alert" accessibilityLiveRegion="assertive">{t(`trip.error.${error}`)}</Text> : null;
}

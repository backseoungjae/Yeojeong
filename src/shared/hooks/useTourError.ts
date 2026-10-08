import type { TourError } from '@/shared/api/tour/tourError';
import { useI18n } from '@/shared/i18n/useI18n';
export function useTourError(error?: TourError) {
  const { t } = useI18n();
  if (!error) return undefined;
  const message = error.kind === 'authentication' ? 'explore.authError' : error.kind === 'quota' ? 'explore.quotaError'
    : error.kind === 'configuration' ? 'explore.configError' : error.kind === 'network' || error.kind === 'timeout' || error.kind === 'http' && (error.status ?? 0) >= 500 ? 'explore.networkError' : 'explore.dataError';
  return { description: t(message), retryable: !['authentication', 'quota', 'configuration', 'parameters'].includes(error.kind) };
}

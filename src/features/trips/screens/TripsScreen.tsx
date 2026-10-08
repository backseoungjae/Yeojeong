import { router } from 'expo-router';
import { useI18n } from '@/shared/i18n/useI18n';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { EmptyState } from '@/shared/ui/EmptyState';
export default function TripsScreen() {
  const { t } = useI18n();
  return <Screen>
    <Text variant="title" accessibilityRole="header">{t('trips.title')}</Text>
    <Text tone="muted">{t('trips.description')}</Text>
    <EmptyState title={t('trips.emptyTitle')} description={t('trips.emptyDescription')} action={{ label: t('trips.create'), onPress: () => router.push('/trips/new') }} />
  </Screen>;
}

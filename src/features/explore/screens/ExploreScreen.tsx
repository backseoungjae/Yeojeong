import { useI18n } from '@/shared/i18n/useI18n';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { EmptyState } from '@/shared/ui/EmptyState';
export default function ExploreScreen() {
  const { t } = useI18n();
  return <Screen>
    <Text variant="title" accessibilityRole="header">{t('explore.title')}</Text>
    <Text tone="muted">{t('explore.description')}</Text>
    <EmptyState title={t('explore.emptyTitle')} description={t('explore.emptyDescription')} />
  </Screen>;
}

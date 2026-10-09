import { View } from 'react-native';
import { useI18n } from '@/shared/i18n/useI18n';
import { useTheme } from '@/shared/theme/useTheme';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { useLibrary } from '../hooks/LibraryProvider';
import { StoredPlaceCard } from './StoredPlaceCard';
export function RecentPlaces() {
  const { t } = useI18n();
  const { spacing } = useTheme();
  const { recent, store, historyBusy, historyError } = useLibrary();
  return <Section title={t('local.recentPlaces')}>
    {historyError && <Text tone="danger" accessibilityRole="alert">{t('local.historyError')}</Text>}
    {!recent.length && <Text tone="muted">{t('local.noRecentPlaces')}</Text>}
    {recent.map(item => <View key={item.place.id} style={{ gap: spacing.sm }}>
      <StoredPlaceCard item={item} />
      <Button label={t('local.removeRecent', { name: item.place.name })} variant="secondary" disabled={historyBusy} onPress={() => void store.removeRecent(item.place.id)} />
    </View>)}
    {recent.length > 0 && <Button label={t('local.clearRecent')} variant="secondary" disabled={historyBusy} onPress={() => void store.clearRecent()} />}
  </Section>;
}

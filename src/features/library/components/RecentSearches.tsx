import { View } from 'react-native';
import { useI18n } from '@/shared/i18n/useI18n';
import { useTheme } from '@/shared/theme/useTheme';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { useLibrary } from '../hooks/LibraryProvider';
export function RecentSearches({ onSelect }: { onSelect: (keyword: string) => void }) {
  const { t } = useI18n();
  const { spacing } = useTheme();
  const { searches, store, historyBusy, historyError } = useLibrary();
  return <Section title={t('local.recentSearches')}>
    {historyError && <Text tone="danger" accessibilityRole="alert">{t('local.historyError')}</Text>}
    {!searches.length && <Text tone="muted">{t('local.noSearches')}</Text>}
    {searches.map(item => <View key={item.keyword} style={{ gap: spacing.sm }}>
      <Button label={item.keyword} accessibilityLabel={t('local.searchAgain', { value: item.keyword })} variant="secondary" onPress={() => onSelect(item.keyword)} />
      <Button label={t('local.removeSearch', { value: item.keyword })} variant="secondary" disabled={historyBusy} onPress={() => void store.removeSearch(item.keyword)} />
    </View>)}
    {searches.length > 0 && <Button label={t('local.clearSearches')} variant="secondary" disabled={historyBusy} onPress={() => void store.clearSearches()} />}
  </Section>;
}

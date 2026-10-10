import { View } from 'react-native';
import { useState } from 'react';
import { useI18n } from '@/shared/i18n/useI18n';
import { useTheme } from '@/shared/theme/useTheme';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { IconButton } from '@/shared/ui/IconButton';
import { useLibrary } from '../hooks/LibraryProvider';
export function RecentSearches({ onSelect }: { onSelect: (keyword: string) => void }) {
  const { t } = useI18n();
  const { spacing } = useTheme();
  const { searches, store, historyBusy, historyError } = useLibrary();
  const [expanded, setExpanded] = useState(false);
  const [managing, setManaging] = useState(false);
  const visibleSearches = expanded || managing ? searches : searches.slice(0, 3);
  if (!searches.length) return historyError ? <Text tone="danger" accessibilityRole="alert">{t('local.historyError')}</Text> : null;
  return <View style={{ gap: spacing.sm }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
      <Text variant="heading" accessibilityRole="header" style={{ flex: 1 }}>{t('local.recentSearches')}</Text>
      <Button label={t(managing ? 'local.finishSearchManagement' : 'local.manageSearches')} variant="secondary" selected={managing} disabled={historyBusy} onPress={() => setManaging(previous => !previous)} />
    </View>
    {historyError && <Text tone="danger" accessibilityRole="alert">{t('local.historyError')}</Text>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {visibleSearches.map(item => <View key={item.keyword} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '100%' }}>
        <View style={{ flexShrink: 1 }}><Chip label={item.keyword} accessibilityLabel={t('local.searchAgain', { value: item.keyword })} disabled={historyBusy} onPress={() => { setManaging(false); onSelect(item.keyword); }} /></View>
        {managing && <IconButton icon="close" label={t('local.removeSearch', { value: item.keyword })} disabled={historyBusy} onPress={() => void store.removeSearch(item.keyword)} />}
      </View>)}
    </View>
    {!managing && searches.length > 3 && <Button label={t(expanded ? 'local.collapseSearches' : 'local.expandSearches')} variant="secondary" selected={expanded} onPress={() => setExpanded(previous => !previous)} />}
    {managing && <Button label={t('local.clearSearches')} variant="secondary" disabled={historyBusy} onPress={() => void store.clearSearches().then(() => { if (!store.getSnapshot().searches.length) { setManaging(false); setExpanded(false); } })} />}
  </View>;
}

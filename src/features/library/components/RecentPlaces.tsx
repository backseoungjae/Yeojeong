import { View } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useI18n } from '@/shared/i18n/useI18n';
import { useTheme } from '@/shared/theme/useTheme';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { useLibrary } from '../hooks/LibraryProvider';
import { RecentPlaceCard } from './RecentPlaceCard';
export function RecentPlaces() {
  const { t } = useI18n();
  const { spacing } = useTheme();
  const { recent, store, historyBusy, historyError } = useLibrary();
  const [expanded, setExpanded] = useState(false);
  const [managing, setManaging] = useState(false);
  const visiblePlaces = expanded || managing ? recent : recent.slice(0, 3);
  const resetIfEmpty = () => { if (!store.getSnapshot().recent.length) { setManaging(false); setExpanded(false); } };
  return <View style={{ gap: spacing.md }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
      <Text variant="heading" accessibilityRole="header" style={{ flex: 1 }}>{t('local.recentPlaces')}</Text>
      {recent.length > 0 && <Button label={t(managing ? 'local.finishRecentManagement' : 'local.manageRecent')} accessibilityLabel={t(managing ? 'local.finishRecentManagementLabel' : 'local.manageRecentLabel')} variant="secondary" selected={managing} disabled={historyBusy} onPress={() => setManaging(previous => !previous)} />}
    </View>
    {historyError && <Text tone="danger" accessibilityRole="alert">{t('local.historyError')}</Text>}
    {!recent.length && <Text tone="muted">{t('local.noRecentPlaces')}</Text>}
    {visiblePlaces.map(item => <RecentPlaceCard key={item.place.id} item={item} onPress={() => router.push({ pathname: '/places/[placeId]', params: { placeId: item.place.id } })}
      removing={historyBusy} onRemove={managing ? () => void store.removeRecent(item.place.id).then(resetIfEmpty) : undefined} />)}
    {!managing && recent.length > 3 && <Button label={t(expanded ? 'local.collapseRecent' : 'local.expandRecent')} variant="secondary" selected={expanded} onPress={() => setExpanded(previous => !previous)} />}
    {managing && recent.length > 0 && <Button label={t('local.clearRecent')} variant="secondary" disabled={historyBusy} onPress={() => void store.clearRecent().then(resetIfEmpty)} />}
  </View>;
}

import type { ReactNode } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useI18n } from '@/shared/i18n/useI18n';
import { useTheme } from '@/shared/theme/useTheme';
import { Chip } from '@/shared/ui/Chip';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useRegions } from '@/features/explore/hooks/useRegions';
import { useSavedPlaces } from '../hooks/useSavedPlaces';
import { StoredPlaceCard } from './StoredPlaceCard';
export function SavedPlacesList({ tabs }: { tabs: ReactNode }) {
  const { t } = useI18n();
  const { colors, spacing, layout } = useTheme();
  const state = useSavedPlaces();
  const names = useRegions();
  return <SafeAreaView edges={['left','right','bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <FlatList data={state.places} keyExtractor={item => item.place.id} initialNumToRender={6} maxToRenderPerBatch={6} windowSize={7}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center' }}
      ListHeaderComponent={<View style={{ gap: spacing.md }}>
        {tabs}<Text variant="heading" accessibilityRole="header">{t('local.savedPlaces')}</Text>
        <Text variant="label">{t('explore.province')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Chip label={t('explore.nationwide')} selected={!state.region} onPress={() => state.setRegion(undefined)} />
          {state.regions.map(code => <Chip key={code} label={names.values.find(item => item.code === code)?.name ?? t('local.regionCode', { value: code })} selected={state.region === code} onPress={() => state.setRegion(code)} />)}
        </View>
        <Text variant="label">{t('explore.type')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {(['all','attraction','culture','restaurant','other'] as const).map(type => <Chip key={type} label={t(`explore.type.${type}`)} selected={state.type === type} onPress={() => state.setType(type)} />)}
        </View>
        <Button label={t('local.resetFilters')} variant="secondary" onPress={state.reset} />
        <Text>{t('local.savedCount', { count: state.places.length })}</Text>
      </View>}
      renderItem={({ item }) => <StoredPlaceCard item={item} />}
      ListEmptyComponent={<EmptyState title={t('local.noSaved')} description={t('local.noSavedHint')} action={{ label: t('home.explore'), onPress: () => router.navigate('/explore') }} />} />
  </SafeAreaView>;
}

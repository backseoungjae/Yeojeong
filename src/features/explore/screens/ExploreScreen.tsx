import { useLibrary } from '@/features/library/hooks/LibraryProvider';
import { RecentSearches } from '@/features/library/components/RecentSearches';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '@/shared/i18n/useI18n';
import { useTheme } from '@/shared/theme/useTheme';
import type { Place } from '@/shared/models/place';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { Loading } from '@/shared/ui/Loading';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { usePlaces } from '../hooks/usePlaces';
import { useRegions } from '../hooks/useRegions';
import { useExploreError } from '../hooks/useExploreError';
import { PlaceCard } from '../../places/components/PlaceCard';
import { ExploreFilters } from '../components/ExploreFilters';
import { changeRegion, queryKey, type ExploreConditions } from '../models/exploreQuery';
export default function ExploreScreen() {
  const { t, language } = useI18n();
  const { colors, spacing, layout } = useTheme();
  const state = usePlaces();
  const { store: library } = useLibrary();
  const { store, conditions } = state;
  const provinces = useRegions();
  const districts = useRegions(conditions.regionCode, Boolean(conditions.regionCode));
  const error = useExploreError(state.error);
  const nextError = useExploreError(state.nextError);
  const [draft, setDraft] = useState<ExploreConditions | null>(null);
  const list = useRef<FlatList<Place>>(null);
  const filterButton = useRef<View>(null);
  const scrolling = useRef(false);
  const key = queryKey(state.language, conditions);
  const regionName = provinces.values.find(region => region.code === conditions.regionCode)?.name ?? t('explore.regionUnknown');
  const districtName = districts.values.find(region => region.code === conditions.districtCode)?.name ?? t('explore.regionUnknown');
  const restoreScroll = useCallback(() => {
    const frame = requestAnimationFrame(() => list.current?.scrollToOffset({ offset: store.getSnapshot().scrollOffset, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [store]);
  useFocusEffect(restoreScroll);
  useEffect(() => {
    scrolling.current = false;
    const frame = requestAnimationFrame(() => list.current?.scrollToOffset({ offset: store.getSnapshot().scrollOffset, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [key, store]);
  const dismissFilters = () => setDraft(null);
  const submit = () => { dismissFilters(); store.submit(); if (state.keywordInput.trim()) void library.recordSearch(state.keywordInput); };
  const recentSearch = (keyword: string) => { dismissFilters(); store.setKeywordInput(keyword); store.submit(); void library.recordSearch(keyword); };
  const reset = () => { dismissFilters(); store.reset(); };
  const matchesLanguage = state.language === language;
  const loading = state.loading || !state.page && !state.error || !matchesLanguage;
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <FlatList ref={list} data={matchesLanguage ? state.places : []} keyExtractor={place => place.id}
      keyboardShouldPersistTaps="handled" initialNumToRender={6} maxToRenderPerBatch={6} windowSize={7}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center' }}
      onScroll={event => store.setScrollOffset(event.nativeEvent.contentOffset.y)} scrollEventThrottle={100}
      onScrollBeginDrag={() => { scrolling.current = true; }}
      onEndReachedThreshold={0.4} onEndReached={() => { if (scrolling.current) store.loadNext(); }}
      ListHeaderComponent={<View style={{ gap: spacing.md, marginBottom: spacing.sm }}>
        <Text variant="title" accessibilityRole="header">{t('explore.title')}</Text>
        <TextField fieldId="explore-keyword" label={t('explore.keyword')} placeholder={t('explore.keywordPlaceholder')} value={state.keywordInput} onChangeText={store.setKeywordInput} returnKeyType="search" onSubmitEditing={submit} />
        <Button label={t('explore.search')} onPress={submit} />
        <RecentSearches onSelect={recentSearch} />
        <Button ref={filterButton} label={t('explore.editFilters')} variant="secondary" selected={draft !== null} onPress={() => setDraft(current => current === null ? { ...conditions } : null)} />
        {draft && <ExploreFilters returnTarget={filterButton} value={draft} onChange={setDraft} onCancel={dismissFilters} onApply={() => { store.apply(draft); dismissFilters(); }} />}
        <Text variant="label">{t('explore.applied')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {Boolean(conditions.keyword) && <Text>{t('explore.appliedKeyword', { value: conditions.keyword })}</Text>}
          {conditions.regionCode ? <Chip label={t('explore.removeRegion', { value: regionName })} onPress={() => { store.apply(changeRegion(conditions)); dismissFilters(); }} /> : <Text tone="muted">{t('explore.nationwide')}</Text>}
          {conditions.districtCode && <Chip label={t('explore.removeDistrict', { value: districtName })} onPress={() => { store.apply({ ...conditions, districtCode: undefined }); dismissFilters(); }} />}
          {conditions.type !== 'all' ? <Chip label={t('explore.removeType', { value: t(`explore.type.${conditions.type}`) })} onPress={() => { store.apply({ ...conditions, type: 'all' }); dismissFilters(); }} /> : <Text tone="muted">{t('explore.type.all')}</Text>}
        </View>
        {Boolean(conditions.keyword) && <Text tone="muted">{t('explore.searchTypeNotice')}</Text>}
        <Button label={t('explore.resetAll')} variant="secondary" onPress={reset} />
        {state.page > 0 && matchesLanguage && <Text accessibilityLiveRegion="polite">{t('explore.resultCount', { shown: state.places.length, total: state.totalCount })}</Text>}
      </View>}
      renderItem={({ item }) => <PlaceCard place={item} regionLabel={item.address ?? provinces.values.find(region => region.code === item.regionCode)?.name ?? t('explore.regionUnknown')}
        onPress={() => router.push({ pathname: '/places/[placeId]', params: { placeId: item.id } })} />}
      ListEmptyComponent={loading ? <View style={{ gap: spacing.md }}><Skeleton /><Skeleton /><Skeleton /></View>
        : error ? <ErrorState description={error.description} onRetry={error.retryable ? store.retry : undefined} />
        : <EmptyState title={t('explore.noResults')} description={t('explore.noResultsHint')} action={{ label: t('explore.resetAll'), onPress: reset }} />}
      ListFooterComponent={state.page > 0 && matchesLanguage ? <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
        {nextError ? <ErrorState title={t('explore.nextError')} description={nextError.description} onRetry={nextError.retryable ? store.retry : undefined} />
          : state.loadingNext ? <Loading /> : state.hasNext ? <Button label={t('explore.loadMore')} variant="secondary" onPress={store.loadNext} /> : <Text tone="muted">{t('explore.end')}</Text>}
      </View> : null} />
  </SafeAreaView>;
}

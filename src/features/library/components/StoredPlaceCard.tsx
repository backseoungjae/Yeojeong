import { router } from 'expo-router';
import { View } from 'react-native';
import { useI18n } from '@/shared/i18n/useI18n';
import { useTheme } from '@/shared/theme/useTheme';
import { Text } from '@/shared/ui/Text';
import { PlaceCard } from '@/features/places/components/PlaceCard';
import type { StoredPlace } from '../models/library';
export function StoredPlaceCard({ item }: { item: StoredPlace }) {
  const { language, t } = useI18n();
  const { spacing } = useTheme();
  return <View style={{ gap: spacing.sm }}>
    {item.place.language !== language && <Text>{t('place.originalLanguage', { language: t(item.place.language === 'ko' ? 'settings.korean' : 'settings.english') })}</Text>}
    <PlaceCard place={item.place} regionLabel={item.place.address ?? t('explore.regionUnknown')}
      onPress={() => router.push({ pathname: '/places/[placeId]', params: { placeId: item.place.id } })} />
  </View>;
}

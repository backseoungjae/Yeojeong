import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import type { PlacePhoto } from '@/shared/models/placeDetail';
import { useTheme } from '@/shared/theme/useTheme';
import { useI18n } from '@/shared/i18n/useI18n';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
export function PlacePhotoGallery({ photos, placeName }: { photos: PlacePhoto[]; placeName?: string }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const { t } = useI18n();
  const { spacing, colors, radius } = useTheme();
  const photo = photos[index];
  const unavailable = !photo?.url || failed.has(photo.id);
  return <View style={{ gap: spacing.md }}>
    {photo && !unavailable ? <Image source={{ uri: photo.url }} recyclingKey={photo.id} contentFit="contain" cachePolicy="memory-disk" accessible
      accessibilityLabel={t('place.photoLabel', { name: photo.name ?? placeName ?? t('place.title'), index: index + 1, total: photos.length })}
      onError={() => setFailed(previous => new Set([...previous, photo.id]))} style={{ width: '100%', height: 240, borderRadius: radius.card, backgroundColor: colors.surfaceMuted }} />
      : <View style={{ minHeight: 240, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.card }}>
        <Text tone="muted">{t(!photo ? 'explore.noImage' : failed.has(photo.id) ? 'explore.imageFailed' : 'place.insecureImage')}</Text>
      </View>}
    {photos.length > 0 && <>
      <Text accessibilityLiveRegion="polite">{t('place.photoCount', { index: index + 1, total: photos.length })}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Button label={t('place.previousPhoto')} variant="secondary" disabled={index === 0} onPress={() => setIndex(value => value - 1)} />
        <Button label={t('place.nextPhoto')} variant="secondary" disabled={index >= photos.length - 1} onPress={() => setIndex(value => value + 1)} />
      </View>
      {photo?.license && <Text variant="caption" tone="muted">{t('place.photoLicense', { value: photo.license })}</Text>}
    </>}
  </View>;
}

import { SavePlaceButton } from '@/features/library/components/SavePlaceButton';
import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import type { Place } from '@/shared/models/place';
import { useI18n } from '@/shared/i18n/useI18n';
import { useTheme } from '@/shared/theme/useTheme';
import { focusRing } from '@/shared/ui/focusRing';
import { Text } from '@/shared/ui/Text';
export function PlaceCard({ place, regionLabel, onPress }: { place: Place; regionLabel: string; onPress: () => void }) {
  const { t } = useI18n();
  const { colors, spacing, radius, layout } = useTheme();
  const [failed, setFailed] = useState(false);
  const [focused, setFocused] = useState(false);
  const imageUrl = place.listImageUrl ?? place.imageUrl;
  return <View style={{ gap: spacing.sm }}><Pressable accessibilityRole="button" accessibilityLabel={t('explore.openPlace', { name: place.name, region: regionLabel, type: t(`explore.type.${place.type}`) })}
    accessibilityHint={t('explore.placeHint', { image: t(failed ? 'explore.imageFailed' : imageUrl ? 'explore.photoAvailable' : 'explore.noListImage') })}
    onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => ({ ...focusRing(focused, colors.focus, layout.focusWidth), borderRadius: radius.card, borderWidth: layout.focusWidth, borderColor: focused ? colors.focus : colors.border,
      padding: spacing.md, gap: spacing.sm, backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 })}>
    {imageUrl && !failed ? <Image source={{ uri: imageUrl }} recyclingKey={place.id} contentFit="contain" cachePolicy="memory-disk" onError={() => setFailed(true)}
      accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: '100%', height: 160, backgroundColor: colors.surfaceMuted, borderRadius: radius.control }} />
      : <View style={{ minHeight: 160, padding: spacing.md, backgroundColor: colors.surfaceMuted, borderRadius: radius.control, justifyContent: 'center', alignItems: 'center' }}><Text tone="muted">{t(failed ? 'explore.imageFailed' : 'explore.noListImage')}</Text></View>}
    <Text variant="heading">{place.name}</Text>
    <Text tone="muted">{regionLabel}</Text>
    <Text variant="label">{t(`explore.type.${place.type}`)}</Text>
    <Text variant="caption" tone="muted">{t('explore.source')}</Text>
  </Pressable><SavePlaceButton place={place} /></View>;
}

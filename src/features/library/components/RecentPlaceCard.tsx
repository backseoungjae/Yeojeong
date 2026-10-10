import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { formatTimestamp } from '@/shared/i18n/format';
import { useI18n } from '@/shared/i18n/useI18n';
import { useTheme } from '@/shared/theme/useTheme';
import { focusRing } from '@/shared/ui/focusRing';
import { Text } from '@/shared/ui/Text';
import { IconButton } from '@/shared/ui/IconButton';
import type { StoredPlace } from '../models/library';

export function RecentPlaceCard({ item, onPress, onRemove, removing = false }: { item: StoredPlace; onPress: () => void; onRemove?: () => void; removing?: boolean }) {
  const { t, language } = useI18n();
  const { colors, spacing, radius, layout } = useTheme();
  const [failed, setFailed] = useState(false);
  const [focused, setFocused] = useState(false);
  const { place } = item;
  const imageUrl = place.listImageUrl ?? place.imageUrl;
  const region = place.address ?? t('explore.regionUnknown');
  return <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: radius.card, borderWidth: layout.focusWidth, borderColor: focused ? colors.focus : colors.border, padding: spacing.md, backgroundColor: colors.surface }}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('explore.openPlace', { name: place.name, region, type: t(`explore.type.${place.type}`) })}
    accessibilityHint={t('explore.placeHint', { image: t(failed ? 'explore.imageFailed' : imageUrl ? 'explore.photoAvailable' : 'explore.noListImage') })}
    onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => ({ ...focusRing(focused, colors.focus, layout.focusWidth), flex: 1, minHeight: layout.touchTarget, borderRadius: radius.control,
      gap: spacing.sm, opacity: pressed ? 0.8 : 1 })}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.sm }}>
      {imageUrl && !failed ? <Image source={{ uri: imageUrl }} recyclingKey={place.id} contentFit="contain" cachePolicy="memory-disk" onError={() => setFailed(true)}
        accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: layout.thumbnailSize, height: layout.thumbnailSize, backgroundColor: colors.surfaceMuted, borderRadius: radius.control }} />
        : <View style={{ width: layout.thumbnailSize, minHeight: layout.thumbnailSize, padding: spacing.xs, backgroundColor: colors.surfaceMuted, borderRadius: radius.control, justifyContent: 'center' }}>
          <Text variant="caption" tone="muted">{t(failed ? 'explore.imageFailed' : 'explore.noListImage')}</Text>
        </View>}
      <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: layout.thumbnailSize, gap: spacing.xs }}>
        <Text variant="label">{place.name}</Text>
        <Text variant="caption" tone="muted">{region}</Text>
        <Text variant="caption" tone="muted">{t(`explore.type.${place.type}`)}</Text>
      </View>
    </View>
    <Text variant="caption" tone="muted">{t('explore.source')}</Text>
    {place.imageLicense && <Text variant="caption" tone="muted">{t('place.photoLicense', { value: place.imageLicense })}</Text>}
    <Text variant="caption" tone="muted">{t('place.savedInfoAt', { value: formatTimestamp(item.capturedAt, language) })}</Text>
    {place.language !== language && <Text variant="caption">{t('place.originalLanguage', { language: t(place.language === 'ko' ? 'settings.korean' : 'settings.english') })}</Text>}
    </Pressable>
    {onRemove && <IconButton icon="close" label={t('local.removeRecent', { name: place.name })} disabled={removing} onPress={onRemove} />}
  </View>;
}

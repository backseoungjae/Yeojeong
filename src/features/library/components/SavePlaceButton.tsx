import { View } from 'react-native';
import type { Place } from '@/shared/models/place';
import { useTheme } from '@/shared/theme/useTheme';
import { useI18n } from '@/shared/i18n/useI18n';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';
import { useSavedPlace } from '../hooks/useSavedPlace';
export function SavePlaceButton({ place }: { place: Place }) {
  const { t } = useI18n();
  const { spacing } = useTheme();
  const { saved, busy, error, toggle } = useSavedPlace(place);
  return <View style={{ gap: spacing.sm }}>
    <Button label={t(saved ? 'local.unsave' : 'place.save')} accessibilityLabel={t(saved ? 'local.unsaveName' : 'local.saveName', { name: place.name })}
      variant={saved ? 'secondary' : 'primary'} selected={saved} busy={busy} accessibilityLiveRegion="polite" onPress={toggle} />
    {error && <Text tone="danger" accessibilityRole="alert" accessibilityLiveRegion="assertive">{t('local.saveError')}</Text>}
  </View>;
}

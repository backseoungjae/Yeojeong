import { RecentPlaces } from '@/features/library/components/RecentPlaces';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useI18n } from '@/shared/i18n/useI18n';
import { useTheme } from '@/shared/theme/useTheme';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
export default function HomeScreen() {
  const { t } = useI18n();
  const { colors, spacing, radius } = useTheme();
  return <Screen>
    <View style={{ gap: spacing.lg, padding: spacing.lg, backgroundColor: colors.selected, borderRadius: radius.card }}>
      <Text variant="caption" tone="accent">{t('app.tagline')}</Text>
      <Text variant="title" accessibilityRole="header">{t('home.title')}</Text>
      <Text tone="muted">{t('home.description')}</Text>
      <Button label={t('home.explore')} onPress={() => router.navigate('/explore')} />
      <Button label={t('home.trips')} variant="secondary" onPress={() => router.navigate('/trips')} />
    </View>
    <RecentPlaces />
  </Screen>;
}

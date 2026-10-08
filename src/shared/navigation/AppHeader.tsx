import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import { useI18n } from '../i18n/useI18n';
import { Text } from '../ui/Text';
import { IconButton } from '../ui/IconButton';
export function AppHeader({ title, back = false }: { title: string; back?: boolean }) {
  const { colors, spacing } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return <View style={{ paddingTop: insets.top + spacing.sm, paddingBottom: spacing.sm, paddingLeft: insets.left + spacing.md, paddingRight: insets.right + spacing.md,
    backgroundColor: colors.background, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
    {back && <IconButton icon="back" label={t('common.back')} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />}
    <Text variant="heading" accessibilityRole="header" style={{ flex: 1 }}>{title}</Text>
  </View>;
}

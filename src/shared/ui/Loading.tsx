import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { useAccessibility } from '../accessibility/AccessibilityProvider';
import { useI18n } from '../i18n/useI18n';
import { Text } from './Text';
export function Loading({ label }: { label?: string }) {
  const { colors, spacing } = useTheme();
  const { reduceMotion } = useAccessibility();
  const { t } = useI18n();
  const message = label ?? t('common.loading');
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={message} accessibilityState={{ busy: true }} aria-busy accessibilityLiveRegion="polite" style={{ gap: spacing.sm, padding: spacing.md, alignItems: 'center' }}>
    {!reduceMotion && <ActivityIndicator accessible={false} color={colors.accent} />}
    <Text>{message}</Text>
  </View>;
}

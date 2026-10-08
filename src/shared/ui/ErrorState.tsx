import { View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { useI18n } from '../i18n/useI18n';
import { Text } from './Text';
import { Button } from './Button';
export function ErrorState({ title, description, onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  const { colors, spacing, radius } = useTheme();
  const { t } = useI18n();
  return <View style={{ gap: spacing.md, padding: spacing.lg, borderRadius: radius.card, backgroundColor: colors.dangerSurface }}>
    <Text variant="heading" tone="danger" accessibilityRole="alert" accessibilityLiveRegion="assertive">{title ?? t('common.errorTitle')}</Text>
    <Text>{description ?? t('common.errorDescription')}</Text>
    {onRetry && <Button label={t('common.retry')} variant="secondary" onPress={onRetry} />}
  </View>;
}

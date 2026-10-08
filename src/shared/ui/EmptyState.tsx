import { View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Text } from './Text';
import { Button } from './Button';
export interface EmptyStateProps { title: string; description: string; action?: { label: string; onPress: () => void } }
export function EmptyState({ title, description, action }: EmptyStateProps) {
  const { colors, spacing, radius } = useTheme();
  return <View style={{ gap: spacing.md, padding: spacing.lg, borderRadius: radius.card, backgroundColor: colors.surface }}>
    <Text variant="heading" accessibilityRole="header">{title}</Text>
    <Text tone="muted">{description}</Text>
    {action && <Button label={action.label} onPress={action.onPress} />}
  </View>;
}

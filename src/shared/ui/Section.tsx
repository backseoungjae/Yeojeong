import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Text } from './Text';
export function Section({ title, children }: { title: string; children: ReactNode }) {
  const { spacing } = useTheme();
  return <View style={{ gap: spacing.md }}><Text variant="heading" accessibilityRole="header">{title}</Text>{children}</View>;
}

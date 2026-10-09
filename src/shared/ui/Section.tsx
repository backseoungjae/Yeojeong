import type { ReactNode, Ref } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Text } from './Text';
export function Section({ title, children, headingRef }: { title: string; children: ReactNode; headingRef?: Ref<View> }) {
  const { spacing } = useTheme();
  return <View style={{ gap: spacing.md }}><View ref={headingRef} accessible accessibilityRole="header" aria-level={2} accessibilityLabel={title}><Text variant="heading">{title}</Text></View>{children}</View>;
}

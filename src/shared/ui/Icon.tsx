import { Text } from 'react-native';
import { useTheme } from '../theme/useTheme';
const glyphs = { home: '⌂', explore: '◎', trips: '▤', settings: '⚙', back: '←', save: '♡', saved: '♥', check: '✓', plus: '+', close: '×', arrow: '→', up: '↑', down: '↓', more: '⋯' } as const;
export type IconName = keyof typeof glyphs;
export function Icon({ name, color }: { name: IconName; color?: string }) {
  const { colors } = useTheme();
  return <Text accessible={false} importantForAccessibility="no" aria-hidden style={{ color: color ?? colors.text, fontSize: 24, lineHeight: 32, textAlign: 'center' }}>{glyphs[name]}</Text>;
}

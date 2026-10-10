import { focusRing } from './focusRing';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Icon } from './Icon';
import { Text } from './Text';
export interface ChipProps { label: string; accessibilityLabel?: string; selected?: boolean; disabled?: boolean; onPress?: () => void }
export function Chip({ label, accessibilityLabel, selected = false, disabled = false, onPress }: ChipProps) {
  const { colors, spacing, radius, layout } = useTheme();
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ selected, disabled }} aria-pressed={selected} aria-disabled={disabled} disabled={disabled} onPress={onPress}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => ({ ...focusRing(focused, colors.focus, layout.focusWidth), minHeight: layout.touchTarget, maxWidth: '100%', justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderRadius: radius.pill, borderWidth: layout.focusWidth, borderColor: focused || selected ? colors.accent : colors.border,
      backgroundColor: disabled ? colors.disabledBackground : selected ? colors.selected : colors.surface, opacity: pressed ? 0.8 : 1 })}>
    {selected && <Icon name="check" color={colors.accent} />}
    <Text variant="label" style={{ flexShrink: 1, color: disabled ? colors.disabledText : colors.text }}>{label}</Text>
  </Pressable>;
}

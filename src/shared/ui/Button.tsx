import { focusRing } from './focusRing';
import { useState } from 'react';
import { ActivityIndicator, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useAccessibility } from '../accessibility/AccessibilityProvider';
import { useTheme } from '../theme/useTheme';
import { Text } from './Text';
export interface ButtonProps extends Omit<PressableProps, 'children' | 'style' | 'accessibilityRole' | 'accessibilityState'> {
  label: string;
  variant?: 'primary' | 'secondary';
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}
export function Button({ label, variant = 'primary', busy = false, disabled = false, style, ...props }: ButtonProps) {
  const { colors, spacing, radius, layout } = useTheme();
  const { reduceMotion } = useAccessibility();
  const [focused, setFocused] = useState(false);
  const unavailable = disabled || busy;
  const background = unavailable ? colors.disabledBackground : variant === 'primary' ? colors.accent : colors.surface;
  const foreground = unavailable ? colors.disabledText : variant === 'primary' ? colors.onAccent : colors.accent;
  return <Pressable {...props} disabled={unavailable} accessibilityRole="button" accessibilityLabel={props.accessibilityLabel ?? label}
    accessibilityState={{ disabled: unavailable, busy }} aria-disabled={unavailable} aria-busy={busy}
    onFocus={event => { setFocused(true); props.onFocus?.(event); }} onBlur={event => { setFocused(false); props.onBlur?.(event); }}
    style={({ pressed }) => [{ ...focusRing(focused, colors.focus, layout.focusWidth), minHeight: layout.touchTarget, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.control,
      borderWidth: layout.focusWidth, borderColor: focused ? variant === 'primary' ? colors.onAccent : colors.focus : variant === 'secondary' ? colors.border : background,
      backgroundColor: background, opacity: pressed ? 0.8 : 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }, style]}>
    {busy && !reduceMotion && <ActivityIndicator color={foreground} accessible={false} />}
    <Text variant="label" style={{ color: foreground, textAlign: 'center', flexShrink: 1 }}>{label}</Text>
  </Pressable>;
}

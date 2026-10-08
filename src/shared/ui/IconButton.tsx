import { focusRing } from './focusRing';
import { useState } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Icon, type IconName } from './Icon';
export interface IconButtonProps extends Omit<PressableProps, 'children' | 'style' | 'accessibilityRole' | 'accessibilityLabel' | 'accessibilityState'> {
  icon: IconName;
  label: string;
  selected?: boolean;
}
export function IconButton({ icon, label, selected, disabled = false, ...props }: IconButtonProps) {
  const { colors, layout, radius, spacing } = useTheme();
  const [focused, setFocused] = useState(false);
  return <Pressable {...props} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: Boolean(disabled), selected }} aria-disabled={Boolean(disabled)} aria-pressed={selected} disabled={disabled}
    onFocus={event => { setFocused(true); props.onFocus?.(event); }} onBlur={event => { setFocused(false); props.onBlur?.(event); }}
    style={({ pressed }) => ({ ...focusRing(focused, colors.focus, layout.focusWidth), minWidth: layout.touchTarget, minHeight: layout.touchTarget, padding: spacing.sm, borderRadius: radius.control,
      alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.selected : colors.surface,
      borderWidth: layout.focusWidth, borderColor: focused ? colors.focus : colors.border, opacity: pressed ? 0.8 : 1 })}>
    <Icon name={selected && icon === 'save' ? 'saved' : icon} color={disabled ? colors.disabledText : colors.accent} />
  </Pressable>;
}

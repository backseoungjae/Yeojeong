import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { useAccessibility } from '../accessibility/AccessibilityProvider';
import { Text } from '../ui/Text';
import { Icon, type IconName } from '../ui/Icon';
const icons: Record<string, IconName> = { index: 'home', explore: 'explore', trips: 'trips', settings: 'settings' };
export function AppTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { colors, spacing, layout, radius } = useTheme();
  const { fontScale } = useAccessibility();
  const [focused, setFocused] = useState<string | null>(null);
  return <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.sm,
    paddingLeft: insets.left + spacing.sm, paddingRight: insets.right + spacing.sm, backgroundColor: colors.surface, borderTopWidth: layout.borderWidth, borderColor: colors.border }}>
    {state.routes.map((route, index) => {
      const active = state.index === index;
      const options = descriptors[route.key].options;
      const label = options.title ?? route.name;
      return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={options.tabBarAccessibilityLabel ?? label} accessibilityState={{ selected: active }} aria-selected={active}
        onFocus={() => setFocused(route.key)} onBlur={() => setFocused(null)}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!active && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }} onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
        style={({ pressed }) => ({ width: fontScale > 1.4 ? '50%' : '25%', minHeight: layout.touchTarget, padding: spacing.sm, alignItems: 'center', gap: spacing.xs,
          borderWidth: layout.focusWidth, borderColor: focused === route.key ? colors.focus : 'transparent', borderRadius: radius.control,
          backgroundColor: active ? colors.selected : colors.surface, opacity: pressed ? 0.8 : 1 })}>
        <Icon name={icons[route.name] ?? 'home'} color={active ? colors.accent : colors.textMuted} />
        <Text variant="caption" style={{ textAlign: 'center', color: active ? colors.accent : colors.textMuted, fontWeight: active ? '700' : '400' }}>{label}</Text>
      </Pressable>;
    })}
  </View>;
}

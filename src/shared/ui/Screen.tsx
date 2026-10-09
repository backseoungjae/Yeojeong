import { useEffect, useRef, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import { useAccessibility } from '../accessibility/AccessibilityProvider';
export function Screen({ children, revealEnd = false }: { children: ReactNode; revealEnd?: boolean }) {
  const { colors, spacing, layout } = useTheme();
  const { reduceMotion } = useAccessibility();
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (!revealEnd) return;
    const frame = requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: !reduceMotion }));
    return () => cancelAnimationFrame(frame);
  }, [revealEnd, reduceMotion]);
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: spacing.lg }}>
      <View style={{ width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center', gap: spacing.lg }}>{children}</View>
    </ScrollView>
  </SafeAreaView>;
}

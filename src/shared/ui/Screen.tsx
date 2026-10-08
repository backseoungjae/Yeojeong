import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
export function Screen({ children }: { children: ReactNode }) {
  const { colors, spacing, layout } = useTheme();
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: spacing.lg }}>
      <View style={{ width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center', gap: spacing.lg }}>{children}</View>
    </ScrollView>
  </SafeAreaView>;
}

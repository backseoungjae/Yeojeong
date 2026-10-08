import { useEffect, useState } from 'react';
import { Animated, Platform, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { useAccessibility } from '../accessibility/AccessibilityProvider';
import { useI18n } from '../i18n/useI18n';
export function Skeleton() {
  const { colors, spacing, radius, motion } = useTheme();
  const { reduceMotion } = useAccessibility();
  const { t } = useI18n();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduceMotion) { opacity.setValue(1); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.45, duration: motion.skeleton, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(opacity, { toValue: 1, duration: motion.skeleton, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    animation.start();
    return () => { animation.stop(); opacity.setValue(1); };
  }, [reduceMotion, opacity, motion.skeleton]);
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={t('common.loading')} accessibilityState={{ busy: true }} aria-busy>
    <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ opacity, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.card, gap: spacing.sm }}>
      <View style={{ height: 96, backgroundColor: colors.skeleton, borderRadius: radius.control }} />
      <View style={{ height: 20, width: '80%', backgroundColor: colors.skeleton, borderRadius: radius.control }} />
      <View style={{ height: 20, width: '55%', backgroundColor: colors.skeleton, borderRadius: radius.control }} />
    </Animated.View>
  </View>;
}

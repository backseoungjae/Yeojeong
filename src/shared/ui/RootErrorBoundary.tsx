import { useFocusRegion } from '../accessibility/useFocusRegion';
import { useEffect, useState } from 'react';
import type { ErrorBoundaryProps } from 'expo-router';
import { useLocales } from 'expo-localization';
import { Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { initialLanguage } from '../i18n/format';
import { translate } from '../i18n/translate';
import { colors, spacing, typography, layout, radius } from '../theme/tokens';
import { logEvent } from '../observability/structuredLog';
// 루트 Provider 자체의 오류도 처리하므로 DB/앱 설정 Context에 의존하지 않는다.
export function RootErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const focus = useFocusRegion();
  const [focused, setFocused] = useState<string>();
  const locales = useLocales();
  const [language, setLanguage] = useState(() => initialLanguage(locales[0]?.languageTag));
  const [busy, setBusy] = useState(false);
  const scheme = useColorScheme();
  const palette = colors[scheme === 'dark' ? 'dark' : 'light'];
  useEffect(() => { logEvent('render_failure','root','render'); }, [error]);
  const recover = async () => { if (busy) return; setBusy(true); logEvent('recovery_retry','root','render'); try { await retry(); } finally { setBusy(false); } };
  return <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.lg, justifyContent: 'center', backgroundColor: palette.background }}>
    <View style={{ width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center', gap: spacing.lg }}>
      <View ref={focus} accessible accessibilityRole="alert" accessibilityLabel={translate(language,'recovery.title')}><Text accessibilityRole="alert" accessibilityLiveRegion="assertive" allowFontScaling style={{ ...typography.heading, color: palette.text }}>{translate(language,'recovery.title')}</Text></View>
      <Text allowFontScaling style={{ ...typography.body, color: palette.text }}>{translate(language,'recovery.description')}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={translate(language,'common.retry')} accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={() => void recover()} onFocus={() => setFocused('retry')} onBlur={() => setFocused(undefined)}
        style={{ minHeight: layout.touchTarget, padding: spacing.md, backgroundColor: palette.accent, borderWidth: layout.focusWidth, borderColor: focused === 'retry' ? palette.onAccent : palette.accent, borderRadius: radius.control }}>
        <Text allowFontScaling style={{ ...typography.label, color: palette.onAccent, textAlign: 'center' }}>{translate(language,'common.retry')}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={translate(language,language === 'ko' ? 'settings.english' : 'settings.korean')} onPress={() => setLanguage(value => value === 'ko' ? 'en' : 'ko')} onFocus={() => setFocused('language')} onBlur={() => setFocused(undefined)}
        style={{ minHeight: layout.touchTarget, padding: spacing.md, borderWidth: layout.focusWidth, borderColor: focused === 'language' ? palette.focus : palette.border, borderRadius: radius.control }}>
        <Text allowFontScaling style={{ ...typography.label, color: palette.text, textAlign: 'center' }}>{translate(language,language === 'ko' ? 'settings.english' : 'settings.korean')}</Text>
      </Pressable>
    </View>
  </ScrollView>;
}

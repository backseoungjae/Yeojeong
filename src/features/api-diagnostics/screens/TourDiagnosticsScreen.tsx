import { Image } from 'expo-image';
import { useState } from 'react';
import { useI18n } from '@/shared/i18n/useI18n';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { diagnosticsMessages, formatDiagnosticNumber, interpolate, diagnosticCheckLabel } from '@/shared/i18n/diagnostics';
import type { ContentLanguage } from '@/shared/models/place';
import { useTourDiagnostics } from '../hooks/useTourDiagnostics';

function ImageSample({ url, name, language }: { url: string; name: string; language: ContentLanguage }) {
  const [state, setState] = useState<'imageLoading' | 'imageLoaded' | 'imageFailed'>('imageLoading');
  const t = diagnosticsMessages[language];
  return <View style={styles.section}>
    <Image source={{ uri: url }} contentFit="contain" transition={0} style={styles.image} accessible accessibilityLabel={interpolate(t.image, { name, source: '한국관광공사 TourAPI' })} onLoad={() => setState('imageLoaded')} onError={() => setState('imageFailed')} />
    <ThemedText accessibilityLiveRegion="polite">{t[state]}</ThemedText>
  </View>;
}
export default function TourDiagnosticsScreen() {
  const { language, setLanguage } = useI18n();
  const t = diagnosticsMessages[language];
  const theme = useTheme();
  const { results, state, run, cancel, configuration } = useTourDiagnostics();
  return <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
    <FlatList data={results} keyExtractor={item => `${item.language}:${item.check}`} contentContainerStyle={styles.content}
      ListHeaderComponent={<View style={styles.section}>
        <ThemedText type="title" accessibilityRole="header">{t.title}</ThemedText>
        <ThemedText>{t.intro}</ThemedText>
        <View style={styles.actions}>{(['ko','en'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={interpolate(t.languageLabel, { label: t.language, language: t[value] })} accessibilityState={{ selected: language === value }} onPress={() => setLanguage(value)} style={[styles.button, { backgroundColor: language === value ? theme.backgroundSelected : theme.backgroundElement }]}><ThemedText>{t[value]}</ThemedText></Pressable>)}</View>
        {configuration.map(item => <ThemedText key={item.language}>{item.language === 'ko' ? 'KorService2' : 'EngService2'}: {item.configured ? t.configured : t.missing}</ThemedText>)}
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: state === 'running' }} disabled={state === 'running'} onPress={run} style={[styles.button, { backgroundColor: theme.backgroundElement }]}><ThemedText>{t.run}</ThemedText></Pressable>
          {state === 'running' && <Pressable accessibilityRole="button" onPress={cancel} style={[styles.button, { backgroundColor: theme.backgroundElement }]}><ThemedText>{t.cancel}</ThemedText></Pressable>}
        </View>
        <ThemedText accessibilityLiveRegion="polite">{t[state]}</ThemedText>
        <ThemedText>{t.manual}</ThemedText>
      </View>}
      renderItem={({ item }) => {
        const sample = item.places?.find(place => place.imageUrl);
        const imageUrl = item.images?.[0]?.url ?? sample?.imageUrl;
        const errorText = item.error ? t[item.error.kind] : t.error;
        return <ThemedView type="backgroundElement" style={styles.result}>
          <ThemedText type="smallBold">{item.language} · {diagnosticCheckLabel(item.check, language)} · {item.endpoint}</ThemedText>
          <ThemedText>{t[item.state]}</ThemedText>
          {item.error && <ThemedText>{interpolate(t.errorSummary, { reason: errorText, code: item.error.code ?? item.error.status ?? '—' })}</ThemedText>}
          {item.evidence && <>
            <ThemedText>{interpolate(t.summary, { received: formatDiagnosticNumber(item.evidence.received, language), total: formatDiagnosticNumber(item.evidence.total, language), status: item.evidence.status, code: item.evidence.resultCode })}</ThemedText>
            <ThemedText type="small">{t.fields}: {item.evidence.fields.join(', ')}</ThemedText>
            <ThemedText type="small">{t.evidence}: {JSON.stringify({ ids: item.evidence.ids, types: item.evidence.types, codes: item.evidence.codes, emptyFields: item.evidence.emptyFields, classifications: item.evidence.classifications, matchesRequestedClassification: item.evidence.matchesRequestedClassification, imageSchemes: item.evidence.imageSchemes })}</ThemedText>
          </>}
          {imageUrl ? <ImageSample key={imageUrl} url={imageUrl} name={sample?.name ?? diagnosticCheckLabel(item.check, language)} language={language} /> : item.state === 'ok' && <ThemedText type="small">{t.imageMissing}</ThemedText>}
        </ThemedView>;
      }} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1 }, content: { padding: Spacing.three, gap: Spacing.three, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  section: { gap: Spacing.three }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  button: { minHeight: 48, minWidth: 48, padding: Spacing.three, borderRadius: Spacing.two, justifyContent: 'center' },
  result: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.two }, image: { width: '100%', height: 200 },
});

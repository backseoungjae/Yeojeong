import { useLibrary } from '@/features/library/hooks/LibraryProvider';
import { router } from 'expo-router';
import { useI18n } from '@/shared/i18n/useI18n';
import { useAccessibility } from '@/shared/accessibility/AccessibilityProvider';
import { Screen } from '@/shared/ui/Screen';
import { AppearanceControls } from '@/shared/ui/AppearanceControls';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
export default function SettingsScreen() {
  const { t, formatNumber } = useI18n();
  const { store, historyBusy, historyError } = useLibrary();
  const { fontScale, reduceMotion, screenReader } = useAccessibility();
  return <Screen>
    <AppearanceControls />
    <Text variant="caption" tone="muted">{t('settings.session')}</Text>
    <Section title={t('local.historySettings')}>
      <Button label={t('local.clearRecent')} variant="secondary" disabled={historyBusy} onPress={() => void store.clearRecent()} />
      <Button label={t('local.clearSearches')} variant="secondary" disabled={historyBusy} onPress={() => void store.clearSearches()} />
      {historyError && <Text tone="danger" accessibilityRole="alert">{t('local.historyError')}</Text>}
    </Section>
    <Section title={t('settings.accessibility')}>
      <Text>{t('settings.fontScale', { value: formatNumber(fontScale, { maximumFractionDigits: 2 }) })}</Text>
      <Text>{t(reduceMotion ? 'settings.motionOn' : 'settings.motionOff')}</Text>
      <Text>{t(screenReader === null ? 'settings.readerUnknown' : screenReader ? 'settings.readerOn' : 'settings.readerOff')}</Text>
    </Section>
    {__DEV__ && <Section title={t('dev.title')}>
      <Button label={t('dev.gallery')} variant="secondary" onPress={() => router.push('/dev/gallery')} />
      <Button label={t('dev.api')} variant="secondary" onPress={() => router.push('/dev/api')} />
    </Section>}
  </Screen>;
}

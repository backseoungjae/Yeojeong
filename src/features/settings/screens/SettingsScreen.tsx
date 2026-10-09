import { useRef } from 'react';
import { Platform, View } from 'react-native';
import { ConfirmationPanel } from '@/shared/ui/ConfirmationPanel';
import { useSettings } from '../hooks/useSettings';
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
  const settings = useSettings();
  const deleteButton = useRef<View>(null);
  const { fontScale, reduceMotion, screenReader } = useAccessibility();
  return <Screen revealEnd={settings.confirming}>
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
    <Section title={t('settings.about')}>
      <Text>{t('settings.version', { value: settings.version })}</Text>
      <Text>{t('settings.sourceInfo')}</Text>
      <Button label={t('settings.openSource')} variant="secondary" onPress={() => void settings.openInformation('source')} />
      <Text>{t('settings.imageInfo')}</Text>
      <Button label={t('settings.openImages')} variant="secondary" onPress={() => void settings.openInformation('images')} />
      {settings.linkError && <Text tone="danger" accessibilityRole="alert">{t('place.linkFailed')}</Text>}
    </Section>
    <Section title={t('settings.localData')}>
      <Text>{t('settings.deleteScope')}</Text>
      <Text>{t(Platform.OS === 'web' ? 'settings.webCacheScope' : 'settings.nativeCacheScope')}</Text>
      <Button ref={deleteButton} label={t('settings.deleteAll')} variant="secondary" onPress={() => settings.setConfirming(true)} />
      {settings.error && <Text tone="danger" accessibilityRole="alert">{t('settings.deleteFailed')}</Text>}
      {settings.completed && <Text accessibilityRole="alert" accessibilityLiveRegion="polite">{t('settings.deleted')}</Text>}
    </Section>
    {__DEV__ && <Section title={t('dev.title')}>
      <Button label={t('dev.gallery')} variant="secondary" onPress={() => router.push('/dev/gallery')} />
      <Button label={t('dev.recovery')} variant="secondary" onPress={() => router.push('/dev/error')} />
      <Button label={t('dev.api')} variant="secondary" onPress={() => router.push('/dev/api')} />
    </Section>}
    {settings.confirming && <ConfirmationPanel returnTarget={deleteButton} title={t('settings.deleteTitle')} description={t('settings.deleteConfirm', settings.counts)}>
      <Text>{t('settings.deleteScope')}</Text>
      <Text>{t(Platform.OS === 'web' ? 'settings.webCacheScope' : 'settings.nativeCacheScope')}</Text>
      <Button label={t('trip.cancel')} onPress={() => settings.setConfirming(false)} />
      <Button label={t('settings.confirmDelete')} variant="secondary" onPress={settings.deleteData} />
    </ConfirmationPanel>}
  </Screen>;
}

import { View } from 'react-native';
import { useAppSettings } from '../settings/AppSettingsProvider';
import { useI18n } from '../i18n/useI18n';
import { useTheme } from '../theme/useTheme';
import { Chip } from './Chip';
import { Section } from './Section';
import { Text } from './Text';
export function AppearanceControls() {
  const { language, setLanguage, resolvedTheme, setThemeMode, settingsBusy, settingsError } = useAppSettings();
  const { t } = useI18n();
  const { spacing } = useTheme();
  const choices = { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } as const;
  return <>
    <Section title={t('settings.language')}><View style={choices}>
      <Chip disabled={settingsBusy} label={t('settings.korean')} selected={language === 'ko'} onPress={() => setLanguage('ko')} />
      <Chip disabled={settingsBusy} label={t('settings.english')} selected={language === 'en'} onPress={() => setLanguage('en')} />
    </View></Section>
    <Section title={t('settings.theme')}><View style={choices}>
      {(['light', 'dark'] as const).map(mode => <Chip disabled={settingsBusy} key={mode} label={t(`settings.${mode}`)} selected={resolvedTheme === mode} onPress={() => setThemeMode(mode)} />)}
    </View><Text tone="muted">{t('settings.themeDefault')}</Text></Section>
    {settingsError && <Text tone="danger" accessibilityRole="alert">{t('local.settingsError')}</Text>}
  </>;
}

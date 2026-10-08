import { View } from 'react-native';
import { useAppSettings } from '../settings/AppSettingsProvider';
import { useI18n } from '../i18n/useI18n';
import { useTheme } from '../theme/useTheme';
import { Chip } from './Chip';
import { Section } from './Section';
import { Text } from './Text';
export function AppearanceControls() {
  const { language, setLanguage, resolvedTheme, setThemeMode } = useAppSettings();
  const { t } = useI18n();
  const { spacing } = useTheme();
  const choices = { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } as const;
  return <>
    <Section title={t('settings.language')}><View style={choices}>
      <Chip label={t('settings.korean')} selected={language === 'ko'} onPress={() => setLanguage('ko')} />
      <Chip label={t('settings.english')} selected={language === 'en'} onPress={() => setLanguage('en')} />
    </View></Section>
    <Section title={t('settings.theme')}><View style={choices}>
      {(['light', 'dark'] as const).map(mode => <Chip key={mode} label={t(`settings.${mode}`)} selected={resolvedTheme === mode} onPress={() => setThemeMode(mode)} />)}
    </View><Text tone="muted">{t('settings.themeDefault')}</Text></Section>
  </>;
}

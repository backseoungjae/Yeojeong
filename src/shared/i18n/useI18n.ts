import { useAppSettings } from '../settings/AppSettingsProvider';
import { translate, type TranslationKey, type TranslationValues } from './translate';
import { formatDate, formatNumber, formatTimestamp } from './format';
export function useI18n() {
  const { language, setLanguage } = useAppSettings();
  return {
    language, setLanguage,
    t: (key: TranslationKey, values?: TranslationValues) => translate(language, key, values),
    formatDate: (value: string) => formatDate(value, language),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => formatNumber(value, language, options),
    formatTimestamp: (value: Date | number) => formatTimestamp(value, language),
  };
}

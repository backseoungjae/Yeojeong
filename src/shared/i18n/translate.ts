import type { ContentLanguage } from '../models/place.ts';
import { formatNumber, locales } from './format.ts';
import { messages, type MessageKey } from './messages.ts';
export type TranslationKey = MessageKey | 'gallery.count';
export type TranslationValues = Record<string, string | number>;
export function translate(language: ContentLanguage, key: TranslationKey, values: TranslationValues = {}) {
  let resolved: MessageKey;
  if (key === 'gallery.count') {
    if (typeof values.count !== 'number') throw new TypeError('Plural count must be numeric');
    resolved = new Intl.PluralRules(locales[language]).select(values.count) === 'one' ? 'gallery.count_one' : 'gallery.count_other';
  } else resolved = key;
  return messages[language][resolved].replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = values[name];
    if (value === undefined) throw new TypeError('Missing translation interpolation');
    return typeof value === 'number' ? formatNumber(value, language) : value;
  });
}

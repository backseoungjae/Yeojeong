import { useLocales } from 'expo-localization';
import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { initialLanguage } from '../i18n/format';
import type { ContentLanguage } from '../models/place';
import { colors, resolveTheme, type ThemeMode, type ResolvedTheme } from '../theme/tokens';
interface AppSettings {
  language: ContentLanguage;
  setLanguage: (language: ContentLanguage) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  resolvedTheme: ResolvedTheme;
  colors: typeof colors.light | typeof colors.dark;
}
const subscribeHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const SettingsContext = createContext<AppSettings | null>(null);
export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const locales = useLocales();
  const hydrated = useSyncExternalStore(subscribeHydration, clientReady, serverReady);
  const systemTheme = useColorScheme();
  const [chosenLanguage, setLanguage] = useState<ContentLanguage | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const language = chosenLanguage ?? initialLanguage(hydrated ? locales[0]?.languageTag : 'en');
  const resolvedTheme = resolveTheme(themeMode, systemTheme);
  return <SettingsContext.Provider value={{ language, setLanguage, themeMode, setThemeMode, resolvedTheme, colors: colors[resolvedTheme] }}>{children}</SettingsContext.Provider>;
}
export function useAppSettings() {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error('AppSettingsProvider is required');
  return settings;
}

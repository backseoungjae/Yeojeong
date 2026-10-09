import { useLibrary } from '@/features/library/hooks/LibraryProvider';
import { useLocales } from 'expo-localization';
import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
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
  settingsBusy: boolean;
  settingsError: boolean;
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
  const { preferences, store, settingsBusy, settingsError } = useLibrary();
  const chosenLanguage = preferences.language;
  const themeMode: ThemeMode = preferences.theme ?? 'system';
  const setLanguage = (language: ContentLanguage) => { void store.setLanguage(language); };
  const setThemeMode = (mode: ThemeMode) => { if (mode !== 'system') void store.setTheme(mode); };
  const language = chosenLanguage ?? initialLanguage(hydrated ? locales[0]?.languageTag : 'en');
  const resolvedTheme = resolveTheme(themeMode, systemTheme);
  return <SettingsContext.Provider value={{ language, setLanguage, themeMode, setThemeMode, resolvedTheme, settingsBusy, settingsError, colors: colors[resolvedTheme] }}>{children}</SettingsContext.Provider>;
}
export function useAppSettings() {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error('AppSettingsProvider is required');
  return settings;
}

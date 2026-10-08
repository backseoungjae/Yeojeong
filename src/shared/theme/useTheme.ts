import { useAppSettings } from '../settings/AppSettingsProvider';
import { spacing, radius, typography, motion, layout } from './tokens';
export function useTheme() {
  const { colors, resolvedTheme, themeMode, setThemeMode } = useAppSettings();
  return { colors, resolvedTheme, themeMode, setThemeMode, spacing, radius, typography, motion, layout };
}

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { LibraryProvider } from '@/features/library/hooks/LibraryProvider';
import { LibraryGate } from '@/features/library/components/LibraryGate';
import { PlaceDetailProvider } from '@/features/places/hooks/PlaceDetailProvider';
import { ExploreProvider } from '@/features/explore/hooks/ExploreProvider';
import { StatusBar } from 'expo-status-bar';
import { AppSettingsProvider } from '@/shared/settings/AppSettingsProvider';
import { AccessibilityProvider, useAccessibility } from '@/shared/accessibility/AccessibilityProvider';
import { useTheme } from '@/shared/theme/useTheme';
import { useI18n } from '@/shared/i18n/useI18n';
import { AppHeader } from '@/shared/navigation/AppHeader';
function Navigation() {
  const { colors, resolvedTheme } = useTheme();
  const { reduceMotion } = useAccessibility();
  const { t } = useI18n();
  const base = resolvedTheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = { ...base, colors: { ...base.colors, background: colors.background, card: colors.surface, text: colors.text, primary: colors.accent, border: colors.border, notification: colors.danger } };
  return <ThemeProvider value={navigationTheme}>
    <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, animation: reduceMotion ? 'none' : 'default', header: ({ options }) => <AppHeader title={options.title ?? t('app.name')} back /> }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="places/[placeId]" options={{ title: t('place.title') }} />
      <Stack.Screen name="trips/new" options={{ title: t('trip.createTitle') }} />
      <Stack.Screen name="trips/[tripId]" options={{ title: t('trip.detailTitle') }} />
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="dev/gallery" options={{ title: t('gallery.title') }} />
        <Stack.Screen name="dev/api" options={{ title: t('dev.api') }} />
      </Stack.Protected>
    </Stack>
  </ThemeProvider>;
}
export default function RootLayout() {
  return <LibraryProvider><AppSettingsProvider><AccessibilityProvider><LibraryGate><ExploreProvider><PlaceDetailProvider><Navigation /></PlaceDetailProvider></ExploreProvider></LibraryGate></AccessibilityProvider></AppSettingsProvider></LibraryProvider>;
}

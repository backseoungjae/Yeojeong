import { Tabs } from 'expo-router/js-tabs';
import { useI18n } from '@/shared/i18n/useI18n';
import { AppHeader } from '@/shared/navigation/AppHeader';
import { AppTabBar } from '@/shared/navigation/AppTabBar';
export default function TabLayout() {
  const { t } = useI18n();
  return <Tabs tabBar={props => <AppTabBar {...props} />} screenOptions={{ animation: 'none', header: ({ options }) => <AppHeader title={typeof options.headerTitle === 'string' ? options.headerTitle : options.title ?? t('app.name')} /> }}>
    <Tabs.Screen name="index" options={{ title: t('tabs.home'), headerTitle: t('app.name'), tabBarAccessibilityLabel: t('tabs.home') }} />
    <Tabs.Screen name="explore" options={{ title: t('tabs.explore'), tabBarAccessibilityLabel: t('tabs.explore') }} />
    <Tabs.Screen name="trips" options={{ title: t('tabs.trips'), tabBarAccessibilityLabel: t('tabs.trips') }} />
    <Tabs.Screen name="settings" options={{ title: t('tabs.settings'), tabBarAccessibilityLabel: t('tabs.settings') }} />
  </Tabs>;
}

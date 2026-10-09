import { useState } from 'react';
import { View } from 'react-native';
import { Chip } from '@/shared/ui/Chip';
import { useTheme } from '@/shared/theme/useTheme';
import { SavedPlacesList } from '@/features/library/components/SavedPlacesList';
import { router } from 'expo-router';
import { useI18n } from '@/shared/i18n/useI18n';
import { Screen } from '@/shared/ui/Screen';
import { Text } from '@/shared/ui/Text';
import { EmptyState } from '@/shared/ui/EmptyState';
export default function TripsScreen() {
  const { t } = useI18n();
  const { spacing } = useTheme();
  const [section, setSection] = useState<'trips' | 'saved'>('trips');
  const tabs = <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
    <Chip label={t('local.tripsSection')} selected={section === 'trips'} onPress={() => setSection('trips')} />
    <Chip label={t('local.savedPlaces')} selected={section === 'saved'} onPress={() => setSection('saved')} />
  </View>;
  if (section === 'saved') return <SavedPlacesList tabs={tabs} />;
  return <Screen>{tabs}
    <Text variant="title" accessibilityRole="header">{t('trips.title')}</Text>
    <Text tone="muted">{t('trips.description')}</Text>
    <EmptyState title={t('trips.emptyTitle')} description={t('trips.emptyDescription')} action={{ label: t('trips.create'), onPress: () => router.push('/trips/new') }} />
  </Screen>;
}

import { router } from 'expo-router';
import { useI18n } from '@/shared/i18n/useI18n';
import { formatDate } from '@/shared/i18n/format';
import { Section } from '@/shared/ui/Section';
import { Button } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useTrips } from '../hooks/TripsProvider';
import { useTripToday } from '../hooks/useTripToday';
import { tripStatus } from '../services/tripRules';
export function TripList() {
  const { t, language } = useI18n();
  const { trips, items } = useTrips();
  const today = useTripToday();
  return <>
    <Button label={t('trips.create')} onPress={() => router.push('/trips/new')} />
    {!trips.length && <EmptyState title={t('trips.emptyTitle')} description={t('trip.noTripsHint')} />}
    {(['ongoing','upcoming','past'] as const).map(status => {
      const values = trips.filter(trip => tripStatus(trip, today) === status);
      if (status === 'past') values.reverse();
      return <Section key={status} title={t(`trip.status.${status}`)}>
        {!values.length && <Text tone="muted">{t('trip.noStatusTrips')}</Text>}
        {values.map(trip => <Section key={trip.id} title={trip.name}>
          <Text>{t('trip.dateRange', { start: formatDate(trip.startDate, language), end: formatDate(trip.endDate, language) })}</Text>
          <Text>{t('trip.itemCount', { count: items.filter(item => item.tripId === trip.id).length })}</Text>
          <Button label={t('trip.openName', { name: trip.name })} variant="secondary" onPress={() => router.push({ pathname: '/trips/[tripId]', params: { tripId: trip.id } })} />
        </Section>)}
      </Section>;
    })}
  </>;
}

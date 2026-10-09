import { router } from 'expo-router';
import type { Place } from '@/shared/models/place';
import { useI18n } from '@/shared/i18n/useI18n';
import { formatDate } from '@/shared/i18n/format';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { useItineraryAddition } from '../hooks/useItineraryAddition';
import { TripFeedback } from './TripFeedback';
export function AddPlaceToTrip({ place, initialTripId }: { place: Place; initialTripId?: string }) {
  const { t, language } = useI18n();
  const flow = useItineraryAddition(place, initialTripId);
  if (!flow.open) return <Button label={t('place.addToTrip')} accessibilityLabel={t('trip.addPlaceName', { name: place.name })} variant="secondary" onPress={flow.begin} />;
  return <Section title={t('trip.chooseTrip')}>
    {!flow.trips.length && <Text>{t('trip.noTripsForAddition')}</Text>}
    {flow.trips.map(trip => <Chip key={trip.id} label={t('trip.tripChoice', { name: trip.name, start: formatDate(trip.startDate, language), end: formatDate(trip.endDate, language) })}
      selected={trip.id === flow.trip?.id} disabled={flow.busy} onPress={() => flow.select(trip.id)} />)}
    <Button label={t('trips.create')} variant="secondary" disabled={flow.busy} onPress={flow.create} />
    {flow.trip && <>
      <TextField label={t('trip.chooseDate')} hint={t('trip.dateRange', { start: formatDate(flow.trip.startDate, language), end: formatDate(flow.trip.endDate, language) })}
        value={flow.date} autoCapitalize="none" editable={!flow.busy} onChangeText={flow.setDate} />
      <Text variant="caption">{t('trip.isoHint')}</Text>
      <Button label={t('trip.confirmAddition')} busy={flow.busy} disabled={flow.added} onPress={() => void flow.add()} />
    </>}
    <TripFeedback error={flow.error} />
    {flow.added && <Text accessibilityRole="alert" accessibilityLiveRegion="polite">{t('trip.added')}</Text>}
    {flow.added && flow.trip && <Button label={t('trip.viewTrip')} variant="secondary" onPress={() => router.push({ pathname: '/trips/[tripId]', params: { tripId: flow.trip?.id ?? '' } })} />}
    <Button label={t('trip.closeAddition')} variant="secondary" disabled={flow.busy} onPress={flow.close} />
  </Section>;
}

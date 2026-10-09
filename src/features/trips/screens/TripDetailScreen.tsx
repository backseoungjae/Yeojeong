import { ConfirmationPanel } from '@/shared/ui/ConfirmationPanel';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useI18n } from '@/shared/i18n/useI18n';
import { formatDate } from '@/shared/i18n/format';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useTripDetail } from '../hooks/useTripDetail';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { useTripToday } from '../hooks/useTripToday';
import { dayNumber, tripStatus } from '../services/tripRules';
import { TripFeedback } from '../components/TripFeedback';
import { DiscardConfirmation } from '../components/DiscardConfirmation';
import { ItineraryCard } from '../components/ItineraryCard';
export default function TripDetailScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const { t, language } = useI18n();
  const state = useTripDetail(typeof tripId === 'string' ? tripId : '');
  const guard = useUnsavedChanges(state.dirty, state.discard);
  const today = useTripToday();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const deleteButton = useRef<View>(null);
  const trip = state.trip;
  if (!trip) return <Screen><EmptyState title={t(deleted ? 'trip.deleted' : 'trip.notFound')} description={t(deleted ? 'trip.deleteCompleteHint' : 'trip.error.missing')}
    action={{ label: t('trip.backToTrips'), onPress: () => router.replace('/trips') }} /></Screen>;
  return <Screen revealEnd={guard.confirming || confirmDelete}>
    <Text variant="title" accessibilityRole="header">{trip.name}</Text>
    <Text>{t(`trip.status.${tripStatus(trip, today)}`)}</Text>
    <Text>{t('trip.dateRange', { start: formatDate(trip.startDate, language), end: formatDate(trip.endDate, language) })}</Text>
    <Button label={t('trip.editTitle')} variant="secondary" disabled={state.busy} onPress={() => guard.request(() => router.push({ pathname: '/trips/edit/[tripId]', params: { tripId: trip.id } }))} />
    <Section title={t('trip.dayHeading', { day: dayNumber(trip.startDate, state.date), date: formatDate(state.date, language) })}>
      <Button label={t('trip.previousDay')} variant="secondary" disabled={state.busy || state.date === trip.startDate} onPress={() => guard.request(() => state.shiftDay(-1))} />
      <Button label={t('trip.nextDay')} variant="secondary" disabled={state.busy || state.date === trip.endDate} onPress={() => guard.request(() => state.shiftDay(1))} />
      <TextField label={t('trip.viewDate')} hint={t('trip.isoHint')} value={state.dateInput} autoCapitalize="none" editable={!state.busy} onChangeText={state.setDateInput} />
      <Button label={t('trip.goDate')} variant="secondary" disabled={state.busy} onPress={() => guard.request(state.selectDate)} />
      {!state.dayItems.length && <EmptyState title={t('trip.emptyDay')} description={t('trip.emptyDayHint')} />}
      {state.dayItems.map(item => <ItineraryCard key={item.id} item={item} total={state.dayItems.length} draft={state.drafts[item.id] ?? item.memo} busy={state.busy}
        onMemo={value => state.setMemo(item.id, value)} onSaveMemo={() => void state.saveMemo(item.id)}
        onDiscardMemo={() => state.discardMemo(item.id)}
        onMove={direction => void state.reorder(item.id, direction)}
        onRemove={() => guard.request(() => void state.removeItem(item.id))}
        onOpen={() => guard.request(() => router.push({ pathname: '/places/[placeId]', params: { placeId: item.place.id } }))} />)}
    </Section>
    <TripFeedback error={state.error} />
    {state.notice && <Text accessibilityRole="alert" accessibilityLiveRegion="polite">{t(`trip.${state.notice}`)}</Text>}
    <Button label={t('home.explore')} variant="secondary" disabled={state.busy} onPress={() => guard.request(() => router.navigate('/explore'))} />
    <Button ref={deleteButton} label={t('trip.deleteTrip')} variant="secondary" disabled={state.busy} onPress={() => guard.request(() => setConfirmDelete(true))} />
    {confirmDelete && <ConfirmationPanel returnTarget={deleteButton} title={t('trip.deleteTitle')} description={t('trip.deleteDescription', { name: trip.name, count: state.tripItems.length })}>
      <Button label={t('trip.confirmDelete')} busy={state.busy} onPress={() => void state.store.deleteTrip(trip.id).then(success => { if (success) setDeleted(true); })} />
      <Button label={t('trip.cancel')} variant="secondary" disabled={state.busy} onPress={() => setConfirmDelete(false)} />
    </ConfirmationPanel>}
    {guard.confirming && <DiscardConfirmation confirm={guard.confirm} cancel={guard.cancel} />}
  </Screen>;
}

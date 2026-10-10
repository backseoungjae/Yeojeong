import { ConfirmationPanel } from '@/shared/ui/ConfirmationPanel';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useI18n } from '@/shared/i18n/useI18n';
import { formatDate } from '@/shared/i18n/format';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';
import { DateField } from '@/shared/ui/DateField';
import { useTheme } from '@/shared/theme/useTheme';
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
  const { spacing } = useTheme();
  const state = useTripDetail(typeof tripId === 'string' ? tripId : '');
  const guard = useUnsavedChanges(state.dirty, state.discard);
  const today = useTripToday();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [orderDate, setOrderDate] = useState<string | null>(null);
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
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button label={t('trip.previousDay')} variant="secondary" style={{ flex: 1 }} disabled={state.busy || state.date === trip.startDate} onPress={() => guard.request(() => { setOrderDate(null); state.shiftDay(-1); })} />
        <Button label={t('trip.nextDay')} variant="secondary" style={{ flex: 1 }} disabled={state.busy || state.date === trip.endDate} onPress={() => guard.request(() => { setOrderDate(null); state.shiftDay(1); })} />
      </View>
      <DateField label={t('trip.viewDate')} value={state.date} minDate={trip.startDate} maxDate={trip.endDate} disabled={state.busy} onChange={date => guard.request(() => { setOrderDate(null); state.selectDate(date); })} />
      {!state.dayItems.length && <EmptyState title={t('trip.emptyDay')} description={t('trip.emptyDayHint')} />}
      {state.dayItems.length > 1 && <Button label={t(orderDate === state.date ? 'trip.finishOrder' : 'trip.editOrder')} selected={orderDate === state.date} variant="secondary" disabled={state.busy} onPress={() => setOrderDate(previous => previous === state.date ? null : state.date)} />}
      {state.dayItems.map(item => <ItineraryCard key={`${state.date}:${item.id}`} item={item} total={state.dayItems.length} editingOrder={orderDate === state.date && state.dayItems.length > 1} draft={state.drafts[item.id] ?? item.memo} busy={state.busy}
        onMemo={value => state.setMemo(item.id, value)} onSaveMemo={() => state.saveMemo(item.id)}
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

import { useEffect } from 'react';
import { router } from 'expo-router';
import { Screen } from '@/shared/ui/Screen';
import { Section } from '@/shared/ui/Section';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useI18n } from '@/shared/i18n/useI18n';
import { formatDate } from '@/shared/i18n/format';
import { useTripEditor } from '../hooks/useTripEditor';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { useTrips } from '../hooks/TripsProvider';
import { DiscardConfirmation } from './DiscardConfirmation';
import { TripFeedback } from './TripFeedback';
export function TripEditor({ tripId, returnPlaceId, returnFlowId }: { tripId?: string; returnPlaceId?: string; returnFlowId?: string }) {
  const { t, language } = useI18n();
  const editor = useTripEditor(tripId);
  const guard = useUnsavedChanges(editor.dirty, editor.discard);
  const { store } = useTrips();
  useEffect(() => {
    const id = editor.completedId;
    if (!id) return;
    if (returnPlaceId) {
      if (returnFlowId) store.selectCreatedTrip(returnFlowId, id);
      if (router.canGoBack()) router.back();
      else router.replace({ pathname: '/places/[placeId]', params: { placeId: returnPlaceId, addTripId: id } });
    } else if (tripId && router.canGoBack()) router.back();
    else router.replace({ pathname: '/trips/[tripId]', params: { tripId: id } });
  }, [editor.completedId, returnPlaceId, returnFlowId, tripId, store]);
  if (editor.missing) return <Screen><EmptyState title={t('trip.notFound')} description={t('trip.error.missing')} /></Screen>;
  return <Screen revealEnd={guard.confirming}>
    <Text variant="title" accessibilityRole="header">{t(tripId ? 'trip.editTitle' : 'trip.createTitle')}</Text>
    {returnPlaceId && <Text>{t('trip.returnToAddition')}</Text>}
    <TextField fieldId="trip-name" label={t('trip.name')} required value={editor.input.name} editable={!editor.busy} onChangeText={value => editor.setField('name', value)} />
    <TextField fieldId="trip-start" label={t('trip.start')} hint={t('trip.isoHint')} required autoCapitalize="none" value={editor.input.startDate} editable={!editor.busy} onChangeText={value => editor.setField('startDate', value)} />
    <TextField fieldId="trip-end" label={t('trip.end')} hint={t('trip.isoHint')} required autoCapitalize="none" value={editor.input.endDate} editable={!editor.busy} onChangeText={value => editor.setField('endDate', value)} />
    {editor.reviewing && <Section title={t('trip.periodReview')}>
      <Text accessibilityRole="alert">{t('trip.periodReviewHint')}</Text>
      {editor.affected.map(item => {
        const resolution = editor.resolutions[item.id];
        return <Section key={item.id} title={t('trip.affectedItem', { name: item.place.name, date: formatDate(item.date, language) })}>
          <Chip label={t('trip.deleteAffected')} selected={resolution?.action === 'delete'} disabled={editor.busy} onPress={() => editor.resolve(item.id, { action: 'delete' })} />
          <Chip label={t('trip.moveAffected')} selected={resolution?.action === 'move'} disabled={editor.busy} onPress={() => editor.resolve(item.id, { action: 'move', date: editor.input.startDate })} />
          {resolution?.action === 'move' && <TextField label={t('trip.moveDate', { name: item.place.name })} hint={t('trip.isoHint')} value={resolution.date} editable={!editor.busy} onChangeText={date => editor.resolve(item.id, { action: 'move', date })} />}
        </Section>;
      })}
      <Button label={t('trip.cancelPeriod')} variant="secondary" disabled={editor.busy} onPress={editor.cancelReview} />
    </Section>}
    <TripFeedback error={editor.error} />
    {editor.error === 'conflict' && <Button label={t('trip.reloadEditor')} variant="secondary" onPress={() => guard.request(() => router.replace({ pathname: '/trips/edit/[tripId]', params: { tripId: tripId ?? '' } }))} />}
    <Button label={t(editor.reviewing ? 'trip.confirmPeriod' : 'trip.save')} busy={editor.busy} onPress={() => void editor.save()} />
    <Button label={t('trip.cancel')} variant="secondary" disabled={editor.busy} onPress={() => guard.request(() => router.canGoBack() ? router.back() : router.replace('/trips'))} />
    {guard.confirming && <DiscardConfirmation confirm={guard.confirm} cancel={guard.cancel} />}
  </Screen>;
}

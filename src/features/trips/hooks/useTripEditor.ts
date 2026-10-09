import { useState } from 'react';
import { useTrips } from './TripsProvider';
import { TripError, type ItemResolution, type PeriodResolutions, type TripInput } from '../models/trip';
import { outsidePeriod, validateTrip, seoulToday } from '../services/tripRules';
export function useTripEditor(tripId?: string) {
  const { trips, items, busy, error, store } = useTrips();
  const trip = trips.find(value => value.id === tripId);
  const [initial] = useState<TripInput>(() => trip ?? { name: '', startDate: seoulToday(), endDate: seoulToday() });
  const [revision] = useState(trip?.revision);
  const [input, setInput] = useState<TripInput>(initial);
  const [reviewing, setReviewing] = useState(false);
  const [resolutions, setResolutions] = useState<PeriodResolutions>({});
  const [validation, setValidation] = useState<TripError['kind']>();
  const [completedId, setCompletedId] = useState<string>();
  const tripItems = items.filter(item => item.tripId === tripId);
  const affected = reviewing ? outsidePeriod(tripItems, input) : [];
  const dirty = !completedId && (input.name !== initial.name || input.startDate !== initial.startDate || input.endDate !== initial.endDate);
  return {
    input, affected, resolutions, reviewing, busy, dirty, completedId, missing: Boolean(tripId && !trip), error: validation ?? error,
    setField: (field: keyof TripInput, value: string) => { setInput(previous => ({ ...previous, [field]: value })); setReviewing(false); setResolutions({}); setValidation(undefined); },
    resolve: (id: string, value: ItemResolution) => setResolutions(previous => ({ ...previous, [id]: value })),
    cancelReview: () => { setReviewing(false); setResolutions({}); setInput(previous => ({ ...previous, startDate: initial.startDate, endDate: initial.endDate })); setValidation(undefined); },
    discard: () => { setInput(initial); setReviewing(false); setResolutions({}); },
    save: async () => {
      let value;
      try { value = validateTrip(input); } catch (error) { setValidation(error instanceof TripError ? error.kind : 'storage'); return; }
      setValidation(undefined);
      if (tripId && outsidePeriod(tripItems, value).length && !reviewing) { setReviewing(true); return; }
      if (tripId) {
        if (revision === undefined) { setValidation('missing'); return; }
        if (await store.updateTrip(tripId, value, revision, resolutions)) setCompletedId(tripId);
      } else {
        const id = await store.create(value); if (id) setCompletedId(id);
      }
    },
  };
}

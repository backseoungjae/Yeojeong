import { useEffect, useRef, useState } from 'react';
import { useTrips } from './TripsProvider';
import { validateDate, shiftDate } from '../services/tripRules';
import { TripError } from '../models/trip';
export function useTripDetail(tripId: string) {
  const { trips, items, busy, error, store } = useTrips();
  const trip = trips.find(value => value.id === tripId);
  const [chosenDate, setChosenDate] = useState(trip?.startDate ?? '');
  const date = trip && chosenDate >= trip.startDate && chosenDate <= trip.endDate ? chosenDate : trip?.startDate ?? '';
  const [dateInput, setDateInput] = useState(date);
  const previousRange = useRef(`${trip?.startDate}:${trip?.endDate}`);
  useEffect(() => store.subscribe(() => {
    const updated = store.getSnapshot().trips.find(value => value.id === tripId);
    const range = `${updated?.startDate}:${updated?.endDate}`;
    if (!updated || previousRange.current === range) return;
    previousRange.current = range;
    setChosenDate(previous => previous < updated.startDate || previous > updated.endDate ? updated.startDate : previous);
    setDateInput(previous => previous < updated.startDate || previous > updated.endDate ? updated.startDate : previous);
  }), [store, tripId]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<TripError['kind']>();
  const [notice, setNotice] = useState<'memoSaved' | 'orderChanged' | 'itemRemoved'>();
  const tripItems = items.filter(item => item.tripId === tripId);
  const dayItems = tripItems.filter(item => item.date === date);
  const dirty = tripItems.some(item => drafts[item.id] !== undefined && drafts[item.id] !== item.memo);
  const setDay = (value: string) => { setChosenDate(value); setDateInput(value); setValidation(undefined); setNotice(undefined); };
  return {
    trip, tripItems, dayItems, date, dateInput, drafts, dirty, busy, store, error: validation ?? error, notice,
    setDateInput, discard: () => setDrafts({}),
    selectDate: () => {
      try { validateDate(dateInput); if (!trip || dateInput < trip.startDate || dateInput > trip.endDate) throw new TripError('outside'); setDay(dateInput); }
      catch (error) { setValidation(error instanceof TripError ? error.kind : 'date'); }
    },
    shiftDay: (direction: -1 | 1) => setDay(shiftDate(date, direction)),
    setMemo: (id: string, value: string) => { setDrafts(previous => ({ ...previous, [id]: value })); setNotice(undefined); },
    discardMemo: (id: string) => setDrafts(previous => { const next = { ...previous }; delete next[id]; return next; }),
    saveMemo: async (id: string) => {
      const item = tripItems.find(value => value.id === id);
      if (item && await store.saveMemo(id, drafts[id] ?? item.memo, item.memo)) {
        setDrafts(previous => { const next = { ...previous }; delete next[id]; return next; }); setNotice('memoSaved');
      }
    },
    reorder: async (id: string, direction: -1 | 1) => { if (await store.reorder(id, direction)) setNotice('orderChanged'); },
    removeItem: async (id: string) => { if (await store.removeItem(id)) { setDrafts(previous => { const next = { ...previous }; delete next[id]; return next; }); setNotice('itemRemoved'); } },
  };
}

import { useEffect, useId, useRef, useState } from 'react';
import { router } from 'expo-router';
import type { Place } from '@/shared/models/place';
import { useTrips } from './TripsProvider';
export function useItineraryAddition(place: Place, initialTripId?: string) {
  const flowId = useId();
  const { trips, busy, error, store } = useTrips();
  const [open, setOpen] = useState(Boolean(initialTripId));
  const [tripId, setTripId] = useState(initialTripId);
  const trip = trips.find(value => value.id === tripId);
  const [date, setDate] = useState(trip?.startDate ?? '');
  const [added, setAdded] = useState(false);
  const consumed = useRef<ReturnType<typeof store.getSnapshot>['createdSelection']>(undefined);
  useEffect(() => store.subscribe(() => {
    const state = store.getSnapshot(), selection = state.createdSelection;
    if (selection?.flowId === flowId && selection !== consumed.current) {
      consumed.current = selection;
      setTripId(selection.tripId); setOpen(true); setAdded(false);
      setDate(state.trips.find(value => value.id === selection.tripId)?.startDate ?? '');
    }
  }), [store, flowId]);
  return {
    open, trips, trip, date, busy, error, added,
    begin: () => { setOpen(true); setAdded(false); store.clearError(); },
    close: () => { setOpen(false); setAdded(false); },
    select: (id: string) => { setTripId(id); setDate(trips.find(value => value.id === id)?.startDate ?? ''); setAdded(false); store.clearError(); },
    setDate: (value: string) => { setDate(value); setAdded(false); store.clearError(); },
    create: () => router.push({ pathname: '/trips/new', params: { returnPlaceId: place.id, returnFlowId: flowId } }),
    add: async () => { if (trip && await store.add(trip.id, date, place)) setAdded(true); },
  };
}

import type { Trip } from '../../trips/models/trip.ts';
import { tripStatus } from '../../trips/services/tripRules.ts';
export function homeTrip(trips: readonly Trip[], today: string): Trip | undefined {
  const eligible = trips.filter(trip => tripStatus(trip, today) !== 'past');
  return eligible.sort((a, b) => Number(tripStatus(a, today) === 'upcoming') - Number(tripStatus(b, today) === 'upcoming') || a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id, 'en', { numeric: true }))[0];
}

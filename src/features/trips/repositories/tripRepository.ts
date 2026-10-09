import { type DatabaseAccess, StorageError, type SqlConnection } from '../../../shared/database/database.ts';
import { writeSnapshot } from '../../../shared/database/placeSnapshots.ts';
import { parseSnapshot } from '../../../shared/models/placeSnapshot.ts';
import type { Place } from '../../../shared/models/place.ts';
import { TripError, type Trip, type TripInput, type TripData, type ItineraryItem, type PeriodResolutions } from '../models/trip.ts';
import { validateTrip, validateDate, planPeriodChange } from '../services/tripRules.ts';
interface TripRow { id: number; name: string; start_date: string; end_date: string; created_at: number; updated_at: number; revision: number }
interface ItemRow { id: number; trip_id: number; place_id: string; date: string; position: number; memo: string; snapshot_json: string; captured_at: number }
function toTrip(row: TripRow): Trip {
  const input = validateTrip({ name: row.name, startDate: row.start_date, endDate: row.end_date });
  if (!Number.isSafeInteger(row.id) || row.id < 1 || !Number.isSafeInteger(row.revision) || row.revision < 0 || !Number.isFinite(row.created_at) || !Number.isFinite(row.updated_at)) throw new StorageError('data');
  return { ...input, id: String(row.id), createdAt: row.created_at, updatedAt: row.updated_at, revision: row.revision };
}
async function load(db: SqlConnection): Promise<TripData> {
  const trips = (await db.getAllAsync<TripRow>('SELECT * FROM trips ORDER BY start_date,id')).map(toTrip);
  const rows = await db.getAllAsync<ItemRow>(`SELECT item.*, snapshot.snapshot_json,snapshot.captured_at FROM itinerary_items item
    JOIN place_snapshots snapshot ON snapshot.id=item.place_id ORDER BY item.trip_id,item.date,item.position`);
  const items: ItineraryItem[] = rows.map(row => {
    let raw: unknown;
    try { raw = JSON.parse(row.snapshot_json); } catch { throw new StorageError('data'); }
    const place = parseSnapshot(raw), trip = trips.find(value => value.id === String(row.trip_id));
    validateDate(row.date);
    if (!trip || row.date < trip.startDate || row.date > trip.endDate || place.id !== row.place_id || typeof row.memo !== 'string' || !Number.isSafeInteger(row.position) || row.position < 0 || !Number.isSafeInteger(row.id) || row.id < 1 || !Number.isFinite(row.captured_at)) throw new StorageError('data');
    return { id: String(row.id), tripId: String(row.trip_id), date: row.date, position: row.position, memo: row.memo, place, capturedAt: row.captured_at };
  });
  return { trips, items };
}
async function getTrip(db: SqlConnection, id: string) {
  const row = await db.getFirstAsync<TripRow>('SELECT * FROM trips WHERE id=?', id);
  if (!row) throw new TripError('missing');
  return toTrip(row);
}
async function touch(db: SqlConnection, id: string, now: number) {
  await db.runAsync('UPDATE trips SET updated_at=?,revision=revision+1 WHERE id=?', now, id);
}
async function normalizeOrder(db: SqlConnection, tripId: string, date: string) {
  const rows = await db.getAllAsync<{ id: number; position: number }>('SELECT id,position FROM itinerary_items WHERE trip_id=? AND date=? ORDER BY position', tripId, date);
  const offset = (rows.at(-1)?.position ?? 0) + rows.length + 1;
  await db.runAsync('UPDATE itinerary_items SET position=position+? WHERE trip_id=? AND date=?', offset, tripId, date);
  for (const [position, row] of rows.entries()) await db.runAsync('UPDATE itinerary_items SET position=? WHERE id=?', position, row.id);
}
export function createTripRepository(database: DatabaseAccess, now = Date.now) {
  return {
    load: () => database.read(load),
    create(input: TripInput) { const value = validateTrip(input); return database.transaction(async db => {
      const timestamp = now();
      const result = await db.runAsync('INSERT INTO trips (name,start_date,end_date,created_at,updated_at) VALUES (?,?,?,?,?)', value.name, value.startDate, value.endDate, timestamp, timestamp);
      return { data: await load(db), id: String(result.lastInsertRowId) };
    }); },
    update(id: string, input: TripInput, revision: number, resolutions: PeriodResolutions = {}) { const value = validateTrip(input); return database.transaction(async db => {
      const trip = await getTrip(db, id);
      if (trip.revision !== revision) throw new TripError('conflict');
      const items = (await load(db)).items.filter(item => item.tripId === id);
      const planned = planPeriodChange(items, value, resolutions);
      await db.runAsync('DELETE FROM itinerary_items WHERE trip_id=?', id);
      await db.runAsync('UPDATE trips SET name=?,start_date=?,end_date=?,updated_at=?,revision=revision+1 WHERE id=?', value.name, value.startDate, value.endDate, now(), id);
      for (const item of planned) await db.runAsync('INSERT INTO itinerary_items (id,trip_id,place_id,date,position,memo) VALUES (?,?,?,?,?,?)', item.id, id, item.place.id, item.date, item.position, item.memo);
      return load(db);
    }); },
    remove(id: string) { return database.transaction(async db => { await getTrip(db, id); await db.runAsync('DELETE FROM trips WHERE id=?', id); return load(db); }); },
    add(tripId: string, date: string, place: Place) { validateDate(date); return database.transaction(async db => {
      const trip = await getTrip(db, tripId);
      if (date < trip.startDate || date > trip.endDate) throw new TripError('outside');
      if (await db.getFirstAsync('SELECT id FROM itinerary_items WHERE trip_id=? AND date=? AND place_id=?', tripId, date, place.id)) throw new TripError('duplicate');
      await writeSnapshot(db, place, now());
      const row = await db.getFirstAsync<{ next: number }>('SELECT COALESCE(MAX(position),-1)+1 AS next FROM itinerary_items WHERE trip_id=? AND date=?', tripId, date);
      await db.runAsync('INSERT INTO itinerary_items (trip_id,place_id,date,position) VALUES (?,?,?,?)', tripId, place.id, date, row?.next ?? 0);
      await touch(db, tripId, now()); return load(db);
    }); },
    reorder(itemId: string, direction: -1 | 1) { return database.transaction(async db => {
      const item = await db.getFirstAsync<ItemRow>('SELECT * FROM itinerary_items WHERE id=?', itemId);
      if (!item) throw new TripError('missing');
      const other = await db.getFirstAsync<ItemRow>('SELECT * FROM itinerary_items WHERE trip_id=? AND date=? AND position=?', item.trip_id, item.date, item.position + direction);
      if (!other) return load(db);
      const max = await db.getFirstAsync<{ value: number }>('SELECT MAX(position)+1 AS value FROM itinerary_items WHERE trip_id=? AND date=?', item.trip_id, item.date);
      await db.runAsync('UPDATE itinerary_items SET position=? WHERE id=?', max?.value ?? 0, itemId);
      await db.runAsync('UPDATE itinerary_items SET position=? WHERE id=?', item.position, other.id);
      await db.runAsync('UPDATE itinerary_items SET position=? WHERE id=?', other.position, itemId);
      await touch(db, String(item.trip_id), now()); return load(db);
    }); },
    saveMemo(itemId: string, memo: string, previous: string) { return database.transaction(async db => {
      const item = await db.getFirstAsync<ItemRow>('SELECT * FROM itinerary_items WHERE id=?', itemId);
      if (!item) throw new TripError('missing');
      if (item.memo !== previous) throw new TripError('conflict');
      await db.runAsync('UPDATE itinerary_items SET memo=? WHERE id=?', memo, itemId);
      await touch(db, String(item.trip_id), now()); return load(db);
    }); },
    removeItem(itemId: string) { return database.transaction(async db => {
      const item = await db.getFirstAsync<ItemRow>('SELECT * FROM itinerary_items WHERE id=?', itemId);
      if (!item) throw new TripError('missing');
      await db.runAsync('DELETE FROM itinerary_items WHERE id=?', itemId);
      await normalizeOrder(db, String(item.trip_id), item.date);
      await touch(db, String(item.trip_id), now()); return load(db);
    }); },
  };
}
export type TripRepository = ReturnType<typeof createTripRepository>;

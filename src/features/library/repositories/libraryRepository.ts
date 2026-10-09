import { writeSnapshot } from '../../../shared/database/placeSnapshots.ts';
import { AppDatabase, StorageError, type SqlConnection } from '../../../shared/database/database.ts';
import type { Place } from '../../../shared/models/place.ts';
import { parseSnapshot, type LibraryData, type StoredPlace } from '../models/library.ts';
interface SnapshotRow { id: string; service: string; content_id: string; language: string; snapshot_json: string; captured_at: number }
async function load(db: SqlConnection): Promise<LibraryData> {
  const rows = await db.getAllAsync<SnapshotRow>('SELECT * FROM place_snapshots WHERE id IN (SELECT place_id FROM saved_places UNION SELECT place_id FROM recent_places)');
  const snapshots = new Map<string, { place: Place; capturedAt: number }>();
  for (const row of rows) {
    let raw: unknown;
    try { raw = JSON.parse(row.snapshot_json); } catch { throw new StorageError('data'); }
    const place = parseSnapshot(raw);
    if (place.id !== row.id || place.service !== row.service || place.contentId !== row.content_id || place.language !== row.language || !Number.isFinite(row.captured_at)) throw new StorageError('data');
    snapshots.set(row.id, { place, capturedAt: row.captured_at });
  }
  const toStored = (placeId: string, recordedAt: number): StoredPlace => {
    const snapshot = snapshots.get(placeId);
    if (!snapshot || !Number.isFinite(recordedAt)) throw new StorageError('data');
    return { ...snapshot, recordedAt };
  };
  const savedRows = await db.getAllAsync<{ place_id: string; saved_at: number }>('SELECT * FROM saved_places ORDER BY saved_at DESC, place_id');
  const recentRows = await db.getAllAsync<{ place_id: string; viewed_at: number }>('SELECT * FROM recent_places ORDER BY sequence DESC, place_id LIMIT 20');
  const searches = await db.getAllAsync<{ keyword: string; searched_at: number }>('SELECT keyword, searched_at FROM recent_searches ORDER BY sequence DESC, keyword LIMIT 10');
  return { saved: savedRows.map(row => toStored(row.place_id, row.saved_at)), recent: recentRows.map(row => toStored(row.place_id, row.viewed_at)), searches: searches.map(row => ({ keyword: row.keyword, searchedAt: row.searched_at })) };
}
export function createLibraryRepository(database: AppDatabase, now = Date.now) {
  return {
    load: () => database.read(load),
    save(place: Place) { return database.transaction(async db => {
      const timestamp = now(); await writeSnapshot(db, place, timestamp);
      await db.runAsync('INSERT INTO saved_places (place_id,saved_at) VALUES (?,?) ON CONFLICT(place_id) DO NOTHING', place.id, timestamp);
      return load(db);
    }); },
    unsave(id: string) { return database.transaction(async db => { await db.runAsync('DELETE FROM saved_places WHERE place_id=?', id); return load(db); }); },
    recordPlace(place: Place) { return database.transaction(async db => {
      const timestamp = now(); await writeSnapshot(db, place, timestamp);
      const row = await db.getFirstAsync<{ next: number }>('SELECT COALESCE(MAX(sequence),0)+1 AS next FROM recent_places');
      await db.runAsync('INSERT INTO recent_places (place_id,viewed_at,sequence) VALUES (?,?,?) ON CONFLICT(place_id) DO UPDATE SET viewed_at=excluded.viewed_at,sequence=excluded.sequence', place.id, timestamp, row?.next ?? 1);
      await db.execAsync('DELETE FROM recent_places WHERE place_id NOT IN (SELECT place_id FROM recent_places ORDER BY sequence DESC LIMIT 20)');
      return load(db);
    }); },
    recordSearch(value: string) { const keyword = value.trim(); if (!keyword) return database.read(load);
      return database.transaction(async db => {
        const row = await db.getFirstAsync<{ next: number }>('SELECT COALESCE(MAX(sequence),0)+1 AS next FROM recent_searches');
        await db.runAsync('INSERT INTO recent_searches (keyword,searched_at,sequence) VALUES (?,?,?) ON CONFLICT(keyword) DO UPDATE SET searched_at=excluded.searched_at,sequence=excluded.sequence', keyword, now(), row?.next ?? 1);
        await db.execAsync('DELETE FROM recent_searches WHERE keyword NOT IN (SELECT keyword FROM recent_searches ORDER BY sequence DESC LIMIT 10)');
        return load(db);
      });
    },
    removeRecent(id: string) { return database.transaction(async db => { await db.runAsync('DELETE FROM recent_places WHERE place_id=?', id); return load(db); }); },
    removeSearch(keyword: string) { return database.transaction(async db => { await db.runAsync('DELETE FROM recent_searches WHERE keyword=?', keyword); return load(db); }); },
    clearRecent() { return database.transaction(async db => { await db.execAsync('DELETE FROM recent_places'); return load(db); }); },
    clearSearches() { return database.transaction(async db => { await db.execAsync('DELETE FROM recent_searches'); return load(db); }); },
  };
}
export type LibraryRepository = ReturnType<typeof createLibraryRepository>;

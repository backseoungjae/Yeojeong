import type { AppDatabase } from '../../../shared/database/database.ts';
export function createLocalDataRepository(database: AppDatabase) {
  return { clear: (prepare: () => Promise<void>) => database.reset(async db => {
    for (const table of ['itinerary_items', 'trips', 'saved_places', 'recent_places', 'recent_searches', 'preferences', 'place_snapshots']) {
      await db.execAsync(`DELETE FROM ${table}`);
    }
    await db.execAsync("DELETE FROM sqlite_sequence WHERE name IN ('trips','itinerary_items')");
  }, prepare) };
}

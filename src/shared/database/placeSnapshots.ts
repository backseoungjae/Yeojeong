import type { SqlConnection } from './database.ts';
import type { Place } from '../models/place.ts';
import { serializeSnapshot } from '../models/placeSnapshot.ts';
export async function writeSnapshot(db: SqlConnection, place: Place, timestamp: number) {
  const json = serializeSnapshot(place);
  // 저장 또는 일정이 참조하는 스냅샷은 일반 조회로 덮어쓰지 않는다.
  await db.runAsync(`INSERT INTO place_snapshots (id,service,content_id,language,snapshot_json,captured_at) VALUES (?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET snapshot_json=excluded.snapshot_json,captured_at=excluded.captured_at
    WHERE NOT EXISTS (SELECT 1 FROM saved_places WHERE place_id=excluded.id)
      AND NOT EXISTS (SELECT 1 FROM itinerary_items WHERE place_id=excluded.id)`, place.id, place.service, place.contentId, place.language, json, timestamp);
}

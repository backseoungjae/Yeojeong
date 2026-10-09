export type SqlValue = string | number | null;
export interface SqlConnection {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...values: SqlValue[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getFirstAsync<T>(sql: string, ...values: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...values: SqlValue[]): Promise<T[]>;
  closeAsync(): Promise<void>;
}
export class StorageError extends Error {
  readonly kind: 'initialization' | 'version' | 'read' | 'write' | 'data';
  constructor(kind: StorageError['kind']) { super(`Local storage: ${kind}`); this.name = 'StorageError'; this.kind = kind; }
}
export const migrations = [
  `CREATE TABLE place_snapshots (
    id TEXT PRIMARY KEY NOT NULL, service TEXT NOT NULL, content_id TEXT NOT NULL, language TEXT NOT NULL CHECK(language IN ('ko','en')),
    snapshot_json TEXT NOT NULL, captured_at INTEGER NOT NULL, UNIQUE(service, content_id)
  );
  CREATE TABLE saved_places (place_id TEXT PRIMARY KEY NOT NULL REFERENCES place_snapshots(id) ON DELETE RESTRICT, saved_at INTEGER NOT NULL);
  CREATE TABLE recent_places (place_id TEXT PRIMARY KEY NOT NULL REFERENCES place_snapshots(id) ON DELETE RESTRICT, viewed_at INTEGER NOT NULL);
  CREATE TABLE recent_searches (keyword TEXT PRIMARY KEY NOT NULL, searched_at INTEGER NOT NULL);
  CREATE TABLE preferences (key TEXT PRIMARY KEY NOT NULL CHECK(key IN ('language','theme')), value TEXT NOT NULL,
    CHECK((key='language' AND value IN ('ko','en')) OR (key='theme' AND value IN ('light','dark'))));`,
  `ALTER TABLE recent_places ADD COLUMN sequence INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE recent_searches ADD COLUMN sequence INTEGER NOT NULL DEFAULT 0;
  UPDATE recent_places SET sequence = (SELECT COUNT(*) FROM recent_places other WHERE other.viewed_at < recent_places.viewed_at OR (other.viewed_at = recent_places.viewed_at AND other.place_id <= recent_places.place_id));
  UPDATE recent_searches SET sequence = (SELECT COUNT(*) FROM recent_searches other WHERE other.searched_at < recent_searches.searched_at OR (other.searched_at = recent_searches.searched_at AND other.keyword <= recent_searches.keyword));
  CREATE INDEX saved_places_saved_at ON saved_places(saved_at DESC);
  CREATE INDEX recent_places_sequence ON recent_places(sequence DESC);
  CREATE INDEX recent_searches_sequence ON recent_searches(sequence DESC);
  DELETE FROM recent_places WHERE place_id NOT IN (SELECT place_id FROM recent_places ORDER BY sequence DESC LIMIT 20);
  DELETE FROM recent_searches WHERE keyword NOT IN (SELECT keyword FROM recent_searches ORDER BY sequence DESC LIMIT 10);`,
] as const;
export async function migrateDatabase(db: SqlConnection) {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) throw new StorageError('data');
  if (version > migrations.length) throw new StorageError('version');
  for (let index = version; index < migrations.length; index++) {
    await db.execAsync('BEGIN IMMEDIATE');
    try { await db.execAsync(migrations[index]); await db.execAsync(`PRAGMA user_version = ${index + 1}`); await db.execAsync('COMMIT'); }
    catch (error) { await db.execAsync('ROLLBACK'); throw error; }
  }
}
export class AppDatabase {
  private open: () => Promise<SqlConnection>;
  private ready?: Promise<SqlConnection>;
  private tail: Promise<void> = Promise.resolve();
  constructor(open: () => Promise<SqlConnection>) { this.open = open; }
  initialize(): Promise<SqlConnection> {
    if (!this.ready) {
      this.ready = this.open().then(async db => {
        try { await migrateDatabase(db); return db; }
        catch (error) { await db.closeAsync().catch(() => {}); throw error; }
      }).catch(error => { this.ready = undefined; throw error instanceof StorageError ? error : new StorageError('initialization'); });
    }
    return this.ready;
  }
  private enqueue<T>(work: (db: SqlConnection) => Promise<T>): Promise<T> {
    const task = this.tail.then(async () => work(await this.initialize()));
    this.tail = task.then(() => {}, () => {});
    return task;
  }
  read<T>(work: (db: SqlConnection) => Promise<T>): Promise<T> {
    return this.enqueue(async db => { try { return await work(db); } catch (error) { throw error instanceof StorageError ? error : new StorageError('read'); } });
  }
  transaction<T>(work: (db: SqlConnection) => Promise<T>): Promise<T> {
    // 모든 조회/쓰기를 한 연결의 큐로 직렬화해 다른 작업이 열린 트랜잭션에 섞이지 않도록 한다.
    return this.enqueue(async db => {
      try { await db.execAsync('BEGIN IMMEDIATE'); }
      catch { throw new StorageError('write'); }
      try { const result = await work(db); await db.execAsync('COMMIT'); return result; }
      catch (error) {
        try { await db.execAsync('ROLLBACK'); }
        catch { this.ready = undefined; await db.closeAsync().catch(() => {}); }
        throw error instanceof StorageError ? error : new StorageError('write');
      }
    });
  }
}

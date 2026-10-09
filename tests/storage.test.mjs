import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppDatabase, migrations, StorageError } from '../src/shared/database/database.ts';
import { createLibraryRepository } from '../src/features/library/repositories/libraryRepository.ts';
import { createSettingsRepository } from '../src/features/settings/repositories/settingsRepository.ts';
import { LibraryStore } from '../src/features/library/models/libraryStore.ts';
import { parseSnapshot } from '../src/features/library/models/library.ts';
const place = (id, language = 'ko') => ({ id: `tourapi:${language === 'ko' ? 'KorService2' : 'EngService2'}:${id}`, service: language === 'ko' ? 'KorService2' : 'EngService2', contentId: String(id), language, name: `Place ${id}`, type: 'attraction', providerTypeCode: language === 'ko' ? '12' : '76', source: '한국관광공사 TourAPI', regionCode: '11', address: 'Stored address' });
function connection(native, intercept = () => {}) {
  return {
    async execAsync(sql) { intercept(sql); native.exec(sql); },
    async runAsync(sql, ...values) { intercept(sql); const result = native.prepare(sql).run(...values); return { changes: result.changes, lastInsertRowId: result.lastInsertRowid }; },
    async getFirstAsync(sql, ...values) { intercept(sql); return native.prepare(sql).get(...values) ?? null; },
    async getAllAsync(sql, ...values) { intercept(sql); return native.prepare(sql).all(...values); },
    async closeAsync() { native.close(); },
  };
}
function fixture(intercept = () => {}, now = () => 1) {
  const native = new DatabaseSync(':memory:');
  const db = new AppDatabase(async () => connection(native, intercept));
  return { native, db, repository: createLibraryRepository(db, now), settings: createSettingsRepository(db) };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
test('초기화 동시 호출과 조회 경쟁: 한 번만 열고 마이그레이션 완료 뒤 조회', async () => {
  let opens = 0; const native = new DatabaseSync(':memory:');
  const database = new AppDatabase(async () => { opens++; await tick(); return connection(native); });
  const repository = createLibraryRepository(database);
  const results = await Promise.all([database.initialize(), repository.load(), repository.load()]);
  assert.equal(opens, 1); assert.equal(results[1].saved.length, 0); assert.equal(native.prepare('PRAGMA user_version').get().user_version, migrations.length);
  assert.equal(native.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name IN ('trips','itinerary_items')").get().n, 2); native.close();
});
test('연속·동시 저장은 SQL 제약으로 중복되지 않고 저장 당시 스냅샷 유지', async () => {
  const f = fixture();
  await Promise.all(Array.from({ length: 20 }, () => f.repository.save(place(1))));
  await f.repository.save({ ...place(1), name: 'Changed name' });
  await f.repository.recordPlace({ ...place(1), name: 'Fresh API name' });
  const data = await f.repository.load(); assert.equal(data.saved.length, 1); assert.equal(data.saved[0].place.name, 'Place 1'); assert.equal(data.recent[0].place.name, 'Place 1');
  assert.equal(f.native.prepare('SELECT count(*) AS n FROM saved_places').get().n, 1); f.native.close();
});
test('동일 숫자 ID의 국문·영문은 별개 저장, 설정 변경으로 저장 기록 삭제하지 않음', async () => {
  const f = fixture(); await f.repository.save(place(1)); await f.repository.save(place(1, 'en'));
  await f.settings.setLanguage('en'); await f.settings.setTheme('dark');
  const data = await f.repository.load(); assert.deepEqual(new Set(data.saved.map(p => p.place.language)), new Set(['ko','en']));
  assert.deepEqual(await f.settings.load(), { language: 'en', theme: 'dark' }); f.native.close();
});
test('최근 장소 20·검색어 10 제한, 동일 시각에도 재조회 순서·중복 제거', async () => {
  const f = fixture();
  for (let id = 1; id <= 25; id++) await f.repository.recordPlace(place(id));
  for (let id = 1; id <= 15; id++) await f.repository.recordSearch(` Search ${id} `);
  await f.repository.recordPlace(place(10)); await f.repository.recordSearch('Search 8');
  const data = await f.repository.load(); assert.equal(data.recent.length, 20); assert.equal(data.searches.length, 10);
  assert.equal(data.recent[0].place.contentId, '10'); assert.equal(data.searches[0].keyword, 'Search 8');
  assert.equal(new Set(data.recent.map(p => p.place.id)).size, 20); assert.equal(new Set(data.searches.map(p => p.keyword)).size, 10);
  await f.repository.recordSearch('   '); assert.equal((await f.repository.load()).searches.length, 10); f.native.close();
});
test('검색어는 바인딩으로 저장, SQL처럼 보이는 입력도 데이터로만 취급', async () => {
  const f = fixture(); const keyword = "x'); DROP TABLE saved_places; --";
  await f.repository.recordSearch(keyword); await f.repository.save(place(1));
  const data = await f.repository.load(); assert.equal(data.searches[0].keyword, keyword); assert.equal(data.saved.length, 1); f.native.close();
});
test('스냅샷·저장 레코드·조회까지 한 트랜잭션: 시작/쓰기/읽기/커밋 실패 시 데이터 보존', async () => {
  for (const mode of ['begin','insert','read','commit']) {
    let fail = false;
    const f = fixture(sql => {
      if (fail && (mode === 'begin' && sql === 'BEGIN IMMEDIATE' || mode === 'insert' && sql.startsWith('INSERT INTO saved_places') || mode === 'read' && sql.startsWith('SELECT * FROM place_snapshots') || mode === 'commit' && sql === 'COMMIT')) throw new Error('private SQL detail');
    });
    await f.db.initialize(); fail = true;
    await assert.rejects(f.repository.save(place(1)), error => error instanceof StorageError && !error.message.includes('private SQL'));
    fail = false; assert.equal((await f.repository.load()).saved.length, 0); assert.equal(f.native.prepare('SELECT count(*) AS n FROM place_snapshots').get().n, 0); f.native.close();
  }
});
test('저장 실패·설정 실패 시 UI 상태는 이전 값 유지하고 이후 재시도 가능', async () => {
  let fail = false;
  const f = fixture(sql => { if (fail && sql.startsWith('INSERT INTO')) throw new Error('disk'); });
  const store = new LibraryStore(f.repository, f.settings); await store.initialize(); fail = true;
  await store.toggleSaved(place(1)); assert.equal(store.isSaved(place(1).id), false); assert.equal(store.getSnapshot().pendingIds.size, 0); assert.equal(store.getSnapshot().saveErrors.has(place(1).id), true);
  await store.setLanguage('en'); assert.equal(store.getSnapshot().preferences.language, undefined); assert.equal(store.getSnapshot().settingsError, true);
  fail = false; await store.toggleSaved(place(1)); await store.setLanguage('en'); assert.equal(store.isSaved(place(1).id), true); assert.equal(store.getSnapshot().preferences.language, 'en'); f.native.close();
});
test('목록·상세 등 공유 저장 상태는 같은 Store에서 갱신하고 빠른 중복 조작 방지', async () => {
  const f = fixture(); const store = new LibraryStore(f.repository, f.settings); await store.initialize();
  let changes = 0; const unsubscribe = store.subscribe(() => changes++);
  await Promise.all([store.toggleSaved(place(1)), store.toggleSaved(place(1))]);
  assert.equal(store.getSnapshot().saved.length, 1); assert.equal(store.isSaved(place(1).id), true);
  await store.toggleSaved(place(1)); assert.equal(store.isSaved(place(1).id), false); assert.ok(changes > 0); unsubscribe(); f.native.close();
});
test('최근 기록 삭제와 저장 해제는 별개이며 스냅샷을 일반 만료로 삭제하지 않음', async () => {
  const f = fixture(); await f.repository.save(place(1)); await f.repository.recordPlace(place(1)); await f.repository.recordSearch('Search');
  await f.repository.removeRecent(place(1).id); await f.repository.removeSearch('Search'); assert.equal((await f.repository.load()).saved.length, 1);
  await f.repository.recordPlace(place(1)); await f.repository.unsave(place(1).id); assert.equal((await f.repository.load()).recent.length, 1);
  await f.repository.clearRecent(); await f.repository.clearSearches(); assert.equal(f.native.prepare('SELECT count(*) AS n FROM place_snapshots').get().n, 1); f.native.close();
});
test('DB 연결 종료·재연결로 장소·최근 기록·선택 설정 복원', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'yeojeong-storage-')); const path = join(folder, 'test.db');
  try {
    const first = new DatabaseSync(path); const db = new AppDatabase(async () => connection(first)); const repository = createLibraryRepository(db), settings = createSettingsRepository(db);
    await repository.save(place(1)); await repository.recordPlace(place(1, 'en')); await repository.recordSearch('Original keyword'); await settings.setLanguage('en'); await settings.setTheme('light'); first.close();
    const second = new DatabaseSync(path); const reopened = new AppDatabase(async () => connection(second)); const store = new LibraryStore(createLibraryRepository(reopened), createSettingsRepository(reopened));
    await store.initialize(); assert.equal(store.getSnapshot().status, 'ready'); assert.equal(store.getSnapshot().saved[0].place.language, 'ko'); assert.equal(store.getSnapshot().recent[0].place.language, 'en'); assert.equal(store.getSnapshot().searches[0].keyword, 'Original keyword'); assert.deepEqual(store.getSnapshot().preferences, { language: 'en', theme: 'light' }); second.close();
  } finally { await rm(folder, { recursive: true, force: true }); }
});
test('기존 v1 DB 마이그레이션은 저장·스냅샷·설정 보존, 최신 버전 재실행은 동일', async () => {
  const f = fixture(); f.native.exec(migrations[0]); f.native.exec('PRAGMA user_version=1');
  const value = place(1); f.native.prepare('INSERT INTO place_snapshots VALUES (?,?,?,?,?,?)').run(value.id,value.service,value.contentId,value.language,JSON.stringify(value),1);
  f.native.prepare('INSERT INTO saved_places VALUES (?,?)').run(value.id,1); f.native.prepare('INSERT INTO recent_places VALUES (?,?)').run(value.id,1); f.native.exec("INSERT INTO recent_searches VALUES ('Original',1); INSERT INTO preferences VALUES ('language','en');");
  const data = await f.repository.load(); assert.equal(data.saved[0].place.name, value.name); assert.equal(data.recent[0].place.id, value.id); assert.equal(data.searches[0].keyword, 'Original'); assert.equal((await f.settings.load()).language, 'en');
  assert.equal(f.native.prepare('PRAGMA user_version').get().user_version, migrations.length); await f.db.initialize(); assert.equal((await f.repository.load()).saved.length, 1); f.native.close();
});
test('마이그레이션 실패는 현재 버전·기존 데이터를 유지하고 다음 시도에 재개', async () => {
  let fail = true; const native = new DatabaseSync(':memory:'); native.exec(migrations[0]); native.exec('PRAGMA user_version=1'); native.exec("INSERT INTO recent_searches VALUES ('Keep',1);");
  const sql = connection(native, query => { if (fail && query.includes('ALTER TABLE recent_places')) throw new Error('migration'); });
  // 종료 후에도 테스트 엔진을 검사하기 위해 close만 무효화한다.
  const database = new AppDatabase(async () => ({ ...sql, closeAsync: async () => {} }));
  await assert.rejects(database.initialize(), { kind: 'initialization' }); assert.equal(native.prepare('PRAGMA user_version').get().user_version, 1); assert.equal(native.prepare('SELECT keyword FROM recent_searches').get().keyword, 'Keep');
  fail = false; await database.initialize(); assert.equal(native.prepare('PRAGMA user_version').get().user_version, migrations.length); assert.equal(native.prepare('SELECT keyword FROM recent_searches').get().keyword, 'Keep'); native.close();
});
test('미래 DB 버전은 덮어쓰지 않고 거부하며 초기화 실패는 복구 가능한 상태', async () => {
  const native = new DatabaseSync(':memory:'); native.exec('PRAGMA user_version=99; CREATE TABLE keep(value TEXT); INSERT INTO keep VALUES (\'safe\');');
  const sql = connection(native); const db = new AppDatabase(async () => ({ ...sql, closeAsync: async () => {} }));
  const store = new LibraryStore(createLibraryRepository(db), createSettingsRepository(db)); await store.initialize(); assert.equal(store.getSnapshot().status, 'error'); assert.equal(native.prepare('SELECT value FROM keep').get().value, 'safe'); assert.equal(native.prepare('PRAGMA user_version').get().user_version, 99); native.close();
});
test('저장 데이터의 서비스·언어·ID 무결성 검증과 불필요한 필드 제거', () => {
  assert.throws(() => parseSnapshot({ ...place(1), language: 'en' }), { kind: 'data' });
  assert.throws(() => parseSnapshot({ ...place(1), contentId: '2' }), { kind: 'data' });
  assert.equal('extraField' in parseSnapshot({ ...place(1), extraField: 'not stored' }), false);
});
test('반복 스냅샷 검증 캐시는 외부 객체 변경·실제 JSON 변경·메타데이터 손상을 숨기지 않음',async()=>{
 const f=fixture();await f.repository.save(place(1));let data=await f.repository.load();data.saved[0].place.name='Fixture external mutation';
 assert.equal((await f.repository.load()).saved[0].place.name,'Place 1');
 const changed={...place(1),name:'Fixture DB update'};f.native.prepare('UPDATE place_snapshots SET snapshot_json=? WHERE id=?').run(JSON.stringify(changed),place(1).id);
 assert.equal((await f.repository.load()).saved[0].place.name,'Fixture DB update');
 f.native.prepare('UPDATE place_snapshots SET service=? WHERE id=?').run('EngService2',place(1).id);await assert.rejects(f.repository.load(),{kind:'data'});
 f.native.prepare('UPDATE place_snapshots SET service=?,snapshot_json=? WHERE id=?').run('KorService2','{"invalid":true}',place(1).id);await assert.rejects(f.repository.load(),{kind:'data'});f.native.close();
});

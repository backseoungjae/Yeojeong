import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { AppDatabase, migrations } from '../src/shared/database/database.ts';
import { createTripRepository } from '../src/features/trips/repositories/tripRepository.ts';
import { createLibraryRepository } from '../src/features/library/repositories/libraryRepository.ts';
import { createSettingsRepository } from '../src/features/settings/repositories/settingsRepository.ts';
import { TripStore } from '../src/features/trips/models/tripStore.ts';
import { validateTrip, seoulToday, tripStatus, dayNumber, shiftDate, planPeriodChange } from '../src/features/trips/services/tripRules.ts';
const input = { name: 'Fixture trip', startDate: '2026-10-08', endDate: '2026-10-10' };
const place = (id, region='11', language='ko') => ({ id: `tourapi:${language === 'ko' ? 'KorService2' : 'EngService2'}:${id}`, service: language === 'ko' ? 'KorService2' : 'EngService2', contentId: String(id), language, name: `Fixture place ${id}`, type: 'attraction', providerTypeCode: language === 'ko' ? '12' : '76', source: '한국관광공사 TourAPI', regionCode: region });
function connection(native, intercept=()=>{}) {
  return {
    async execAsync(sql) { intercept(sql); native.exec(sql); },
    async runAsync(sql,...values) { intercept(sql); const result = native.prepare(sql).run(...values); return { changes: result.changes, lastInsertRowId: result.lastInsertRowid }; },
    async getAllAsync(sql,...values) { intercept(sql); return native.prepare(sql).all(...values); },
    async getFirstAsync(sql,...values) { intercept(sql); return native.prepare(sql).get(...values)??null; },
    async closeAsync() { native.close(); },
  };
}
function fixture(intercept=()=>{}) {
  const native=new DatabaseSync(':memory:');const db=new AppDatabase(async()=>connection(native,intercept));
  return {native,db,repository:createTripRepository(db,()=>123),library:createLibraryRepository(db,()=>123),settings:createSettingsRepository(db)};
}
const tripData=async f=>{const data=await f.repository.load();return {trip:data.trips[0],items:data.items};};
test('이름·달력 날짜·기간 검증, 윤년과 긴 기간의 실제 날짜 계산',()=>{
  assert.equal(validateTrip({...input,name:'  Fixture  trip  '}).name,'Fixture  trip');
  for(const invalid of [{...input,name:'  '},{...input,startDate:'2026-02-29'},{...input,endDate:'2026-10-07'},{...input,startDate:'2026-1-01'},{...input,startDate:'0000-01-01'}])assert.throws(()=>validateTrip(invalid));
  assert.equal(shiftDate('2024-02-28',1),'2024-02-29');assert.equal(shiftDate('2024-02-29',1),'2024-03-01');
  assert.equal(dayNumber('2024-02-28','2024-03-01'),3);assert.equal(dayNumber('2026-10-08','2026-10-08'),1);
});
test('서울 기준 상태는 시작·종료일 포함, 한국 자정 경계와 해외 시간대에서도 동일',()=>{
  assert.equal(seoulToday(Date.UTC(2026,9,7,14,59,59)),'2026-10-07');assert.equal(seoulToday(Date.UTC(2026,9,7,15)),'2026-10-08');
  assert.equal(tripStatus(input,'2026-10-07'),'upcoming');assert.equal(tripStatus(input,'2026-10-08'),'ongoing');assert.equal(tripStatus(input,'2026-10-10'),'ongoing');assert.equal(tripStatus(input,'2026-10-11'),'past');
  const script="import {seoulToday,dayNumber,shiftDate} from './src/features/trips/services/tripRules.ts';import {formatDate} from './src/shared/i18n/format.ts';process.stdout.write(JSON.stringify([seoulToday(Date.UTC(2026,9,7,15)),dayNumber('2024-02-28','2024-03-01'),shiftDate('2026-10-08',1),formatDate('2026-10-08','en')]));";
  const outputs=['Asia/Seoul','America/Los_Angeles','Pacific/Honolulu','Pacific/Kiritimati'].map(TZ=>execFileSync(process.execPath,['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON','--input-type=module','-e',script],{cwd:process.cwd(),env:{...process.env,TZ}}).toString());assert.equal(new Set(outputs).size,1);
});
test('여러 지역·여러 날짜, 같은 날짜 동일 식별자 중복만 금지하고 국문/영문은 독립',async()=>{
  const f=fixture();const {id}=await f.repository.create(input);
  await f.repository.add(id,'2026-10-08',place(1));await f.repository.add(id,'2026-10-08',place(2,'26'));await f.repository.add(id,'2026-10-09',place(1));await f.repository.add(id,'2026-10-08',place(1,'11','en'));
  await assert.rejects(f.repository.add(id,'2026-10-08',place(1)),{kind:'duplicate'});await assert.rejects(f.repository.add(id,'2026-10-11',place(3)),{kind:'outside'});
  const {items}=await tripData(f);assert.equal(items.length,4);assert.deepEqual(items.filter(item=>item.date==='2026-10-08').map(item=>item.position),[0,1,2]);f.native.close();
});
test('동시 중복 추가는 Repository와 DB 제약으로 단 하나만 저장',async()=>{
  const f=fixture();const {id}=await f.repository.create(input);
  const results=await Promise.allSettled(Array.from({length:10},()=>f.repository.add(id,input.startDate,place(1))));
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal((await tripData(f)).items.length,1);f.native.close();
});
test('위·아래 방문 순서 교환, 경계 이동 무시, 삭제 후 연속 순서와 메모 유지',async()=>{
  const f=fixture();const {id}=await f.repository.create(input);
  for(const n of [1,2,3])await f.repository.add(id,input.startDate,place(n));
  let {items}=await tripData(f);await f.repository.saveMemo(items[1].id,'Fixture memo','');await f.repository.reorder(items[1].id,-1);
  items=(await tripData(f)).items;assert.deepEqual(items.map(item=>item.place.contentId),['2','1','3']);assert.equal(items[0].memo,'Fixture memo');
  await f.repository.reorder(items[0].id,-1);await f.repository.reorder(items[0].id,1);items=(await tripData(f)).items;assert.deepEqual(items.map(item=>item.place.contentId),['1','2','3']);
  await f.repository.removeItem(items[1].id);items=(await tripData(f)).items;assert.deepEqual(items.map(item=>item.position),[0,1]);f.native.close();
});
test('메모는 명시 저장, 충돌 시 기존 내용 유지, 이름과 메모를 SQL 데이터로만 취급',async()=>{
  const f=fixture();const {id}=await f.repository.create({...input,name:"Fixture'); DROP TABLE trips; --"});await f.repository.add(id,input.startDate,place(1));
  const item=(await tripData(f)).items[0];await f.repository.saveMemo(item.id,"Fixture'); DELETE FROM trips; --",'');
  await assert.rejects(f.repository.saveMemo(item.id,'Stale fixture edit',''),{kind:'conflict'});assert.equal((await tripData(f)).items[0].memo,"Fixture'); DELETE FROM trips; --");assert.equal((await tripData(f)).trip.id,id);f.native.close();
});
test('기간 변경 시 실제 날짜 유지, 범위 밖 이동·삭제를 한 번에 저장하고 순서·메모 보존',async()=>{
  const f=fixture();const {id}=await f.repository.create(input);
  await f.repository.add(id,'2026-10-08',place(1));await f.repository.add(id,'2026-10-09',place(2));await f.repository.add(id,'2026-10-10',place(3));
  let {trip,items}=await tripData(f);await f.repository.saveMemo(items[2].id,'Fixture retained memo','');({trip,items}=await tripData(f));
  await f.repository.update(id,{...input,startDate:'2026-10-09',endDate:'2026-10-09'},trip.revision,{[items[0].id]:{action:'delete'},[items[2].id]:{action:'move',date:'2026-10-09'}});
  ({trip,items}=await tripData(f));assert.equal(trip.startDate,'2026-10-09');assert.deepEqual(items.map(item=>item.place.contentId),['2','3']);assert.deepEqual(items.map(item=>item.position),[0,1]);assert.equal(items[1].memo,'Fixture retained memo');
  await f.repository.update(id,{...input,startDate:'2026-10-07'},trip.revision);assert.equal((await tripData(f)).items[0].date,'2026-10-09');assert.equal(dayNumber('2026-10-07','2026-10-09'),3);f.native.close();
});
test('기간 변경 취소/선택 누락/잘못된 이동/중복 충돌은 원래 기간·항목을 유지',async()=>{
  const f=fixture();const {id}=await f.repository.create(input);await f.repository.add(id,'2026-10-08',place(1));await f.repository.add(id,'2026-10-10',place(1));
  const before=await f.repository.load(),{trip,items}=await tripData(f),changed={...input,endDate:'2026-10-08'};
  assert.throws(()=>planPeriodChange(items,changed),{kind:'outside'});assert.deepEqual(await f.repository.load(),before);
  await assert.rejects(f.repository.update(id,changed,trip.revision),{kind:'outside'});
  await assert.rejects(f.repository.update(id,changed,trip.revision,{[items[1].id]:{action:'move',date:'2026-10-09'}}),{kind:'outside'});
  await assert.rejects(f.repository.update(id,changed,trip.revision,{[items[1].id]:{action:'move',date:'2026-10-08'}}),{kind:'duplicate'});
  assert.deepEqual(await f.repository.load(),before);f.native.close();
});
test('이전 편집의 revision과 오래된 처리 계획은 거부하고 새 일정 유지',async()=>{
  const f=fixture();const {id}=await f.repository.create(input);const {trip}=await tripData(f);await f.repository.add(id,input.endDate,place(1));
  await assert.rejects(f.repository.update(id,{...input,endDate:input.startDate},trip.revision),{kind:'conflict'});assert.equal((await tripData(f)).items.length,1);
  const current=(await tripData(f)).trip;await assert.rejects(f.repository.update(id,input,current.revision,{'unknown':{action:'delete'}}),{kind:'conflict'});f.native.close();
});
test('기간 변경 중 삭제/여행 수정/항목 재삽입/COMMIT 실패는 전부 롤백',async()=>{
  for(const failAt of ['DELETE FROM itinerary_items WHERE trip_id','UPDATE trips SET name','INSERT INTO itinerary_items (id','COMMIT']){
    let fail=false;const f=fixture(sql=>{if(fail&&sql.startsWith(failAt))throw new Error('Fixture failure');});const {id}=await f.repository.create(input);await f.repository.add(id,input.endDate,place(1));const before=await f.repository.load(),{trip,items}=await tripData(f);
    fail=true;await assert.rejects(f.repository.update(id,{...input,endDate:input.startDate},trip.revision,{[items[0].id]:{action:'move',date:input.startDate}}));fail=false;assert.deepEqual(await f.repository.load(),before);f.native.close();
  }
});
test('추가/순서/메모/여행 삭제 도중 실패해도 스냅샷·항목·순서·메모·여행 부분 저장 없음',async()=>{
  let failing='';const f=fixture(sql=>{if(failing&&sql.startsWith(failing))throw new Error('Fixture fault');});const {id}=await f.repository.create(input);await f.repository.add(id,input.startDate,place(1));await f.repository.add(id,input.startDate,place(2));
  const before=await f.repository.load(),item=before.items[0];
  for(const [sql,action] of [['INSERT INTO itinerary_items',()=>f.repository.add(id,input.startDate,place(3))],['UPDATE trips SET updated_at',()=>f.repository.reorder(item.id,1)],['UPDATE trips SET updated_at',()=>f.repository.saveMemo(item.id,'Fixture failed memo','')],['COMMIT',()=>f.repository.remove(id)]]){
    failing=sql;await assert.rejects(action());failing='';assert.deepEqual(await f.repository.load(),before);
  }
  assert.equal(f.native.prepare('SELECT count(*) AS n FROM place_snapshots').get().n,2);f.native.close();
});
test('장소 저장 해제·최근 삭제·스냅샷 조회와 일정은 독립, 여행 삭제 시 저장/최근 유지',async()=>{
  const f=fixture();const {id}=await f.repository.create(input);await f.library.save(place(1));await f.library.recordPlace(place(1));await f.repository.add(id,input.startDate,place(1));
  await f.library.unsave(place(1).id);await f.library.clearRecent();assert.equal((await tripData(f)).items.length,1);
  await f.library.recordPlace({...place(1),name:'Fresh fixture name'});assert.equal((await tripData(f)).items[0].place.name,'Fixture place 1');
  await f.library.save(place(1));await f.repository.remove(id);assert.equal((await f.repository.load()).items.length,0);assert.equal((await f.repository.load()).trips.length,0);assert.equal((await f.library.load()).saved.length,1);assert.equal((await f.library.load()).recent.length,1);f.native.close();
});
test('Store 중복 조작 방지, 실패는 기존 화면 유지, stale 편집 충돌 후 최신 데이터 갱신',async()=>{
  let fail=false;const f=fixture(sql=>{if(fail&&sql==='COMMIT')throw new Error('Fixture disk');});const store=new TripStore(f.repository);await store.initialize();
  const ids=await Promise.all([store.create(input),store.create(input)]);assert.equal(ids.filter(Boolean).length,1);const id=ids.find(Boolean);const revision=store.getSnapshot().trips[0].revision;
  fail=true;assert.equal(await store.add(id,input.startDate,place(1)),undefined);assert.equal(store.getSnapshot().items.length,0);assert.equal(store.getSnapshot().busy,false);assert.equal(store.getSnapshot().error,'storage');fail=false;
  await f.repository.add(id,input.endDate,place(1));assert.equal(await store.updateTrip(id,input,revision),undefined);assert.equal(store.getSnapshot().error,'conflict');assert.equal(store.getSnapshot().items.length,1);f.native.close();
});
test('기존 v2→v3 마이그레이션은 장소·최근·설정 보존, 실패 롤백 후 재개',async()=>{
  const native=new DatabaseSync(':memory:');native.exec(migrations[0]);native.exec(migrations[1]);native.exec('PRAGMA user_version=2');const p=place(1);
  native.prepare('INSERT INTO place_snapshots VALUES (?,?,?,?,?,?)').run(p.id,p.service,p.contentId,p.language,JSON.stringify(p),1);native.prepare('INSERT INTO saved_places VALUES (?,?)').run(p.id,1);native.exec("INSERT INTO recent_searches VALUES ('Fixture original',1,1); INSERT INTO preferences VALUES ('language','en');");
  let fail=true;const wrapped=connection(native,sql=>{if(fail&&sql.includes('CREATE TABLE trips')){native.exec('CREATE TABLE trips (fixture INTEGER)');throw new Error('Fixture migration');}});const db=new AppDatabase(async()=>({...wrapped,closeAsync:async()=>{}}));
  await assert.rejects(db.initialize());assert.equal(native.prepare('PRAGMA user_version').get().user_version,2);assert.equal(native.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='trips'").get().n,0);assert.equal(native.prepare('SELECT count(*) AS n FROM saved_places').get().n,1);fail=false;await db.initialize();
  assert.equal(native.prepare('PRAGMA user_version').get().user_version,3);assert.equal((await createLibraryRepository(db).load()).saved[0].place.id,p.id);assert.equal((await createSettingsRepository(db).load()).language,'en');assert.equal((await createTripRepository(db).load()).trips.length,0);native.close();
});
test('연결 종료·재연결 후 여행·다중 날짜 순서·메모와 원문 언어 복원',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'yeojeong-trips-')),path=join(folder,'trips.db');
  try{
    const first=new DatabaseSync(path),db=new AppDatabase(async()=>connection(first)),repository=createTripRepository(db);const {id}=await repository.create(input);await repository.add(id,input.startDate,place(1));await repository.add(id,input.startDate,place(2,'26','en'));await repository.add(id,input.endDate,place(1));
    let data=await repository.load();await repository.saveMemo(data.items[1].id,'Fixture restoration memo','');await repository.reorder(data.items[1].id,-1);data=await repository.load();first.close();
    const second=new DatabaseSync(path),reopened=new AppDatabase(async()=>connection(second)),store=new TripStore(createTripRepository(reopened));await store.initialize();assert.deepEqual({trips:store.getSnapshot().trips,items:store.getSnapshot().items},data);assert.equal(store.getSnapshot().items[0].place.language,'en');second.close();
  }finally{await rm(folder,{recursive:true,force:true});}
});
test('웹 페이지 종료의 동기 연결 정리 뒤 동일 DB 재연결과 일정 복원',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'yeojeong-trip-exit-')),path=join(folder,'exit.db');let opened;
  try{
    const db=new AppDatabase(async()=>{opened=new DatabaseSync(path);return {...connection(opened),closeSync:()=>opened.close()};});
    const repository=createTripRepository(db);const {id}=await repository.create(input);await repository.add(id,input.startDate,place(1));const before=await repository.load();
    db.releaseForPageExit();db.releaseForPageExit();assert.deepEqual(await repository.load(),before);db.releaseForPageExit();
  }finally{await rm(folder,{recursive:true,force:true});}
});

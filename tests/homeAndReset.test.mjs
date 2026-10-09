import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppDatabase, migrations } from '../src/shared/database/database.ts';
import { createLocalDataRepository } from '../src/features/settings/repositories/localDataRepository.ts';
import { createLibraryRepository } from '../src/features/library/repositories/libraryRepository.ts';
import { createSettingsRepository } from '../src/features/settings/repositories/settingsRepository.ts';
import { createTripRepository } from '../src/features/trips/repositories/tripRepository.ts';
import { createPlaceDetailRepository } from '../src/features/places/repositories/placeDetailRepository.ts';
import { createTourClient } from '../src/shared/api/tour/tourClient.ts';
import { parsePlaceIdentifier } from '../src/shared/models/placeDetail.ts';
import { homeTrip } from '../src/features/home/models/homeTrip.ts';
import { curations } from '../src/features/home/models/curations.ts';
import { parseSnapshot } from '../src/shared/models/placeSnapshot.ts';
import { RequestCache } from '../src/shared/cache/requestCache.ts';
const input={name:'Fixture trip',startDate:'2026-10-08',endDate:'2026-10-10'};
const place=n=>({id:`tourapi:KorService2:${n}`,contentId:String(n),service:'KorService2',language:'ko',name:`Fixture place ${n}`,type:'attraction',providerTypeCode:'12',source:'한국관광공사 TourAPI'});
function fixture(file=':memory:',intercept=()=>{}) {
 const native=new DatabaseSync(file);
 const connection={async execAsync(sql){intercept(sql);native.exec(sql);},async runAsync(sql,...values){intercept(sql);const r=native.prepare(sql).run(...values);return{changes:r.changes,lastInsertRowId:r.lastInsertRowid};},async getAllAsync(sql,...v){return native.prepare(sql).all(...v);},async getFirstAsync(sql,...v){return native.prepare(sql).get(...v)??null;},async closeAsync(){native.close();}};
 const db=new AppDatabase(async()=>connection);
 return{native,db,library:createLibraryRepository(db.forSession(),()=>123),settings:createSettingsRepository(db.forSession()),trips:createTripRepository(db.forSession(),()=>123),reset:createLocalDataRepository(db)};
}
async function seed(f) {
 const {id}=await f.trips.create(input);for(const n of[1,2])await f.trips.add(id,input.startDate,place(n));
 await f.library.save(place(1));await f.library.recordPlace(place(1));await f.library.recordSearch('Fixture query');
 await f.settings.setLanguage('ko');await f.settings.setTheme('dark');
 const item=(await f.trips.load()).items[0];await f.trips.saveMemo(item.id,'Fixture memo','');return id;
}
function assertEmpty(native){for(const table of['trips','itinerary_items','place_snapshots','saved_places','recent_places','recent_searches','preferences'])assert.equal(native.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count,0,table);}
test('홈은 진행 중 여행 우선, 없으면 가장 가까운 예정, 지난 여행 제외 및 새 사용자',()=>{
 const trip=(id,startDate,endDate)=>({...input,id,startDate,endDate,revision:0,createdAt:0,updatedAt:0});
 const past=trip('1','2026-10-01','2026-10-07'),now=trip('2','2026-10-08','2026-10-10'),soon=trip('3','2026-10-11','2026-10-12'),later=trip('4','2026-11-01','2026-11-03');
 assert.equal(homeTrip([later,soon,past,now],'2026-10-09').id,'2');assert.equal(homeTrip([later,past,soon],'2026-10-09').id,'3');assert.equal(homeTrip([past],'2026-10-09'),undefined);assert.equal(homeTrip([],'2026-10-09'),undefined);
 assert.equal(homeTrip([now,soon],'2026-10-10').id,'2');assert.equal(homeTrip([now,soon],'2026-10-11').id,'3');
});
test('큐레이션은 검증 시점·출처·언어·서비스 식별자가 있는 실제 선정 3유형이며 언어별 독립',()=>{
 for(const language of['ko','en']){const items=curations.filter(c=>c.place.language===language);assert.deepEqual(items.map(c=>c.theme),['nature','culture','food']);assert.equal(new Set(items.map(c=>c.place.id)).size,3);for(const item of items){assert.ok(item.verifiedAt>0);assert.equal(parseSnapshot(item.place).id,item.place.id);assert.equal(parsePlaceIdentifier(item.place.id).language,language);}}
});
test('전체 삭제는 모든 사용자 테이블·ID 순서를 지우고 스키마와 버전 및 기본 설정 복원 유지',async()=>{
 const f=fixture();await seed(f);let prepared=0;await f.reset.clear(async()=>{prepared++;});assert.equal(prepared,1);assertEmpty(f.native);
 assert.equal(f.native.prepare('PRAGMA user_version').get().user_version,migrations.length);
 const settings=createSettingsRepository(f.db.forSession());assert.deepEqual(await settings.load(),{});
 const trips=createTripRepository(f.db.forSession());assert.equal((await trips.load()).trips.length,0);assert.equal((await trips.create(input)).id,'1');f.native.close();
});
test('삭제 도중 신규 작업·중복 삭제 차단 및 이전 세션의 늦은 최근 기록·메모·설정 쓰기 거부',async()=>{
 const f=fixture();await seed(f);let release;const wait=new Promise(r=>release=r);
 const earlier=f.library.recordSearch('Earlier fixture search');const clearing=f.reset.clear(()=>wait);
 await assert.rejects(f.library.recordSearch('Late fixture search'));await assert.rejects(f.settings.setTheme('light'));await assert.rejects(f.db.read(async()=>true));await assert.rejects(f.reset.clear(async()=>{}));
 await earlier;release();await clearing;assertEmpty(f.native);
 await assert.rejects(f.library.recordPlace(place(3)));await assert.rejects(f.trips.create(input));await assert.rejects(f.settings.setLanguage('en'));assertEmpty(f.native);
 const newLibrary=createLibraryRepository(f.db.forSession());await newLibrary.recordSearch('New session fixture');assert.equal((await newLibrary.load()).searches.length,1);f.native.close();
});
test('사진 캐시 준비 실패 시 사용자 기록 유지하고 새 세션에서 재시도 가능',async()=>{
 const f=fixture();await seed(f);await assert.rejects(f.reset.clear(async()=>{throw new Error('fixture cache failure');}));
 assert.equal(f.native.prepare('SELECT COUNT(*) AS count FROM trips').get().count,1);assert.equal(f.native.prepare('SELECT memo FROM itinerary_items ORDER BY id').get().memo,'Fixture memo');
 await f.reset.clear(async()=>{});assertEmpty(f.native);f.native.close();
});
test('테이블별 삭제·COMMIT 실패 시 전체 롤백으로 여행·메모·스냅샷·설정 보존',async()=>{
 for(const target of['DELETE FROM trips','DELETE FROM saved_places','DELETE FROM preferences','DELETE FROM place_snapshots','COMMIT']){
  let enabled=false;const f=fixture(':memory:',sql=>{if(enabled&&sql===target)throw new Error('fixture deletion failure');});await seed(f);enabled=true;
  await assert.rejects(f.reset.clear(async()=>{}));enabled=false;
  const restored=await createTripRepository(f.db.forSession()).load();assert.equal(restored.trips.length,1);assert.equal(restored.items.length,2);assert.equal(restored.items[0].memo,'Fixture memo');
  assert.equal((await createLibraryRepository(f.db.forSession()).load()).saved.length,1);assert.deepEqual(await createSettingsRepository(f.db.forSession()).load(),{language:'ko',theme:'dark'});
  await f.reset.clear(async()=>{});assertEmpty(f.native);f.native.close();
 }
});
test('오프라인 메모·순서 편집 후 실제 DB 파일 종료·재연결 복원, 저장 해제와 캐시 만료 뒤 일정 독립',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'yeojeong-offline-test-'));const file=join(directory,'fixture.db');
 try{
  const f=fixture(file);await seed(f);let data=await f.trips.load();await f.library.unsave(place(1).id);await f.library.clearRecent();
  await f.trips.saveMemo(data.items[0].id,'Offline fixture memo','Fixture memo');await f.trips.reorder(data.items[0].id,1);
  let now=0;const cache=new RequestCache(1,1,()=>now);await cache.get('fixture',async()=>place(1));now=2;assert.equal(cache.read('fixture'),undefined);f.native.close();
  const reopened=fixture(file);data=await reopened.trips.load();assert.deepEqual(data.items.map(i=>i.place.contentId),['2','1']);assert.equal(data.items[1].memo,'Offline fixture memo');assert.equal((await reopened.library.load()).saved.length,0);
  await reopened.reset.clear(async()=>{});reopened.native.close();const after=fixture(file);assertEmpty(after.native);assert.deepEqual(await after.settings.load(),{});assert.equal((await after.trips.load()).trips.length,0);after.native.close();
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('최신 상세 빈 결과를 형식 오류와 구분하고 스냅샷·일정을 유지',async()=>{
 const f=fixture();await seed(f);
 const client=createTourClient({common:'fixture-key'},async()=>({status:200,contentType:'application/json',body:JSON.stringify({response:{header:{resultCode:'0000'},body:{items:{item:[]},totalCount:0,pageNo:1,numOfRows:1}}})}));
 const repository=createPlaceDetailRepository(client);await assert.rejects(repository.basic(parsePlaceIdentifier(place(1).id)),{kind:'missing'});assert.equal((await f.trips.load()).items.length,2);assert.equal((await f.library.load()).saved.length,1);f.native.close();
});
test('캐시 삭제 뒤 늦은 응답은 값을 재생성하지 않고 새 요청은 별도로 조회',async()=>{
 let finish;const cache=new RequestCache();const request=cache.get('fixture',()=>new Promise(resolve=>finish=resolve));const failure=assert.rejects(request,{kind:'cancelled'});
 await Promise.resolve();cache.clear();finish('Old fixture');await failure;assert.equal(cache.read('fixture'),undefined);assert.equal(await cache.get('fixture',async()=> 'New fixture'),'New fixture');
});

test('실제 확인 시점은 캐시 조회 시점으로 바꾸지 않고 제공 수정일과 구분',async()=>{
 let now=123;
 const client=createTourClient({common:'fixture-key'},async()=>({status:200,contentType:'application/json',body:JSON.stringify({response:{header:{resultCode:'0000'},body:{items:{item:[{contentid:'1',contenttypeid:'12',title:'Fixture place',modifiedtime:'20251009123456'}]},totalCount:1,pageNo:1,numOfRows:1}}})}));
 const repository=createPlaceDetailRepository(client,()=>now);const id=parsePlaceIdentifier(place(1).id);const first=await repository.basic(id);now=456;
 assert.equal(first.checkedAt,123);assert.equal((await repository.basic(id)).checkedAt,123);assert.equal(first.modifiedDate,'2025-10-09');repository.dispose();
});

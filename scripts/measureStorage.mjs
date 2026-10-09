// 실제 사용자 DB 대신 고정 목업 데이터와 Node 내장 SQLite로 Repository 비용을 비교한다.
import { DatabaseSync } from 'node:sqlite';
import { performance } from 'node:perf_hooks';
import { AppDatabase } from '../src/shared/database/database.ts';
import { createLibraryRepository } from '../src/features/library/repositories/libraryRepository.ts';
import { serializeSnapshot } from '../src/shared/models/placeSnapshot.ts';
const native=new DatabaseSync(':memory:');
const db=new AppDatabase(async()=>({
 async execAsync(sql){native.exec(sql);},async runAsync(sql,...v){const r=native.prepare(sql).run(...v);return{changes:r.changes,lastInsertRowId:r.lastInsertRowid};},
 async getFirstAsync(sql,...v){return native.prepare(sql).get(...v)??null;},async getAllAsync(sql,...v){return native.prepare(sql).all(...v);},async closeAsync(){native.close();},
}));
await db.initialize();
await db.transaction(async connection=>{
 for(let n=1;n<=1000;n++){
  const place={id:`tourapi:KorService2:${n}`,contentId:String(n),service:'KorService2',language:'ko',name:`Synthetic fixture ${n}`,type:'attraction',providerTypeCode:'12',address:'Synthetic address',regionCode:'11',districtCode:'110',longitude:127,latitude:37,source:'한국관광공사 TourAPI'};
  await connection.runAsync('INSERT INTO place_snapshots VALUES (?,?,?,?,?,?)',place.id,place.service,place.contentId,place.language,serializeSnapshot(place),123);
  await connection.runAsync('INSERT INTO saved_places VALUES (?,?)',place.id,123);
 }
});
const repository=createLibraryRepository(db.forSession());
const samples=[];
for(let n=0;n<31;n++){const started=performance.now();await repository.load();samples.push(performance.now()-started);}
const warm=samples.slice(1).sort((a,b)=>a-b);
console.log(JSON.stringify({environment:`Node ${process.version}, ${process.platform}/${process.arch}, SQLite ${native.prepare('select sqlite_version() as version').get().version}`,fixtureRecords:1000,samples:30,coldLoadMs:samples[0],warmP50Ms:warm[15],warmP95Ms:warm[28],heapBytes:process.memoryUsage().heapUsed,scope:'in-memory SQLite repository; not native app frame or memory measurement'}));
native.close();

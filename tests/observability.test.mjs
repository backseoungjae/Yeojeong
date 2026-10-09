import test from 'node:test';
import assert from 'node:assert/strict';
import { safeLog, createLogger } from '../src/shared/observability/structuredLog.ts';
test('로그는 고정 이벤트/영역/분류/시각만 허용하고 인증키·URL·개인 기록·원본 오류를 제거',()=>{
 const secret='fixture-private-value';
 for(const kind of [secret,`https://example.test/?serviceKey=${secret}`,new Error(secret),{kind:'network',memo:secret,name:secret,latitude:37,longitude:127},{toString(){throw new Error(secret);}}]){
  const record=safeLog('api_failure','tour',kind,()=>123);
  assert.deepEqual(Object.keys(record),['event','scope','kind','at']);assert.equal(record.kind,'render');assert.ok(!JSON.stringify(record).includes(secret));
 }
 assert.equal(safeLog(secret,secret,secret,()=>123).scope,'root');
 assert.deepEqual(safeLog('api_failure','tour','authentication',()=>123),{event:'api_failure',scope:'tour',kind:'authentication',at:123});
});
test('로그 출력 실패는 업무 오류를 만들지 않고 같은 안전한 구조로 전달',()=>{
 const records=[];const write=createLogger(record=>records.push(record),()=>456);write('storage_failure','database','write');assert.equal(records[0].at,456);
 assert.doesNotThrow(()=>createLogger(()=>{throw new Error('fixture sink failure');})('render_failure','root','render'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTourResponse } from '../src/shared/api/tour/tourDto.ts';
import { toPlace, placeType, httpsImage } from '../src/shared/api/tour/placeAdapter.ts';
import { resolveTourKey, configurationStatus } from '../src/shared/api/tour/tourConfig.ts';
import { createTourClient } from '../src/shared/api/tour/tourClient.ts';
import { runTourDiagnostics } from '../src/features/api-diagnostics/services/tourDiagnostics.ts';
const envelope = (items, totalCount = 1, resultCode = '0000') => JSON.stringify({ response: { header: { resultCode }, body: { items, totalCount, pageNo: 1, numOfRows: 3 } } });
const fixture = { contentid: '123', title: '장소', contenttypeid: '12' };
const kind = expected => error => error.kind === expected;
test('빈 응답·단일 객체·배열 및 문자열 페이지 숫자 처리', () => {
  assert.equal(parseTourResponse(envelope('', 0), 200).items.length, 0);
  assert.equal(parseTourResponse(envelope({ item: fixture }), 200).items.length, 1);
  assert.equal(parseTourResponse(envelope({ item: [fixture] }), 200).items.length, 1);
  const response = JSON.parse(envelope('', 0)); response.response.body.totalCount = '0';
  assert.equal(parseTourResponse(JSON.stringify(response), 200).totalCount, 0);
});
test('API 성공이어도 HTTP 실패이며 HTTP 200의 API 오류도 실패', () => {
  assert.throws(() => parseTourResponse(envelope('',0),503), kind('http'));
  for (const code of ['20','30','31']) assert.throws(() => parseTourResponse(envelope('',0,code),200),kind('authentication'));
  for (const code of ['22','23']) assert.throws(() => parseTourResponse(envelope('',0,code),200),kind('quota'));
  assert.throws(() => parseTourResponse(envelope('',0,'99'),200),kind('api'));
});
test('XML 인증/할당량 오류와 비 JSON·잘못된 구조 분리', () => {
  assert.throws(() => parseTourResponse('<returnReasonCode>30</returnReasonCode>',200),kind('authentication'));
  assert.throws(() => parseTourResponse('<returnReasonCode>22</returnReasonCode>',200),kind('quota'));
  for (const body of ['<html>failure</html>', '{}', 'null']) assert.throws(() => parseTourResponse(body,200),kind('format'));
  assert.throws(() => parseTourResponse('failure',429),kind('quota'));
  assert.throws(() => parseTourResponse(envelope({ item: [null] }),200),kind('format'));
  assert.throws(() => parseTourResponse(envelope('',3),200),kind('format'));
});
test('필수 표시·식별자 누락은 실패, 선택 정보와 잘못된 좌표는 보충하지 않음', () => {
  for (const field of ['contentid','title','contenttypeid']) { const row = { ...fixture }; delete row[field]; assert.throws(() => toPlace(row,'ko'),kind('format')); }
  assert.throws(() => toPlace({ ...fixture, contentid: 123 },'ko'),kind('format'));
  const place = toPlace({ ...fixture, addr1: '', mapx: '181', mapy: 'NaN' },'ko');
  assert.equal(place.address,undefined); assert.equal(place.longitude,undefined); assert.equal(place.latitude,undefined);
});
test('서비스마다 세 타입 변환 및 언어 간 동일 콘텐츠 ID도 독립', () => {
  for (const [language,codes] of [['ko',['12','14','39']],['en',['76','78','82']]]) codes.forEach((code,index) => assert.equal(placeType(language,code),['attraction','culture','restaurant'][index]));
  assert.equal(placeType('en','12'),'other');
  assert.notEqual(toPlace(fixture,'ko').id,toPlace({ ...fixture, contenttypeid: '76' },'en').id);
});
test('미검증 HTTP 이미지는 치환하지 않고 원본과 이용 유형 보존', () => {
  const image = 'http://tong.visitkorea.or.kr/cms/a.jpg';
  const place = toPlace({ ...fixture, firstimage: image, cpyrhtDivCd:'Type3' },'ko');
  assert.equal(place.imageSourceUrl,image); assert.equal(place.imageUrl,undefined); assert.equal(place.imageLicense,'Type3');
  assert.equal(httpsImage('javascript:alert(1)'),undefined); assert.equal(httpsImage('https://user:pass@example.com/a'),undefined);
});
test('키 우선순위·인코딩과 설정 검증', () => {
  assert.equal(resolveTourKey({ common:'a%2Bb%2Fc%3D' },'ko'),'a+b/c=');
  assert.equal(resolveTourKey({ common:'common',ko:'korean' },'ko'),'korean');
  assert.equal(resolveTourKey({ common:'common',ko:' ' },'ko'),'common');
  for (const key of ['', 'your_key','%zz','a b']) assert.throws(() => resolveTourKey({ common:key },'ko'),kind('configuration'));
  assert.deepEqual(configurationStatus({}),[{language:'ko',configured:false},{language:'en',configured:false}]);
});
test('요청 이름·필수값·계층 조건 검증, 검색에는 contentTypeId 전달 금지', async () => {
  let calls = 0; const client=createTourClient({ common:'test' }, async () => { calls++; return { status:200,body:envelope('',0) }; });
  for (const params of [{ keyword:'x',contentTypeId:'12' },{keyword:''},{keyword:'x',lclsSystm3:'x'}, {keyword:'x',lDongSignguCd:'110'}]) await assert.rejects(client.request('ko','searchKeyword2',params),kind('parameters'));
  await assert.rejects(client.request('ko','detailIntro2',{contentId:'1'}),kind('parameters'));
  await assert.rejects(client.request('ko','ldongCode2',{numOfRows:'-1'}),kind('parameters'));
  assert.equal(calls,0);
});
test('한글 키워드와 키는 한 번 인코딩, 오류 메시지는 원본 URL 노출하지 않음', async () => {
  const client=createTourClient({common:'a%2Bb%3D'},async url => {
    const parsed = new URL(url); assert.equal(parsed.searchParams.get('keyword'),'경복궁'); assert.equal(parsed.searchParams.get('serviceKey'),'a+b=');
    assert.equal(parsed.pathname,'/B551011/EngService2/searchKeyword2');
    throw new Error(url);
  });
  await assert.rejects(client.request('en','searchKeyword2',{keyword:'경복궁'}),error => error.kind==='network' && !String(error).includes('serviceKey') && !error.cause);
});
test('취소를 무시하고 늦게 끝나는 transport 결과도 수락하지 않음', async () => {
  let complete; const controller=new AbortController();
  const client=createTourClient({common:'test'},() => new Promise(resolve => {complete=resolve;}));
  const promise=client.request('ko','areaBasedList2',{},controller.signal); controller.abort();
  complete({status:200,body:envelope({item:fixture})}); await assert.rejects(promise,kind('cancelled'));
});
test('시간 초과와 사용자 취소 구분', async () => {
  const client=createTourClient({common:'test'},async (_url,signal) => new Promise((_resolve,reject) => signal.addEventListener('abort',()=>reject(new Error('aborted')))), 'ETC', 5);
  await assert.rejects(client.request('ko','areaBasedList2'),kind('timeout'));
});
test('인증 오류 이후 해당 언어의 호출 중단, 자동 재시도 없음', async () => {
  let calls=0;
  const client=createTourClient({common:'test'},async () => {calls++;return {status:200,body:envelope('',0,'30')};});
  const results=await runTourDiagnostics(client);
  assert.equal(calls,2); assert.equal(results.filter(x=>x.state==='error').length,2); assert.equal(results.filter(x=>x.state==='skipped').length,36);
});

test('실제 게이트웨이 JSON 인증 오류 envelope와 HTTP 비정형 본문', () => {
  const gateway = JSON.stringify({ OpenAPI_ServiceResponse: { cmmMsgHeader: { errMsg: 'SERVICE ERROR', returnAuthMsg: 'SERVICE_KEY_IS_NOT_REGISTERED_ERROR', returnReasonCode: '30' } } });
  assert.throws(() => parseTourResponse(gateway,403), error => error.kind === 'authentication' && error.code === '30' && error.status === 403);
  assert.throws(() => parseTourResponse('{}',403),kind('authentication'));
  assert.throws(() => parseTourResponse('{}',500),kind('http'));
});
test('상세 한 영역 실패 후 다른 조회 유지 및 미실행 선행조건 표시', async () => {
  const client=createTourClient({common:'test'},async rawUrl => {
    const url=new URL(rawUrl); const endpoint=url.pathname.split('/').at(-1); const params=url.searchParams;
    if (endpoint === 'detailIntro2' && params.get('contentTypeId') === '14') return {status:503,body:'temporarily unavailable'};
    if (endpoint === 'areaBasedList2') return {status:200,body:envelope({item:{...fixture,contenttypeid:params.get('contentTypeId'),contentid:`sample${params.get('contentTypeId')}`}})};
    if (endpoint === 'detailCommon2') return {status:200,body:envelope({item:{...fixture,contentid:params.get('contentId'),contenttypeid:params.get('contentId').replace('sample','')}})};
    if (endpoint === 'detailIntro2') return {status:200,body:envelope({item:{contentid:params.get('contentId')}})};
    return {status:200,body:envelope('',0)};
  });
  const results=await runTourDiagnostics(client);
  assert.equal(results.length,38);
  assert.equal(results.find(x=>x.language==='ko'&&x.check==='cultureIntro').state,'error');
  assert.equal(results.find(x=>x.language==='ko'&&x.check==='cultureCommon').state,'ok');
  assert.equal(results.find(x=>x.language==='ko'&&x.check==='cultureImages').state,'empty');
  assert.equal(results.find(x=>x.language==='ko'&&x.check==='searchFiltered').state,'skipped');
});

test('검증된 관광공사 CDN 이미지 경로만 HTTPS로 표시하고 원본 보존', () => {
  const image = 'http://tong.visitkorea.or.kr/cms/resource/28/2993428_image2_1.jpg';
  const thumb = 'http://tong.visitkorea.or.kr/cms/resource/28/2993428_image3_1.JPG';
  const place = toPlace({ ...fixture, firstimage: image, firstimage2: thumb, cpyrhtDivCd: 'Type3' }, 'en');
  assert.equal(place.imageSourceUrl, image); assert.equal(place.imageUrl, image.replace('http:', 'https:'));
  assert.equal(place.listImageUrl, thumb.replace('http:', 'https:')); assert.equal(place.imageLicense, 'Type3');
  for (const address of [
    'http://example.com/cms/resource/28/a.jpg', 'http://tong.visitkorea.or.kr.evil.test/cms/resource/28/a.jpg',
    'http://tong.visitkorea.or.kr/other/a.jpg', 'http://tong.visitkorea.or.kr/cms/resource/28/a.html',
    'http://user:pass@tong.visitkorea.or.kr/cms/resource/28/a.jpg', 'http://tong.visitkorea.or.kr:8080/cms/resource/28/a.jpg',
    'http://tong.visitkorea.or.kr/cms/resource/28/a.jpg?redirect=x', 'http://tong.visitkorea.or.kr/cms/resource/28/a.jpg#x',
  ]) assert.equal(httpsImage(address), undefined, address);
});

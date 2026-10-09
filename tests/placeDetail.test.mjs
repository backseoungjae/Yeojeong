import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlaceIdentifier } from '../src/shared/models/placeDetail.ts';
import { plainText, websiteUrl, phoneUrl, toPlaceDetail, toPlaceInfo, toPlacePhoto } from '../src/shared/api/tour/detailAdapter.ts';
import { createTourClient } from '../src/shared/api/tour/tourClient.ts';
import { TourError } from '../src/shared/api/tour/tourError.ts';
import { createPlaceDetailRepository } from '../src/features/places/repositories/placeDetailRepository.ts';
import { PlaceDetailController } from '../src/features/places/models/placeDetailController.ts';
import { galleryPhotos } from '../src/features/places/models/galleryPhotos.ts';
const ko = parsePlaceIdentifier('tourapi:KorService2:123'), en = parsePlaceIdentifier('tourapi:EngService2:123');
const row = (code = '12') => ({ contentid: '123', contenttypeid: code, title: 'Place', addr1: 'Address', modifiedtime: '20261008123045' });
const detail = toPlaceDetail(row(), ko);
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; let reject; const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; }); return { promise, resolve, reject }; };
const response = (items, total = items.length, number = 1) => ({ status: 200, body: JSON.stringify({ response: { header: { resultCode: '0000' }, body: { items: items.length ? { item: items } : '', totalCount: total, pageNo: number, numOfRows: 100 } } }) });
test('공급자 식별자는 엄격하게 검증하고 동일 ID도 서비스별 언어를 유지', () => {
  assert.equal(ko.language, 'ko'); assert.equal(en.language, 'en');
  for (const id of ['123','preview','tourapi:Other:123','tourapi:KorService2:../../abc','tourapi:KorService2:123?key=x','tourapi:KorService2:']) assert.throws(() => parsePlaceIdentifier(id), { kind: 'parameters' });
});
test('HTML은 실행 가능한 영역을 제거한 일반 텍스트로 변환하고 줄바꿈·엔티티 정리', () => {
  assert.equal(plainText('<p>Hello &amp; world</p><script>alert(1)</script><style>x</style><iframe src="x">bad</iframe><div>Second<br/>line &#x1f30f; &nbsp; &#169;</div>'), 'Hello & world\nSecond\nline 🌏 ©');
  assert.equal(plainText('<p title="a > b">First</p><!--note--><b>Next</b>\r\n\r\n\r\nlast'), 'First\nNext\n\nlast');
  assert.equal(plainText('<script>unfinished'), undefined); assert.equal(plainText('   '), undefined);
  assert.equal(plainText('&lt;img src=x onerror=alert(1)&gt;'), '<img src=x onerror=alert(1)>'); // Text에서만 표시되므로 HTML로 실행되지 않는다.
});
test('홈페이지는 절대 HTTP(S)만 허용하며 자격증명·제어 문자·복수 링크 차단', () => {
  assert.equal(websiteUrl('<a href="https://example.com/page?a=1&amp;b=2" target="_blank">Website</a>'), 'https://example.com/page?a=1&b=2');
  assert.equal(websiteUrl('http://example.com'), 'http://example.com/');
  for (const url of ['javascript:alert(1)','data:text/html,x','file:///tmp/a','tel:0212345678','//example.com','/relative','https://u:p@example.com','https://example.com/%0afoo','https://example.com/ a','https://localhost/a','https://127.0.0.1/a','https://example.com\\evil','<a href="https://a.com">a</a><a href="https://b.com">b</a>']) assert.equal(websiteUrl(url), undefined, url);
});
test('전화번호는 단일 번호만 연결하고 안내·복수 번호·URI 주입은 연결하지 않음', () => {
  assert.equal(phoneUrl('+82 (2) 1234-5678'), 'tel:+82212345678'); assert.equal(phoneUrl('1330'), 'tel:1330');
  for (const number of ['tel:1234','123','02-1234-5678 / 02-9876-5432','Call 02-1234-5678','02-1234-5678\n999','1234;ext=22','javascript:alert(1)']) assert.equal(phoneUrl(number), undefined);
});
test('기본 상세의 설명·주소·연락처·수정일 누락과 잘못된 값은 추정하지 않음', () => {
  const value = toPlaceDetail({ ...row(), overview: '<p>About<br>place</p>', addr2: 'Second address', tel: '02-1234-5678', homepage: '<a href="https://example.com">go</a>' }, ko);
  assert.equal(value.address, 'Address Second address'); assert.equal(value.description, 'About\nplace'); assert.equal(value.modifiedDate, '2026-10-08'); assert.equal(value.phoneUrl, 'tel:0212345678');
  const missing = toPlaceDetail({ ...row(), addr1: '', modifiedtime: '20260230010101' }, ko);
  assert.equal(missing.address, undefined); assert.equal(missing.description, undefined); assert.equal(missing.modifiedDate, undefined); assert.equal(missing.websiteUrl, undefined);
  assert.throws(() => toPlaceDetail({ ...row(), contentid: '999' }, ko), { kind: 'format' });
  assert.equal(toPlaceDetail({ ...row('76'), addr1: 'English address' }, en).place.language, 'en');
});
test('두 언어의 세 유형마다 실제 제공 필드만 공통 이용 정보로 변환', () => {
  for (const [id, codes] of [[ko, ['12','14','39']], [en, ['76','78','82']]]) {
    const a = toPlaceInfo({ ...row(codes[0]), usetime: 'Hours', restdate: 'Closed', infocenter: '02-1234-5678', usefee: 'Wrong type fee' }, id, toPlaceDetail(row(codes[0]), id));
    assert.deepEqual(a.map(p => p.key), ['hours','closed','contact']); assert.equal(a[2].phoneUrl, 'tel:0212345678');
    const b = toPlaceInfo({ ...row(codes[1]), usetimeculture: 'Hours', usefee: 'Fee supplied', parkingfee: 'Parking fee' }, id, toPlaceDetail(row(codes[1]), id));
    assert.deepEqual(b.map(p => p.key), ['hours','fees','parkingFees']);
    const c = toPlaceInfo({ ...row(codes[2]), opentimefood: 'Hours', firstmenu: 'Menu', treatmenu: 'More', reservationfood: '<b>Book</b>' }, id, toPlaceDetail(row(codes[2]), id));
    assert.deepEqual(c.map(p => p.key), ['hours','menu','otherMenu','reservation']);
    assert.deepEqual(toPlaceInfo(row(codes[1]), id, toPlaceDetail(row(codes[1]), id)), []);
  }
  assert.throws(() => toPlaceInfo(row('39'), ko, detail), { kind: 'format' });
});
test('사진 원본·이용 유형 보존, HTTP는 바꾸지 않고 상세 사진이 비면 실제 대표사진 사용', () => {
  const photo = toPlacePhoto({ contentid: '123', serialnum: '1', originimgurl: 'http://example.com/a.jpg', cpyrhtDivCd: 'Type3', imgname: '<b>Photo</b>' }, ko, 0);
  assert.equal(photo.url, undefined); assert.equal(photo.sourceUrl, 'http://example.com/a.jpg'); assert.equal(photo.license, 'Type3'); assert.equal(photo.name, 'Photo');
  const withImage = toPlaceDetail({ ...row(), firstimage: 'https://example.com/a.jpg', cpyrhtDivCd: 'Type1' }, ko);
  assert.equal(galleryPhotos([], withImage)[0].url, 'https://example.com/a.jpg'); assert.equal(galleryPhotos([photo], withImage)[0], photo); assert.deepEqual(galleryPhotos([], detail), []);
});
test('상세 캐시는 서비스별 분리, 이용 정보는 기본 상세의 검증된 타입을 사용', async () => {
  const calls = [];
  const repository = createPlaceDetailRepository(createTourClient({ common: 'mock-key' }, async raw => {
    const url = new URL(raw); calls.push(url); return response([row(url.pathname.includes('EngService2') ? '76' : '12')]);
  }));
  const basic = await repository.basic(ko); await repository.basic(ko); await repository.basic(en); await repository.info(ko, basic);
  assert.equal(calls.length, 3); assert.ok(calls[1].pathname.includes('EngService2')); assert.equal(calls[2].searchParams.get('contentTypeId'), '12');
  await repository.info(ko, toPlaceDetail(row('99'), ko)); assert.equal(calls.length, 3);
});
test('빈 사진·이용 정보는 정상, 사진 페이지 중복 제거 및 잘못된 식별자 거부', async () => {
  const repository = createPlaceDetailRepository(createTourClient({ common: 'mock-key' }, async raw => {
    const url = new URL(raw);
    if (url.pathname.endsWith('detailImage2')) return response([{ contentid: '123', originimgurl: 'https://example.com/a.jpg' }, { contentid: '123', originimgurl: 'https://example.com/a.jpg' }]);
    return response([]);
  }));
  assert.equal((await repository.photos(ko)).length, 1); assert.deepEqual(await repository.info(ko, detail), []);
  await assert.rejects(repository.basic(ko), { kind: 'missing' });
  const wrong = createPlaceDetailRepository(createTourClient({ common: 'mock-key' }, async () => response([{ contentid: '999', originimgurl: 'https://example.com/a.jpg' }])));
  await assert.rejects(wrong.photos(ko), { kind: 'format' });
});
test('이용 정보 부분 실패: 기본·사진 유지, 해당 영역만 재시도하고 중복 요청 방지', async () => {
  const calls = { basic: 0, info: 0, photos: 0 }; const task = deferred();
  const controller = new PlaceDetailController({ basic: async () => { calls.basic++; return detail; }, photos: async () => { calls.photos++; return []; }, info: async () => { if (++calls.info === 1) throw new TourError('network'); return task.promise; } }, ko.id);
  controller.start(); await tick(); assert.equal(controller.getSnapshot().basic.data, detail); assert.equal(controller.getSnapshot().info.status, 'error'); assert.equal(controller.getSnapshot().photos.status, 'success');
  controller.retry('info'); controller.retry('info'); assert.deepEqual(calls, { basic: 1, info: 2, photos: 1 });
  task.resolve([{ key: 'hours', value: 'Hours' }]); await tick(); assert.equal(controller.getSnapshot().info.status, 'success');
});
test('기본 실패는 이용 정보만 대기하고 사진은 독립 성공, 기본 재시도 후 이용 정보 연결', async () => {
  let basic = 0, info = 0, photos = 0;
  const controller = new PlaceDetailController({ basic: async () => { if (++basic === 1) throw new TourError('timeout'); return detail; }, info: async () => { info++; return []; }, photos: async () => { photos++; return []; } }, ko.id);
  controller.start(); await tick(); assert.equal(controller.getSnapshot().info.status, 'blocked'); assert.equal(controller.getSnapshot().photos.status, 'success'); assert.equal(info, 0);
  controller.retry('basic'); await tick(); assert.deepEqual([basic, info, photos], [2,1,1]);
});
test('사진 실패와 재시도도 기본·이용 정보를 다시 요청하지 않음, 인증·할당량 재시도 금지', async () => {
  for (const kind of ['network','authentication','quota']) {
    const calls = { basic: 0, info: 0, photos: 0 };
    const controller = new PlaceDetailController({ basic: async () => { calls.basic++; return detail; }, info: async () => { calls.info++; return []; }, photos: async () => { calls.photos++; throw new TourError(kind); } }, ko.id);
    controller.start(); await tick(); controller.retry('photos'); await tick();
    assert.equal(calls.basic, 1); assert.equal(calls.info, 1); assert.equal(calls.photos, kind === 'network' ? 2 : 1);
  }
});
test('경로 변경·화면 이탈 뒤 늦은 응답은 무시하고 재시작은 취소된 영역만 요청', async () => {
  const old = deferred(); let calls = 0;
  const controller = new PlaceDetailController({ basic: async () => ++calls === 1 ? old.promise : detail, info: async () => [], photos: async () => [] }, ko.id);
  controller.start(); await tick(); controller.dispose(); old.resolve(detail); await tick(); assert.equal(controller.getSnapshot().basic.status, 'idle');
  controller.start(); await tick(); assert.equal(controller.getSnapshot().basic.status, 'success'); assert.equal(calls, 2);
});
test('잘못된 식별자는 API를 호출하지 않음', () => {
  const controller = new PlaceDetailController({ basic: async () => { assert.fail('unexpected call'); }, info: async () => { assert.fail('unexpected call'); }, photos: async () => { assert.fail('unexpected call'); } }, 'preview');
  controller.start(); assert.equal(controller.getSnapshot().basic.error.kind, 'parameters');
});

test('영문 상세 사진도 같은 CDN 규칙을 사용하며 언어·원본·라이선스를 유지', () => {
  const source = 'http://tong.visitkorea.or.kr/cms/resource/28/2993428_image2_1.jpg';
  const photo = toPlacePhoto({ contentid: '123', originimgurl: source, smallimageurl: source.replace('image2', 'image3'), cpyrhtDivCd: 'Type3' }, en, 0);
  assert.equal(photo.sourceUrl, source); assert.equal(photo.url, source.replace('http:', 'https:'));
  assert.equal(photo.thumbnailUrl, source.replace('http:', 'https:').replace('image2', 'image3'));
  assert.equal(photo.license, 'Type3'); assert.ok(photo.id.includes('EngService2'));
});

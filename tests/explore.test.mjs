import test from 'node:test';
import assert from 'node:assert/strict';
import { RequestCache } from '../src/shared/cache/requestCache.ts';
import { createTourClient } from '../src/shared/api/tour/tourClient.ts';
import { TourError } from '../src/shared/api/tour/tourError.ts';
import { createPlaceRepository } from '../src/features/explore/repositories/placeRepository.ts';
import { ExploreStore } from '../src/features/explore/models/exploreStore.ts';
import { changeRegion, defaultConditions, queryKey } from '../src/features/explore/models/exploreQuery.ts';
const deferred = () => { let resolve; let reject; const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; }); return { resolve, reject, promise }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
const response = (items, total = items.length, page = 1, rows = 20) => ({ status: 200, body: JSON.stringify({ response: { header: { resultCode: '0000' }, body: { items: items.length ? { item: items } : '', totalCount: total, pageNo: page, numOfRows: rows } } }) });
const item = (id, language = 'ko') => ({ contentid: id, contenttypeid: language === 'ko' ? '12' : '76', title: `Place ${id}`, lDongRegnCd: '11', lDongSignguCd: '11110' });
const repo = send => createPlaceRepository(createTourClient({ common: 'mock-key' }, send));
const page = (ids, number = 1, hasNext = false) => ({ places: ids.map(id => ({ id, name: id })), page: number, totalCount: 50, hasNext });
const fakeRepo = load => ({ page: load, cachedPage: () => undefined, regions: async () => [] });
test('통신 실패 뒤 같은 검색어 명시 제출은 새 요청, 요청 중 제출은 중복 호출하지 않음', async () => {
  for (const failure of [new TourError('network'), new TourError('timeout'), new TourError('http', undefined, 503)]) {
    let calls = 0; const recovery = deferred(); const requests = [];
    const store = new ExploreStore(fakeRepo(async (language, conditions, number) => {
      calls++; requests.push({ ...conditions, page: number });
      if (calls === 1) throw failure;
      return recovery.promise;
    }), 'ko');
    store.setKeywordInput('  palace  '); store.submit(); await tick();
    assert.equal(store.getSnapshot().error, failure);
    store.ensureLoaded(); store.apply(store.getSnapshot().conditions); assert.equal(calls, 1);
    store.setKeywordInput('palace'); store.submit(); store.submit(); store.ensureLoaded();
    assert.equal(calls, 2); assert.equal(store.getSnapshot().loading, true);
    assert.deepEqual(requests.map(value => [value.keyword, value.page]), [['palace', 1], ['palace', 1]]);
    recovery.resolve(page(['recovered'])); await tick();
    assert.equal(store.getSnapshot().error, undefined);
    assert.equal(store.getSnapshot().places[0].id, 'recovered');
    store.submit(); assert.equal(calls, 2);
  }
});
test('인증·할당량 오류는 같은 조건의 재검색으로도 자동 요청을 재개하지 않음', async () => {
  for (const kind of ['authentication', 'quota']) {
    let calls = 0;
    const store = new ExploreStore(fakeRepo(async () => { calls++; throw new TourError(kind); }), 'ko');
    store.setKeywordInput('palace'); store.submit(); await tick();
    store.ensureLoaded(); store.loadNext(); store.submit(); await tick();
    assert.equal(calls, 1); assert.equal(store.getSnapshot().error.kind, kind);
  }
});
test('상위 지역 변경은 하위 선택 초기화, 검색 유형 결합은 거부', () => {
  assert.equal(changeRegion({ ...defaultConditions, regionCode: '11', districtCode: '11110' }, '26').districtCode, undefined);
  assert.equal(changeRegion({ ...defaultConditions, regionCode: '11', districtCode: '11110' }).regionCode, undefined);
  assert.throws(() => queryKey('ko', { keyword: 'palace', type: 'attraction' }), { kind: 'parameters' });
  assert.throws(() => queryKey('ko', { ...defaultConditions, districtCode: '11110' }), { kind: 'parameters' });
});
test('언어·서비스·검색어·지역·유형·페이지별 캐시 분리 및 실제 요청 파라미터', async () => {
  const calls = [];
  const repository = repo(async url => {
    const value = new URL(url); calls.push(value);
    return response([item('1', value.pathname.includes('EngService2') ? 'en' : 'ko')], 1, Number(value.searchParams.get('pageNo')));
  });
  await repository.page('ko', defaultConditions, 1); await repository.page('ko', defaultConditions, 1);
  await repository.page('en', defaultConditions, 1);
  for (const value of [{ ...defaultConditions, regionCode: '11' }, { ...defaultConditions, regionCode: '11', districtCode: '11110' }, { ...defaultConditions, type: 'culture' }, { ...defaultConditions, keyword: 'palace' }]) await repository.page('ko', value, 1);
  await repository.page('ko', defaultConditions, 2);
  assert.equal(calls.length, 7);
  assert.ok(calls[1].pathname.includes('EngService2'));
  assert.equal(calls[2].searchParams.get('lDongRegnCd'), '11');
  assert.equal(calls[3].searchParams.get('lDongSignguCd'), '11110');
  assert.equal(calls[4].searchParams.get('contentTypeId'), '14');
  assert.ok(calls[5].pathname.endsWith('searchKeyword2')); assert.equal(calls[5].searchParams.has('contentTypeId'), false);
  const ko = await repository.page('ko', defaultConditions, 1), en = await repository.page('en', defaultConditions, 1);
  assert.notEqual(ko.places[0].id, en.places[0].id);
});
test('영문 세 유형의 검증된 코드 전달, 검색 지역 조건만 전달', async () => {
  const calls = [];
  const repository = repo(async url => { calls.push(new URL(url)); return response([], 0); });
  for (const type of ['attraction', 'culture', 'restaurant']) await repository.page('en', { ...defaultConditions, type }, 1);
  assert.deepEqual(calls.map(value => value.searchParams.get('contentTypeId')), ['76', '78', '82']);
  await repository.page('en', { ...defaultConditions, keyword: 'palace', regionCode: '11', districtCode: '11110' }, 1);
  assert.equal(calls[3].searchParams.get('keyword'), 'palace'); assert.equal(calls[3].searchParams.get('lDongSignguCd'), '11110');
  assert.equal(calls[3].searchParams.has('contentTypeId'), false);
});
test('지역 코드가 반환 행 수를 numOfRows로 보내도 정상, 언어·상위별 분리와 중복 제거', async () => {
  const calls = [];
  const repository = repo(async url => { calls.push(new URL(url)); return response([{ code: '36110', name: 'Sejong' }, { code: '36110', name: 'Sejong' }], 2, 1, 2); });
  assert.equal((await repository.regions('ko')).length, 1); await repository.regions('ko');
  await repository.regions('en'); await repository.regions('ko', '36110');
  assert.equal(calls.length, 3); assert.equal(calls[2].searchParams.get('lDongRegnCd'), '36110');
});
test('같은 요청 공유, 한 이용자의 취소는 다른 이용자의 요청을 취소하지 않음', async () => {
  const cache = new RequestCache(); const task = deferred(); let count = 0; let signal;
  const load = value => { signal = value; count++; return task.promise; };
  const a = new AbortController(), b = new AbortController();
  const first = cache.get('query', load, a.signal), second = cache.get('query', load, b.signal);
  await tick(); a.abort(); await assert.rejects(first, { kind: 'cancelled' });
  assert.equal(signal.aborted, false); task.resolve(42); assert.equal(await second, 42); assert.equal(count, 1);
});
test('전체 취소 후 늦은 응답은 캐시에 남지 않고 같은 키의 새 요청에 간섭하지 않음', async () => {
  const cache = new RequestCache(); const task = deferred(), controller = new AbortController();
  const first = cache.get('same', () => task.promise, controller.signal); await tick(); controller.abort(); await assert.rejects(first, { kind: 'cancelled' });
  assert.equal(await cache.get('same', async () => 2), 2); task.resolve(1); await tick(); assert.equal(cache.read('same'), 2);
});
test('TTL 만료와 LRU 제한, 실패 응답은 캐시하지 않음', async () => {
  let now = 0; const cache = new RequestCache(10, 2, () => now);
  await cache.get('a', async () => 1); await cache.get('b', async () => 2); assert.equal(cache.read('a'), 1);
  await cache.get('c', async () => 3); assert.equal(cache.read('b'), undefined);
  now = 11; assert.equal(cache.read('a'), undefined);
  await assert.rejects(cache.get('failed', async () => { throw new TourError('quota'); }), { kind: 'quota' });
  assert.equal(cache.read('failed'), undefined);
});
test('빠른 조건 변경: 이전 요청이 취소를 무시하고 늦게 성공·실패해도 최신 결과 유지', async () => {
  for (const oldFailure of [false, true]) {
    const old = deferred(), latest = deferred(); const signals = [];
    const store = new ExploreStore(fakeRepo((language, conditions, number, signal) => { signals.push(signal); return conditions.regionCode ? latest.promise : old.promise; }), 'ko');
    store.ensureLoaded(); store.apply({ ...defaultConditions, regionCode: '11' });
    latest.resolve(page(['new'])); await tick();
    if (oldFailure) old.reject(new TourError('network')); else old.resolve(page(['old'])); await tick();
    assert.equal(signals[0].aborted, true); assert.equal(store.getSnapshot().places[0].id, 'new'); assert.equal(store.getSnapshot().error, undefined);
  }
});
test('추가 페이지 요청 중복 및 항목 중복 제거, 실패 시 기존 목록 보존·명시 재시도', async () => {
  const next = deferred(); let calls = 0;
  const store = new ExploreStore(fakeRepo(async (language, conditions, number) => { calls++; return number === 1 ? page(['1', '2'], 1, true) : next.promise; }), 'ko');
  store.ensureLoaded(); store.ensureLoaded(); await tick(); assert.equal(calls, 1);
  store.loadNext(); store.loadNext(); assert.equal(calls, 2);
  next.reject(new TourError('network')); await tick(); assert.deepEqual(store.getSnapshot().places.map(p => p.id), ['1', '2']);
  store.loadNext(); assert.equal(calls, 2); assert.equal(store.getSnapshot().nextError.kind, 'network');
  const success = new ExploreStore(fakeRepo(async (language, conditions, number) => number === 1 ? page(['1', '2'], 1, true) : page(['2', '3'], 2)), 'ko');
  success.ensureLoaded(); await tick(); success.loadNext(); success.loadNext(); await tick();
  assert.deepEqual(success.getSnapshot().places.map(p => p.id), ['1', '2', '3']); assert.equal(success.getSnapshot().page, 2);
});
test('실패한 다음 페이지는 성공 페이지 번호를 유지하고 같은 페이지를 재시도', async () => {
  let attempt = 0; const numbers = [];
  const store = new ExploreStore(fakeRepo(async (language, conditions, number) => {
    numbers.push(number); if (number === 1) return page(['1'], 1, true);
    if (++attempt === 1) throw new TourError('timeout'); return page(['2'], 2);
  }), 'ko');
  store.ensureLoaded(); await tick(); store.loadNext(); await tick(); assert.equal(store.getSnapshot().page, 1);
  store.retry(); await tick(); assert.deepEqual(numbers, [1, 2, 2]); assert.deepEqual(store.getSnapshot().places.map(p => p.id), ['1', '2']);
});
test('언어 변경은 같은 지역·검색어 유지, 이전 언어 캐시와 스크롤 복원', async () => {
  let calls = 0;
  const repository = repo(async url => { calls++; const value = new URL(url); return response([item('1', value.pathname.includes('EngService2') ? 'en' : 'ko')]); });
  const store = new ExploreStore(repository, 'ko'); store.apply({ keyword: 'palace', type: 'all', regionCode: '11', districtCode: '11110' }); await tick(); await tick();
  store.setKeywordInput('unfinished'); store.setScrollOffset(700);
  const koId = store.getSnapshot().places[0].id;
  store.setLanguage('en'); await tick(); await tick();
  assert.equal(store.getSnapshot().conditions.districtCode, '11110'); assert.equal(store.getSnapshot().conditions.keyword, 'palace'); assert.notEqual(store.getSnapshot().places[0].id, koId);
  store.setLanguage('ko'); assert.equal(store.getSnapshot().scrollOffset, 700); assert.equal(store.getSnapshot().places[0].id, koId); assert.equal(store.getSnapshot().keywordInput, 'unfinished'); assert.equal(calls, 2);
});
test('빈 결과·인증·할당량 실패의 자동 재시도 없음, 입력만 변경하면 요청하지 않음', async () => {
  for (const kind of ['authentication', 'quota']) {
    let calls = 0;
    const store = new ExploreStore(fakeRepo(async () => { calls++; throw new TourError(kind); }), 'ko');
    store.ensureLoaded(); await tick(); store.ensureLoaded(); store.loadNext(); store.setKeywordInput('new');
    assert.equal(calls, 1); assert.equal(store.getSnapshot().error.kind, kind);
  }
  const repository = repo(async () => response([], 0));
  const value = await repository.page('ko', defaultConditions, 1); assert.equal(value.places.length, 0); assert.equal(value.hasNext, false);
});
test('이전 조건의 늦은 추가 페이지는 새 첫 페이지에 합쳐지지 않음', async () => {
  const oldNext = deferred();
  const store = new ExploreStore(fakeRepo(async (language, conditions, number) => conditions.regionCode ? page(['new']) : number === 1 ? page(['old'], 1, true) : oldNext.promise), 'ko');
  store.ensureLoaded(); await tick(); store.loadNext(); store.apply({ ...defaultConditions, regionCode: '11' }); await tick();
  oldNext.resolve(page(['old-next'], 2)); await tick();
  assert.deepEqual(store.getSnapshot().places.map(p => p.id), ['new']); assert.equal(store.getSnapshot().page, 1);
});
test('조건 변경 시 캐시가 있어도 첫 페이지와 처음 스크롤에서 시작', async () => {
  const repository = repo(async url => { const number = Number(new URL(url).searchParams.get('pageNo')); return response([item(String(number))], 40, number); });
  const store = new ExploreStore(repository, 'ko'); store.ensureLoaded(); await tick(); await tick(); store.loadNext(); await tick(); await tick(); store.setScrollOffset(800);
  store.apply({ ...defaultConditions, regionCode: '11' }); await tick(); await tick();
  store.apply(defaultConditions); await tick(); await tick();
  assert.equal(store.getSnapshot().page, 1); assert.equal(store.getSnapshot().scrollOffset, 0); assert.equal(store.getSnapshot().places.length, 1);
});
test('잘못된 페이지와 필수 표시 필드 누락은 형식 오류, 탐색 전 언어 변경은 호출하지 않음', async () => {
  const wrongPage = repo(async () => response([item('1')], 30, 1));
  await assert.rejects(wrongPage.page('ko', defaultConditions, 2), { kind: 'format' });
  const missing = repo(async () => response([{ contentid: '1', contenttypeid: '12' }]));
  await assert.rejects(missing.page('ko', defaultConditions, 1), { kind: 'format' });
  let calls = 0; const store = new ExploreStore(fakeRepo(async () => { calls++; return page([]); }), 'ko');
  store.setLanguage('en'); assert.equal(calls, 0); assert.equal(store.getSnapshot().language, 'en');
});
test('목록 사진은 제공된 HTTPS 썸네일 우선, HTTP 원본은 변경하지 않음', async () => {
  const repository = repo(async () => response([{ ...item('1'), firstimage: 'http://example.com/original.jpg', firstimage2: 'https://example.com/thumb.jpg', cpyrhtDivCd: 'Type3' }]));
  const place = (await repository.page('ko', defaultConditions, 1)).places[0];
  assert.equal(place.listImageUrl, 'https://example.com/thumb.jpg'); assert.equal(place.imageUrl, undefined); assert.equal(place.imageSourceUrl, 'http://example.com/original.jpg'); assert.equal(place.imageLicense, 'Type3');
});

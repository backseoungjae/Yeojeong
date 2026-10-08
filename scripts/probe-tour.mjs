// 호출은 명시적으로 실행할 때만 수행한다. 키와 전체 URL은 출력하지 않는다.
import { spawn } from 'node:child_process';
import { createTourClient } from '../src/shared/api/tour/tourClient.ts';
import { toPlace } from '../src/shared/api/tour/placeAdapter.ts';
import { getTourEnvironment } from '../src/shared/api/tour/tourConfig.ts';
import { runTourDiagnostics } from '../src/features/api-diagnostics/services/tourDiagnostics.ts';
try { process.loadEnvFile('.env'); } catch { /* 기존 프로세스 환경변수도 지원한다. */ }
const send = (url, signal) => new Promise((resolve, reject) => {
  const child = spawn('curl', ['--silent', '--max-time', '14', '--proto', '=https', '--write-out', '\n%{http_code}\n%{content_type}', '--config', '-'], { signal });
  const chunks = []; child.stdout.on('data', chunk => { chunks.push(chunk); });
  child.stderr.resume(); child.on('error', () => reject(new Error('network')));
  child.on('close', code => {
    if (code !== 0) return reject(new Error('network'));
    const bytes = Buffer.concat(chunks); const body = bytes.toString('utf8');
    const last = body.lastIndexOf('\n'); const split = body.lastIndexOf('\n', last - 1);
    resolve({ body: body.slice(0, split), status: Number(body.slice(split + 1, last)), contentType: body.slice(last + 1), jpegSignature: bytes[0] === 0xff && bytes[1] === 0xd8 });
  });
  child.stdin.on('error', () => {});
  child.stdin.end(`url = "${url.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"\n`);
});
const client = createTourClient(getTourEnvironment(), send);
const inspect = process.argv.includes('--inspect');
const supplemental = process.argv.includes('--supplement');
const results = supplemental || inspect ? [] : await runTourDiagnostics(client, undefined, result => {
  const { places, images, ...safe } = result;
  console.log(JSON.stringify(safe));
});
if (process.argv.includes('--extended') || supplemental || inspect) {
  if (supplemental) {
    for (const language of ['ko', 'en']) {
      for (const [check, endpoint, params] of [
        ['regions', 'ldongCode2', { numOfRows: '100', lDongListYn: 'N' }],
        ['control36Districts', 'ldongCode2', { lDongRegnCd: '36', lDongListYn: 'N', numOfRows: '100' }],
        ['control36Places', 'areaBasedList2', { lDongRegnCd: '36', contentTypeId: language === 'ko' ? '12' : '76' }],
        ['imageSamples', 'areaBasedList2', { lDongRegnCd: '11', contentTypeId: language === 'ko' ? '14' : '78', arrange: 'A' }],
      ]) {
        try {
          const page = await client.request(language, endpoint, params);
          console.log(JSON.stringify({ language, check, total: page.totalCount, received: page.items.length, codes: endpoint === 'ldongCode2' ? page.items.map(item => ({ code: item.code, name: item.name })) : undefined }));
          if (check === 'regions') {
            const sejong = page.items.find(item => item.code === '36110');
            if (sejong) for (const target of ['ldongCode2','areaBasedList2']) {
              const found = await client.request(language, target, { lDongRegnCd: sejong.code, numOfRows: '100' });
              console.log(JSON.stringify({ language, check: 'returnedSejongCode', endpoint: target, total: found.totalCount, received: found.items.length, fields: Object.keys(found.items[0] ?? {}) }));
            }
          }
          if (check === 'imageSamples') results.push({ places: page.items.map(item => toPlace(item, language)) });
        } catch (error) { console.log(JSON.stringify({ language, check, kind: error.kind, code: error.code, status: error.status })); }
      }
    }
  }
  const badClient = createTourClient({ common: 'YeojeongInvalidKeyForErrorCheck' }, async (url, signal) => {
    const response = await send(url, signal);
    console.log(JSON.stringify({ check: 'invalidKeyShape', status: response.status, contentType: response.contentType, bytes: response.body.length, markers: ['Forbidden','Unauthorized','SERVICE_KEY_IS_NOT_REGISTERED_ERROR','SERVICE_ACCESS_DENIED_ERROR','SERVICE_KEY_IS_NULL','SERVICE_ERROR','returnReasonCode','resultCode','resultMsg','OpenAPI_ServiceResponse'].filter(marker => response.body.includes(marker)), xmlCodes: [...response.body.matchAll(/<(?:returnReasonCode|resultCode)>\s*(\d{1,4})\s*<\//g)].map(match => match[1]) }));
    return response;
  });
  try { await badClient.request('ko', 'areaBasedList2'); }
  catch (error) { console.log(JSON.stringify({ check: 'invalidKey', kind: error.kind, code: error.code, status: error.status })); }
  const candidates = results.flatMap(result => result.places ?? []).flatMap(place => place.imageSourceUrl ? [place.imageSourceUrl] : []);
  const probes = [candidates.find(url => url.startsWith('https://')), candidates.find(url => url.startsWith('http://'))].filter(Boolean);
  for (const original of probes) {
    const url = new URL(original);
    if (url.hostname !== 'tong.visitkorea.or.kr') continue;
    const wasHttp = url.protocol === 'http:';
    url.protocol = 'https:';
    try {
      const response = await send(url.href, new AbortController().signal);
      console.log(JSON.stringify({ check: 'httpsImageDownload', wasHttp, host: url.hostname, status: response.status, contentType: response.contentType, jpegSignature: response.jpegSignature, note: 'device rendering unverified' }));
    } catch { console.log(JSON.stringify({ check: 'httpsImageDownload', wasHttp, state: 'network' })); }
  }
}

if (results.some(result => result.state === 'error')) process.exitCode = 1;

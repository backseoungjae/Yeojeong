import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { httpsImage } from '../src/shared/api/tour/placeAdapter.ts';
// 확보한 공개 목록의 CDN HTTPS 썸네일만 최대 2개 확인하며 인증 URL은 다루지 않는다.
const fixture=JSON.parse(await readFile(process.env.YEOJEONG_REAL_FIXTURE ?? '/tmp/yeojeong-real-list-fixture.json','utf8'));
for(const language of ['ko','en']){
 const url=fixture[language].pages.flat().map(row=>httpsImage(row.firstimage2)).find(value=>{try{return new URL(value).hostname==='tong.visitkorea.or.kr';}catch{return false;}});
 if(!url){console.log(JSON.stringify({language,state:'unavailable'}));continue;}
 const started=performance.now();
 const result=await new Promise(resolve=>{
  const child=spawn('curl',['--silent','--max-time','14','--proto','=https','--write-out','\n%{http_code}\n%{content_type}','--config','-']);
  const chunks=[];child.stdout.on('data',c=>chunks.push(c));child.stderr.resume();child.on('error',()=>resolve({state:'network'}));
  child.on('close',code=>{if(code!==0)return resolve({state:'network'});const bytes=Buffer.concat(chunks);const last=bytes.lastIndexOf(10),split=bytes.lastIndexOf(10,last-1);resolve({state:'downloaded',status:Number(bytes.subarray(split+1,last).toString()),contentType:bytes.subarray(last+1).toString(),bytes:split,durationMs:performance.now()-started});});
  child.stdin.on('error',()=>{});child.stdin.end(`url = "${url.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"\n`);
 });
 console.log(JSON.stringify({language,...result,scope:'real CDN download; device rendering not tested'}));if(result.state!=='downloaded'||result.status!==200)process.exitCode=1;
}

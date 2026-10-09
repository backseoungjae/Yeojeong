import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { createTourClient } from '../src/shared/api/tour/tourClient.ts';
import { getTourEnvironment } from '../src/shared/api/tour/tourConfig.ts';
try { process.loadEnvFile('.env'); } catch { /* 프로세스 환경변수 지원 */ }
const observations=[];
const send=(url,signal)=>new Promise((resolve,reject)=>{
 const started=performance.now();
 const child=spawn('curl',['--silent','--max-time','14','--proto','=https','--write-out','\n%{http_code}','--config','-'],{signal});
 const chunks=[];child.stdout.on('data',c=>chunks.push(c));child.stderr.resume();child.on('error',()=>reject(new Error('network')));
 child.on('close',code=>{if(code!==0)return reject(new Error('network'));const bytes=Buffer.concat(chunks);const text=bytes.toString();const split=text.lastIndexOf('\n');const body=text.slice(0,split),status=Number(text.slice(split+1));observations.push({durationMs:performance.now()-started,bytes:Buffer.byteLength(body),status});resolve({body,status});});
 child.stdin.on('error',()=>{});child.stdin.end(`url = "${url.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"\n`);
});
const client=createTourClient(getTourEnvironment(),send);
const result={};
try{
 for(const language of ['ko','en']){
  const pages=[];let totalCount=0;
  for(let page=1;page<=2;page++){const response=await client.request(language,'areaBasedList2',{pageNo:String(page),numOfRows:'20',arrange:'A',contentTypeId:language==='ko'?'12':'76'});pages.push(response.items);totalCount=response.totalCount;}
  result[language]={pages,totalCount};
 }
 await writeFile('/tmp/yeojeong-real-list-fixture.json',JSON.stringify(result));
 console.log(JSON.stringify({state:'passed',scope:'Real TourAPI CLI, national attractions, 20 rows x 2 pages x 2 services; curl TLS verified',calls:observations.length,measurements:observations}));
}catch(error){console.log(JSON.stringify({state:'failed',kind:error.kind??'network',calls:observations.length}));process.exitCode=1;}

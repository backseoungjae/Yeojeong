import { seoulToday, shiftDate } from '../src/features/trips/services/tripRules.ts';
import { formatDate } from '../src/shared/i18n/format.ts';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat, mkdtemp, writeFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import assert from 'node:assert/strict';
const fixtureStart=seoulToday();
const fixtureEnd=shiftDate(fixtureStart,2);
const root=resolve(process.argv.find(arg=>arg.startsWith('--build='))?.slice('--build='.length) ?? process.env.YEOJEONG_WEB_BUILD ?? 'dist');
const quality=process.argv.includes('--quality');
const development=process.argv.includes('--development');
const measuring=process.argv.includes('--performance');
const fixtureFile=process.argv.find(arg=>arg.startsWith('--fixture='))?.slice('--fixture='.length) ?? process.env.YEOJEONG_REAL_FIXTURE;
const realFixture=fixtureFile ? JSON.parse(await readFile(fixtureFile,'utf8')) : null;
const server=createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let file=join(root,pathname);let fallback=false;
    if (!file.startsWith(root+'/') && file!==root) {res.writeHead(403);res.end();return;}
    try { if((await stat(file)).isDirectory()){const index=join(file,'index.html');try{await stat(index);file=index;}catch{file+='.html';}} } catch {
      try {await stat(file+'.html');file+='.html';}catch{file=join(root,'index.html');fallback=true;}
    }
    let body=await readFile(file);
    if(fallback){let html=body.toString();const start=html.indexOf('<div id="root">'),end=html.lastIndexOf('</div><script src=');if(start>=0&&end>start){html=html.slice(0,start)+'<div id="root"></div>'+html.slice(end+6);html=html.replace('__EXPO_ROUTER_HYDRATE__=true','__EXPO_ROUTER_HYDRATE__=false');body=Buffer.from(html);}}
    const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.wasm':'application/wasm'};
    res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'credentialless'});res.end(body);
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(8088,'127.0.0.1',resolve));
const restoring=process.argv.includes('--restore')||process.argv.includes('--reset-restored');
const profile=restoring?(await readFile('/tmp/yeojeong-final-browser-profile.txt','utf8')):await mkdtemp('/tmp/yeojeong-chrome-');
if(!restoring && !quality && !measuring)await writeFile('/tmp/yeojeong-final-browser-profile.txt',profile);
const chrome=spawn(process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9223','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket;const errors=[];const structured=[];let debugEvaluate;
try {
  let tabs;
  for(let i=0;i<100;i++){try{tabs=await(await fetch('http://127.0.0.1:9223/json/list')).json();if(tabs.length)break;}catch{}await delay(100);}
  socket=new WebSocket(tabs.find(tab=>tab.type==='page').webSocketDebuggerUrl);
  await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
  let next=1;const pending=new Map();
  socket.addEventListener('message',event=>{
    const value=JSON.parse(event.data);
    if(value.id){const entry=pending.get(value.id);pending.delete(value.id);value.error?entry.reject(new Error(value.error.message)):entry.resolve(value.result);}
    else if(value.method==='Runtime.exceptionThrown')errors.push(value.params.exceptionDetails.exception?.description??value.params.exceptionDetails.text);
    else if(value.method==='Runtime.consoleAPICalled'&&value.params.type==='warning'){for(const arg of value.params.args){try{const log=JSON.parse(arg.value);if(log.event)structured.push(log);}catch{}}}
    else if(value.method==='Runtime.consoleAPICalled'&&value.params.type==='error')errors.push(value.params.args.map(arg=>arg.value??arg.description).join(' ').slice(0,300));
  });
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=next++;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);return result.result.value;};
  debugEvaluate=evaluate;
  const click=label=>evaluate(`(()=>{const element=[...document.querySelectorAll('[role="button"],[role="tab"],button,a')].filter(el=>el.getClientRects().length>0 && getComputedStyle(el).visibility!=='hidden' && !el.closest('[aria-hidden="true"]')).find(el=>el.getAttribute('aria-label')===${JSON.stringify(label)}||el.textContent.trim()===${JSON.stringify(label)});if(!element)throw new Error('Missing control: '+${JSON.stringify(label)});element.click();return true;})()`);
  const waitText=async text=>{for(let i=0;i<150;i++){if(await evaluate(`(document.body?.innerText ?? "").includes(${JSON.stringify(text)})`))return;await delay(100);}throw new Error('Missing text: '+text);};
  const report=value=>console.log(JSON.stringify(value));
  await cdp('Runtime.enable');await cdp('Page.enable');
  await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`window.__sqliteFailures=[];const NativeWorker=Worker;window.Worker=class extends NativeWorker {constructor(...args){super(...args);this.addEventListener('message',event=>{if(event.data?.error)window.__sqliteFailures.push(String(event.data.error));});}};`});
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'},{name:'prefers-reduced-motion',value:'reduce'}]});

  let offline=false, missing=false, photosMissing=false, failNext=false;
  const calls=[];const attempts=new Map();
  socket.addEventListener('message',async event=>{
    const message=JSON.parse(event.data);if(message.method!=='Fetch.requestPaused')return;
    try {
    const {requestId,request}=message.params;
    if(offline){await cdp('Fetch.failRequest',{requestId,errorReason:'InternetDisconnected'});return;}
    if(request.url.startsWith('https://images.example.test/') || request.url.startsWith('https://tong.visitkorea.or.kr/')){await cdp('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/png'},{name:'Access-Control-Allow-Origin',value:'*'}],body:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='});return;}
    const url=new URL(request.url),endpoint=url.pathname.split('/').at(-1),id=url.searchParams.get('contentId'),english=url.pathname.includes('EngService2');
    const key=[english,id,endpoint].join(':');const attempt=(attempts.get(key)??0)+1;attempts.set(key,attempt);calls.push({endpoint,id,english});
    let items=[];let status=200;
    const keyword=url.searchParams.get('keyword');
    const type=n=>english?['76','78','82'][(Number(n)-1)%3]:['12','14','39'][(Number(n)-1)%3];
    const base=n=>({contentid:String(n),contenttypeid:type(n),title:(english?'English place ':'한국어 장소 ')+n,lDongRegnCd:n==='2'||n===2?'26':'11',addr1:'Mock address '+n,firstimage:'https://images.example.test/snapshot-'+n+'.png'});
    if(endpoint==='areaBasedList2'||endpoint==='searchKeyword2')items=[base(1),base(2),base(3)];
    const page=Number(url.searchParams.get('pageNo')??1);let total=items.length;
    if(measuring && endpoint==='areaBasedList2'){
      total=realFixture ? realFixture[english?'en':'ko'].totalCount : 2000;
      items=realFixture ? (realFixture[english?'en':'ko'].pages[page-1] ?? []) : Array.from({length:20},(_,index)=>base((page-1)*20+index+1));
      await delay(40);
    }
    if(quality && endpoint==='areaBasedList2'){total=60;items=[base((page-1)*3+1),base((page-1)*3+2),base((page-1)*3+3)];if(page===2&&failNext){status=503;failNext=false;}}
    if(quality && endpoint==='searchKeyword2'){if(keyword==='empty')items=[];if(keyword==='fail')status=503;if(keyword==='slow')await delay(1200);if(keyword==='fast')items=[base(9)];}
    if(endpoint==='ldongCode2')items=[{code:'11',name:english?'Seoul':'서울'},{code:'26',name:english?'Busan':'부산'}];
    if(endpoint==='detailCommon2' && !missing)items=[{...base(id),addr1:id==='2'?'':('Mock address '+id),overview:id==='2'?'':('<p>First line<br/>Second line &amp; details</p><script>window.__unsafeExecuted=true</script>'+'Long description without truncation. '.repeat(150)),tel:id==='2'?'invalid phone':'02-1234-5678',homepage:id==='2'?'javascript:alert(1)':'<a href="https://example.test/?a=1&amp;b=2">Site</a>',modifiedtime:id==='2'?'not-date':'20261008123456'}];
    if(endpoint==='detailIntro2'){
      if(id==='1'&&attempt===1)status=503;
      else items=[{...base(id),usetime:'Mock hours',usefee:'Supplied fee',usetimeculture:'Culture hours',opentimefood:'Food hours',firstmenu:'Mock menu',infocenter:'02-1234-5678'}];
    }
    if(endpoint==='detailImage2' && !photosMissing){
      if(id==='3'&&attempt===1)status=503;
      else if(id!=='2')items=[{contentid:id,serialnum:'1',originimgurl:'https://images.example.test/one.png',imgname:'Photo one',cpyrhtDivCd:'Type1'},{contentid:id,serialnum:'2',originimgurl:'http://images.example.test/two.png',cpyrhtDivCd:'Type3'}];
    }
    if(process.argv.includes('--offline')&&['detailCommon2','detailImage2'].includes(endpoint))status=503;
    const body=status===200?{response:{header:{resultCode:keyword==='quota'?'22':keyword==='auth'?'30':'0000'},body:{items:items.length?{item:items}:'',totalCount:(measuring||quality)&&endpoint==='areaBasedList2'?total:items.length,pageNo:(measuring||quality)&&endpoint==='areaBasedList2'?page:1,numOfRows:20}}}:{};
    await cdp('Fetch.fulfillRequest',{requestId,responseCode:status,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(JSON.stringify(body)).toString('base64')});
    } catch(error) { if (!String(error.message).includes('Invalid InterceptionId')) errors.push('Mock interception failed'); }
  });
  await cdp('Fetch.enable',{patterns:[{urlPattern:'https://apis.data.go.kr/*'},{urlPattern:'https://images.example.test/*'},{urlPattern:'https://tong.visitkorea.or.kr/*'}]});
  await cdp('Browser.grantPermissions',{origin:'http://127.0.0.1:8088',permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
  const visible=el=>el.getClientRects().length>0 && getComputedStyle(el).visibility!=='hidden' && !el.closest('[aria-hidden="true"]');
  const setInput=async(label,value)=>evaluate(`(()=>{const el=[...document.querySelectorAll('input,textarea')].find(el=>el.getClientRects().length>0 && !el.closest('[aria-hidden="true"]') && (el.getAttribute('aria-label')??'').includes(${JSON.stringify(label)}));if(!el)throw new Error('Missing input: '+${JSON.stringify(label)});Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
  const visibleText=()=>evaluate(`(()=>{const regions=[...document.querySelectorAll('[aria-hidden="true"]')];const before=regions.map(el=>el.style.display);regions.forEach(el=>el.style.display='none');const text=document.body.innerText;regions.forEach((el,i)=>el.style.display=before[i]);return text;})()`);
  const openCalendar=async label=>{
    const trigger=await evaluate(`[...document.querySelectorAll('[role="button"]')].find(el=>el.getClientRects().length>0 && !el.closest('[aria-hidden="true"]') && ((el.getAttribute('aria-label')??'').startsWith(${JSON.stringify(label)}+':') || (el.getAttribute('aria-label')??'').startsWith(${JSON.stringify(label)}+' ('))).getAttribute('aria-label')`);
    await click(trigger);await delay(120);
  };
  const chooseDate=async(label,value,language)=>{
    await openCalendar(label);
    const month=formatDate(value,language,{year:'numeric',month:'long'});
    for(let count=0;!(await visibleText()).includes(month) && count<2;count++){await click(language==='ko'?'다음 달':'Next month');await delay(120);}
    await click(formatDate(value,language));await delay(120);
  };
  const openPlace=async n=>{const label=await evaluate(`document.querySelector('[aria-label^="Open details for English place ${n},"]').getAttribute('aria-label')`);await click(label);};
  await cdp('Emulation.setTimezoneOverride',{timezoneId:'America/Los_Angeles'});
  const tripName='Home fixture trip';
  if(quality){
    await cdp('Emulation.setDeviceMetricsOverride',{width:320,height:844,deviceScaleFactor:1,mobile:true});
    const wide=()=>evaluate('document.documentElement.scrollWidth>innerWidth');
    const checkScale=async()=>{
      await evaluate(`window.__scaled=[];for(const el of document.querySelectorAll('div,input,textarea')){if(el.closest('[aria-hidden="true"]')||!el.getClientRects().length)continue;if((el.childNodes.length===1&&el.firstChild.nodeType===3)||el.matches('input,textarea')){const s=getComputedStyle(el),size=parseFloat(s.fontSize),line=parseFloat(s.lineHeight);window.__scaled.push([el,el.style.fontSize,el.style.lineHeight]);el.style.fontSize=size*1.6+'px';if(Number.isFinite(line))el.style.lineHeight=line*1.6+'px';}}`);
      assert.equal(await wide(),false);
      await evaluate(`for(const [el,size,line] of window.__scaled){el.style.fontSize=size;el.style.lineHeight=line;}window.__scaled=[];`);
    };
    await cdp('Page.navigate',{url:'http://127.0.0.1:8088/settings'});await waitText('화면 테마');
    const waitSelected=async label=>{for(let n=0;n<150;n++){if(await evaluate(`[...document.querySelectorAll('[aria-label]')].some(el=>!el.closest('[aria-hidden="true"]')&&el.getAttribute('aria-label')===${JSON.stringify(label)}&&el.getAttribute('aria-disabled')!=='true'&&el.getAttribute('aria-pressed')==='true')`))return;await delay(30);}throw new Error('Setting did not settle');};
    await waitText('모션 감소 켜짐');
    await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await waitText('모션 감소 꺼짐');
    await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await waitText('모션 감소 켜짐');
    for(const english of [false,true]){
      await click(english?'English':'한국어');await waitSelected(english?'English':'한국어');
      for(const dark of [false,true]){
        await click(english?(dark?'Dark':'Light'):(dark?'다크':'라이트'));await waitSelected(english?(dark?'Dark':'Light'):(dark?'다크':'라이트'));
        for(const tab of english?['Home','Explore','My trips','Settings']:['홈','탐색','내 여행','설정']){await click(tab);await delay(180);assert.equal(await wide(),false);await checkScale();}
      }
    }
    await click('한국어');await waitSelected('한국어');await click('탐색');await waitText('한국어 장소 1');
    await click('필터 편집');await delay(120);assert.equal(await evaluate('document.activeElement.getAttribute("role")'),'heading');await click('편집 취소');await delay(120);assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'),'필터 편집');
    failNext=true;await click('다음 페이지 불러오기');await waitText('다음 페이지');assert.ok((await visibleText()).includes('한국어 장소 1'));await click('다시 시도');await waitText('한국어 장소 4');
    const search=async keyword=>{await setInput('검색어',keyword);await click('검색');};
    await search('slow');await delay(50);await search('fast');await waitText('한국어 장소 9');await delay(1400);assert.ok(!(await visibleText()).includes('한국어 장소 1'));
    const tree=await cdp('Accessibility.getFullAXTree');assert.ok(tree.nodes.some(node=>node.role?.value==='button'));assert.ok(tree.nodes.some(node=>node.role?.value==='heading'));
    await search('empty');await waitText('조건에 맞는 장소가 없어요');await search('fail');await waitText('일시적인 통신 오류');await search('auth');await waitText('인증');await search('quota');await waitText('호출');
    await waitText('quota');await delay(200);
    const recentCount=()=>evaluate(`[...document.querySelectorAll('[role="button"]')].filter(el=>el.getClientRects().length>0 && !el.closest('[aria-hidden="true"]') && (el.getAttribute('aria-label')??'').endsWith(' 다시 검색')).length`);
    assert.equal(await recentCount(),3);
    assert.equal(await evaluate(`document.querySelector('[aria-label^="최근 검색어 삭제:"]')===null`),true);
    await click('더보기');await delay(120);assert.ok(await recentCount()>3);await click('접기');await delay(120);assert.equal(await recentCount(),3);
    await click('관리');await delay(120);assert.ok(await recentCount()>3);assert.equal(await wide(),false);await checkScale();
    await click('최근 검색어 삭제: slow');await delay(200);assert.equal(await evaluate(`document.querySelector('[aria-label="slow 다시 검색"]')===null`),true);
    await click('관리 완료');await click('더보기');await click('fast 다시 검색');await waitText('한국어 장소 9');await delay(200);
    await click('관리');await click('최근 검색어 전체 삭제');await delay(200);
    assert.equal(await recentCount(),0);assert.equal(await evaluate(`document.querySelector('[aria-label="관리"]')===null`),true);
    for(const record of structured){assert.deepEqual(Object.keys(record),['event','scope','kind','at']);assert.ok(!JSON.stringify(record).includes('serviceKey'));}
    await cdp('Page.navigate',{url:'http://127.0.0.1:8088/trips/new'});await waitText('여행 이름');await checkScale();
    await setInput('여행 이름',tripName);await chooseDate('시작일',fixtureStart,'ko');await chooseDate('종료일',fixtureEnd,'ko');await click('여행 저장');await waitText(tripName);
    await cdp('Page.navigate',{url:'http://127.0.0.1:8088/places/tourapi%3AKorService2%3A1'});await waitText('First line');await checkScale();
    await click('한국어 장소 1 일정에 추가');await delay(120);assert.equal(await evaluate('document.activeElement.getAttribute("role")'),'heading');
    const qualityChoice=await evaluate(`[...document.querySelectorAll('[role="button"]')].find(el=>(el.getAttribute('aria-label')??'').startsWith(${JSON.stringify(tripName)}+' ·')).getAttribute('aria-label')`);
    await click(qualityChoice);await click('이 날짜에 장소 추가');await waitText('일정에 장소를 추가했습니다');await click('장소 추가 닫기');await delay(120);assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'),'한국어 장소 1 일정에 추가');
    for(const english of [false,true]){
      await cdp('Page.navigate',{url:'http://127.0.0.1:8088/settings'});await waitText('화면 테마');await click(english?'English':'한국어');await waitSelected(english?'English':'한국어');
      for(const dark of [false,true]){
        await click(english?(dark?'Dark':'Light'):(dark?'다크':'라이트'));await waitSelected(english?(dark?'Dark':'Light'):(dark?'다크':'라이트'));
        for(const [path,text] of [['/places/tourapi%3AKorService2%3A1','First line'],['/trips/1',tripName],['/trips/edit/1',english?'Trip name':'여행 이름'],['/trips/new',english?'Trip name':'여행 이름']]){await cdp('Page.navigate',{url:'http://127.0.0.1:8088'+path});await waitText(text);await checkScale();}
        await cdp('Page.navigate',{url:'http://127.0.0.1:8088/settings'});await waitText(english?'Appearance':'화면 테마');
      }
    }
    await click('한국어');await waitSelected('한국어');
    await click('설정');await click('로컬 데이터 전체 삭제');await delay(120);assert.equal(await evaluate('document.activeElement.getAttribute("role")'),'alert');await click('취소');await delay(120);assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'),'로컬 데이터 전체 삭제');
    if(development){
      await click('탐색');await search('fast');await waitText('한국어 장소 9');await click('한국어 장소 9 저장');await waitText('저장 해제');
      await cdp('Page.navigate',{url:'http://127.0.0.1:8088/dev/gallery'});await waitText('컴포넌트 갤러리');await click('1.6배 추가 확대');assert.equal(await wide(),false);
      await cdp('Page.navigate',{url:'http://127.0.0.1:8088/dev/error'});await waitText('검증용 화면 오류 발생');await click('검증용 화면 오류 발생');await waitText('화면을 표시하지 못했습니다');await click('English');await waitText('Unable to display this screen');await click('Try again');await waitText('어디로 떠나고 싶으세요');
      assert.ok(structured.some(log=>log.event==='render_failure'));assert.ok(structured.some(log=>log.event==='recovery_retry'));
      await click('내 여행');await click('저장한 장소');await waitText('한국어 장소 9');await waitText('저장 해제');
    }else{
      for(const path of ['/dev/gallery','/dev/api','/dev/error']){await cdp('Page.navigate',{url:'http://127.0.0.1:8088'+path});await waitText('어디로 떠나고 싶으세요');assert.ok(!(await visibleText()).includes('검증용 화면 오류 발생'));}
    }
    assert.deepEqual(errors.filter(value=>!value.includes('Failed to load resource')&&!value.includes('Diagnostic render failure')),[]);
    report({state:'passed',check:'KO/EN, light/dark, 320px and 1.6x DOM font simulation on core screens; filter focus/return; next-page failure retains list; slow/fast/empty/network/auth/quota scenarios; safe structured logs; reduced-motion media; '+(development?'actual render ErrorBoundary recovery and development gallery':'release developer routes excluded')+'. Native font scaling and screen readers not tested.'});
  }else   if(measuring){
    await cdp('Performance.enable');
    await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`window.__frames=[];window.__longTasks=[];try{new PerformanceObserver(list=>window.__longTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});}catch{}`});
    const began=performance.now();await cdp('Page.navigate',{url:'http://127.0.0.1:8088/explore'});await waitText('저장');
    await waitText('20개 표시');
    const firstMs=performance.now()-began;
    const scrollBottom=()=>evaluate(`(()=>{const el=[...document.querySelectorAll('div')].filter(el=>el.clientHeight>100&&['auto','scroll'].includes(getComputedStyle(el).overflowY)&&el.scrollHeight>el.clientHeight).sort((a,b)=>b.scrollHeight-a.scrollHeight)[0];if(!el)throw new Error('Scroll container unavailable');el.scrollTop=el.scrollHeight;el.dispatchEvent(new Event('scroll'));return true;})()`);
    const pages=realFixture?2:30;
    for(let n=2;n<=pages;n++){await scrollBottom();await delay(80);await click('다음 페이지 불러오기');await waitText((n*20)+'개 표시');}
    await delay(500);
    await evaluate(`window.__frames=[];window.__frameDone=false;let before=performance.now(),start=before;const el=[...document.querySelectorAll('div')].filter(el=>el.clientHeight>100&&['auto','scroll'].includes(getComputedStyle(el).overflowY)&&el.scrollHeight>el.clientHeight).sort((a,b)=>b.scrollHeight-a.scrollHeight)[0];el.scrollTop=0;function frame(now){window.__frames.push(now-before);before=now;el.scrollTop+=12;if(now-start<2000)requestAnimationFrame(frame);else window.__frameDone=true;}requestAnimationFrame(frame);`);
    for(let n=0;n<150;n++){if(await evaluate('window.__frameDone'))break;await delay(30);}
    await delay(500);
    const samples=await evaluate('window.__frames');const sorted=samples.slice(1).sort((a,b)=>a-b);
    await cdp('HeapProfiler.collectGarbage');
    const metrics=Object.fromEntries((await cdp('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
    report({state:'measured',environment:'Chrome headless release web; API response replay, not native',data:realFixture?'real API collected rows':'synthetic 2000 rows; loaded 600',firstListMs:Number(firstMs.toFixed(2)),frameP50Ms:sorted[Math.floor(sorted.length*.5)],frameP95Ms:sorted[Math.floor(sorted.length*.95)],framesOver32Ms:sorted.filter(n=>n>32).length,jsHeapBytes:metrics.JSHeapUsedSize,domNodes:metrics.Nodes,liveElements:await evaluate('document.querySelectorAll("*").length'),apiRequests:calls.length,listRequests:calls.filter(c=>c.endpoint==='areaBasedList2').length,longTaskCount:await evaluate('window.__longTasks.length'),longTaskTotalMs:await evaluate('window.__longTasks.reduce((n,v)=>n+v,0)'),browser:(await cdp('Browser.getVersion')).product});
  }else   if(process.argv.includes('--reset-restored')){
    offline=true;
    await cdp('Page.navigate',{url:'http://127.0.0.1:8088/settings'});await waitText('화면 테마');await waitText('앱 버전 1.0.0');await waitText('관광정보와 사진 출처');await waitText('공공누리 Type1');
    assert.ok(await evaluate(`[...document.querySelectorAll('[aria-pressed="true"]')].some(el=>!el.closest('[aria-hidden="true"]') && el.getAttribute('aria-label')==='라이트')`));
    await click('홈');await waitText('진행 중이거나 예정된 여행이 없습니다');await waitText('최근 본 장소가 없어요');
    await click('내 여행');await delay(300);assert.ok(!(await visibleText()).includes(tripName));await click('저장한 장소');await waitText('표시할 저장 장소가 없어요');
    assert.deepEqual(errors.filter(value=>!value.includes('Failed to load resource')),[]);
    report({state:'passed',check:'A new browser process after full deletion keeps trips, saved places, recent places and settings empty/default. App version and KOGL/source guidance are visible. API network denied.'});
  }else if(restoring){
    offline=true;
    await cdp('Page.navigate',{url:'http://127.0.0.1:8088/trips/1'});await waitText(tripName);
    await waitText('Stop 1 · English place 2');await waitText('Stop 2 · English place 1');
    await waitText('Offline browser fixture memo');
    assert.equal(await evaluate(`document.querySelectorAll('textarea').length`),0);
    report({state:'passed',check:'Browser process restart restores offline memo, order and original-language place snapshots; API network denied.'});
    await cdp('Page.navigate',{url:'http://127.0.0.1:8088/settings'});await waitText('Appearance');await click('Delete all local data');await waitText('Delete all local data?');await click('Cancel');await click('My trips');await waitText(tripName);
    await click('Settings');await click('Delete all local data');await click('Confirm deletion of all local data');
    for(let i=0;i<200;i++){if((await visibleText()).includes('초기화되었습니다')||(await visibleText()).includes('Local data was deleted.'))break;await delay(100);}
    const text=await visibleText();assert.ok(text.includes('초기화되었습니다')||text.includes('Local data was deleted.'));
    assert.ok(!text.includes('could not be completed'));
    const settingsLabel=text.includes('로컬 데이터를 삭제했습니다')?'설정':'Settings';await click(settingsLabel);
    await cdp('Page.reload');
    for(let i=0;i<150;i++){if((await visibleText()).includes('화면 테마')||(await visibleText()).includes('Appearance'))break;await delay(100);}
    const buttons=await evaluate(`[...document.querySelectorAll('[aria-pressed="true"]')].filter(el=>!el.closest('[aria-hidden="true"]')).map(el=>el.getAttribute('aria-label'))`);
    assert.ok(buttons.includes('라이트')||buttons.includes('Light'));
    assert.ok((await visibleText()).includes('화면 테마'));
    await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'},{name:'prefers-reduced-motion',value:'reduce'}]});await delay(300);
    assert.ok(await evaluate(`[...document.querySelectorAll('[aria-pressed="true"]')].some(el=>!el.closest('[aria-hidden="true"]') && el.getAttribute('aria-label')==='다크')`));
    const label=(await visibleText()).includes('화면 테마')?'내 여행':'My trips';await click(label);await delay(300);assert.ok(!(await visibleText()).includes(tripName));
    report({state:'passed',check:'Full deletion cancel keeps records; confirmed reset clears real SQLite, snapshots and preferences; reload uses device defaults and no trips. Browser HTTP cache exclusion is visible.'});
  }else{
    await cdp('Page.navigate',{url:'http://127.0.0.1:8088/settings'});await waitText('화면 테마');await click('English');await waitText('Appearance');await click('Dark');
    await click('Home');await waitText('No trip is in progress');
    await click('Explore');await waitText('English place 1');
    const latest=calls.filter(c=>c.endpoint==='areaBasedList2');assert.ok(latest.length);
    await click('Save English place 1');await openPlace(1);await waitText('First line');await click('Add English place 1 to an itinerary');await click('Create a trip');
    await setInput('Trip name',tripName);await chooseDate('Start date',fixtureStart,'en');await chooseDate('End date',fixtureEnd,'en');await click('Save trip');await waitText('Choose a trip');await click('Add place on this date');await waitText('Place added to the itinerary.');
    await click('Close place addition');await click('Back');await openPlace(2);await waitText('English place 2');await click('Add English place 2 to an itinerary');
    const choice=await evaluate(`[...document.querySelectorAll('[role="button"]')].find(el=>(el.getAttribute('aria-label')??'').startsWith(${JSON.stringify(tripName)}+' ·')).getAttribute('aria-label')`);await click(choice);await click('Add place on this date');await waitText('Place added to the itinerary.');await click('View trip itinerary');await waitText('Stop 1 · English place 1');
    await openCalendar('Date to view');
    for(const outside of [shiftDate(fixtureStart,-1),shiftDate(fixtureEnd,1)]){
      const disabled=await evaluate(`(()=>{const el=[...document.querySelectorAll('[role="button"]')].find(el=>el.getClientRects().length>0 && el.getAttribute('aria-label')===${JSON.stringify(formatDate(outside,'en'))});return !el || el.getAttribute('aria-disabled')==='true';})()`);
      assert.equal(disabled,true);
    }
    await click('Close calendar');await chooseDate('Date to view',fixtureEnd,'en');
    assert.equal(await evaluate(`document.querySelector('[aria-label="Next day"]').getAttribute('aria-disabled')`),'true');
    await chooseDate('Date to view',fixtureStart,'en');await waitText('Stop 1 · English place 1');
    assert.equal(await evaluate(`document.querySelector('[aria-label="Previous day"]').getAttribute('aria-disabled')`),'true');
    assert.equal(await evaluate(`(()=>{const previous=document.querySelector('[aria-label="Previous day"]').getBoundingClientRect(),next=document.querySelector('[aria-label="Next day"]').getBoundingClientRect();return Math.abs(previous.top-next.top)<1 && previous.right<=next.left;})()`),true);
    await click('Edit trip');await openCalendar('Start date');
    const yesterday=shiftDate(fixtureStart,-1);
    assert.equal(await evaluate(`(()=>{const el=[...document.querySelectorAll('[role="button"]')].find(el=>el.getClientRects().length>0 && el.getAttribute('aria-label')===${JSON.stringify(formatDate(yesterday,'en'))});return !el || el.getAttribute('aria-disabled')==='true';})()`),true);
    await click('Close calendar');await click('Cancel');await waitText('Stop 1 · English place 1');
    report({state:'passed',check:'Calendar range limits, inclusive trip endpoints, horizontal previous/next buttons and today minimum in edit screen; API mocked.'});
    await cdp('Page.navigate',{url:'http://127.0.0.1:8088/'});await waitText('Continue your trip');await waitText(tripName);await click('Open trip: '+tripName);await waitText('Stop 1 · English place 1');
    await cdp('Network.enable');await cdp('Network.setCacheDisabled',{cacheDisabled:true});await cdp('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});offline=true;
    await click('Delete trip');await waitText('Delete this trip?');await click('Cancel');await delay(120);assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'),'Delete trip');
    assert.equal(await evaluate(`document.querySelectorAll('textarea').length`),0);
    assert.equal(await evaluate(`document.querySelector('[aria-label="Move English place 2 up"]')===null`),true);
    assert.equal(await evaluate(`document.querySelector('[aria-label="Remove English place 1 from itinerary"]')===null`),true);
    await click('More actions for English place 1');await delay(120);assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`),'Remove English place 1 from itinerary');
    await click('Close actions');await delay(120);assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`),'More actions for English place 1');
    await click('Add memo for English place 1');
    await setInput('Memo for English place 1','Unsaved fixture');await click('Discard memo changes for English place 1');await click('Keep editing');await delay(120);assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'),'Discard memo changes for English place 1');
    await setInput('Memo for English place 1','Offline browser fixture memo');await click('Save memo for English place 1');await waitText('Memo saved.');await delay(120);
    assert.equal(await evaluate(`document.querySelectorAll('textarea').length`),0);await waitText('Offline browser fixture memo');
    assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`),'Edit memo for English place 1');
    await click('Edit order');await click('Move English place 2 up');await waitText('Stop 1 · English place 2');await click('Finish editing order');
    assert.equal(await evaluate(`document.querySelector('[aria-label="Move English place 2 up"]')===null`),true);
    await click('Place details: English place 1');await waitText('captured earlier');await click('Unsave English place 1');await click('Back');await waitText('Stop 2 · English place 1');
    await cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    // Fresh full navigation creates new API caches. Keep only the app origin reachable.
    await cdp('Page.navigate',{url:'http://127.0.0.1:8088/places/tourapi%3AEngService2%3A1'});await waitText('captured earlier');await waitText('English place 1');await waitText('Could not load this photo');
    await cdp('Emulation.setDeviceMetricsOverride',{width:320,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
    offline=false;missing=true;photosMissing=true;
    await cdp('Page.navigate',{url:'http://127.0.0.1:8088/places/tourapi%3AEngService2%3A1'});await waitText('latest API returned no basic information');await waitText('English place 1');await waitText('captured earlier');
    await cdp('Page.navigate',{url:'http://127.0.0.1:8088/trips'});await waitText(tripName);await click('Open trip: '+tripName);await waitText('Stop 2 · English place 1');
    assert.deepEqual(errors.filter(value=>!value.includes('Failed to load resource')),[]);
    missing=false;
    for(const id of [3,4]){await cdp('Page.navigate',{url:'http://127.0.0.1:8088/places/tourapi%3AEngService2%3A'+id});await waitText('English place '+id);await waitText('First line');await delay(200);}
    await cdp('Page.navigate',{url:'http://127.0.0.1:8088/'});await waitText('Recently viewed places');await delay(200);
    const recentPlaceCount=()=>evaluate(`[...document.querySelectorAll('[role="button"]')].filter(el=>el.getClientRects().length>0 && !el.closest('[aria-hidden="true"]') && (el.getAttribute('aria-label')??'').startsWith('Open details for English place')).length`);
    assert.equal(await recentPlaceCount(),3);
    assert.equal(await evaluate(`[...document.querySelectorAll('[role="button"]')].filter(el=>el.getClientRects().length>0 && !el.closest('[aria-hidden="true"]')).some(el=>/^(Save English place|Unsave English place|Add English place|Remove .* from recent history)/.test(el.getAttribute('aria-label')??''))`),false);
    await click('Show more recently viewed places');await delay(120);assert.ok(await recentPlaceCount()>3);
    await click('Show fewer recently viewed places');await delay(120);assert.equal(await recentPlaceCount(),3);
    await click('Manage recently viewed places');await delay(120);assert.ok(await recentPlaceCount()>3);
    await click('Remove English place 1 from recent history');await delay(200);
    assert.equal(await evaluate(`document.querySelector('[aria-label="Remove English place 1 from recent history"]')===null`),true);
    assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
    await click('Clear recently viewed places');
    await delay(200);await waitText('No recently viewed places yet.');
    await click('Open trip: '+tripName);await waitText('Stop 2 · English place 1');
    report({state:'passed',check:'Recent place cards: latest three, show more/less, management-only removal and clear; clearing history preserves itinerary; 320px English, API mocked.'});
    report({state:'passed',check:'Actual SQLite WASM: new/existing home, explore navigation, calendar trip creation, offline memo/order edits, unsave independence, API-unavailable snapshot and missing-photo fallback, missing latest place retains itinerary, 320px English. API/images mocked except separate CLI verification.'});
  }

} catch(error) { console.error(JSON.stringify({state:'failed',check:'Browser verification',reason:String(error.message).slice(0,160)})); process.exitCode=1; } finally {socket?.close();const exited=chrome.exitCode===null?new Promise(resolve=>chrome.once('exit',resolve)):Promise.resolve();chrome.kill();await exited;await new Promise(resolve=>server.close(resolve));}

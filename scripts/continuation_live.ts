// Opt-in real API verification. Credentials stay in the process environment.
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createSimulationApi} from '../server/simulation-api.mjs';
import {createJournal,currentWorld,readJournal} from '../src/simulation/world';
import {prepareContinuation,readStorySource,runContinuation} from '../src/simulation/continuation';
import type {CanonData} from '../src/data/types';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const data=Object.fromEntries([...['places','characters','events','sources','routes','relations','editionCatalog'].map(k=>[k,read(`data/canon/${k}.json`)]),['manifest',read('public/scene-manifest.json')]]) as unknown as CanonData;
if(!process.env.LLM_ACCESS_TOKEN)throw new Error('LLM_* environment required');
const api=createSimulationApi(process.env),server=createServer((req,res)=>{void api(req,res);});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();if(!address||typeof address==='string')throw new Error('No server');
const calls:{operation:string,status:number}[]=[],runs:unknown[]=[];
const provider={name:'live model',narrative:async(operation:'story-read'|'story-continue'|'story-review',payload:unknown,signal:AbortSignal)=>{const res=await fetch(`http://127.0.0.1:${address.port}/api/simulation`,{method:'POST',signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.LLM_ACCESS_TOKEN}`},body:JSON.stringify({operation,payload})});calls.push({operation,status:res.status});const body=await res.json();if(!res.ok)throw new Error(body.error);return body.result;}};
try{
 // Explicitly a synthetic source fixture, not a claimed complete 80-chapter text.
 const fixture='第八十回之后的测试起点（人为设定，不作为原著证据）：贾府收支日渐吃紧，王熙凤刚收到两本数目不一致的账册，还没有来得及对质。林黛玉在潇湘馆整理旧诗，尚不知账册一事。贾宝玉刚从院外回来，只见凤姐脸色不豫，未获悉缘由。薛宝钗听母亲说近日用度须俭省，却不知道具体账目。这一日凤姐暂将两本账锁起，决定次日先问经手人，避免惊动长辈。任何人尚未被查出贪墨。';
 const source=await readStorySource(fixture,'测试前情.txt',80,'original80',provider,AbortSignal.timeout(125000),()=>{});
 const run=async(edition:'original80'|'cheng120'|'guiyou108')=>{
  let j=prepareContinuation(createJournal(data,edition),data,'顺着现有矛盾推进，不要立即断案或让人物突然知晓秘密。',edition==='original80'?80:edition==='cheng120'?105:91,edition==='original80'?source:undefined);
  for(let i=0;i<(edition==='original80'?2:1);i++){j=await runContinuation(j,data,provider,async()=>{},AbortSignal.timeout(250000),()=>{});readJournal(JSON.stringify(j),data);console.log(edition+': continuation '+(i+1)+' saved');}
  runs.push({edition,continuation:currentWorld(j).continuation,characters:Object.fromEntries(Object.entries(currentWorld(j).agents).map(([id,a])=>[id,{alive:a.alive}]))});
 };
 const checks=await Promise.allSettled([run('original80'),(async()=>{await run('cheng120');await run('guiyou108');})()]);
 for(const check of checks)if(check.status==='rejected')throw check.reason;
}finally{server.closeAllConnections();server.close();mkdirSync('reports/acceptance/continuation-20260929',{recursive:true});writeFileSync('reports/acceptance/continuation-20260929/live.json',JSON.stringify({at:new Date().toISOString(),scope:'Real model; synthetic text reading fixture, two sequential original80 scenes and one each for cheng120/guiyou108 reviewed excerpts; simulated scene executor, not complete eighty-chapter quality acceptance',calls,runs},null,2));}

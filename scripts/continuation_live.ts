// Opt-in real API verification. Credentials stay in the process environment.
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createSimulationApi} from '../server/simulation-api.mjs';
import {createJournal,currentWorld,readJournal} from '../src/simulation/world';
import {prepareContinuation,runContinuation} from '../src/simulation/continuation';
import type {CanonData} from '../src/data/types';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const data=Object.fromEntries([...['places','characters','events','sources','routes','relations','editionCatalog'].map(k=>[k,read(`data/canon/${k}.json`)]),['manifest',read('public/scene-manifest.json')]]) as unknown as CanonData;
if(!process.env.LLM_ACCESS_TOKEN)throw new Error('LLM_* environment required');
let upstreamSerial=0;
const tracedRequest:typeof fetch=async(url,options)=>{
 const response=await fetch(url,options);
 upstreamSerial++;
 // Opt-in model diagnostics stay private. Do not save headers or API credentials.
 if(process.env.GARDEN_MODEL_TRACE==='1'){mkdirSync('.local/continuation-live',{recursive:true});writeFileSync(`.local/continuation-live/upstream-${upstreamSerial}.json`,JSON.stringify({request:JSON.parse(options?.body as string),response:await response.clone().json()},null,2));}
 return response;
};
const api=createSimulationApi(process.env,tracedRequest,{corpusRoot:'data/canon/corpus'}),server=createServer((req,res)=>{void api(req,res);});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();if(!address||typeof address==='string')throw new Error('No server');
const calls:{operation:string,status:number}[]=[],runs:unknown[]=[];
const selected=(process.env.GARDEN_TEST_EDITIONS??'original80,cheng120,guiyou108').split(',');
if(selected.some(id=>!['original80','cheng120','guiyou108'].includes(id)))throw new Error('Unknown test edition');
const provider={name:'live model',narrative:async(operation:'story-read'|'story-continue'|'story-review',payload:unknown,signal:AbortSignal)=>{const res=await fetch(`http://127.0.0.1:${address.port}/api/simulation`,{method:'POST',signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.LLM_ACCESS_TOKEN}`},body:JSON.stringify({operation,payload})});calls.push({operation,status:res.status});const body=await res.json();if(!res.ok)throw new Error(body.error);return body.result;}};
try{
 const run=async(edition:'original80'|'cheng120'|'guiyou108')=>{
  let j=prepareContinuation(createJournal(data,edition),data,'',80);
  const record={edition,continuation:currentWorld(j).continuation,characters:{}};runs.push(record);
  for(let i=0;i<2;i++){j=await runContinuation(j,data,provider,async()=>{},AbortSignal.timeout(250000),()=>{});readJournal(JSON.stringify(j),data);record.continuation=currentWorld(j).continuation;record.characters=Object.fromEntries(Object.entries(currentWorld(j).agents).map(([id,a])=>[id,{alive:a.alive}]));console.log(edition+': '+(currentWorld(j).continuation?.playbackChapter??'creative scene '+(i+1))+' saved');}
 };
 for(const edition of selected)await run(edition as 'original80'|'cheng120'|'guiyou108');
}finally{server.closeAllConnections();server.close();const directory=`reports/acceptance/after80-${new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'}).replaceAll('-','')}`;mkdirSync(directory,{recursive:true});writeFileSync(`${directory}/model-${selected.join('-')}.json`,JSON.stringify({at:new Date().toISOString(),scope:'Actual model for listed editions; original80 creative scenes after chapter 80, Cheng and Guiyou chapters 81/82 from their own full chapter text; simulated scene executor. Not full-book model reading or all continuation chapters quality acceptance.',upstreamModelCalls:upstreamSerial,calls,runs},null,2));}

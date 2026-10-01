import {approvedReview} from './review-fixture';
import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {createSimulationApi} from '../server/simulation-api.mjs';
import {narrativeText,playbackSource} from '../server/story-playback.mjs';
import {prepareContinuation,continuationPayload,runContinuation,defaultContinuationChapter,isBookPlayback,playbackComplete} from '../src/simulation/continuation';
import {createJournal,currentWorld,forkWorld,readJournal} from '../src/simulation/world';
import type {CanonData} from '../src/data/types';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const data=Object.fromEntries([...['places','characters','events','sources','routes','relations','editionCatalog'].map(k=>[k,read(`data/canon/${k}.json`)]),['manifest',read('public/scene-manifest.json')]]) as unknown as CanonData;
const makeResult=(p:any)=>({review:approvedReview(),title:'原文演绎',narrative:'依据本回原文展现人物行动与结果。'.repeat(25),memory:'本回情节已经展现。',threads:[],causality:'仅承接本回正文。',characterStates:['baoyu','daiyu','baochai','wangxifeng'].map(agent=>({agent,alive:true})),consequences:[],staging:[],...(p.mode==='playback'?{sourceChapter:{chapter:p.nextChapter,title:`第${p.nextChapter}回`,sourceEdition:'fixture',sha256:'b'.repeat(64)}}:{})});
describe('chapter 80 creative and edition playback policy',()=>{
 for(const id of ['original80','cheng120','guiyou108'] as const)it(`${id} always begins after 80`,()=>{
  const journal=createJournal(data,id),world=currentWorld(journal);world.storyChapter=105;
  expect(defaultContinuationChapter(data,id,world)).toBe(80);
  expect(()=>prepareContinuation(journal,data,'',74)).toThrow('第80回');
  const prepared=prepareContinuation(journal,data,'',80),payload=continuationPayload(prepared,data);
  expect(payload.source.through).toBe(80);expect(payload.mode).toBe(id==='original80'?'creative':'playback');
  expect(payload.nextChapter).toBe(id==='original80'?undefined:81);
 });
 for(const id of ['cheng120','guiyou108'] as const)it(`${id} advances exactly one chapter, saves and stops at its actual ending`,async()=>{
  let journal=prepareContinuation(createJournal(data,id),data,'不改变原文',80);
  const calls:any[]=[];const provider={name:'fixture',narrative:vi.fn(async(op:string,p:any)=>{calls.push({op,chapter:p.nextChapter});return makeResult(p);})};
  const end=id==='cheng120'?120:108;
  for(let chapter=81;chapter<=end;chapter++){
   journal=await runContinuation(journal,data,provider,async()=>{},new AbortController().signal,()=>{});
   expect(currentWorld(journal).continuation?.playbackChapter).toBe(chapter);
   expect(currentWorld(journal).storyChapter).toBe(chapter);
  }
  expect(calls.filter(c=>c.op==='story-continue').map(c=>c.chapter)).toEqual(Array.from({length:end-80},(_,i)=>81+i));
  expect(journal.main.snapshots).toHaveLength(end-79);
  expect(readJournal(JSON.stringify(journal),data)).toEqual(journal);
  expect(playbackComplete(journal)).toBe(true);
  await expect(runContinuation(journal,data,provider,async()=>{},new AbortController().signal,()=>{})).rejects.toThrow('已演绎完毕');
  const fork=forkWorld(journal,{type:'world',field:'jia_family_finance',value:50},'另一个可能');
  expect(isBookPlayback(fork)).toBe(false);expect(continuationPayload(fork,data).mode).toBe('creative');expect(continuationPayload(fork,data).nextChapter).toBeUndefined();
 });
 it('rolls back a mismatching review source and cancelled chapter',async()=>{
  const journal=prepareContinuation(createJournal(data,'cheng120'),data,'',80),before=structuredClone(journal);
  const provider={name:'fixture',narrative:async(op:string,p:any)=>({...makeResult(p),sourceChapter:{...makeResult(p).sourceChapter,sha256:(op==='story-review'?'a':'b').repeat(64)}})};
  await expect(runContinuation(journal,data,provider,async()=>{},new AbortController().signal,()=>{})).rejects.toThrow('来源不一致');
  expect(journal).toEqual(before);expect(currentWorld(journal).continuation?.playbackChapter).toBeUndefined();
 });
 it('does not promote annotation spoilers to narrative facts',()=>{
  const text='第八十一回\n[批语：后面另一个结局。]\n话说迎春归去。【回前批：黛玉将死。】宝玉来见。';
  expect(narrativeText(text)).toBe('第八十一回\n\n话说迎春归去。宝玉来见。');
 });
 it('reads only the requested real Cheng chapter',()=>{
  const source=playbackSource('cheng120',81,'data/canon/corpus');
  expect(source.title).toContain('四美');expect(source.text).toContain('釣魚');expect(source.chapter).toBe(81);
  expect(()=>playbackSource('original80',81,'data/canon/corpus')).toThrow();
  expect(()=>playbackSource('cheng120',121,'data/canon/corpus')).toThrow();
 });
 it('injects authoritative chapter evidence into both model calls and fails closed for missing Guiyou',async()=>{
  const requests:any[]=[];
  let forceLong=false;
  const upstream=vi.fn(async(_url:any,options:any)=>{const model=JSON.parse(options.body),p=JSON.parse(model.messages[1].content);requests.push({model,p});const result=p.narrative?{narrative:makeResult({mode:'creative'}).narrative}:makeResult({...p,mode:'creative'});if(requests.length===1||forceLong)result.narrative='超长原文'.repeat(1000);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(result)}}]}));});
  const api=createSimulationApi({LLM_BASE_URL:'https://api.deepseek.com',LLM_MODEL:'deepseek-flash',LLM_API_KEY:'fixture-key',LLM_ACCESS_TOKEN:'fixture-access'},upstream as typeof fetch,{corpusRoot:'data/canon/corpus',guiyouRoot:'.local/nonexistent-playback-fixture'});
  const server=createServer((req,res)=>{void api(req,res);});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${(server.address() as any).port}/api/simulation`;
  const call=async(operation:string,payload:any)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer fixture-access'},body:JSON.stringify({operation,payload})});
  try{
   const payload=continuationPayload(prepareContinuation(createJournal(data,'cheng120'),data,'',80),data);
   const first=await call('story-continue',{...payload,adaptationSource:{text:'FORGED FUTURE'}});expect(first.status).toBe(200);const draft=(await first.json()).result;
   expect(draft.narrative).toBe(makeResult({mode:'creative'}).narrative);
   expect(requests[1].model.messages[0].content).toContain('600—1000字');
   expect(requests[1].model.messages[0].content).toContain('重要结尾结果');
   expect(requests[1].p.adaptationSource).toBeUndefined();
   expect(draft.sourceChapter.chapter).toBe(81);expect(draft.sourceChapter.sha256).toBe(playbackSource('cheng120',81,'data/canon/corpus').sha256);
   expect((await call('story-review',{...payload,draft})).status).toBe(200);
   for(const {model,p} of requests){if(p.adaptationSource){expect(p.adaptationSource.chapter).toBe(81);expect(p.adaptationSource.text).not.toContain('FORGED');expect(p.literaryReferences.endpoint.every((e:any)=>e.chapter===80)).toBe(true);expect(model.messages[0].content).toContain('续本原文演绎');}if(p.draft){expect(model.thinking).toEqual({type:'enabled'});expect(model.max_tokens).toBe(24000);}else{expect(model.thinking).toEqual({type:'disabled'});expect(model.reasoning_effort).toBeUndefined();}}
   const gui=continuationPayload(prepareContinuation(createJournal(data,'guiyou108'),data,'',80),data);
   expect((await call('story-continue',gui)).status).toBe(503);
   expect((await call('story-continue',{...payload,edition:{id:'original80'}})).status).toBe(400);
   expect((await call('story-continue',{...payload,nextChapter:121})).status).toBe(400);
   expect(upstream).toHaveBeenCalledTimes(3);
   forceLong=true;
   expect((await call('story-continue',payload)).status).toBe(502);
   expect(upstream).toHaveBeenCalledTimes(7); // Four bounded attempts, never truncation or unlimited retries.
  }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
 });
});

import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {prepareContinuation,continuationPayload,runContinuation,readStorySource} from '../src/simulation/continuation';
import {createJournal,currentWorld,forkWorld,readJournal,restoreTick} from '../src/simulation/world';
import {validContinuationInput,validContinuationResult} from '../server/continuation.mjs';
import type {CanonData} from '../src/data/types';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const data=Object.fromEntries([...['places','characters','events','sources','routes','relations','editionCatalog'].map(k=>[k,read(`data/canon/${k}.json`)]),['manifest',read('public/scene-manifest.json')]]) as unknown as CanonData;
const result={title:'账册风波',narrative:'贾府开支日重，凤姐命人将旧账与现账一一比对。'.repeat(18),memory:'旧账存在两笔未核实支出，凤姐已决定查证，尚未处分任何人。',threads:['两笔支出的去向'],causality:'收支压力促成查账，查出疑点却未直接认定贪墨。',characterStates:['baoyu','daiyu','baochai','wangxifeng'].map(agent=>({agent,alive:true})),consequences:[{agent:'wangxifeng',fact:'查出两筆支出待核实。'}],staging:[]};
const controller=()=>new AbortController();
describe('model narrative continuation',()=>{
 for(const edition of ['original80','cheng120','guiyou108'] as const)it(`${edition} sends its own source and preserves cumulative consequences`,async()=>{
  let journal=prepareContinuation(createJournal(data,edition),data,'推进贾府收支矛盾',80);
  const provider={name:'fixture',narrative:vi.fn(async(_op:string,p:any)=>({...structuredClone(result),...(p.mode==='playback'?{sourceChapter:{chapter:p.nextChapter,title:'测试回目',sourceEdition:'fixture',sha256:'b'.repeat(64)}}:{})}))};
  journal=await runContinuation(journal,data,provider,async()=>{},controller().signal,()=>{});
  const w=currentWorld(journal);expect(w.continuation?.sequence).toBe(1);expect(w.continuation?.episodes[0].narrative).toBe(result.narrative);
  const next=continuationPayload(journal,data);expect(next.edition.id).toBe(edition);expect(next.memory).toBe(result.memory);expect(next.threads).toEqual(result.threads);expect(next.history).toHaveLength(1);
  expect(w.agents.wangxifeng.memories.some(m=>m.content===result.consequences[0].fact)).toBe(true);expect(w.agents.daiyu.memories.some(m=>m.content===result.consequences[0].fact)).toBe(false);
  expect(readJournal(JSON.stringify(journal),data)).toEqual(journal);expect(currentWorld(restoreTick(journal,0)).continuation?.sequence).toBe(0);
  expect(validContinuationInput('story-continue',next)).toBe(true);
 });
 it('keeps IF conditions and isolates generated continuations',async()=>{
  const base=prepareContinuation(createJournal(data),data,'',80),fork=forkWorld(base,{type:'knowledge',target:'baoyu',content:'贾府准备议亲'},'宝玉提前得知议亲');
  expect(continuationPayload(fork,data).branchCondition).toContain('议亲');
  const next=await runContinuation(fork,data,{name:'fixture',narrative:async()=>result},async()=>{},controller().signal,()=>{});
  expect(next.main).toEqual(base.main);expect(currentWorld(next).agents.baoyu.memories.some(m=>m.origin==='intervention')).toBe(true);
 });
 it('rolls back invalid model output and cancelled staged scenes',async()=>{
  const base=prepareContinuation(createJournal(data),data,'',80),before=structuredClone(base);
  await expect(runContinuation(base,data,{name:'fixture',narrative:async()=>({...result,narrative:''})},async()=>{},controller().signal,()=>{})).rejects.toThrow();
  const c=controller();await expect(runContinuation(base,data,{name:'fixture',narrative:async()=>({...result,staging:[{agent:'baoyu',place:'yihongyuan',action:'write',caption:'写信'}]})},async()=>{c.abort();},c.signal,()=>{})).rejects.toThrow();expect(base).toEqual(before);
 });
 it('reads all input chunks and carries the accumulated source forward',async()=>{
  const text='原文资料\n'.repeat(6000),calls:any[]=[],progress=vi.fn();const p={narrative:vi.fn(async(_op:string,payload:unknown)=>{calls.push(payload);return {summary:`已读${calls.length}段`};})};
  const source=await readStorySource(text,'前八十回.txt',80,'original80',p,controller().signal,progress);
  expect(calls.map(c=>c.text).join('')).toBe(text);expect(calls[1].previous).toBe('已读1段');expect(source.summary).toBe(`已读${calls.length}段`);expect(source.tail).toBe(text.slice(-6000));expect(source.sha256).toMatch(/^[a-f0-9]{64}$/);expect(source.imported).toBe(true);
 });
 it('rejects wrong edition boundaries, fake stage locations and duplicate personal facts',()=>{
  const p=continuationPayload(prepareContinuation(createJournal(data),data,'',80),data);
  expect(validContinuationInput('story-continue',{...p,source:{...p.source,through:120}})).toBe(false);
  expect(validContinuationResult('story-continue',{...result,staging:[{agent:'baoyu',place:'imaginary',action:'write',caption:'写信'}]},p)).toBe(false);
  expect(validContinuationResult('story-continue',{...result,consequences:[...result.consequences,...result.consequences]},p)).toBe(false);
 });
});
it('does not send chapters beyond the selected source boundary to the model',async()=>{
 const p={narrative:vi.fn()};await expect(readStorySource('第八十一回\n'+ '尚未发生的未来'.repeat(30),'完整文本.txt',80,'original80',p,controller().signal,()=>{})).rejects.toThrow('超过所选起点');expect(p.narrative).not.toHaveBeenCalled();
});
it('the main Continue button calls the model twice and never falls back to the demo engine',async()=>{
 const {useSimulation}=await import('../src/simulation/store');const {useGarden}=await import('../src/state/store');
 const initialSimulation=useSimulation.getState(),initialGarden=useGarden.getState();const calls:any[]=[];
 vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{calls.push(JSON.parse(init.body));return new Response(JSON.stringify({result}));}));
 try{useGarden.setState({data});useSimulation.setState({journal:createJournal(data),editionId:'original80',phase:'ready',sceneReady:true,provider:'mock',accessToken:'fixture',comicAutomatic:false});await useSimulation.getState().next();
 expect(useSimulation.getState().error).toBe('');expect(calls.map(c=>c.operation)).toEqual(['story-continue','story-review']);expect(calls[1].payload.draft.title).toBe(result.title);expect(currentWorld(useSimulation.getState().journal!).continuation?.source.through).toBe(80);
 }finally{vi.unstubAllGlobals();useSimulation.setState(initialSimulation,true);useGarden.setState(initialGarden,true);}
});
it('does not revive a character who died in an earlier generated scene',()=>{
 const j=prepareContinuation(createJournal(data),data,'',80);currentWorld(j).agents.daiyu.alive=false;currentWorld(j).continuation!.sequence=1;const p=continuationPayload(j,data);p.history=[{number:1,title:'前段',narrative:'黛玉已故。',causality:'前情'}];expect(validContinuationResult('story-continue',result,p)).toBe(false);
});

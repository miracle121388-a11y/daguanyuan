import {readFileSync} from 'node:fs';
import {describe,it,expect,vi} from 'vitest';
import type {CanonData} from '../src/data/types';
import type {LLMProvider,AgentId} from '../src/simulation/types';
import {forkStory} from '../src/simulation/story';
import {MockProvider} from '../src/simulation/providers';
import {runTick} from '../src/simulation/engine';
import {inviteGathering} from '../src/simulation/participation';
import {prepareContinuation} from '../src/simulation/continuation';
import {setStoryTask} from '../src/simulation/openstory';
import {clone,createJournal,currentWorld,placePosition,readJournal,forkWorld,restoreTick} from '../src/simulation/world';
import {validStoryInput,validStoryResult} from '../server/openstory.mjs';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const data=Object.fromEntries([...['places','characters','events','sources','routes','relations'].map(k=>[k,read(`data/canon/${k}.json`)]),['manifest',read('public/scene-manifest.json')],['editionCatalog',read('data/canon/editionCatalog.json')]]) as unknown as CanonData;
const outcome={narrative:'二人对消息来源各有疑虑，约定先查证，不贸然作答。',fact:'宝玉与黛玉约定查证消息来源。',status:'completed',thread:'消息尚待查证。',reflection:'不能仅凭传闻下结论。',stability:0,finance:0,reason:'尚未解决重大冲突。',relations:[{from:'baoyu',to:'daiyu',trust:1,affection:0,resentment:0}]};
function fixture(){const journal=createJournal(data),w=currentWorld(journal);for(const id of ['baoyu','daiyu'] as AgentId[]){w.agents[id].location='yihongyuan';w.agents[id].position=placePosition(data.manifest,'yihongyuan',id);w.agents[id].mood={calm:70,energy:80};}w.agents.baochai.alive=false;w.agents.wangxifeng.alive=false;return journal;}
function model(overrides:Partial<LLMProvider>={}){return Object.assign(new MockProvider(),{name:'测试模型',story:vi.fn(async(op:string,p:any)=>op==='story-plan'?{goal:'我想问清消息再作决定',steps:[{intent:'与黛玉查证传闻',place:'yihongyuan',target:'daiyu',activity:'investigate',importance:8}],reflection:'先询问，再查证。'}:op==='story-dialogue'?{text:p.perception.self.id==='baoyu'?'此事尚未查明，容我问清来处。':'那便先问清，不可轻信。',end:p.dialogue.length>0}:outcome),...overrides}) as LLMProvider;}
const run=(j=fixture(),p=model(),execute=async()=>{})=>runTick(j,data,p,execute,new AbortController().signal,()=>{});
describe('OpenStory integrated story loop',()=>{
 it.each([['original80','flowers-27',27,80],['cheng120','manuscript-97',97,120],['guiyou108','poems-82',82,108]] as const)('runs %s from its own reviewed story seed',async(edition,node,chapter,maxChapter)=>{
  const j=forkStory(createJournal(data,edition),data,node),w=currentWorld(j);
  for(const id of ['baoyu','baochai','wangxifeng'] as AgentId[])w.agents[id].alive=false;
  w.agents.daiyu.mood={calm:70,energy:80};
  const captured:any[]=[];
  const p=model({story:async(op,payload)=>{captured.push(payload);return op==='story-plan'?{goal:'整理眼前线索',steps:[{intent:'记录当前经历',place:payload.perception.self.location,activity:'write',importance:5}],reflection:'依据当前版本起点'}:{...outcome,relations:[],fact:'黛玉记录眼前经历。'};}});
  const result=await run(j,p);expect(captured[0].perception.literary).toMatchObject({id:edition,chapter,maxChapter});expect(captured[0].perception.literary.boundary).toBeTruthy();expect(captured[0].perception.memories.some((m:any)=>m.content===w.agents.daiyu.memories[0].content)).toBe(true);expect(currentWorld(result).editionId).toBe(edition);expect(readJournal(JSON.stringify(result),data).editionId).toBe(edition);expect(result.main).toEqual(j.main);
 });
 it('runs plans, alternating dialogue and actual consequences, with one encounter per participant',async()=>{
  const j=fixture(),p=model(),result=await run(j,p),w=currentWorld(result);
  expect(w.tick).toBe(1);expect(w.minutes).toBe(currentWorld(j).minutes+120);expect(w.storyRecords).toHaveLength(1);expect(w.storyRecords![0].dialogue.map(d=>d.speaker)).toEqual(['baoyu','daiyu']);expect(w.agents.daiyu.memories.some(m=>m.content===outcome.fact)).toBe(true);expect(w.agents.baoyu.story?.reflection).toContain('查证');expect(currentWorld(j).tick).toBe(0);
  expect(readJournal(JSON.stringify(result),data)).toEqual(result);expect(currentWorld(restoreTick(result,0)).storyRecords).toBeUndefined();
 });
 it('cannot save partial speech or consequences after a failed model call',async()=>{
  const j=fixture(),before=clone(j),p=model();const original=p.story!;p.story=async(op,payload,signal)=>{if(op==='story-outcome')throw new Error('offline');return original(op,payload,signal);};await expect(run(j,p)).rejects.toThrow('offline');expect(j).toEqual(before);
 });
 it('keeps private memories out of the other speaker request',async()=>{
  const j=fixture();currentWorld(j).agents.baoyu.memories.push({id:'secret',tick:0,type:'reflection',content:'私密猜测不可共享',participants:['baoyu'],origin:'generated'});const p=model();await run(j,p);const calls=vi.mocked(p.story!).mock.calls;const daiyu=calls.find(([op,p])=>op==='story-dialogue'&&p.perception.self.id==='daiyu')!;expect(JSON.stringify(daiyu[1])).not.toContain('私密猜测');
 });
 it('stores task changes on the IF world without altering main',()=>{const j=fixture(),fork=forkWorld(j,{type:'mood',target:'baoyu',field:'calm',value:60},'IF');const assigned=setStoryTask(fork,'baoyu','问清婚事来源');expect(currentWorld(assigned).agents.baoyu.story?.task).toBe('问清婚事来源');expect(assigned.main).toEqual(j.main);});
 it('does not execute or score an encounter with an absent target',async()=>{const j=fixture();currentWorld(j).agents.daiyu.location='xiaoxiangguan';currentWorld(j).agents.daiyu.position=placePosition(data.manifest,'xiaoxiangguan','daiyu');currentWorld(j).agents.daiyu.alive=false;const p=model(),w=currentWorld(await run(j,p));expect(w.storyRecords).toHaveLength(0);expect(w.world).toEqual(currentWorld(j).world);expect(vi.mocked(p.story!).mock.calls.every(([op])=>op==='story-plan')).toBe(true);});
 it('rejects consequences targeting an absent third party',async()=>{const p=model({story:async(op,payload)=>op==='story-plan'?{goal:'问话',steps:[{intent:'问话',place:'yihongyuan',target:'daiyu',activity:'confide',importance:7}],reflection:''}:op==='story-dialogue'?{text:'尚待查证。',end:payload.dialogue!.length>0}:{...outcome,relations:[{from:'baoyu',to:'baochai',trust:5,affection:0,resentment:0}]}});await expect(run(fixture(),p)).rejects.toThrow('未参与人物');});
 it('rejects abort even after a scene executor returns',async()=>{const j=fixture(),controller=new AbortController();await expect(runTick(j,data,model(),async()=>{controller.abort();},controller.signal,()=>{})).rejects.toThrow();expect(currentWorld(j).tick).toBe(0);});
 it('invalidates pending story plans when an IF state changes',async()=>{const initial=await run(),w=currentWorld(initial);w.agents.baoyu.story!.steps=[{intent:'未完成打算',place:'yihongyuan',activity:'read',importance:5}];const fork=forkWorld(initial,{type:'world',field:'jia_family_finance',value:25},'家计变化');expect(currentWorld(fork).agents.baoyu.story!.steps).toHaveLength(0);expect(currentWorld(initial).agents.baoyu.story!.steps).toHaveLength(1);});
 it('bounds score changes and rejects duplicate relationship updates',()=>{const p={participants:['baoyu','daiyu']};expect(validStoryResult('story-outcome',outcome,p)).toBe(true);expect(validStoryResult('story-outcome',{...outcome,finance:99},p)).toBe(false);expect(validStoryResult('story-outcome',{...outcome,relations:[...outcome.relations,...outcome.relations]},p)).toBe(false);expect(validStoryInput('story-plan',{})).toBe(false);});
});

it('the gathering UI action advances real scene commands without generating a new literary chapter',async()=>{
 const {useSimulation}=await import('../src/simulation/store'),{useGarden}=await import('../src/state/store');
 const before=useSimulation.getState(),gardenBefore=useGarden.getState();
 const j=inviteGathering(prepareContinuation(fixture(),data,'',80),data,{place:'qiushuangzhai',kind:'poetry',participants:['baoyu','daiyu']});
 const commands:string[]=[];
 const unsubscribe=useSimulation.subscribe(state=>{if(state.playback){commands.push(state.playback.command.action.action);state.playback.done();}});
 vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{}});
 const upstream=vi.fn();vi.stubGlobal('fetch',upstream);
 try {
  useGarden.setState({data});useSimulation.setState({journal:j,open:true,phase:'ready',sceneReady:true,accessToken:'fixture',comicAutomatic:false});
  for(let step=0;step<4&&currentWorld(useSimulation.getState().journal!).gathering?.status==='pending';step++)await useSimulation.getState().advanceParticipation();
  const after=currentWorld(useSimulation.getState().journal!);
  expect(useSimulation.getState().error).toBe('');expect(after.gathering?.status).toBe('completed');expect(commands).toContain('move');expect(commands).toContain('write');
  expect(after.continuation?.sequence).toBe(0);expect(after.continuation?.playbackChapter).toBe(currentWorld(j).continuation?.playbackChapter);
  expect(after.agents.baoyu.memories.some(m=>m.content.includes('完成了联句'))).toBe(true);
  expect(upstream).not.toHaveBeenCalled(); // A scheduled invitation uses route/arrival rules, not fabricated completion.
 }finally{unsubscribe();vi.unstubAllGlobals();useSimulation.setState(before,true);useGarden.setState(gardenBefore,true);}
});

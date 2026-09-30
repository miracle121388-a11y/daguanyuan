// Opt-in real-model acceptance. Credentials come only from process environment.
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createSimulationApi} from '../server/simulation-api.mjs';
import {createJournal,currentWorld,readJournal,placePosition} from '../src/simulation/world';
import {forkStory} from '../src/simulation/story';
import {runTick} from '../src/simulation/engine';
import {MockProvider} from '../src/simulation/providers';
import type {CanonData} from '../src/data/types';
import type {AgentId,LLMProvider} from '../src/simulation/types';
if(!process.env.LLM_ACCESS_TOKEN)throw new Error('Requires configured LLM_* environment');
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const data=Object.fromEntries([...['places','characters','events','sources','routes','relations','editionCatalog'].map(k=>[k,read(`data/canon/${k}.json`)]),['manifest',read('public/scene-manifest.json')]]) as unknown as CanonData;
const api=createSimulationApi(process.env,async(...args:Parameters<typeof fetch>)=>{const response=await fetch(...args);const body=await response.clone().json().catch(()=>null);const c=body?.choices?.[0];if(c){let valid=true;try{JSON.parse(c.message?.content??'')}catch{valid=false}if(!valid)console.log(JSON.stringify({diagnostic:'invalid-json',finish:c.finish_reason,length:c.message?.content?.length,prefix:c.message?.content?.slice(0,100),suffix:c.message?.content?.slice(-100)}));}return response;}),server=createServer((req,res)=>{void api(req,res).then(done=>{if(!done){res.writeHead(404);res.end();}});});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();if(!address||typeof address==='string')throw new Error('server');
const calls:{operation:string;status:number}[]=[],runs:any[]=[];
const provider=Object.assign(new MockProvider(),{name:'live server model',story:async(operation:string,payload:unknown,signal:AbortSignal)=>{const res=await fetch(`http://127.0.0.1:${address.port}/api/simulation`,{method:'POST',signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.LLM_ACCESS_TOKEN}`},body:JSON.stringify({operation,payload})});calls.push({operation,status:res.status});const body=await res.json();if(!res.ok)throw new Error(body.error);return body.result;}}) as LLMProvider;
try{
 for(const [edition,node] of (process.env.OPENSTORY_LIVE_DIALOGUE_ONLY?[]:[['original80','flowers-27'],['cheng120','manuscript-97'],['guiyou108','poems-82']] as const)){
  let journal=forkStory(createJournal(data,edition),data,node);const w=currentWorld(journal);
  // Isolated acceptance scenario: one active actor, no expensive uncontrolled loop.
  for(const id of ['baoyu','baochai','wangxifeng'] as AgentId[])w.agents[id].alive=false;
  w.agents.daiyu.mood={calm:70,energy:80};
  w.agents.daiyu.story={goal:'',steps:[],reflection:'',plannedTick:-1,memoryStamp:'',task:'留在当前院中，先独自写下眼前困惑与消息出处，分辨已知和猜测；下一步拟好一份查证的问题清单。不要离开或拜访他人。',taskRevision:1,plannedRevision:-1};
  for(let i=0;i<2;i++)journal=await runTick(journal,data,provider,async()=>{},AbortSignal.timeout(240000),()=>{});
  const after=currentWorld(journal);readJournal(JSON.stringify(journal),data);
  if(!after.storyRecords?.length||after.tick!==2)throw new Error(`${edition} did not produce a saved story`);
  runs.push({edition,node,tick:after.tick,records:after.storyRecords,plan:after.agents.daiyu.story});console.log(`${edition}: two ticks saved, ${after.storyRecords.length} story records`);
 }
 const dialogueJournal=createJournal(data),dw=currentWorld(dialogueJournal);
 for(const id of ['baoyu','daiyu'] as AgentId[]){dw.agents[id].location='yihongyuan';dw.agents[id].position=placePosition(data.manifest,'yihongyuan',id);dw.agents[id].mood={calm:70,energy:80};}
 dw.agents.baochai.alive=false;dw.agents.wangxifeng.alive=false;
 dw.agents.baoyu.story={goal:'我想与黛玉商量重开诗社，先听她的想法',steps:[{intent:'商议重开诗社，问清黛玉的意愿与顾虑',place:'yihongyuan',target:'daiyu',activity:'organize',importance:8}],reflection:'尚未获得答复，不预设她同意',plannedTick:0,memoryStamp:dw.agents.baoyu.memories.filter(m=>m.type==='knowledge').map(m=>m.knowledgeId??m.id).join('|'),task:'',taskRevision:0,plannedRevision:0};
 const dialogueResult=await runTick(dialogueJournal,data,provider,async()=>{},AbortSignal.timeout(240000),()=>{});readJournal(JSON.stringify(dialogueResult),data);
 const dialogueRecords=currentWorld(dialogueResult).storyRecords??[];if(!dialogueRecords[0]?.dialogue.length)throw new Error('No real dialogue generated');runs.push({edition:'original80',scope:'isolated two-person encounter with fixture plan',records:dialogueRecords});console.log('Live alternating dialogue and outcome saved');
}finally{server.closeAllConnections();server.close();mkdirSync('reports/acceptance/openstory-20260929',{recursive:true});writeFileSync(process.env.OPENSTORY_LIVE_DIALOGUE_ONLY?'reports/acceptance/openstory-20260929/dialogue-live.json':'reports/acceptance/openstory-20260929/live.json',JSON.stringify({at:new Date().toISOString(),scope:'Real model, three editions, isolated solo activities, scene executor stubbed; not browser animation acceptance',calls,runs},null,2)+'\n');}

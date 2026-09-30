// OpenStory story-mode port; source and Apache-2.0 notice: third_party/openstory/.
import type {CanonData} from '../data/types';
import {agentIds, type AgentId, type Journal, type LLMProvider, type SceneExecutor, type SemanticAction, type WorldState} from './types';
import {storyOutcomeSchema, storyPlanSchema, type StoryRequest} from './openstoryTypes';
import {addMemory, clamp, clone, clockLabel, currentBranch, currentWorld} from './world';
import {perceive} from './perception';
import {validateAction} from './rules';
import {planAgent} from './planning';

const abort=(signal:AbortSignal)=>{if(signal.aborted)throw new DOMException('本步已取消','AbortError');};
const stamp=(w:WorldState,id:AgentId)=>w.agents[id].memories.filter(m=>m.type==='knowledge').map(m=>m.knowledgeId??m.id).join('|');
export function setStoryTask(journal:Journal,id:AgentId,task:string):Journal {
 const value=task.trim();if(!value||value.length>400)throw new Error('请填写1到400字的任务。');
 const next=clone(journal),actor=currentWorld(next).agents[id];if(!actor.alive)throw new Error('该人物当前不能接受任务。');
 actor.story??={goal:'',steps:[],reflection:'',plannedTick:-1,memoryStamp:'',task:'',taskRevision:0,plannedRevision:-1};
 actor.story.task=value;actor.story.completed=false;actor.story.taskRevision++;actor.story.steps=[];
 return next;
}
/** The complete tick is a transaction, including plans, speech and consequences. */
export async function runOpenStoryTick(journal:Journal,data:CanonData,provider:LLMProvider,execute:SceneExecutor,signal:AbortSignal,progress:(world:WorldState,phase:'deciding'|'executing',actor:AgentId)=>void):Promise<Journal>{
 if(!provider.story)throw new Error('此推演需要已配置的服务器模型。');
 const world=clone(currentWorld(journal));world.tick++;world.events=[];world.storyRecords??=[];
 const occupied=new Set<AgentId>(),actions:SemanticAction[]=[];
 const log=(id:AgentId,text:string,kind:'story'|'dialogue'|'rule'|'action'='story')=>{
  const event={id:`${world.worldId??world.branchId}:${world.tick}:${world.events.length}`,tick:world.tick,time:clockLabel(world.minutes),kind,text,agent:id,contentType:'generated' as const};world.events.push(event);return event;
 };
 const act=async(id:AgentId,action:SemanticAction)=>{
  const p=perceive(world,id,data);p.self.plan=undefined;
  const {command,notes}=validateAction(action,id,world,p,data);
  for(const note of notes)log(id,note,'rule');
  world.agents[id].currentAction=command.action;progress(clone(world),'executing',id);
  await execute(command,signal);abort(signal);actions.push(command.action);
  if(command.action.action==='move'&&command.destination){
   const actor=world.agents[id];actor.location=command.destination;actor.spot=command.destinationSpot??'gate';actor.position=[...command.path.at(-1)!];actor.knownLocations[id]=actor.location;actor.mood.energy=clamp(actor.mood.energy-5);
   const e=log(id,`${actor.name}沿园路来到${data.places.find(p=>p.id===actor.location)?.name}。`,'action');
   addMemory(actor,{tick:world.tick,type:'activity',content:e.text,participants:[id],origin:'generated',sourceEventId:e.id});
  }
  return command;
 };
 // OpenStory occupation arbitration: important available tasks get first turn;
 // a participant can join only one encounter in the same tick.
 const priority=(id:AgentId)=>world.directives.some(d=>d.agent===id)?100:world.agents[id].mood.energy<35?90:world.agents[id].story?.steps[0]?.importance??0;
 const order=[...agentIds].sort((a,b)=>priority(b)-priority(a));
 for(const id of order){
  abort(signal);const actor=world.agents[id];if(!actor.alive||occupied.has(id))continue;
  for(const other of agentIds)if(world.agents[other].alive&&world.agents[other].location===actor.location)actor.knownLocations[other]=actor.location;
  const directive=world.directives.find(d=>d.agent===id);
  if(directive?.kind==='tell'){
   const e=log(id,`玩家托人告诉${actor.name}：“${directive.content}”`);
   addMemory(actor,{tick:world.tick,type:'knowledge',content:directive.content!,participants:[id],origin:'player',knowledgeId:directive.id,sourceEventId:e.id,importance:90});world.directives=world.directives.filter(d=>d.id!==directive.id);
  }
  progress(clone(world),'deciding',id);
  const p=perceive(world,id,data);const routine=planAgent(p);
  if((routine.trigger==='needs'&&(actor.mood.energy<35||actor.mood.calm<40))||routine.trigger==='player'){
   actor.plan=routine;const command=await act(id,routine.steps[0]);
   if(command.action.action!=='move'){
    actor.mood.energy=clamp(actor.mood.energy+(command.action.action==='rest'?10:-1));if(command.action.action==='rest')actor.mood.calm=clamp(actor.mood.calm+4);
    log(id,`${actor.name}${command.action.action==='rest'?'歇息恢复体力':'处理当前托付'}。`,'action');
   }
   if(directive&&directive.kind!=='tell'&& (directive.kind===command.action.action&&directive.target===command.action.target&&(directive.spot??'gate')===(command.destinationSpot??'gate') || directive.kind==='visit'&&actor.location===world.agents[directive.target as AgentId]?.location))world.directives=world.directives.filter(d=>d.id!==directive.id);
   occupied.add(id);continue;
  }
  actor.plan=null;
  const state=actor.story,knowledge=stamp(world,id);
  if(!state?.steps.length||state.memoryStamp!==knowledge||state.plannedRevision!==state.taskRevision||world.tick-state.plannedTick>=12){
   const plan=storyPlanSchema.parse(await provider.story('story-plan',{perception:p,task:state?.task??'',previous:state},signal));abort(signal);
   for(const step of plan.steps){if(!data.places.some(x=>x.id===step.place)||step.target&&(!actor.knownLocations[step.target]||step.target===id))throw new Error('人物计划包含不可用的地点或对象，本步未保存。');}
   actor.story={...plan,completed:false,plannedTick:world.tick,memoryStamp:knowledge,task:state?.task??'',taskRevision:state?.taskRevision??0,plannedRevision:state?.taskRevision??0};
  }
  const step=actor.story!.steps[0];actor.goals=[actor.story!.goal];
  if(actor.location!==step.place){await act(id,{agent:id,action:'move',target:step.place,reason:step.intent});continue;}
  const target=step.target&&world.agents[step.target];
  if(target&&(!target.alive||occupied.has(target.id)||target.location!==actor.location)){
   const e=log(id,`${actor.name}想${step.intent}，但${target.name}${!target.alive?'当前不在场':occupied.has(target.id)?'正在处理别的事情':'不在此处'}。这件事尚未完成。`);
   addMemory(actor,{tick:world.tick,type:'observation',content:e.text,participants:[id],origin:'generated',sourceEventId:e.id});
   actor.story!.reflection='会面未成，需要调整时间或地点；不能假定对方已经答应。';actor.story!.steps=[];occupied.add(id);continue;
  }
  if(target&&Math.hypot(...actor.position.map((v,i)=>v-target.position[i]))>4){await act(id,{agent:id,action:'visit',target:target.id,reason:step.intent});continue;}
  const participants:AgentId[]=target?[id,target.id]:[id];participants.forEach(x=>occupied.add(x));
  const dialogue:{speaker:AgentId;text:string}[]=[];
  if(target){
   for(let round=0;round<4;round++){
    const speaker=participants[round%2];progress(clone(world),'deciding',speaker);
    const raw=await provider.story('story-dialogue',{perception:perceive(world,speaker,data),scene:step,participants,dialogue:clone(dialogue)},signal) as {text:string;end:boolean};abort(signal);
    if(typeof raw?.text!=='string'||!raw.text.trim()||raw.text.length>400||typeof raw.end!=='boolean')throw new Error('人物对白格式不正确，本步未保存。');
    // Dynamic dialogue is an utterance, not an unrestricted world mutation.
    const speech:SemanticAction={agent:speaker,action:'talk',target:participants[(round+1)%2],content:raw.text,reason:step.intent};
    world.agents[speaker].currentAction=speech;progress(clone(world),'executing',speaker);
    await execute({action:speech,path:[],face:[...world.agents[speech.target as AgentId].position]},signal);abort(signal);actions.push(speech);
    dialogue.push({speaker,text:raw.text});log(speaker,`${world.agents[speaker].name}：${raw.text}`,'dialogue');if(raw.end&&round>=1)break;
   }
  }else{await act(id,{agent:id,action:['read','write','rest'].includes(step.activity)?step.activity as 'read'|'write'|'rest':step.activity==='manage'?'write':'observe',reason:step.intent});}
  progress(clone(world),'deciding',id);
  const request:StoryRequest={perception:perceive(world,id,data),scene:step,participants,dialogue};
  const outcome=storyOutcomeSchema.parse(await provider.story('story-outcome',request,signal));abort(signal);
  if(new Set(outcome.relations.map(r=>r.from+':'+r.to)).size!==outcome.relations.length||outcome.relations.some(r=>r.from===r.to||!participants.includes(r.from)||!participants.includes(r.to)))throw new Error('剧情试图改变未参与人物，本步未保存。');
  const e=log(id,outcome.narrative);
  const before={...world.world};world.world.jia_family_stability=clamp(before.jia_family_stability+outcome.stability);world.world.jia_family_finance=clamp(before.jia_family_finance+outcome.finance);
  for(const r of outcome.relations){const rel=world.agents[r.from].relationships[r.to];for(const key of ['trust','affection','resentment'] as const)rel[key]=clamp(rel[key]+r[key]);}
  for(const who of participants){
   addMemory(world.agents[who],{tick:world.tick,type:'interaction',content:outcome.fact,participants,origin:'generated',sourceEventId:e.id,importance:step.importance*10});
   world.agents[who].mood.energy=clamp(world.agents[who].mood.energy+(step.activity==='rest'?10:-2));
   for(const other of participants)world.agents[who].knownLocations[other]=world.agents[other].location;
  }
  if(target?.story)target.story.plannedTick=-12;
  actor.story!.reflection=(outcome.reflection+(outcome.thread?' 后续：'+outcome.thread:'')).slice(0,160);
  if(outcome.status==='completed'){actor.story!.steps.shift();if(!actor.story!.steps.length){actor.story!.completed=true;actor.story!.task='';}}else actor.story!.steps=[];
  addMemory(actor,{tick:world.tick,type:'reflection',content:`${outcome.reflection}${outcome.thread?' 待办：'+outcome.thread:''}`,participants:[id],origin:'generated',evidenceIds:[e.id],importance:70});
  world.storyRecords.push({id:e.id,tick:world.tick,actor:id,title:step.intent,narrative:outcome.narrative,fact:outcome.fact,thread:outcome.thread,status:outcome.status,participants,dialogue,stability:world.world.jia_family_stability-before.jia_family_stability,finance:world.world.jia_family_finance-before.jia_family_finance,reason:outcome.reason});world.storyRecords=world.storyRecords.slice(-40);
 }
 const gathering=world.gathering;
 if(gathering?.status==='pending'){
  const activity=gathering.kind==='poetry'?'write':'rest';
  if(gathering.participants.every(id=>world.agents[id].location===gathering.place&&world.agents[id].spot==='court'&&actions.some(a=>a.agent===id&&a.action===activity))){
   gathering.status='completed';gathering.finishedTick=world.tick;
   const e=log(gathering.participants[0],gathering.participants.map(id=>world.agents[id].name).join('、')+'在约定庭院完成了'+(gathering.kind==='poetry'?'联句':'茶叙')+'。');
   for(const id of gathering.participants){world.agents[id].mood.calm=clamp(world.agents[id].mood.calm+3);addMemory(world.agents[id],{tick:world.tick,type:'interaction',content:e.text,participants:gathering.participants,origin:'generated',sourceEventId:e.id});}
  }else if(world.tick-gathering.createdTick>=6){gathering.status='cancelled';gathering.finishedTick=world.tick;log(gathering.participants[0],'等候已久，本次小聚未能完成，约定暂且作罢。');}
 }
 world.minutes+=120;
 const records=world.storyRecords.filter(r=>r.tick===world.tick);
 const summary=records.length?records.map(r=>r.narrative).join('\n\n'):world.events.map(e=>e.text).join(' ');
 const next=clone(journal),branch=currentBranch(next);branch.snapshots=branch.snapshots.slice(0,branch.cursor+1);branch.snapshots.push({worldState:world,actions,summary,provider:`OpenStory · ${provider.name}`});if(branch.snapshots.length>30)branch.snapshots.shift();branch.cursor=branch.snapshots.length-1;return next;
}

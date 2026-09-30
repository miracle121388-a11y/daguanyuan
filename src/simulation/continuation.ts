import {z} from 'zod';
import type {CanonData} from '../data/types';
import {editionFor, type EditionId} from '../data/editions';
import {validContinuationResult} from '../../server/continuation.mjs';
import {continuationResultSchema, type NarrativeProvider, type StorySource} from './continuationTypes';
import {agentIds, type AgentId, type Journal, type SceneExecutor, type WorldState} from './types';
import {addMemory, clockLabel, clone, currentBranch, currentWorld, createWorld} from './world';
import {perceive} from './perception';
import {validateAction} from './rules';

export function defaultContinuationChapter(_data:CanonData,_id:EditionId,_world:WorldState){
 return 80;
}
export const isBookPlayback=(journal:Journal)=>journal.active==='main'&&(journal.editionId??'original80')!=='original80';
export const playbackComplete=(journal:Journal)=>isBookPlayback(journal)&&(currentWorld(journal).continuation?.playbackChapter??80)>=editionFor(journal.editionId!).chapters;
export function reviewedSource(data:CanonData,id:EditionId,through:number):StorySource {
 const edition=editionFor(id,data.editionCatalog);
 const nodes=(data.editionCatalog?.nodes??[]).filter(n=>n.editions.includes(id)&&n.chapter<=through).sort((a,b)=>a.chapter-b.chapter);
 const detail=(n:typeof nodes[number])=>`第${n.chapter}回 ${n.title}：${n.summary}\n`+n.sourceRefs.map(ref=>data.editionCatalog?.sources.find(s=>s.id===ref)).filter(Boolean).map(s=>`审核摘录（${s!.locator}）：${s!.excerpt}`).join('\n');
 if(through===80)return {label:`${edition.shortTitle} · 第80回结束`,through,summary:[edition.coverage,...nodes.map(detail),'统一从第80回结束开始。服务器须提供该版本第80回结尾正文，以上早期节选不是终点。'].join('\n').slice(0,16000),tail:'第80回结尾由服务器核验正文提供，不能把早期节选当当前场景。',characters:0,sha256:'reviewed-canon',imported:false};
 if(!nodes.some(n=>n.chapter===through))throw new Error(`尚无第${through}回结尾资料。`);
 return {label:`${edition.shortTitle} · 已核对的节选资料`,through,summary:[edition.coverage,...nodes.map(detail)].join('\n').slice(0,16000),tail:('续演必须从以下资料终点之后展开，不能倒退到前面的回目：\n'+detail(nodes.at(-1)!)+(nodes.at(-1)!.seed.inactiveAgents?.length?'\n当前已故、不能再当下登场的人物：'+nodes.at(-1)!.seed.inactiveAgents!.map(id=>data.characters.find(c=>c.id===id)?.name).join('、'): '')).slice(-6000),characters:0,sha256:'reviewed-canon',imported:false};
}
export function prepareContinuation(journal:Journal,data:CanonData,direction:string,through:number,source?:StorySource):Journal {
 const result=clone(journal),branch=currentBranch(result),world=currentWorld(result),edition=result.editionId??'original80';
 if(through!==80)throw new Error('三个版本统一从第80回结束开始。');
 if(world.continuation?.sequence && (source||through!==world.continuation.source.through))throw new Error('故事已开始。请先在时间快照回到续演前，再更换原文或起点。');
 if(!world.continuation){world.continuation={source:source??reviewedSource(data,edition,through),sequence:0,direction:'',memory:'',threads:[],episodes:[]};}
 else if(!world.continuation.sequence)world.continuation.source=source??(through===world.continuation.source.through?world.continuation.source:reviewedSource(data,edition,through));
 world.continuation.direction=direction.trim().slice(0,800);
 branch.snapshots=branch.snapshots.slice(0,branch.cursor+1);return result;
}
/** Text files remain local; only bounded text chunks are sent to the configured model.
 * The digest is private simulation data, never published as reviewed canon. */
export async function readStorySource(text:string,label:string,through:number,edition:EditionId,provider:NarrativeProvider,signal:AbortSignal,progress:(done:number,total:number)=>void):Promise<StorySource>{
 if(text.trim().length<100||text.length>1500000)throw new Error('请选择100字至150万字的纯文本原文。');
 if(through<1||through>editionFor(edition).chapters)throw new Error('原文终点超出所选版本。');
 const digits:Record<string,number>={'零':0,'〇':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};
 for(const match of text.matchAll(/(?:^|\n)\s*第([0-9零〇一二两三四五六七八九十百]+)回/g)){
  let chapter=0,number=0;const token=match[1];
  if(/^\d+$/.test(token))chapter=Number(token);else{for(const char of token){if(char==='十'||char==='百'){chapter+=(number||1)*(char==='十'?10:100);number=0;}else number=digits[char]??0;}chapter+=number;}
  if(chapter>through)throw new Error('原文包含第'+chapter+'回，超过所选起点。请只导入截至第'+through+'回的内容。');
 }
 const chunks:string[]=[];let offset=0;
 while(offset<text.length){let end=Math.min(offset+16000,text.length);if(end<text.length){const line=text.lastIndexOf('\n',end);if(line>offset+12000)end=line;}chunks.push(text.slice(offset,end));offset=end;}
 let summary='';progress(0,chunks.length);
 for(let i=0;i<chunks.length;i++){signal.throwIfAborted();const result=await provider.narrative('story-read',{edition:{id:edition},part:i+1,text:chunks[i],previous:summary},signal);signal.throwIfAborted();summary=z.object({summary:z.string().min(1).max(10000)}).strict().parse(result).summary;progress(i+1,chunks.length);}
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 return {label:label.slice(0,160),through,summary,tail:text.slice(-6000),characters:text.length,sha256:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join(''),imported:true};
}
export function continuationPayload(journal:Journal,data:CanonData){
 const world=currentWorld(journal),c=world.continuation;if(!c)throw new Error('请先选择续演起点。');
 const inactive=!c.sequence&&!c.source.imported?data.editionCatalog?.nodes.find(n=>n.editions.includes(journal.editionId??'original80')&&n.chapter===c.source.through)?.seed.inactiveAgents??[]:[];
 const playback=isBookPlayback(journal);
 return {edition:editionFor(journal.editionId??'original80',data.editionCatalog),source:c.source,mode:playback?'playback' as const:'creative' as const,...(playback?{nextChapter:(c.playbackChapter??80)+1}:{}),direction:playback?'':c.direction,memory:c.memory,threads:c.threads,history:c.episodes,branchCondition:currentBranch(journal).prompt,
 stageActors:agentIds.map(id=>{const a=world.agents[id];return {id,name:a.name,alive:!inactive.includes(id)&&(!c.sequence||a.alive),personality:a.personality,memories:a.memories.filter(m=>c.sequence>0||m.origin==='intervention'||m.origin==='player').slice(-6),task:c.sequence?a.story?.task??'':'',directives:world.directives.filter(d=>d.agent===id)};}),
 places:data.places.filter(p=>data.manifest.pathNodes.some(n=>n.id===p.id)).map(p=>({id:p.id,name:p.name}))};
}
export async function runContinuation(journal:Journal,data:CanonData,provider:NarrativeProvider&{name:string},execute:SceneExecutor,signal:AbortSignal,progress:(world:WorldState,phase:'deciding'|'reviewing'|'executing',actor:AgentId)=>void):Promise<Journal>{
 if(playbackComplete(journal))throw new Error('本版本后续回目已演绎完毕。可在时间快照重看，或创建IF世界。');
 const payload=continuationPayload(journal,data),world=clone(currentWorld(journal)),c=world.continuation!;
 progress(clone(world),'deciding','baoyu');
 const draft=await provider.narrative('story-continue',payload,signal);signal.throwIfAborted();
 if(!validContinuationResult('story-continue',draft,payload))throw new Error('模型剧情格式不完整，本段未保存，请重试。');
 progress(clone(world),'reviewing','baoyu');
 const raw=await provider.narrative('story-review',{...payload,draft},signal);signal.throwIfAborted();
 if(!validContinuationResult('story-continue',raw,payload))throw new Error('模型剧情格式不完整，本段未保存，请重试。');
 const result=continuationResultSchema.parse(raw);world.tick++;world.events=[];
 const draftSource=continuationResultSchema.parse(draft).sourceChapter;
 if(payload.mode==='playback'&&(!draftSource||result.sourceChapter?.sha256!==draftSource.sha256))throw new Error('创作与复核的原文来源不一致，本回未保存。');
 for(const state of result.characterStates)world.agents[state.agent].alive=state.alive;
 // Source chronology replaces old scenic demo memories, not the reader's IF condition.
 if(!c.sequence){const fresh=createWorld(data,world.editionId);for(const id of agentIds){world.agents[id].memories=world.agents[id].memories.filter(m=>['intervention','player'].includes(m.origin));world.agents[id].plan=null;world.agents[id].story=undefined;world.agents[id].knowledgeLedger={};world.agents[id].currentAction=null;world.agents[id].goals=fresh.agents[id].goals;}world.storyChapter=c.source.through;delete world.storyNodeId;}
 const actions:import('./types').SemanticAction[]=[];
 const log:(kind:import('./types').SimulationEvent['kind'],text:string,agent?:AgentId,details?:Partial<import('./types').SimulationEvent>)=>import('./types').SimulationEvent=(kind,text,agent,details={})=>{const e:import('./types').SimulationEvent={id:`${world.worldId}:${world.tick}:${world.events.length}`,tick:world.tick,time:clockLabel(world.minutes),kind,text,agent,contentType:'generated',...details};world.events.push(e);return e;};
 // Stage only supported scenes; narration is generated independently of animation assets.
 for(const beat of result.staging){const a=world.agents[beat.agent];if(!a.alive)continue;
  for(const action of [...(a.location!==beat.place?[{agent:beat.agent,action:'move' as const,target:beat.place,reason:beat.caption}]:[]),{agent:beat.agent,action:beat.action,reason:beat.caption}]){
   signal.throwIfAborted();const p=perceive(world,beat.agent,data);p.self.plan=null;const {command}=validateAction(action,beat.agent,world,p,data);world.agents[beat.agent].currentAction=command.action;progress(clone(world),'executing',beat.agent);await execute(command,signal);signal.throwIfAborted();if(command.destination){a.location=command.destination;a.spot=command.destinationSpot??'gate';a.position=[...command.path.at(-1)!];}actions.push(command.action);
  }
 }
 for(const item of result.consequences)addMemory(world.agents[item.agent],{tick:world.tick,type:'interaction',content:item.fact,participants:[item.agent],origin:'generated',importance:90});
 c.sequence++;c.memory=result.memory;c.threads=result.threads;
 if(result.sourceChapter){c.playbackChapter=result.sourceChapter.chapter;world.storyChapter=result.sourceChapter.chapter;}
 c.episodes=[...c.episodes,{number:c.sequence,title:result.title,narrative:result.narrative,causality:result.causality,...(result.sourceChapter?{sourceChapter:result.sourceChapter}:{})}].slice(-3);
 log('story',result.narrative);world.minutes+=120;
 const next=clone(journal),branch=currentBranch(next);branch.snapshots=branch.snapshots.slice(0,branch.cursor+1);branch.snapshots.push({worldState:world,actions,summary:result.narrative,provider:provider.name,label:`${result.sourceChapter?`第${result.sourceChapter.chapter}回演绎`:`续演${c.sequence}`} · ${result.title}`.slice(0,100)});if(branch.snapshots.length>(isBookPlayback(next)?64:30))branch.snapshots.shift();branch.cursor=branch.snapshots.length-1;return next;
}

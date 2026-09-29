import {editionFor} from '../data/editions';
import {useState} from 'react';
import {useSimulation} from '../simulation/store';
import type {AgentId, WorldState} from '../simulation/types';
export default function SimulationStory({world,person,busy,configured}:{world:WorldState;person:AgentId;busy:boolean;configured:boolean}){
 const s=useSimulation(),[task,setTask]=useState('');const actor=world.agents[person],state=actor.story;
 const records=(world.storyRecords??[]).slice(-8).reverse();
 return <section className="sim-story" aria-label="故事推演">
  <p className="sim-note">{editionFor(s.editionId).title} · 第{world.storyChapter??23}回起点 · 独立世界线</p><div className="sim-story-heading"><h3>故事推演</h3><span>{s.provider==='remote'?'OpenStory · 模型驱动':'本地规则 · 行为演示'}</span></div>
  {s.provider!=='remote'?<><p>启用故事模式，让人物形成目标、自由交谈，并根据结果继续发展情节。</p><button disabled={busy||!configured} onClick={()=>useSimulation.setState({provider:'remote',automatic:false})}>{configured?'启用故事模式':'服务器模型尚未配置'}</button></>:<>
   {<label>推演访问口令<input type="password" autoComplete="off" value={s.accessToken} onChange={e=>useSimulation.setState({accessToken:e.target.value})}/></label>}
   <p className="sim-note">每步推进一个时辰。人物可能拒绝、错过会面或改变打算；生成剧情独立于原著。</p>
   <form onSubmit={e=>{e.preventDefault();if(s.assignStoryTask(person,task))setTask('');}}><label>托付{actor.name}一件事<textarea value={task} maxLength={400} disabled={busy} onChange={e=>setTask(e.target.value)} placeholder="例如：找宝玉问清婚事消息的来源，再决定如何回应"/></label><button disabled={busy||!task.trim()}>交付任务</button></form>
  </>}
  {state&&<details open><summary>{actor.name}{state.completed?'已完成的打算':'的打算'}</summary><p>{state.goal||state.task}</p>{state.task&&<small>玩家托付：{state.task}</small>}<ol>{state.steps.map((step,i)=><li key={i}>{step.intent}</li>)}</ol>{state.reflection&&<p className="sim-note">反思：{state.reflection}</p>}</details>}
  {records.map(r=><article key={r.id}><small>第 {r.tick} 步 · {world.agents[r.actor].name} · {r.status==='completed'?'本次行动完成':r.status==='blocked'?'遇阻':'继续发展'}</small><h4>{r.title}</h4><p>{r.narrative}</p>{r.thread&&<p className="sim-story-thread">后续：{r.thread}</p>}<details><summary>对话与结果依据</summary>{r.dialogue.map((d,i)=><p key={i}><strong>{world.agents[d.speaker].name}：</strong>{d.text}</p>)}<p>{r.fact}</p><p>安定 {r.stability>0?'+':''}{r.stability} · 财力 {r.finance>0?'+':''}{r.finance}：{r.reason}</p></details></article>)}
 <small>推演机制改编自 <a href="https://github.com/ZJU-LLMs/OpenStory" target="_blank" rel="noreferrer">OpenStory</a> · <a href="/licenses/openstory/LICENSE.txt" target="_blank" rel="noreferrer">Apache-2.0</a></small>
 </section>;
}

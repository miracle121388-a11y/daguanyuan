import {useEffect,useRef,useState} from 'react';
import {useGarden} from '../state/store';
import {defaultContinuationChapter} from '../simulation/continuation';
import {editionFor} from '../data/editions';
import {useSimulation} from '../simulation/store';
import type {WorldState} from '../simulation/types';
/** Implementation provenance belongs in server/continuation.mjs and third_party/. */
export default function SimulationStory({world,busy}:{world:WorldState;busy:boolean}){
 const s=useSimulation(),c=world.continuation,edition=editionFor(s.editionId);
 const data=useGarden(state=>state.data)!;
 const through=c?.source.through??defaultContinuationChapter(data,s.editionId,world);
 const [importThrough,setImportThrough]=useState(edition.chapters);
 const newest=useRef<HTMLElement>(null);
 useEffect(()=>{if(c?.sequence&&!busy)newest.current?.scrollIntoView({block:'start',behavior:'smooth'});},[c?.sequence,busy]);
 return <section className="sim-story" aria-label="故事续演">
  <div className="sim-story-heading"><h3>{c?.sequence?'故事正在继续':'从已有故事，续演下去'}</h3></div>
  <p className="sim-note">{edition.shortTitle} · 第{through}回之后 · {c?.source.imported?'已导入原文':'依据已核对节选，尚未导入完整原文'}</p>
  <label>推演口令<input type="password" autoComplete="off" value={s.accessToken} onChange={e=>useSimulation.setState({accessToken:e.target.value})}/></label>
  <label>你希望故事如何发展？<textarea aria-label="故事发展方向" maxLength={800} disabled={busy} value={c?.direction??''} onChange={e=>s.setContinuation(e.target.value,through)} placeholder="可以留空，让人物依照前情自行选择；也可以提出想探索的变化。"/></label>
  <details><summary>原文与续演起点</summary>
   <label>导入原文截止第几回<input type="number" min={1} max={edition.chapters} disabled={busy||!!c?.sequence} value={importThrough} onChange={e=>setImportThrough(Number(e.target.value))}/></label>
   <p className="sim-note">导入对应版本、截至所选回目的 TXT 原文。模型逐段读取，保留人物关系、伏笔和最后情境，用于连续续演。原文会发送给本项目配置的模型。</p>
   <label>导入原文<input type="file" accept=".txt,.md,text/plain" disabled={busy||!!c?.sequence} onChange={e=>{const file=e.target.files?.[0];if(file)void s.importSource(file,importThrough);e.target.value='';}}/></label>
   {c?.source.imported&&<p>{c.source.label} · {c.source.characters.toLocaleString()} 字</p>}
   {s.readingProgress&&<p role="status">{s.readingProgress}</p>}
   {!!c?.sequence&&<p className="sim-note">更换原文前，可在时间快照回到续演前的时刻。</p>}
  </details>
  {!!c?.sequence&&<p className="sim-note">每段由模型生成，承接已发生的剧情。可在“时间快照”阅读或回到更早的段落。</p>}
  {c?.episodes.slice().reverse().map((r,i)=><article ref={i===0?newest:undefined} key={r.number}><small>续演 · 第{r.number}段</small><h4>{r.title}</h4><div className="sim-narrative">{r.narrative.split(/\n+/).map((p,i)=><p key={i}>{p}</p>)}</div><details><summary>前因与后果</summary><p>{r.causality}</p></details></article>)}
  {!!c?.threads.length&&<details><summary>尚未解开的线索</summary><ul>{c.threads.map(t=><li key={t}>{t}</li>)}</ul></details>}
 </section>;
}

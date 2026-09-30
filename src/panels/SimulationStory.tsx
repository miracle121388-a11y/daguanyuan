import {useEffect,useRef} from 'react';
import {isBookPlayback,playbackComplete} from '../simulation/continuation';
import {editionFor} from '../data/editions';
import {useSimulation} from '../simulation/store';
import type {WorldState} from '../simulation/types';
/** Implementation provenance belongs in server/continuation.mjs and third_party/. */
export default function SimulationStory({world,busy}:{world:WorldState;busy:boolean}){
 const s=useSimulation(),c=world.continuation,edition=editionFor(s.editionId);
 const playback=!!s.journal&&isBookPlayback(s.journal),complete=!!s.journal&&playbackComplete(s.journal);
 const through=80;
 const newest=useRef<HTMLElement>(null);
 useEffect(()=>{if(c?.sequence&&!busy)newest.current?.scrollIntoView({block:'start',behavior:'smooth'});},[c?.sequence,busy]);
 return <section className="sim-story" aria-label="故事续演">
  <div className="sim-story-heading"><h3>{playback?(complete?'后续回目已演绎完毕':'沿原文，走进后续情节'):'第80回之后，故事由此新生'}</h3></div>
  <p className="sim-note">{edition.shortTitle} · 统一从第80回结束开始 · {playback?'原文演绎':'自由推演'}</p>
  {playback?<p className="sim-note">{complete?`已演至第${edition.chapters}回，可回看快照或创建IF世界。`:`下一回：第${(c?.playbackChapter??80)+1}回。按本版本正文顺序呈现情节；对白与镜头由模型改编。`}</p>:<p className="sim-note">不预设续本结局，由模型依据前80回的人物与前情创作。IF条件将持续影响后续。</p>}
  <label>推演口令<input type="password" autoComplete="off" value={s.accessToken} onChange={e=>useSimulation.setState({accessToken:e.target.value})}/></label>
  {!playback&&<label>你希望故事如何发展？<textarea aria-label="故事发展方向" maxLength={800} disabled={busy} value={c?.direction??''} onChange={e=>s.setContinuation(e.target.value,through)} placeholder="可以留空，让人物依照前情自行选择；也可以提出想探索的变化。"/></label>}
  <details><summary>前情资料</summary>
   <p className="sim-note">起点固定为第80回结束。{playback?'每回从服务器核验过的本版本正文取材，不混用另一本结局。':'服务器提供第80回结尾及相关历史片段；这不等于模型已通读全书。可另行导入截至80回的私人TXT，逐段建立前情档案。'}</p>
   {!playback&&<label>导入前80回原文<input type="file" accept=".txt,.md,text/plain" disabled={busy||!!c?.sequence} onChange={e=>{const file=e.target.files?.[0];if(file)void s.importSource(file,80);e.target.value='';}}/></label>}
   {c?.source.imported&&<p>{c.source.label} · {c.source.characters.toLocaleString()} 字</p>}
   {s.readingProgress&&<p role="status">{s.readingProgress}</p>}
   {!!c?.sequence&&<p className="sim-note">更换原文前，可在时间快照回到续演前的时刻。</p>}
  </details>
  {!!c?.sequence&&<p className="sim-note">可在“时间快照”阅读或回到更早的{playback?'回目':'段落'}。</p>}
  {c?.episodes.slice().reverse().map((r,i)=><article ref={i===0?newest:undefined} key={r.number}><small>{r.sourceChapter?`原文演绎 · 第${r.sourceChapter.chapter}回`:`自由推演 · 第${r.number}段`}</small><h4>{r.title}</h4>{r.sourceChapter&&<p className="sim-note">{r.sourceChapter.title}</p>}<div className="sim-narrative">{r.narrative.split(/\n+/).map((p,i)=><p key={i}>{p}</p>)}</div><details><summary>前因与后果</summary><p>{r.causality}</p></details></article>)}
  {!!c?.threads.length&&<details><summary>尚未解开的线索</summary><ul>{c.threads.map(t=><li key={t}>{t}</li>)}</ul></details>}
 </section>;
}

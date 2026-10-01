import {useEffect,useRef} from 'react';
import {isBookPlayback,playbackComplete} from '../simulation/continuation';
import {branchOrigin,currentBranch} from '../simulation/world';
import {editionFor} from '../data/editions';
import {useSimulation} from '../simulation/store';
import type {WorldState} from '../simulation/types';
const checks={chronology:'时间顺序',knowledge:'人物知情',motivation:'选择与动机',continuity:'前后衔接',branch:'分支条件',edition:'版本依据',staging:'场景一致性'};
/** Implementation provenance belongs in server/continuation.mjs and third_party/. */
export default function SimulationStory({world,busy}:{world:WorldState;busy:boolean}){
 const s=useSimulation(),c=world.continuation,edition=editionFor(s.editionId);
 const playback=!!s.journal&&isBookPlayback(s.journal),complete=!!s.journal&&playbackComplete(s.journal);
 const branch=s.journal?.active==='if'?currentBranch(s.journal):null,origin=branch?branchOrigin(branch):null;
 const episodes=c?.episodes.filter(r=>!branch||origin?.sequence===undefined||r.number>origin.sequence)??[];
 const inherited=branch&&origin?.sequence!==undefined?c?.episodes.filter(r=>r.number<=origin.sequence!)??[]:[];
 const newest=useRef<HTMLElement>(null);
 useEffect(()=>{if(c?.sequence&&!busy)newest.current?.scrollIntoView({block:'start',behavior:'smooth'});},[c?.sequence,busy]);
 const direction=<label>你希望故事如何发展？<textarea aria-label="故事发展方向" maxLength={800} disabled={busy} value={c?.direction??''} onChange={e=>s.setContinuation(e.target.value,80)} placeholder="可以留空，让人物依照前情自行选择。"/></label>;
 return <section className={'sim-story'+(branch?' sim-branch-story':'')} aria-label={branch?'分支故事':'故事续演'}>
  {!branch&&<><div className="sim-story-heading"><h3>{playback?(complete?'后续回目已演绎完毕':'沿原文，走进后续情节'):'第80回之后，故事由此新生'}</h3></div>
  <p className="sim-note">{edition.shortTitle} · 从第80回结束开始 · {playback?'原文演绎':'自由推演'}</p>
  {playback?<p className="sim-note">{complete?`已演至第${edition.chapters}回，可回看快照或创建IF世界。`:`下一回：第${(c?.playbackChapter??80)+1}回。按本版本正文顺序呈现情节；对白与镜头依据原文改编。`}</p>:<><p className="sim-note">不预设续本结局，依据前80回的人物与前情展开。</p>{direction}</>}
  </>}
  {branch&&!episodes.length&&<div className="sim-branch-empty"><h3>分支已开启，新的故事还未发生</h3><p>点击「推演这个如果」，看这个改变怎样影响人物的选择。</p><span>不会改写主故事，也不预设这个如果的结局。</span></div>}
  {episodes.slice().reverse().map((r,i)=><article ref={i===0?newest:undefined} key={r.number}><small>{branch?`IF 分支${origin?.sequence!==undefined?` · 第${r.number-origin.sequence}段`:''}`:r.sourceChapter?`原文演绎 · 第${r.sourceChapter.chapter}回`:`自由推演 · 第${r.number}段`}</small><h4>{r.title}</h4>{r.sourceChapter&&<p className="sim-note">{r.sourceChapter.title}</p>}<div className="sim-narrative">{r.narrative.split(/\n+/).map((p,i)=><p key={i}>{p}</p>)}</div><details><summary>前因与后果</summary><p>{r.causality}</p></details>{r.review&&<details className="sim-review"><summary>情节核对记录</summary><p className="sim-note">生成后逐项复核的依据，供阅读与检查；仍可能存在表达疏漏。</p><dl>{r.review.checks.map(check=><div key={check.category}><dt>{checks[check.category]}</dt><dd>{check.evidence}</dd></div>)}</dl></details>}</article>)}
  {!!inherited.length&&<details><summary>分岔前的最近前情</summary>{inherited.map(r=><div key={r.number}><h4>{r.title}</h4><p>{r.narrative}</p></div>)}</details>}
  {!!c?.threads.length&&<details><summary>尚未解开的线索</summary><ul>{c.threads.map(t=><li key={t}>{t}</li>)}</ul></details>}
  {branch&&<details><summary>补充分支的发展方向</summary>{direction}<p className="sim-note">补充探索方向不会替换顶部的分支条件，也不等于已经发生的事实。</p></details>}
  <details><summary>前情资料</summary>
   <p className="sim-note">主故事从第80回结束开始。{branch?'本分支继承分岔时的故事和人物记忆，按新的假设继续创作，不强制重演续本结局。':playback?'每回从服务器核验过的本版本正文取材，不混用另一本结局。':'服务器提供第80回结尾及相关历史片段；这些片段并非全书内容。可另行导入截至80回的私人TXT，逐段建立前情档案。'}</p>
   {!playback&&<label>导入前80回原文<input type="file" accept=".txt,.md,text/plain" disabled={busy||!!c?.sequence} onChange={e=>{const file=e.target.files?.[0];if(file)void s.importSource(file,80);e.target.value='';}}/></label>}
   {c?.source.imported&&<p>{c.source.label} · {c.source.characters.toLocaleString()} 字</p>}
   {s.readingProgress&&<p role="status">{s.readingProgress}</p>}
   {!!c?.sequence&&<p className="sim-note">可在时间快照阅读或恢复更早的段落；更换原文需回到续演前。</p>}
  </details>
 </section>;
}

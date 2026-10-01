import {GitBranch} from 'lucide-react';
import {editionFor} from '../data/editions';
import {branchOrigin, interventionDescription} from '../simulation/world';
import type {Branch, WorldState} from '../simulation/types';
import {useSimulation} from '../simulation/store';

export default function SimulationBranch({branch,world,busy}:{branch:Branch;world:WorldState;busy:boolean}) {
 const s=useSimulation(),origin=branchOrigin(branch);
 const point=origin.sequence===0?'第80回结束':origin.chapter&&origin.chapter>80?`第${origin.chapter}回演绎后`:origin.sequence!==undefined?`已有故事第${origin.sequence}段后`:`已有故事第${branch.forkTick}步`;
 return <section className="sim-branch-hero" aria-label="当前 IF 分支条件">
  <div className="sim-branch-eyebrow"><GitBranch size={15}/><span>一个如果，另一条故事线</span></div>
  <p className="sim-branch-premise">{branch.prompt}</p>
  <div className="sim-branch-origin">{editionFor(s.editionId).shortTitle} · 从{point}分岔</div>
  <div className="sim-branch-actions"><button disabled={busy} onClick={()=>s.openWorld('main')}>返回主故事</button><button disabled={busy} onClick={()=>useSimulation.setState({ifComposerOpen:true,automatic:false})}>另写一个如果</button></div>
  <details className="sim-branch-change"><summary>查看实际改变</summary><p>{branch.intervention&&interventionDescription(world,branch.intervention)}</p><p>分岔之前的前情保留，后续故事单独存档。</p></details>
 </section>;
}

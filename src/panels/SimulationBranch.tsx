import type {Branch} from '../simulation/types';
import {useSimulation} from '../simulation/store';

export default function SimulationBranch({branch,busy}:{branch:Branch;busy:boolean}) {
 const s=useSimulation();
 return <section className="sim-branch-hero" aria-label="当前 IF 分支条件">
  <p className="sim-branch-premise">{branch.prompt}</p>
  <details className="sim-branch-menu"><summary>分支选项</summary><div className="sim-branch-actions"><button disabled={busy} onClick={()=>s.openWorld('main')}>返回主故事</button><button disabled={busy} onClick={()=>useSimulation.setState({ifComposerOpen:true,automatic:false})}>另写一个如果</button></div></details>
 </section>;
}

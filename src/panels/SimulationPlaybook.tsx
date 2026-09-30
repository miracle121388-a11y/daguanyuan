import {ArrowRight, BookOpen} from 'lucide-react';
import type {WorldState} from '../simulation/types';
import {useSimulation} from '../simulation/store';

export default function SimulationPlaybook({world}: {world: WorldState}) {
  const s = useSimulation();
  return <section className="sim-playbook" aria-label="入园玩法">
    <span className="sim-eyebrow">一园故人，等你入局</span>
    <h3>{world.tick ? '故事里，已有你的痕迹。' : '从这一刻，走入红楼。'}</h3>
    <p>点「继续故事」看人物行动，或在「入局互动」中交谈、抉择、邀人小聚。</p>
    <button className="sim-playbook-story" disabled={s.phase !== 'ready'} onClick={() => useSimulation.setState({libraryOpen: true, automatic: false})}><BookOpen size={16}/><span>选一幕红楼，亲身入局</span><ArrowRight size={15}/></button>
  </section>;
}

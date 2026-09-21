import {ArrowRight, BookOpen, MessageCircle, Users} from 'lucide-react';
import type {WorldState} from '../simulation/types';
import {useSimulation} from '../simulation/store';
import {currentBranch} from '../simulation/world';

/** Invitations and milestones describe saved actions, never inferred story outcomes. */
export default function SimulationPlaybook({world}: {world: WorldState}) {
  const s = useSimulation(), busy = s.phase !== 'ready';
  const pending = world.gathering?.status === 'pending';
  const history = s.journal ? currentBranch(s.journal).snapshots.slice(0, currentBranch(s.journal).cursor + 1) : [];
  const spoke = !!world.conversations?.length;
  const changed = !!world.resolvedEncounters?.length || !!world.directives.length || !!world.gathering;
  const witnessed = history.some(snapshot => snapshot.actions.length > 0);
  const chatTarget = world.agents.daiyu.alive ? 'daiyu' : Object.values(world.agents).find(actor => actor.alive)?.id;
  const guests = (['baoyu','daiyu','baochai'] as const).filter(id => world.agents[id].alive);
  const invite = () => {
    if (!pending) {
      if (guests.length < 2) return;
      s.invite({place:'qiushuangzhai',kind:'tea',participants:guests});
    }
    useSimulation.setState({recordView:'participate',participationView:'gathering',automatic:false,director:true});
  };
  return <section className="sim-playbook" aria-label="入园玩法">
    <span className="sim-eyebrow">一园故人，等你入局</span>
    <h3>{world.tick || spoke || changed ? '故事里，已有你的痕迹。' : '从一次相逢开始。'}</h3>
    <p>走近一人，说一句话，邀一席茶。看你的小小选择，怎样改变园中的下一刻。</p>
    <div className="sim-playbook-cards">
      <button disabled={busy || !chatTarget} onClick={() => chatTarget && s.participate(chatTarget)}><MessageCircle size={18}/><strong>竹下问安</strong><span>与{chatTarget ? world.agents[chatTarget].name : '故人'}说说话</span><ArrowRight size={14}/></button>
      <button disabled={busy || !pending && guests.length < 2} onClick={invite}><Users size={18}/><strong>{pending ? '故人赴约中' : '邀一席茶'}</strong><span>{pending ? '查看众人的赴约进度' : `邀${guests.map(id => world.agents[id].name.slice(1)).join('、')}同坐`}</span><ArrowRight size={14}/></button>
    </div>
    <button className="sim-playbook-story" disabled={busy} onClick={() => useSimulation.setState({libraryOpen:true,automatic:false})}><BookOpen size={16}/><span>选一幕红楼，亲身入局</span><ArrowRight size={15}/></button>
    <ol className="sim-playbook-steps" aria-label="本条故事的参与足迹">{[[spoke,'交谈'],[changed,'改变一念'],[witnessed,'见证后续']].map(([done,label]) => <li key={String(label)} data-complete={Boolean(done)}><i>{done ? '✓' : '·'}</i>{label}</li>)}</ol>
  </section>;
}

import {useState} from 'react';
import {ArrowRight, BookOpen} from 'lucide-react';
import type {CanonData} from '../data/types';
import {useGarden} from '../state/store';
import {useSimulation} from '../simulation/store';
import {agentIds, type AgentId, type PlayerDirective, type WorldState} from '../simulation/types';
import {interviewAgent, type InterviewTopic} from '../simulation/insights';
import {courtRoutes, placeSetting} from '../simulation/space';

const requests = {move: '前往一处园景', visit: '去拜访一个人', tell: '告诉他一个消息', read: '读一会书', write: '写字抒怀', rest: '静坐歇息', observe: '留意周围'} as const;
export default function SimulationInteractions({id, world, data}: {id: AgentId; world: WorldState; data: CanonData}) {
  const s = useSimulation(), spoiler = useGarden(g => g.spoilerLimit);
  const actor = world.agents[id], busy = s.phase !== 'ready';
  const [kind, setKind] = useState<PlayerDirective['kind']>('move'), [target, setTarget] = useState('xiaoxiangguan');
  const [content, setContent] = useState(''), [topic, setTopic] = useState<InterviewTopic | null>(null);
  const [notice, setNotice] = useState('');
  const pending = world.directives.find(d => d.agent === id);
  const interview = topic ? interviewAgent(world, id, topic, data) : null;
  const canonical = data.places.find(p => p.id === actor.location);
  const sources = data.sources.filter(source => canonical?.sourceRefs.includes(source.id) && (spoiler === null || source.chapter <= spoiler));
  const chooseKind = (value: PlayerDirective['kind']) => { setKind(value); setNotice(''); setTarget(value === 'visit' ? agentIds.find(other => other !== id)! : actor.location); };
  return <>
    <div className="sim-intention"><h4>此刻的打算</h4><p>{actor.plan?.goal ?? '尚未安排下一步，等待推演展开。'}</p>{actor.plan?.steps.length ? <ol>{actor.plan.steps.map((step, index) => <li key={index}>{step.action === 'move' ? `前往${data.places.find(p => p.id === step.target)?.name ?? step.target}${step.spot === 'court' ? '院内' : ''}` : step.action === 'visit' ? `拜访${world.agents[step.target as AgentId]?.name}` : step.action === 'talk' ? '与知交交谈' : requests[step.action as keyof typeof requests] ?? '停留片刻'}</li>)}</ol> : null}</div>
    <form className="sim-request" onSubmit={event => { event.preventDefault(); const ok = s.issueDirective({agent: id, kind, ...(['move', 'visit'].includes(kind) ? {target} : {}), ...(kind === 'move' ? {spot: courtRoutes[target] ? 'court' as const : 'gate' as const} : {}), ...(kind === 'tell' ? {content: content.trim()} : {})}); if (ok) setNotice('已记下托付。运行下一 Tick 后，人物会依身体状况逐步行动。'); }}>
      <h4>托付一件事</h4><label htmlFor={`sim-request-${id}`}>请{actor.name}<select id={`sim-request-${id}`} value={kind} disabled={busy} onChange={event => chooseKind(event.target.value as PlayerDirective['kind'])}>{Object.entries(requests).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {kind === 'move' && <label>前往地点<select value={target} disabled={busy} onChange={event => setTarget(event.target.value)}>{data.places.map(place => <option value={place.id} key={place.id}>{place.name}{courtRoutes[place.id] ? ' · 入院' : ''}</option>)}</select></label>}
      {kind === 'visit' && <label>拜访人物<select value={target} disabled={busy} onChange={event => setTarget(event.target.value)}>{agentIds.filter(other => other !== id).map(other => <option value={other} key={other}>{world.agents[other].name}</option>)}</select></label>}
      {kind === 'tell' && <label>只让{actor.name}先听到<textarea rows={3} maxLength={400} value={content} disabled={busy} onChange={event => setContent(event.target.value)} placeholder="例如：今夜有一封信送到潇湘馆。"/><span className="sim-note">这是加入本世界的虚构消息，其他人须经交谈才能获知。</span></label>}
      <button className="sim-branch-button" disabled={busy || kind === 'tell' && !content.trim()} type="submit">{pending ? '更新托付' : '记下托付'}<ArrowRight size={15}/></button>
      {pending && <p className="sim-pending" role="status">待办：{requests[pending.kind]}{pending.target && ` · ${data.places.find(p => p.id === pending.target)?.name ?? world.agents[pending.target as AgentId]?.name ?? ''}`}<button type="button" disabled={busy} onClick={() => { s.withdrawDirective(id); setNotice('已撤回这件尚未完成的托付。'); }}>撤回</button></p>}
      {notice && <p className="sim-note" role="status">{notice}</p>}
    </form>
    <section className="sim-interview" aria-label="人物追问"><h4>问一问{actor.name}</h4><div role="group" aria-label="追问话题">{([['intention', '接下来有何打算？'], ['knowledge', '你听说了什么？'], ['relationship', '你此刻信任谁？']] as const).map(([key, label]) => <button key={key} aria-pressed={topic === key} onClick={() => setTopic(key)}>{label}</button>)}</div>{interview && <div className="sim-answer"><p>“{interview.answer}”</p><small>根据此人的当前状态与记忆整理 · 本地回应</small>{interview.evidence.length > 0 && <details><summary>查看这段回答的记忆依据</summary><ol>{interview.evidence.map(e => <li key={e.id}>Tick {e.tick} · {e.text}</li>)}</ol></details>}</div>}</section>
    {actor.reflection && <details className="sim-reflection"><summary>最近一次自省 · Tick {actor.reflection.tick}</summary><p>{actor.reflection.text}</p></details>}
    <details className="sim-canon"><summary><BookOpen size={14}/>此地原文依据 · 与推演分列</summary><p>{placeSetting(data, actor.location).atmosphere}</p><span className="sim-note">庭院站位和行动路线为舞台安排。</span>{sources.length ? sources.slice(0, 2).map(source => <div key={source.id}><blockquote>{source.evidenceExcerpt}</blockquote><p>{source.title} · {source.paragraphLocator}</p></div>) : <p>当前阅读范围内暂无此地可展示的原文。</p>}</details>
  </>;
}

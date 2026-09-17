import {useEffect, useRef, useState} from 'react';
import {ArrowRight, GitBranch, MessageCircle, Send, Users} from 'lucide-react';
import type {CanonData} from '../data/types';
import {agentIds, type AgentId, type ConversationTurn, type Gathering, type WorldState} from '../simulation/types';
import {useSimulation} from '../simulation/store';
import {agentColors, currentBranch} from '../simulation/world';
import {encounterFor} from '../simulation/participation';
import {courtRoutes, spotName} from '../simulation/space';
import {DreamButton} from './DreamExperience';

export default function SimulationParticipation({world, data}: {world: WorldState; data: CanonData}) {
  const s = useSimulation(), id = s.focused ?? 'baoyu', actor = world.agents[id], busy = s.phase !== 'ready';
  return <section className="sim-participation" aria-label="入局互动">
    <div className="sim-person-tabs" role="group" aria-label="选择交谈人物">{agentIds.map(person => <button key={person} disabled={busy} aria-pressed={id === person} onClick={() => s.focus(person)}><span style={{background: agentColors[person]}}/>{world.agents[person].name}</button>)}</div>
    <div className="sim-participation-heading"><h3>{actor.name}</h3><p>{spotName(data, actor.location, actor.spot)}<span>与你熟悉 {actor.playerBond ?? 50}</span></p></div>
    <div className="sim-participation-modes" role="group" aria-label="参与方式">{([['chat', '与他交谈', MessageCircle], ['choice', '临场抉择', GitBranch], ['gathering', '邀人小聚', Users]] as const).map(([key, label, Icon]) => <button key={key} aria-pressed={s.participationView === key} onClick={() => useSimulation.setState({participationView: key, automatic: false})}><Icon size={14}/>{label}</button>)}</div>
    {s.participationView === 'chat' && <Conversation key={id} id={id} world={world}/>}
    {s.participationView === 'choice' && <Choices id={id} world={world} data={data}/>}
    {s.participationView === 'gathering' && <GatheringInvitation world={world} data={data}/>}
  </section>;
}
function Conversation({id, world}: {id: AgentId; world: WorldState}) {
  const s = useSimulation(), {message, tone} = s.conversationDrafts[id] ?? {message: '', tone: 'chat' as const};
  const draft = (changes: Partial<{message: string; tone: ConversationTurn['tone']}>) => useSimulation.setState(state => ({conversationDrafts: {...state.conversationDrafts, [id]: {message, tone, ...changes}}}));
  const setMessage = (message: string) => draft({message}), setTone = (tone: ConversationTurn['tone']) => draft({tone});
  const turns = (world.conversations ?? []).filter(t => t.agent === id), latest = useRef<HTMLDivElement>(null), busy = s.phase !== 'ready';
  const actor = world.agents[id];
  useEffect(() => { if (turns.length) latest.current?.scrollIntoView({block: 'nearest'}); }, [turns.at(-1)?.id]);
  const submit = async () => { if (await s.converse(id, message, tone)) setMessage(''); };
  return <div className="sim-conversation">
    <p className="sim-note">{s.provider === 'mock' ? '本地模式按人物状态组织回应。切换服务器模型，可自由展开话题。' : `${s.remoteLabel} 会结合此人记忆和最近四轮对话作答。`}交谈即时存档，不推进时辰。</p>
    {turns.length > 3 && <details className="sim-chat-earlier"><summary>查看更早的 {turns.length - 3} 次交谈</summary>{turns.slice(0, -3).map(t => <ConversationEntry key={t.id} turn={t} name={actor.name}/>)}</details>}
    <div className="sim-chat-transcript" role="log" aria-live="polite" aria-label="你们的对话">{turns.slice(-3).map(t => <ConversationEntry key={t.id} turn={t} name={actor.name}/>)}</div>
    <div ref={latest} aria-live="polite" className="sim-chat-live">{s.phase === 'conversing' ? `${world.agents[s.actor ?? id].name}正在回应…` : turns.length ? '回应已存入这一刻。' : '从一句问候开始，或说说你的打算。'}</div>
    {turns.at(-1)?.tick === world.tick && <DreamButton capture trigger="conversation" focus={id}/>}
    <form className="sim-chat-form" onFocus={() => useSimulation.setState({automatic: false})} onSubmit={e => { e.preventDefault(); void submit(); }}>
      <label htmlFor="sim-chat-message">想对{actor.name}说什么</label>
      <textarea id="sim-chat-message" value={message} maxLength={400} rows={3} disabled={busy} placeholder="你此刻有什么牵挂？我愿听你慢慢说。" onChange={e => setMessage(e.target.value)} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); if (!busy && message.trim()) void submit(); } }}/>
      <div className="sim-chat-suggestions">{['你此刻有什么牵挂？', '这里的景致可入诗？', '你还记得我们刚才说的事吗？'].map(text => <button type="button" key={text} disabled={busy} onClick={() => setMessage(text)}>{text}</button>)}</div>
      <div className="sim-chat-compose"><label>语气<select value={tone} disabled={busy} onChange={e => setTone(e.target.value as ConversationTurn['tone'])}><option value="chat">叙话</option><option value="comfort">宽慰</option><option value="challenge">直言</option></select></label>{s.phase === 'conversing' ? <button key="cancel" type="button" onClick={e => { e.preventDefault(); s.cancel(); }}>取消这次交谈</button> : <button key="send" type="submit" className="sim-primary" disabled={busy || !message.trim()}><Send size={14}/>说给他听</button>}</div>
      {s.error && <div className="sim-chat-feedback" role="alert"><p>{s.error}</p><button type="button" disabled={busy || !message.trim()} onClick={() => void submit()}>重试这句话</button></div>}
      <p className="sim-note">交谈与抉择每人每 Tick 只调整一次平静和熟悉度。对白为虚构；若要传递明确消息，请使用“托付与追问”。</p>
      <button className="sim-text-action" type="button" disabled={busy} onClick={() => s.inspect(id)}>托付与追问<ArrowRight size={13}/></button>
    </form>
  </div>;
}
function ConversationEntry({turn: t, name}: {turn: ConversationTurn; name: string}) {
  return <article className="sim-chat-entry"><p className="sim-chat-player"><span>你 · {t.tone === 'comfort' ? '宽慰' : t.tone === 'challenge' ? '直言' : '叙话'}</span>{t.message}</p>
    <div className="sim-chat-reply"><span>{name} · {t.provider} · Tick {t.tick}</span><p>{t.reply}</p><small>{t.outcome}</small>
      {t.evidence.length > 0 && <details><summary>他想起的经历 · {t.evidence.length} 条</summary>{t.evidence.map(e => <p key={e.id}>{e.text}</p>)}</details>}
    </div></article>;
}
function Choices({id, world, data}: {id: AgentId; world: WorldState; data: CanonData}) {
  const s = useSimulation(), busy = s.phase !== 'ready', encounter = encounterFor(world, id, data);
  if (!encounter) return <p className="sim-note">这位人物当前无法参与。</p>;
  const branch = s.journal && currentBranch(s.journal), previous = branch && branch.cursor > 0 && branch.snapshots[branch.cursor].label?.startsWith('临场选择');
  const outcome = encounter.resolved?.outcome ?? world.events.find(e => e.kind === 'choice' && e.agent === id)?.text;
  return <div className="sim-encounter"><h4>{encounter.title}</h4><p className="sim-encounter-scene">{encounter.text}</p>
    {outcome ? <div className="sim-choice-outcome" role="status"><strong>你的选择已经留下痕迹</strong><p>{outcome}</p><span>继续推演，看看这番话如何影响他的安排。</span>{previous && <button disabled={busy} onClick={() => s.restore(branch!.cursor - 1)}>回到选择之前</button>}</div>
      : <><button className="sim-text-action" disabled={busy} onClick={s.forkHere}><GitBranch size={14}/>从此刻另开一线</button><p className="sim-note">先分岔，可保留原线；每个情境只能选一次。状态变化或三个 Tick 后，可能遇到新情境。</p><div className="sim-choice-list">{encounter.choices.map(choice => <button key={choice.id} disabled={busy} onClick={() => s.choose(id, encounter.id, choice.id)}><strong>{choice.label}</strong><span>{choice.consequence}{choice.directive && world.directives.some(d => d.agent === id) ? ' 将替换此人原有托付。' : ''}</span><ArrowRight size={16}/></button>)}</div></>}
    {outcome && <button className="sim-branch-button" disabled={busy || !s.sceneReady} onClick={() => void s.next()}>让故事继续<ArrowRight size={15}/></button>}
  </div>;
}
function GatheringInvitation({world, data}: {world: WorldState; data: CanonData}) {
  const s = useSimulation(), [place, setPlace] = useState('qiushuangzhai'), [kind, setKind] = useState<Gathering['kind']>('poetry'), [participants, setParticipants] = useState<AgentId[]>(['baoyu', 'daiyu']);
  const gathering = world.gathering, pending = gathering?.status === 'pending', busy = s.phase !== 'ready';
  return <div className="sim-gathering"><h4>邀几位故人，同坐一席</h4><p className="sim-note">选一处已有庭院，邀请两至四人。赴约、等候与联句或茶叙都在园中逐步发生。</p>
    {gathering && <div className="sim-gathering-status" role="status"><strong>{gathering.status === 'completed' ? '小聚已成' : pending ? '一席待故人' : '这场邀约已散'}</strong><p>{spotName(data, gathering.place, 'court')} · {gathering.kind === 'poetry' ? '联句' : '品茗'}</p><ul>{gathering.participants.map(id => <li key={id}><span>{world.agents[id].name}</span><span>{pending ? world.agents[id].location === gathering.place && world.agents[id].spot === 'court' ? '已到院中' : world.agents[id].mood.energy < 35 ? '先歇息，再赴约' : world.directives.some(d => d.agent === id) ? '先完成已有托付' : '待沿路赴约' : gathering.status === 'completed' ? '留下一段共同经历' : '回到各自安排'}</span></li>)}</ul>
      {pending && <><button className="sim-branch-button" disabled={busy || !s.sceneReady} onClick={() => void s.next()}>{busy ? '众人正在行动' : '继续这场小聚'}<ArrowRight size={15}/></button><button className="sim-text-action" disabled={busy} onClick={s.dismissGathering}>撤回邀请</button><p className="sim-note">身体需要、已有托付可能推迟赴约。六步仍未成席，会自动散约。</p></>}
    </div>}
    {!pending && <form className="sim-gathering-form" onFocus={() => useSimulation.setState({automatic: false})} onSubmit={e => { e.preventDefault(); s.invite({place, kind, participants}); }}>
      <label>相聚地点<select value={place} disabled={busy} onChange={e => setPlace(e.target.value)}>{data.places.filter(p => courtRoutes[p.id]).map(p => <option key={p.id} value={p.id}>{spotName(data, p.id, 'court')}</option>)}</select></label>
      <fieldset disabled={busy}><legend>邀谁同来 · 已选 {participants.length} 人</legend>{agentIds.map(id => <label key={id}><input type="checkbox" checked={participants.includes(id)} disabled={!world.agents[id].alive} onChange={e => setParticipants(e.target.checked ? [...participants, id] : participants.filter(p => p !== id))}/>{world.agents[id].name}</label>)}</fieldset>
      <label>席间做什么<select value={kind} disabled={busy} onChange={e => setKind(e.target.value as Gathering['kind'])}><option value="poetry">联句 · 一同提笔</option><option value="tea">品茗 · 一同歇息</option></select></label>
      <button className="sim-branch-button" disabled={busy || participants.length < 2} type="submit"><Users size={15}/>{gathering ? '再邀一场小聚' : '发出邀请'}<ArrowRight size={15}/></button><p className="sim-note">到齐并完成活动后，平静各增加3点，彼此信任最多增加2点；未到场不会获得相处结果。</p>
    </form>}
  </div>;
}

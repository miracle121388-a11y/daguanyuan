import SimulationPlaybook from './SimulationPlaybook';
import {useEffect, useRef, useState} from 'react';
import {ArrowRight, Download, GitBranch, LocateFixed, RotateCcw, X} from 'lucide-react';
import {useGarden} from '../state/store';
import {agentIds} from '../simulation/types';
import {exportJournal, useSimulation} from '../simulation/store';
import {agentColors, clockLabel, currentBranch, currentWorld, interventionDescription} from '../simulation/world';
import {spotName} from '../simulation/space';
import {SimulationRunControls, SimulationSpeed} from './SimulationControls';
import SimulationInteractions from './SimulationInteractions';
import SimulationParticipation from './SimulationParticipation';
import {SimulationFlow, SimulationWorldlines} from './SimulationWorldlines';
import Disclosure from './Disclosure';
import {DreamStatus} from './DreamExperience';

export const EXAMPLE_IF = '如果宝玉提前知道贾府准备让他迎娶薛宝钗，会发生什么？';
const topics = [{label: '提前知情', text: EXAMPLE_IF}, {label: '黛玉静养', text: '如果黛玉的精力降到30'}, {label: '贾府收支', text: '如果贾府财力降到30'}];
const actions: Record<string, string> = {move: '沿路行走', visit: '前去拜访', talk: '交谈', observe: '观望', rest: '休息', read: '读书', write: '写字', wait: '等候'};
const kinds: Record<string, string> = {rule: '规则校验', relationship: '关系变化', intervention: '假设条件', dialogue: '对话', player: '你的托付', reflection: '人物自省', action: '行动', conversation: '你们的交谈', choice: '你的抉择', gathering: '园中小聚'};

export default function SimulationPanel() {
  const s = useSimulation(), data = useGarden(state => state.data);
  const [prompt, setPrompt] = useState(EXAMPLE_IF);
  const [config, setConfig] = useState<{configured: boolean; needsToken?: boolean; modelLabel?: string} | null>(null);
  const [configError, setConfigError] = useState(false), [configAttempt, setConfigAttempt] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null), scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { if (data) s.initialize(data); }, [data]);
  useEffect(() => {
    if (!s.open) return;
    heading.current?.focus();
    const abort = new AbortController(); setConfigError(false);
    fetch('/api/simulation/config', {signal: abort.signal}).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(config => { setConfig(config); useSimulation.setState({remoteLabel: config.modelLabel || '服务器模型'}); }).catch(() => { if (!abort.signal.aborted) setConfigError(true); });
    return () => abort.abort();
  }, [s.open, configAttempt]);
  useEffect(() => {
    if (!s.automatic || s.phase !== 'ready' || !s.open || s.paused) return;
    const timer = setTimeout(() => { if (!document.hidden) void useSimulation.getState().next(); }, 1400);
    return () => clearTimeout(timer);
  }, [s.automatic, s.phase, s.open, s.paused, s.journal]);
  useEffect(() => {
    const visibility = () => { if (document.hidden) useSimulation.setState({automatic: false, paused: useSimulation.getState().phase !== 'ready'}); };
    document.addEventListener('visibilitychange', visibility); return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  useEffect(() => {
    if (!scroll.current) return;
    const request = s.inspectionTarget && !s.immersive ? scroll.current.querySelector<HTMLFormElement>('.sim-request') : null;
    if (request) {
      request.scrollIntoView({block: 'start'});
      request.querySelector<HTMLSelectElement>('select')?.focus({preventScroll: true});
      useSimulation.setState({inspectionTarget: null});
    } else scroll.current.scrollTop = 0;
  }, [s.recordView, s.immersive, s.inspectionRevision, s.ifComposerOpen]);
  useEffect(() => { if (s.open && s.ifComposerOpen) scroll.current?.querySelector<HTMLTextAreaElement>('#sim-if-input')?.focus(); }, [s.open, s.ifComposerOpen]);
  if (!s.open || !s.journal || !data) return null;
  const world = s.preview ?? currentWorld(s.journal), branch = currentBranch(s.journal), snapshot = branch.snapshots[branch.cursor];
  const busy = s.phase !== 'ready', person = s.focused ?? 'baoyu', actor = world.agents[person], view = s.recordView;
  const status = s.phase === 'conversing' ? `${world.agents[s.actor ?? 'baoyu'].name}正在回应…` : s.paused ? '已暂停 · 可继续或撤销本步' : s.phase === 'parsing' ? '正在解析假设条件…' : s.phase === 'deciding' ? `${world.agents[s.actor ?? 'baoyu'].name}正在思量…` : s.phase === 'executing' ? `${world.agents[s.actor!].name}正在${actions[world.agents[s.actor!].currentAction?.action ?? 'wait']}…` : s.automatic ? '自动推演中' : `故事已记至第 ${world.tick} 步`;
  return <aside className={'simulation-panel ' + (expanded ? 'expanded' : '') + (s.ifComposerOpen ? ' composing' : '')} aria-label="世界推演控制台" hidden={s.immersive}>
    <div className="sim-heading"><div><h2 tabIndex={-1} ref={heading}>{s.ifComposerOpen || s.journal.active === 'if' ? 'IF 世界' : '世界推演'}</h2><p>{s.ifComposerOpen ? '从当前时刻，另写一种可能' : '一念之间，故事有了新的走向'}</p></div><button className="sim-expand" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? '收起面板' : '展开面板'}</button></div>
    <div className="sim-session-bar"><span>{s.journal.active === 'if' ? 'IF 线' : '主世界'} · <span data-testid="sim-tick">第 {world.tick} 步</span> · {clockLabel(world.minutes)}</span>{!s.ifComposerOpen && s.journal.active === 'if' && <button disabled={busy} onClick={() => useSimulation.setState({ifComposerOpen: true, automatic: false})}><GitBranch size={14}/>新建假设</button>}</div>
    {!s.ifComposerOpen && <div className="sim-primary-dock"><SimulationRunControls/><div className="sim-status"><p role="status">{status}</p>{busy && <button onClick={s.cancel}>撤销本步</button>}</div></div>}
    <div className="sim-scroll" ref={scroll}>
      {s.error && (s.ifComposerOpen || !(view === 'participate' && s.participationView === 'chat')) && <div className="sim-error" role="alert">{s.error}<button aria-label="关闭推演提示" onClick={() => useSimulation.setState({error: ''})}><X size={14}/></button></div>}
      {!s.sceneReady && <p className="sim-note">三维园林载入后即可运行。若设备不支持三维，仍可查看人物和存档。</p>}
      {s.storageNotice && <p className="sim-error" role="status">{s.storageNotice}</p>}
      <DreamStatus/>
      {s.ifComposerOpen ? <div className="if-composer">
        <p className="sim-note">以当前世界第 {world.tick} 步为起点。原有故事会保留。</p>
        <form className="sim-if" onSubmit={e => { e.preventDefault(); void s.createIf(prompt); }}>
          <label htmlFor="sim-if-input">写下你的「如果」</label><textarea id="sim-if-input" value={prompt} maxLength={400} rows={3} disabled={busy} onChange={e => setPrompt(e.target.value)} aria-describedby="sim-if-help"/>
          <details className="sim-examples-disclosure"><summary>试试一个假设</summary><div className="sim-examples">{topics.map(topic => <button type="button" key={topic.label} disabled={busy} onClick={() => setPrompt(topic.text)}>{topic.label}</button>)}</div></details>
          <p id="sim-if-help" className="sim-note">只改变知情或状态，后续由人物逐步行动。所有推演均为虚构，可能涉及原著后续情节。</p>
          <button type="submit" className="sim-branch-button" disabled={busy || !prompt.trim()}><GitBranch size={15}/>{s.journal.if ? '创建新的 IF 世界' : '创建 IF 世界'}<ArrowRight size={15}/></button>
          {s.journal.if && <p className="sim-note">当前 IF 将自动保留到“世界线”，可随时恢复。</p>}
        </form>

        {busy ? <div className="sim-status"><p role="status">{status}</p><button onClick={s.cancel}>取消解析</button></div> : <button className="sim-text-action" onClick={() => useSimulation.setState({ifComposerOpen: false})}>返回当前故事</button>}
      </div> : <>
      <div className="sim-tabs" role="group" aria-label="推演记录分类">{([['events', '园中纪事'], ['participate', '入局互动']] as const).map(([key, label]) => <button key={key} aria-pressed={view === key} onClick={() => useSimulation.setState({recordView: key, ...(key === 'participate' ? {automatic: false} : {})})}>{label}</button>)}
        <Disclosure className="sim-records-more" label={<span>{({people: '人物心迹', flow: '消息流转', worlds: '世界线', history: '时间快照'} as Record<string,string>)[view] ?? '更多记录'}</span>}>{([['people', '人物心迹'], ['flow', '消息流转'], ['worlds', '世界线'], ['history', '时间快照']] as const).map(([key, label]) => <button key={key} aria-pressed={view === key} onClick={() => useSimulation.setState({recordView: key})}>{label}</button>)}</Disclosure>
      </div>
      {view === 'participate' && <SimulationParticipation world={world} data={data}/>}
      {view === 'events' && <>
        {!busy && !world.events.length && <SimulationPlaybook world={currentWorld(s.journal)}/>}
        {branch.intervention && <div className="sim-condition"><strong>本次改变 · 从 Tick {branch.forkTick} 分岔</strong><p>{interventionDescription(world, branch.intervention)}</p></div>}
        <div className="sim-world-stats" aria-label="虚构世界指标"><span>贾府安定 <strong>{world.world.jia_family_stability}</strong></span><span>贾府财力 <strong>{world.world.jia_family_finance}</strong></span><small>0–100 · 推演设定</small></div>
        <section className="sim-events" aria-label="推演日志"><h3>这一刻，园中发生了什么</h3>{world.events.length ? <ol>{world.events.map(e => <li key={e.id} className={'sim-event ' + e.kind}><time>{e.time.split(' ')[1]}</time><div><span>{kinds[e.kind] ?? '行动'}</span><p>{e.text}</p>{e.reason && <details><summary>为何这样行动</summary><p>{e.reason}</p><small>事件 {e.id}</small></details>}</div></li>)}</ol> : <div className="sim-empty"><p>四人各在一方，故事尚未展开。</p><span>创建一个 IF 世界，或先运行主世界作为对照。</span></div>}{!busy && world.events.length > 0 && <details className="sim-summary"><summary>本步小结 · {snapshot.provider}</summary><p>{snapshot.summary}</p></details>}</section>
      </>}
      {view === 'people' && <section className="sim-people" aria-label="人物状态与记忆">
        <div className="sim-person-tabs">{agentIds.map(id => <button key={id} disabled={!world.agents[id].alive} aria-pressed={id === person} onClick={() => s.focus(id)}><span style={{background: agentColors[id]}}/>{world.agents[id].name}</button>)}</div>
        <div className="sim-person-heading"><div><h3>{actor.name}</h3><p>{actor.id === 'wangxifeng' && actor.location === 'daguanyuan_gate' ? '贾府 · 园门展示锚点' : spotName(data, actor.location, actor.spot)}</p></div><button onClick={() => s.focus(person)}><LocateFixed size={15}/>跟随人物</button></div>
        <p className="sim-note">{actor.personality.join(' · ')}<br/>{actor.goals.join('；')}</p><div className="sim-world-stats"><span>平静 <strong>{actor.mood.calm}</strong></span><span>精力 <strong>{actor.mood.energy}</strong></span></div>
        <SimulationInteractions key={person} id={person} world={world} data={data}/>
        <h4>此人的记忆 <span>{actor.memories.length} 条</span></h4><ol className="sim-memories">{actor.memories.slice(-8).reverse().map(memory => <li key={memory.id}><span>Tick {memory.tick} · {memory.origin === 'intervention' ? 'IF 新增知情' : memory.origin === 'player' ? '你的消息' : memory.type === 'knowledge' ? '获知消息' : memory.type === 'reflection' ? '自省' : '个人经历'}</span><p>{memory.content}</p>{memory.sourceAgent && <small>消息来自{world.agents[memory.sourceAgent].name}</small>}</li>)}</ol>
        <h4>与他人的关系</h4><div className="sim-table-wrap"><table><caption>数值为推演设定，每项每步变化最多5点</caption><thead><tr><th>人物</th><th>亲近</th><th>信任</th><th>妒意</th><th>怨意</th></tr></thead><tbody>{agentIds.filter(id => id !== person).map(id => <tr key={id}><th scope="row">{world.agents[id].name}</th><td>{actor.relationships[id].affection}</td><td>{actor.relationships[id].trust}</td><td>{actor.relationships[id].jealousy}</td><td>{actor.relationships[id].resentment}</td></tr>)}</tbody></table></div>
      </section>}
      {view === 'flow' && <SimulationFlow/>}{view === 'worlds' && <SimulationWorldlines data={data}/>}
      {view === 'history' && <section className="sim-history" aria-label="世界快照"><h3>回到一个已发生的时刻</h3><p className="sim-note">各分支保留最近30个完整快照。恢复后继续运行，会改写该分支此后的记录。</p><ol>{branch.snapshots.map((item, index) => <li key={index}><div><strong>Tick {item.worldState.tick}</strong><span>{clockLabel(item.worldState.minutes)}</span>{item.label && <span>{item.label}</span>}</div><button disabled={busy || index === branch.cursor} onClick={() => s.restore(index)}>{index === branch.cursor ? '当前时刻' : <><RotateCcw size={13}/>恢复</>}</button></li>)}</ol><button className="sim-export" onClick={exportJournal}><Download size={15}/>导出所有世界与全部快照</button></section>}
      </>}<details className="sim-options"><summary>推演设置</summary><SimulationSpeed/><label>决策来源<select value={s.provider} disabled={busy} onChange={e => useSimulation.setState({provider: e.target.value as 'mock' | 'remote', automatic: false})}><option value="mock">本地规则 · 无需密钥</option><option value="remote" disabled={!config?.configured}>{config?.modelLabel || '服务器模型'}{config?.configured ? '' : ' · 未配置'}</option></select></label>{configError && <p className="sim-note">暂时无法获取服务器配置。<button onClick={() => setConfigAttempt(configAttempt + 1)}>重试</button></p>}{s.provider === 'remote' && config?.needsToken && <label>推演访问口令<input type="password" autoComplete="off" value={s.accessToken} onChange={e => useSimulation.setState({accessToken: e.target.value})}/><span className="sim-note">使用项目管理员提供的推演口令。</span></label>}<p className="sim-note">本地规则根据个人计划、知情、精力、关系与近期经历作决定；相同状态可重复演算。服务器模型仅接收该人物可感知的资料及相关记忆。</p><p className="sim-note">人格、数值、对白与三维小像为推演设定。四处庭院使用现有模型和校验过的舞台路线。王熙凤初始“贾府”借用园门作展示锚点。原文依据独立呈现。</p><button className="sim-export" onClick={exportJournal}><Download size={15}/>导出存档</button></details>
    </div><div className="sim-footer"><span>自动存档 · 各版本独立保存</span><span>虚构推演</span></div>
  </aside>;
}

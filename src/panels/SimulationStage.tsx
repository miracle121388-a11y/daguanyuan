import {editionFor} from '../data/editions';
import {useEffect} from 'react';
import {BookOpen, Expand, LocateFixed, MessageCircle, Moon, Sun, Users, Clapperboard, Check} from 'lucide-react';
import {actionNames} from '../simulation/presentation';
import {useGarden} from '../state/store';
import {useSimulation} from '../simulation/store';
import {useDreams} from '../dreams/store';
import {agentIds} from '../simulation/types';
import {agentColors, clockLabel, currentWorld} from '../simulation/world';
import {spotName} from '../simulation/space';
import {SimulationRunControls, SimulationSpeed} from './SimulationControls';

export default function SimulationStage() {
  const s = useSimulation(), data = useGarden(g => g.data);
  const dreamNotice = useDreams(d => !!d.candidate || !!d.arrived || d.entries.some(e => ['queued','painting'].includes(e.job.status)));
  const world = s.preview ?? (s.journal ? currentWorld(s.journal) : null);
  const actor = s.focused && world ? world.agents[s.focused] : null;
  // Load the incumbent detailed model while approaching its court. This is
  // scene presentation only; logical arrival still awaits executed playback.
  const location = actor && s.playback?.command.action.agent === actor.id ? s.playback.command.destination ?? actor.location : actor?.location;
  const detail = data?.manifest.places.find(p => p.id === location && p.featured)?.id ?? null;
  const night = world ? world.minutes % 1440 >= 1140 || world.minutes % 1440 < 360 : false;
  useEffect(() => {
    if (!s.open) return;
    useGarden.setState({selectedPlaceId: detail, panelOpen: false, hotspotId: null});
  }, [s.open, detail]);
  useEffect(() => { if (s.open) useGarden.setState({timeOfDay: night ? 'night' : 'day'}); }, [s.open, night]);
  if (!s.open || !world || !data) return null;
  const dialogue = [...world.events].reverse().find(e => ['dialogue', 'conversation'].includes(e.kind) && (!actor || e.agent === actor.id || e.target === actor.id));
  const saved = s.journal ? currentWorld(s.journal) : world;
  const recent = [...saved.events].reverse();
  const moment = recent.find(e => ['conversation','choice','gathering','dialogue'].includes(e.kind)) ?? recent.find(e => ['player','action'].includes(e.kind));
  const performing = s.actor && world.agents[s.actor];
  const live = s.playback?.command;
  const utterance = s.playback?.command.action.action === 'talk' ? {agent: s.playback.command.action.agent, text: s.playback.command.action.content} : null;
  return <div className={'sim-stage ' + (s.immersive ? 'immersive' : '')} aria-label="场景推演互动">
    <div className="sim-stage-top"><div className="sim-stage-time">{night ? <Moon size={15}/> : <Sun size={15}/>}<span>{clockLabel(world.minutes)}</span><small>{editionFor(s.editionId, data.editionCatalog).shortTitle} · {s.journal?.active === 'if' ? 'IF 世界' : '主世界'}</small></div><button className="sim-stage-book" title={s.immersive&&dreamNotice?'有画卷动态，打开手记查看':undefined} onClick={() => useSimulation.setState({immersive: !s.immersive})}>{s.immersive ? <BookOpen size={16}/> : <Expand size={16}/>}<span>{s.immersive ? '打开推演手记' : '入园沉浸'}</span>{s.immersive&&dreamNotice&&<i className="sim-keepsake-dot" aria-hidden="true"/>}</button></div>
    <div className="sim-stage-roster" role="group" aria-label="选择场景人物">{agentIds.map(id => <button key={id} disabled={!world.agents[id].alive} title={world.agents[id].alive ? undefined : "此幕已退场"} aria-pressed={s.focused === id} onClick={() => s.focus(id)}><img src={`${import.meta.env.BASE_URL}textures/characters/${id}.png`} alt="" width="28" height="32" style={{borderColor:agentColors[id]}}/>{world.agents[id].name}</button>)}</div>
    {performing && s.phase !== 'ready' && <section className="sim-live-scene" aria-live="polite" aria-label="当前人物行动"><span>{s.paused ? '暂歇片刻' : '正在上演'} · {agentIds.filter(id => world.agents[id].alive).indexOf(performing.id) + 1} / {agentIds.filter(id => world.agents[id].alive).length}</span><strong>{performing.name} · {s.phase === 'conversing' ? '正听你说' : s.phase === 'deciding' ? '有所思量' : actionNames[live?.action.action ?? 'wait']}</strong><p>{live?.destination ? `沿园径前往${data.places.find(p => p.id === live.destination)?.name ?? ''}` : live?.action.reason || performing.plan?.goal || '故事将在此刻继续。'}</p>{utterance && <blockquote className="sim-speech">{utterance.text}</blockquote>}{live && <div className="sim-action-progress" role="progressbar" aria-label="本次行动进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s.playbackProgress*100)}><i style={{width:`${s.playbackProgress*100}%`}}/></div>}</section>}
    <div className="sim-stage-bottom">
      {s.phase === 'ready' && moment && <button className="sim-moment" onClick={() => useSimulation.setState({recordView:'events',immersive:false,automatic:false})}><Check size={16}/><span><small>这一刻，已留在故事里</small><strong>{moment.text}</strong></span><BookOpen size={16}/></button>}
      {s.immersive && (utterance || dialogue) && <div className="sim-stage-dialogue" aria-live="polite"><MessageCircle size={16}/><p>{utterance ? `${world.agents[utterance.agent].name}：${utterance.text}` : dialogue!.text}</p></div>}
      <div className="sim-stage-person"><div><h2>{actor?.name ?? '园中众人'}<span>{actor ? spotName(data, actor.location, actor.spot) : '全园观察'}</span></h2><p>{actor?.plan?.goal ?? (actor ? '走近他，说一句话，让此刻有另一种可能。' : '选择一人，走近他的这一刻。')}</p></div>{actor && <div className="sim-stage-actions"><button onClick={() => s.participate(actor.id)}><MessageCircle size={15}/><span>交谈入局</span></button><button onClick={() => s.inspect(actor.id)}>托付与追问</button></div>}</div>
      <div className="sim-stage-views" role="group" aria-label="推演观看方式"><button disabled={!actor} aria-pressed={!!actor && s.cameraMode === 'close'} onClick={() => useSimulation.setState({cameraMode:'close',focusRevision:s.focusRevision+1})}><Users size={15}/>临场</button><button disabled={!actor} aria-pressed={!!actor && s.cameraMode === 'follow'} onClick={() => useSimulation.setState({cameraMode:'follow',focusRevision:s.focusRevision+1})}><LocateFixed size={15}/>跟随</button><button aria-pressed={!actor} onClick={() => { s.focus(null); useGarden.getState().home(); }}>全园</button><button aria-pressed={s.director} onClick={() => useSimulation.setState({director:!s.director,...(!s.director&&s.actor?{focused:s.actor,focusRevision:s.focusRevision+1}:{})})}><Clapperboard size={14}/>剧情跟拍</button><span>虚构推演</span></div>
      {s.immersive && <div className="sim-stage-dock"><SimulationRunControls compact/><SimulationSpeed/>{s.phase !== 'ready' && <button className="sim-stage-cancel" onClick={s.cancel}>撤销本步</button>}<p role="status">{s.error || (!s.sceneReady ? '园林载入中…' : s.paused ? '已暂停' : s.phase !== 'ready' ? '人物正在行动…' : '这一刻已自动保存')}</p></div>}
    </div>
  </div>;
}

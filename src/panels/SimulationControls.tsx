import {Pause, Play, StepForward} from 'lucide-react';
import {useSimulation} from '../simulation/store';

export function SimulationRunControls({compact = false}: {compact?: boolean}) {
  const s = useSimulation(), busy = s.phase !== 'ready';
  return <div className={'sim-run-controls ' + (compact ? 'compact' : '')}>
    <button className="sim-primary" disabled={busy || !s.sceneReady} onClick={() => { useSimulation.setState({automatic: false}); void s.next(); }}><StepForward size={16}/>{compact ? '下一刻' : '继续故事'}</button>
    {busy && !['parsing', 'conversing'].includes(s.phase) ? <button onClick={s.pause}>{s.paused ? <Play size={15}/> : <Pause size={15}/>}<span>{s.paused ? '继续本步' : '暂停'}</span></button> : <button disabled={busy || !s.sceneReady} aria-pressed={s.automatic} onClick={() => useSimulation.setState({automatic: !s.automatic})}>{s.automatic ? <Pause size={15}/> : <Play size={15}/>}<span>{s.automatic ? '停止自动' : '自动运行'}</span></button>}
  </div>;
}
export function SimulationSpeed() {
  const rate = useSimulation(s => s.playbackRate);
  return <div className="sim-speed" role="group" aria-label="场景播放速度"><span>行进</span>{([1, 2, 4] as const).map(value => <button key={value} aria-pressed={rate === value} onClick={() => useSimulation.setState({playbackRate: value})}>{value}×</button>)}</div>;
}

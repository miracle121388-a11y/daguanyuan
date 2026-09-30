import {Pause, Play, StepForward} from 'lucide-react';
import {useSimulation} from '../simulation/store';
import {isBookPlayback,playbackComplete} from '../simulation/continuation';
import {currentWorld} from '../simulation/world';

export function SimulationRunControls({compact = false}: {compact?: boolean}) {
  const s = useSimulation(), busy = s.phase !== 'ready';
  const playback=!!s.journal&&isBookPlayback(s.journal),complete=!!s.journal&&playbackComplete(s.journal);
  const chapter=s.journal?(currentWorld(s.journal).continuation?.playbackChapter??80)+1:81;
  return <div className={'sim-run-controls ' + (compact ? 'compact' : '')}>
    <button className="sim-primary" disabled={busy || !s.sceneReady||complete} onClick={() => { useSimulation.setState({automatic: false}); void s.next(); }}><StepForward size={16}/>{complete?'本版本已演绎完毕':playback?`演绎第${chapter}回`:compact ? '自由续演' : '生成下一段故事'}</button>
    {busy && s.phase === 'executing' ? <button onClick={s.pause}>{s.paused ? <Play size={15}/> : <Pause size={15}/>}<span>{s.paused ? '继续本步' : '暂停'}</span></button> : !busy && <button disabled={!s.sceneReady||complete} aria-pressed={s.automatic} onClick={() => useSimulation.setState({automatic: !s.automatic})}>{s.automatic ? <Pause size={15}/> : <Play size={15}/>}<span>{s.automatic ? '停止自动' : '自动运行'}</span></button>}
  </div>;
}
export function SimulationSpeed() {
  const rate = useSimulation(s => s.playbackRate);
  return <div className="sim-speed" role="group" aria-label="场景播放速度"><span>行进</span>{([1, 2, 4] as const).map(value => <button key={value} aria-pressed={rate === value} onClick={() => useSimulation.setState({playbackRate: value})}>{value}×</button>)}</div>;
}

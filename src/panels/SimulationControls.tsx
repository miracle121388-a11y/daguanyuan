import {GitBranch, Pause, Play, StepForward} from 'lucide-react';
import {useSimulation} from '../simulation/store';
import {isBookPlayback,playbackComplete} from '../simulation/continuation';
import {branchOrigin,currentBranch,currentWorld} from '../simulation/world';

export function SimulationRunControls({compact = false}: {compact?: boolean}) {
  const s = useSimulation(), busy = s.phase !== 'ready';
  const playback=!!s.journal&&isBookPlayback(s.journal),complete=!!s.journal&&playbackComplete(s.journal);
  const chapter=s.journal?(currentWorld(s.journal).continuation?.playbackChapter??80)+1:81;
  const branch=s.journal?.active==='if'?currentBranch(s.journal):null,origin=branch?branchOrigin(branch):null;
  const firstIf=!!branch&&(currentWorld(s.journal!).continuation?.sequence??0)===(origin?.sequence??0);
  return <div className={'sim-run-controls ' + (compact ? 'compact' : '')}>
    <button className="sim-primary" disabled={busy || !s.sceneReady||complete} onClick={() => { useSimulation.setState({automatic: false}); void s.next(); }}><StepForward size={16}/>{complete?'本版本已演绎完毕':branch?(firstIf?'推演这个如果':'继续分支故事'):playback?`演绎第${chapter}回`:compact ? '自由续演' : '生成下一段故事'}</button>
    {busy && s.phase === 'executing' ? <button onClick={s.pause}>{s.paused ? <Play size={15}/> : <Pause size={15}/>}<span>{s.paused ? '继续本步' : '暂停'}</span></button> : !busy && !branch && <button onClick={() => useSimulation.setState({ifComposerOpen:true,automatic:false,immersive:false,recordView:'events'})}><GitBranch size={15}/><span>开启 IF 分支</span></button>}
  </div>;
}
export function SimulationAutomatic(){
 const s=useSimulation();return <button className="sim-auto-option" disabled={s.phase!=='ready'||!s.sceneReady||!!s.journal&&playbackComplete(s.journal)||s.ifComposerOpen||s.journal?.active==='if'} aria-pressed={s.automatic} onClick={()=>useSimulation.setState({automatic:!s.automatic})}>{s.automatic?'停止自动续演':'自动连续续演'}</button>;
}
export function SimulationSpeed() {
  const rate = useSimulation(s => s.playbackRate);
  return <div className="sim-speed" role="group" aria-label="场景播放速度"><span>行进</span>{([1, 2, 4] as const).map(value => <button key={value} aria-pressed={rate === value} onClick={() => useSimulation.setState({playbackRate: value})}>{value}×</button>)}</div>;
}

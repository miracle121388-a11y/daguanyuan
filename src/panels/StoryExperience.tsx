import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {ArrowLeft, ArrowRight, BookOpen, Clapperboard, GitBranch, Pause, Play, RotateCcw, X} from 'lucide-react';
import {createPortal} from 'react-dom';
import {editionFor, storyNodes, type EditionId, type StoryNode} from '../data/editions';
import {useGarden} from '../state/store';
import {currentWorld} from '../simulation/world';
import {useSimulation, type ComicCue} from '../simulation/store';
import {useDreams} from '../dreams/store';
import {storyMoment} from '../dreams/moments';
import type {DreamEntry} from '../dreams/types';
import {DreamButton, DreamStatus} from './DreamExperience';

function useModal(ref: React.RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    const dialog = ref.current, focus = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); if (focus?.isConnected) focus.focus({preventScroll: true}); };
  }, [ref]);
}
export function EditionPicker({compact = false}: {compact?: boolean}) {
  const data = useGarden(s => s.data), s = useSimulation();
  const edition = editionFor(s.editionId, data?.editionCatalog);
  return <div className={'edition-picker' + (compact ? ' compact' : '')}>
    <label><BookOpen size={16}/><span>剧情版本</span><select aria-label="剧情依据版本" value={s.editionId} disabled={s.phase !== 'ready'} onChange={e => s.selectEdition(e.target.value as EditionId)}>
      {data?.editionCatalog?.editions.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
    </select></label>
    {!compact && <p>{edition.boundary}</p>}
  </div>;
}
export function StoryButton() {
  return <button className="story-nav" aria-label="剧情画卷" onClick={() => useSimulation.setState({libraryOpen: true, automatic: false})}><Clapperboard size={16}/><span>剧情画卷</span></button>;
}
export function StoryEntry() {
  const s = useSimulation(), data = useGarden(g => g.data);
  const node = data?.editionCatalog?.nodes.find(n => n.id === (s.journal && currentWorld(s.journal).storyNodeId));
  return <div className="sim-story-entry"><EditionPicker/>
    <button disabled={s.phase !== 'ready'} onClick={() => useSimulation.setState({libraryOpen: true, automatic: false})}><Clapperboard size={18}/><span><strong>{node ? node.title : '选择一幕，走进书中'}</strong><small>{node ? `第${node.chapter}回 · 改编起点` : '全彩动态漫画 · 从关键剧情入局'}</small></span><ArrowRight size={16}/></button><div className="dream-entry-pair"><DreamButton capture/><DreamButton/></div>
  </div>;
}
function Evidence({node}: {node: StoryNode}) {
  const catalog = useGarden(s => s.data?.editionCatalog);
  return <details className="story-evidence"><summary>{node.evidenceKind === 'chapter_heading' ? '回目依据与改编范围' : '文本依据与改编范围'}</summary><p>{node.summary}</p>
    {node.sourceRefs.map(id => { const source = catalog?.sources.find(s => s.id === id); return source && <div key={id}><blockquote>{source.excerpt}</blockquote><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><small>{source.locator} · {source.retrievedAt.slice(0, 10)}</small></div>; })}
    <p>{node.staging}画面、分镜文字和人物心绪由本项目创作，不是逐字引文。</p>
  </details>;
}
function StoryLibrary() {
  const s = useSimulation(), garden = useGarden(), ref = useRef<HTMLDialogElement>(null);
  const nodes = storyNodes(garden.data?.editionCatalog, s.editionId, garden.spoilerLimit);
  const [picked, setPicked] = useState(nodes[0]?.id ?? '');
  const node = nodes.find(n => n.id === picked) ?? nodes[0], edition = editionFor(s.editionId, garden.data?.editionCatalog);
  useModal(ref);
  const close = () => useSimulation.setState({libraryOpen: false});
  return <dialog ref={ref} className="story-library" aria-labelledby="story-library-title" onCancel={e => {e.preventDefault(); close();}}>
    <header><div><h2 id="story-library-title">满纸红楼，一幕入梦</h2><p>选一本书，从一处心事开始。</p></div><button className="icon-button" aria-label="关闭剧情画卷" onClick={close}><X size={21}/></button></header>
    <div className="story-dream-tools"><DreamButton/><p>让你经历的剧情，长成新的画卷。</p></div><EditionPicker/>
    <div className="story-library-body"><section className="story-chapters" aria-label="可进入的剧情节点">
      <div className="story-chapters-label"><strong>{edition.shortTitle}</strong><span>{nodes.length} 个剧情起点</span></div>
      {!!nodes.length && <label className="story-node-select">选择剧情节点<select aria-label="选择剧情节点" value={node?.id} onChange={e => setPicked(e.target.value)}>{nodes.map(n => <option key={n.id} value={n.id}>第{n.chapter}回 · {n.title}</option>)}</select></label>}
      {nodes.map(n => <button key={n.id} aria-pressed={n.id === node?.id} onClick={() => setPicked(n.id)}><span>第 {n.chapter} 回</span><strong>{n.title}</strong><small>{n.chapter <= 80 ? '共同前八十回' : n.evidenceKind === 'chapter_heading' ? '据此版回目改编' : '此版文本片段'}</small><ArrowRight size={15}/></button>)}
      {!nodes.length && <p className="story-empty">已读回目内还没有画卷。首个节点在第27回；可在游园设置中调整阅读进度。</p>}
      <label className="story-auto"><input type="checkbox" checked={s.comicAutomatic} onChange={e => useSimulation.setState({comicAutomatic: e.target.checked})}/>关键节点自动展开漫画</label>
      {garden.spoilerLimit !== null && <p>已按第 {garden.spoilerLimit} 回隐藏后续剧情。</p>}
    </section>
    {node && <section className="story-preview" aria-label="剧情画卷预览"><div className="story-preview-image"><img src={`/comics/${node.art}-mobile.webp`} alt={node.title + ' · 全彩剧情插画'} width={768} height={512}/><span>AI 绘制 · 剧情演绎</span></div><div className="story-preview-copy"><h3>{node.title}</h3><p>{node.summary}</p>
      <div className="story-preview-actions"><button className="story-primary" disabled={s.phase !== 'ready'} onClick={() => useDreams.setState({candidate: storyMoment(node, s.editionId), retrying: null, workshopOpen: true, error: ''})}><Clapperboard size={16}/>为此幕作画</button><button disabled={s.phase !== 'ready'} onClick={() => s.enterStory(node.id)}><GitBranch size={16}/>从此幕入局</button><button className="story-reference-play" disabled={s.phase !== 'ready'} onClick={() => s.openComic(node.id)}><Play size={16}/>展开动态漫画</button></div><p className="story-reference-note">可先看预设分镜，也可按这一幕重新作画。</p>
      {s.error && <p className="sim-error" role="alert">{s.error}</p>}
      <p className="story-save-note">入局会创建独立 IF 线，保留主世界。三种版本分别存档。</p><Evidence node={node}/></div></section>}
    </div><DreamStatus/><footer>{edition.coverage}</footer>
  </dialog>;
}
export function MotionComic({cue, node, painting}: {cue: ComicCue; node: StoryNode; painting?: DreamEntry}) {
  const ref = useRef<HTMLDialogElement>(null), s = useSimulation(), garden = useGarden();
  const [frame, setFrame] = useState(0), [playing, setPlaying] = useState(garden.motion), [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [retry, setRetry] = useState(0), [hidden, setHidden] = useState(document.hidden);
  const [reduced, setReduced] = useState(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useModal(ref);
  const motion = garden.motion && !reduced, animating = playing && motion && ready && !hidden;
  useEffect(() => { const mq = window.matchMedia('(prefers-reduced-motion: reduce)'), change = () => setReduced(mq.matches), visibility = () => setHidden(document.hidden); mq.addEventListener('change', change); document.addEventListener('visibilitychange', visibility); return () => {mq.removeEventListener('change', change); document.removeEventListener('visibilitychange', visibility);}; }, []);
  useEffect(() => { if (!playing || !ready || hidden || !motion || frame === 2) return; const timer = setTimeout(() => setFrame(f => f + 1), 6500); return () => clearTimeout(timer); }, [frame, playing, ready, hidden, motion]);
  const shot = node.frames[frame], isIf = cue.kind === 'if';
  const close = painting ? () => useDreams.setState({viewing: null}) : s.closeComic;
  const advance = (n: number) => { setFrame(Math.max(0, Math.min(2, n))); setPlaying(false); };
  const edition = editionFor(painting?.job.moment.editionId ?? s.editionId, garden.data?.editionCatalog);
  return <dialog ref={ref} className={'motion-comic ' + (animating ? 'is-playing' : 'is-paused') + (motion ? '' : ' reduced-motion') + (painting && frame !== 1 ? ' is-whole-painting' : '')} aria-labelledby="comic-title" onCancel={e => {e.preventDefault(); close();}} onKeyDown={e => {if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return; if (e.key === 'ArrowRight') {e.preventDefault(); advance(frame + 1);} if (e.key === 'ArrowLeft') {e.preventDefault(); advance(frame - 1);}}}>
    <div className="comic-art" aria-busy={!ready && !failed}>
      {!failed && <picture key={retry}><img src={painting?.url ?? `/comics/${node.art}.webp`} alt={`${node.title}：${node.summary}`} width={1536} height={1024} onLoad={() => setReady(true)} onError={() => {setFailed(true); setReady(false);}} style={{objectPosition: shot.position, '--shot-scale': shot.scale, '--mobile-position': painting ? '50% 38%' : node.art === 'storm' ? '44% 38%' : node.art === 'bamboo' ? '55% 38%' : '63% 38%'} as CSSProperties}/></picture>}
      {!ready && !failed && <div className="comic-loading" role="status">画卷正在展开…</div>}
      {failed && <div className="comic-loading" role="alert"><p>画面未能载入，仍可阅读分镜。</p><button onClick={() => {setFailed(false); setRetry(n => n + 1);}}>重新加载图片</button></div>}
      <div className={'comic-atmosphere ' + node.atmosphere} aria-hidden="true">{Array.from({length: 18}, (_, i) => <i key={i} style={{'--i': i, '--left': `${(i * 37 + 11) % 100}%`, '--delay': `${-(i % 7)}s`} as CSSProperties}/>)}</div>
      <div className="comic-shade"/>
    </div>
    <header className="comic-heading"><div><h2 id="comic-title">{node.title}</h2><p>{edition.shortTitle} · 第{node.chapter}回 · {painting ? `剧情新绘 · ${painting.job.moment.branch === 'if' ? 'IF线' : '主世界'}` : isIf ? 'IF 转折 · 借景演绎' : '全彩动态漫画'}{painting?.job.cardNo && ` · ${painting.job.cardNo}`}{painting && painting.job.styleVersion !== 'legacy' && ` · ${painting.job.styleName}`}</p></div><button aria-label="关闭动态漫画" onClick={close}><X size={22}/></button></header>
    <div className="comic-bottom"><div className="comic-narration" aria-live="polite"><span>{isIf ? '你的一念' : shot.title}</span><p>{isIf ? (frame === 0 ? '原来的故事，在你的选择之后有了新的回声。' : frame === 1 ? cue.text ?? '人物记住了这一刻的选择。' : '带着这一刻，回到园中，让人物继续行动。') : shot.text}</p></div>
      <div className="comic-timeline" role="group" aria-label="漫画分镜">{node.frames.map((f, i) => <button key={i} aria-label={`第${i + 1}镜：${f.title}`} aria-pressed={frame === i} onClick={() => advance(i)}><span>{String(i + 1).padStart(2, '0')}</span><i/>{f.title}</button>)}</div>
      <div className="comic-controls"><div><button disabled={frame === 0} aria-label="上一镜" onClick={() => advance(frame - 1)}><ArrowLeft size={18}/></button><button aria-label={playing && motion ? '暂停漫画' : '播放漫画'} disabled={!motion} onClick={() => {if (!playing && frame === 2) setFrame(0); setPlaying(!playing);}}>{playing && motion ? <Pause size={18}/> : <Play size={18}/>}</button><button disabled={frame === 2} aria-label="下一镜" onClick={() => advance(frame + 1)}><ArrowRight size={18}/></button><button aria-label="重播漫画" onClick={() => {setFrame(0); setPlaying(motion);}}><RotateCcw size={16}/></button><span>{frame + 1} / 3</span></div>
        {painting ? <button className="comic-return" onClick={close}>收起画卷 <ArrowRight size={17}/></button> : s.open && s.journal && currentWorld(s.journal).storyNodeId === node.id ? <button className="comic-return" onClick={close}>回到园中 <ArrowRight size={17}/></button> : <button className="comic-return" onClick={() => s.enterStory(node.id, false)}>从此幕入局 <GitBranch size={17}/></button>}
      </div>
      {s.error && <p role="alert">{s.error}</p>}
      <p className="comic-disclosure">{!motion ? '已启用静态分镜 · 可手动切换。' : '可暂停、逐镜阅读。'} {painting ? '根据这次剧情生成；图像与旁白为艺术演绎。' : `AI 绘制与改编旁白${isIf ? '；沿用本幕意境，画中动作不代表本次选择已执行。' : '，非原文引文。'}`}</p>{!painting && <DreamStatus/>}
    </div>
  </dialog>;
}
export default function StoryExperience() {
  const s = useSimulation(), garden = useGarden();
  const node = s.comicCue && storyNodes(garden.data?.editionCatalog, s.editionId, garden.spoilerLimit).find(n => n.id === s.comicCue!.nodeId);
  useEffect(() => {
    if (!garden.selectedEventId || s.open || !s.comicAutomatic) return;
    const target = storyNodes(garden.data?.editionCatalog, s.editionId, garden.spoilerLimit).find(n => n.eventId === garden.selectedEventId);
    if (target) useSimulation.getState().openComic(target.id);
  }, [garden.selectedEventId]);
  if (!garden.data) return null;
  return createPortal(<>{s.libraryOpen && <StoryLibrary/>}{s.comicCue && node && <MotionComic key={`${s.comicCue.serial}:${s.comicCue.nodeId}`} cue={s.comicCue} node={node}/>}</>, document.body);
}

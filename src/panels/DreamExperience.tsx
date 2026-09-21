import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowRight, BookOpen, Download, Heart, ImagePlus, LoaderCircle, RefreshCw, X} from 'lucide-react';
import {useDreams, downloadDream} from '../dreams/store';
import {captureMoment} from '../dreams/moments';
import type {ArtMoment, DreamEntry} from '../dreams/types';
import {useGarden} from '../state/store';
import {useSimulation} from '../simulation/store';
import {editionFor, type StoryNode} from '../data/editions';
import {MotionComic} from './StoryExperience';
import type {AgentId} from '../simulation/types';
import {currentWorld} from '../simulation/world';

export function DreamButton({capture = false, trigger = 'manual', focus}: {capture?: boolean; trigger?: 'manual' | 'conversation'; focus?: AgentId}) {
  const s = useSimulation(), garden = useGarden(), count = useDreams(d => d.entries.filter(e => e.image).length);
  const hidden = garden.spoilerLimit !== null && s.journal && (currentWorld(s.journal).storyChapter ?? 23) > garden.spoilerLimit;
  return <button className="dream-entry" disabled={capture && (s.phase !== 'ready' || !!hidden)} onClick={() => {
    if (capture && s.journal && garden.data) useDreams.setState({candidate: captureMoment(s.journal, garden.data, trigger, focus ?? s.focused ?? undefined), retrying: null, workshopOpen: true, error: ''});
    else useDreams.setState({collectionOpen: true, arrived: null});
  }}>{capture ? <ImagePlus size={17}/> : <BookOpen size={17}/>}<span>{capture ? trigger === 'conversation' ? '将这句心声入画' : '此刻作画' : `我的梦藏${count ? ` · ${count}` : ''}`}</span></button>;
}
export function DreamStatus() {
  const d = useDreams(), limit = useGarden(g => g.spoilerLimit), visible = (chapter: number) => limit === null || chapter <= limit;
  const pending = d.entries.find(e => ['painting', 'queued'].includes(e.job.status) && visible(e.job.moment.chapter)), arrived = d.entries.find(e => e.job.id === d.arrived && visible(e.job.moment.chapter));
  if (!pending && !arrived && !(d.candidate && visible(d.candidate.chapter))) return null;
  return <div className="dream-status" role="status">
    {arrived?.url ? <img src={arrived.url} alt="新得画作缩略图"/> : pending ? <LoaderCircle size={20} className="dream-working"/> : <ImagePlus size={20}/>}
    <div><strong>{arrived ? arrived.job.status === 'failed' ? '这一幅，暂未画成' : '新得一页，收入梦藏' : pending ? '这一刻，正在成画' : '此刻可入画'}</strong><small>{arrived?.job.moment.title ?? pending?.job.moment.title ?? d.candidate?.title}</small></div>
    <button onClick={() => useDreams.setState(arrived ? arrived.image ? {viewing: arrived.job.id, arrived: null} : {collectionOpen: true, arrived: null} : pending ? {collectionOpen: true} : {workshopOpen: true, retrying: null, error: ''})}>{arrived?.image ? '展开' : arrived || pending ? '查看' : '作画'}<ArrowRight size={15}/></button>
    {!pending && <button aria-label="收起作画提示" onClick={() => useDreams.setState(arrived ? {arrived: null} : {candidate: null})}><X size={16}/></button>}
  </div>;
}
function useDreamDialog(ref: React.RefObject<HTMLDialogElement | null>) {
  useEffect(() => {const focus = document.activeElement as HTMLElement | null; ref.current?.showModal(); return () => {ref.current?.close(); if (focus?.isConnected) focus.focus({preventScroll: true});};}, [ref]);
}
function Workshop({moment}: {moment: ArtMoment}) {
  const ref = useRef<HTMLDialogElement>(null), d = useDreams(), garden = useGarden();
  const [draft, setDraft] = useState(moment);
  useDreamDialog(ref); const close = () => useDreams.setState({workshopOpen: false, retrying: null, candidate: draft});
  const edition = editionFor(draft.editionId, garden.data?.editionCatalog), place = garden.data?.places.find(p => p.id === draft.placeId);
  return <dialog ref={ref} className="dream-workshop" aria-labelledby="dream-workshop-title" onCancel={e => {e.preventDefault(); close();}}>
    <header><div><h2 id="dream-workshop-title">为这一刻，留一幅画</h2><p>把这一幕的心事，画成一页梦藏。</p></div><button aria-label="关闭作画" onClick={close}><X size={20}/></button></header>
    <div className="dream-workshop-body"><section className="dream-scene"><h3>{draft.title}</h3><span>{edition.shortTitle} · 第{draft.chapter}回 · {draft.branch === 'if' ? 'IF线' : '主世界'}</span><p>{draft.text.length > 180 ? draft.text.slice(0, 160).trimEnd() + '…' : draft.text}</p>{draft.text.length > 180 && <details className="dream-full-scene"><summary>阅读完整剧情</summary><p>{draft.text}</p></details>}<small>{place?.name} · {draft.time}</small>{d.config?.styleVersion === 'honglou-silk-v1' && <div className="dream-style-intro"><strong>梦绢</strong><p>细墨勾线，矿物色薄染。让这一刻的心事，留成一页绢本叙事画。</p><small>参考素材仍在整理，画面为当代艺术演绎。</small></div>}</section>
      <form onSubmit={e => {e.preventDefault(); if (d.retrying) void d.retry(d.retrying); else void d.generate(draft);}}>
        <fieldset disabled={!!d.retrying}><legend>这一页的意境</legend><div className="dream-moods">{([['poetic','含蓄诗意'],['warm','温暖相逢'],['dramatic','风雨入梦']] as const).map(([value,label]) => <button type="button" key={value} aria-pressed={draft.mood === value} onClick={() => setDraft(v => ({...v, mood: value}))}>{label}</button>)}</div></fieldset>
        <label>画面取景<select disabled={!!d.retrying} value={draft.framing} onChange={e => setDraft(v => ({...v, framing: e.target.value as ArtMoment['framing']}))}><option value="scene">人与园景</option><option value="portrait">人物心绪</option></select></label>
        <label>想留下的细节 <span>可不填</span><textarea disabled={!!d.retrying} maxLength={180} rows={3} value={draft.note} placeholder="例如：雨后竹叶带着水珠，两人的神情比往日轻松。" onChange={e => setDraft(v => ({...v, note: e.target.value}))}/></label>
        <label>作画口令<input type="password" autoComplete="off" value={d.accessToken} onChange={e => useDreams.setState({accessToken: e.target.value, error: ''})}/></label>
        <small>由园主提供；只在本次打开期间保存。仅将这一幕的文字与本站画法、人物和空间参考发送给生图服务。</small>
        <label className="dream-auto"><input type="checkbox" checked={d.automatic} onChange={e => d.setAutomatic(e.target.checked)}/>后续关键剧情自动作画并收藏</label>
        {!d.config?.configured && <p className="dream-error">{d.config?.error || '生图服务暂不可用，剧情记录与现有画册可以继续使用。'}</p>}
        {d.error && <p className="dream-error" role="alert">{d.error}</p>}
        <button className="dream-create" disabled={d.busy || !d.config?.configured}>{d.busy ? <LoaderCircle size={18} className="dream-working"/> : <ImagePlus size={18}/>}{d.retrying ? '继续这幅画作' : '生成这一幅'}</button>
        <p className="dream-cost">同一剧情与画意只提交一次。生成期间可继续游园，完成后收入梦藏。{d.config?.configured && `今日本站还可作画 ${d.config.remaining} 次。`}</p>
      </form></div>
  </dialog>;
}
const triggerNames = {story: '书中一幕', choice: '一念生枝', gathering: '同席相逢', conversation: '人物心声', manual: '园中留影'};
function Album() {
  const ref = useRef<HTMLDialogElement>(null), d = useDreams(), garden = useGarden();
  const [filter, setFilter] = useState('all'), [favorites, setFavorites] = useState(false);
  useDreamDialog(ref); const close = () => useDreams.setState({collectionOpen: false});
  const entries = d.entries.filter(e => (filter === 'all' || e.job.moment.editionId === filter) && (!favorites || e.favorite) && (garden.spoilerLimit === null || e.job.moment.chapter <= garden.spoilerLimit));
  const finished = entries.filter(e => e.image).length;
  return <dialog ref={ref} className="dream-album" aria-labelledby="dream-album-title" onCancel={e => {e.preventDefault(); close();}}>
    <header><div><h2 id="dream-album-title">我的梦藏</h2><p>每一页，都曾是你在园中的一刻。</p></div><button aria-label="关闭梦藏" onClick={close}><X size={20}/></button></header>
    <div className="dream-album-tools"><label>文学版本<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">所有版本</option>{garden.data?.editionCatalog?.editions.map(e => <option key={e.id} value={e.id}>{e.shortTitle}</option>)}</select></label><button aria-pressed={favorites} onClick={() => setFavorites(!favorites)}><Heart size={17}/>只看珍藏</button><button onClick={() => {useDreams.setState({error: ''}); void d.refresh();}}><RefreshCw size={17}/>刷新画册</button></div>
    <div className="dream-album-summary"><span>已收 {finished} 幅</span><p>{garden.spoilerLimit !== null ? `已隐藏第${garden.spoilerLimit}回以后的画作。` : '书中一幕、一念生枝、人物心声与同席相逢，都会留下不同的画。'}</p></div>
    {d.notice && <p className="dream-error" role="status">{d.notice}</p>}{d.error && <p className="dream-error" role="alert">{d.error}</p>}
    <div className="dream-shelf">{entries.map(entry => <Painting key={entry.job.id} entry={entry}/>)}
      {!entries.length && <div className="dream-empty"><BookOpen size={36}/><h3>{favorites ? '珍藏尚待落印' : '空白的一页，等你入梦'}</h3><p>{favorites ? '在喜欢的画作旁轻点心形，就能在这里重逢。' : '走进一幕剧情，作出自己的选择。为它作画之后，这里会留下你的版本、人物与那一刻的心事。'}</p><button onClick={close}>回园寻一刻 <ArrowRight size={17}/></button></div>}
    </div><footer>画作保存在本机画册，并可下载原图与剧情记录。收藏不会改变故事走向；AI画面属于艺术演绎。</footer>
  </dialog>;
}
function Painting({entry}: {entry: DreamEntry}) {
  const d = useDreams(), garden = useGarden(), {job} = entry, edition = editionFor(job.moment.editionId, garden.data?.editionCatalog);
  const place = garden.data?.places.find(p => p.id === job.moment.placeId), legacy = job.styleVersion === 'legacy';
  const references = job.referenceSet?.inputs.map(input => ({style: '画法', character: '人物', scene: '空间'})[input.role]).join('／');
  return <article className="dream-painting" data-style-version={job.styleVersion}>
    {entry.url ? <button className="dream-picture" aria-label={`展开画作：${job.moment.title}`} onClick={() => useDreams.setState({viewing: job.id})}><img src={entry.url} alt={job.moment.title + ' · 根据这次剧情生成'} loading="lazy"/></button> : <div className="dream-painting-wait">{job.status === 'failed' ? <ImagePlus size={30}/> : <LoaderCircle size={30} className="dream-working"/>}<strong>{job.status === 'failed' ? '这一页，尚未画成' : job.status === 'queued' ? '画师正在准备' : '笔下的故事正在成形'}</strong><p>{job.error || '可先回园，完成后会自动收藏。'}</p></div>}
    <div className="dream-painting-copy"><h3>{job.moment.title}</h3><div className="dream-card-catalog"><span className="dream-card-no" aria-label="收藏编号">{job.cardNo || '旧藏 · 未编目'}</span><span>{legacy ? '原画风' : job.styleName} · 剧情新绘</span></div><p>{edition.shortTitle} · 第{job.moment.chapter}回 · {job.moment.branch === 'if' ? 'IF线' : '主世界'}</p><p className="dream-place-trigger">{place?.name || job.moment.placeId} · {triggerNames[job.moment.trigger]}</p>
      <div className="dream-painting-actions">{entry.image && <><button aria-label={entry.favorite ? '取消珍藏' : '珍藏画作'} aria-pressed={entry.favorite} onClick={() => void d.favorite(job.id)}><Heart size={18}/>{entry.favorite ? '已珍藏' : '珍藏'}</button><button onClick={() => downloadDream(entry)}><Download size={17}/>原图</button><button onClick={() => downloadDream(entry, true)}>剧情记录</button></>}{job.status === 'failed' && <button disabled={d.busy} onClick={() => void d.retry(job.id)}>{job.resumeAvailable ? '继续查询原画' : '重新请求生图'}</button>}</div>
      <details><summary>回看这一刻</summary><p>{job.moment.text}</p>{job.moment.note && <p>画意：{job.moment.note}</p>}<dl className="dream-colophon">
        <dt>编目</dt><dd>{job.cardNo || '旧藏尚未编目'} · {job.cardKind === 'story-node' ? '剧情起点；不同画意可共用编号' : '个人画册；保留当时的故事分支'}</dd>
        <dt>画风</dt><dd>{legacy ? '旧藏原画风；保留原作' : job.styleName}<span>{job.styleVersion}</span></dd>
        <dt>参考</dt><dd>{references ? `${references} · 临时素材` : job.referenceArt ? '旧版单图造型参考' : '文字生成'}</dd>
        <dt>留存</dt><dd>{new Date(job.createdAt).toLocaleString('zh-CN')}</dd>
      </dl>{job.referenceSet?.fallbacks.map((message, i) => <p className="dream-reference-note" key={i}>{message}</p>)}<small>{job.model} · {job.promptRevision}{job.seed !== null ? ` · seed ${job.seed}` : ''}。完整创作参数与来源可下载“剧情记录”。</small></details>
    </div>
  </article>;
}
function dreamNode(entry: DreamEntry, baseline: StoryNode): StoryNode {
  const m = entry.job.moment;
  return {...baseline, id: 'dream-' + entry.job.id, title: m.title, chapter: m.chapter, summary: m.text, atmosphere: m.mood === 'dramatic' ? 'rain' : 'light', frames: [
    {title: '相逢', text: m.title, position: '50% 42%', scale: 1},
    {title: '心事', text: m.text.split('\n')[0].slice(0, 100), position: '56% 40%', scale: 1.08},
    {title: '留梦', text: m.note || '这一刻已收入梦藏。沿着你的选择，故事还会继续。', position: '50% 48%', scale: 1.03},
  ]};
}
export default function DreamExperience() {
  const d = useDreams(), s = useSimulation(), garden = useGarden();
  useEffect(() => {void useDreams.getState().initialize();}, []);
  useEffect(() => {if (s.accessToken) useDreams.setState({accessToken: s.accessToken});}, [s.accessToken]);
  const entry = d.entries.find(e => e.job.id === d.viewing && e.image && (garden.spoilerLimit === null || e.job.moment.chapter <= garden.spoilerLimit)), baseline = garden.data?.editionCatalog?.nodes[0];
  return createPortal(<>{d.collectionOpen && <Album/>}{d.workshopOpen && d.candidate && <Workshop key={d.candidate.snapshotId} moment={d.candidate}/>}{entry && baseline && <MotionComic cue={{nodeId: entry.job.id, serial: 0, kind: 'story'}} node={dreamNode(entry, baseline)} painting={entry}/>}{!s.open && !s.libraryOpen && !s.comicCue && !d.collectionOpen && !d.workshopOpen && !entry && <div className="dream-toast"><DreamStatus/></div>}</>, document.body);
}

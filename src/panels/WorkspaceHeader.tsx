import {BookOpen, Compass, GitBranch, Info, Menu, Settings2, Users, Sparkles} from 'lucide-react';
import gardenMark from '../assets/garden-mark.svg?no-inline';
import {editionFor, fallbackEditions, type EditionId} from '../data/editions';
import {useGarden, type Tab} from '../state/store';
import {useSimulation} from '../simulation/store';
import {StoryButton} from './StoryExperience';
import {DreamButton} from './DreamExperience';
import {GalleryButton} from './ReferenceExperience';
import AccessGate from './AccessGate';
import Disclosure from './Disclosure';

export default function WorkspaceHeader() {
  const garden = useGarden(), sim = useSimulation();
  const editions = garden.data?.editionCatalog?.editions ?? fallbackEditions;
  const edition = editionFor(sim.editionId, garden.data?.editionCatalog);
  const mode = !sim.open ? 'garden' : sim.ifComposerOpen || sim.journal?.active === 'if' ? 'if' : 'main';
  const chooseEdition = (id: EditionId) => {
    if (sim.editionId === id || sim.phase !== 'ready') return;
    sim.selectEdition(id);
    if (sim.open) useSimulation.getState().openWorld(mode === 'if' ? 'if' : 'main');
  };
  const browse = (tab?: Tab) => {
    if (sim.open) sim.toggle();
    garden.home();
    useGarden.setState({sourcesOpen: false, settingsOpen: false, tab: tab ?? 'places', indexOpen: !!tab});
  };
  return <header className="workspace-header">
    <div className="workspace-topline">
      <button className="brand" onClick={() => browse()} aria-label="大观园入梦，回到全园">
        <img className="brand-mark" src={gardenMark} width="40" height="40" alt=""/>
        <span className="brand-wordmark"><strong>大观园<span className="brand-suffix"> · 入梦</span></strong><small>一园山水，满纸红楼</small></span>
      </button>
      <div className="version-switch">
        <span className="version-label">故事版本</span>
        <div role="group" aria-label="剧情依据版本">{editions.map(item => <button key={item.id} aria-label={item.shortTitle} aria-pressed={sim.editionId === item.id} disabled={sim.phase !== 'ready'} onClick={() => chooseEdition(item.id)}><strong>{item.id === 'original80' ? '前八十回' : item.shortTitle}</strong><small>{item.chapters} 回</small></button>)}</div>
      </div>
      <Disclosure className="workspace-more" label={<><Menu size={18}/><span>更多</span></>}>
        <section aria-label="资料与设置">
          <p className="menu-label">红楼资料</p>
          <button onClick={() => browse('characters')}><Users size={17}/>人物群像</button>
          <button onClick={() => browse('chapters')}><BookOpen size={17}/>回目拾遗</button>
          <StoryButton/><DreamButton/><GalleryButton/>
          <p className="menu-label">偏好与帮助</p>
          <button onClick={() => useGarden.setState({settingsOpen: true, sourcesOpen: false})}><Settings2 size={17}/>游园设置</button>
          <button onClick={() => useGarden.setState({sourcesOpen: true, settingsOpen: false})}><Info size={17}/>来源与说明</button>
          <a href="./reading.html"><BookOpen size={17}/>轻量阅读</a>
          <p className="version-boundary">{edition.boundary}<br/>不同版本分别存档，推演内容为虚构。</p>
        </section>
      </Disclosure>
    </div>
    <div className="workspace-navline">
      <nav aria-label="主导航">
        <button aria-label="世界推演" className={mode === 'main' ? 'active' : 'primary-entry'} aria-pressed={mode === 'main'} disabled={sim.phase !== 'ready' && sim.journal?.active !== 'main'} onClick={() => sim.openWorld('main')}><Sparkles size={17}/><span>世界推演</span></button>
        <button aria-label="IF 世界" className={mode === 'if' ? 'active' : ''} aria-pressed={mode === 'if'} disabled={sim.phase !== 'ready' && sim.journal?.active !== 'if'} onClick={() => sim.openWorld('if')}><GitBranch size={17}/><span>IF 世界</span></button>
        <button aria-label="园林漫游" className={mode === 'garden' ? 'active' : ''} aria-pressed={mode === 'garden'} onClick={() => browse()}><Compass size={17}/><span>园林漫游</span></button>
      </nav>
      <AccessGate/>
    </div>
    {!sim.open && sim.phase !== 'ready' && <div className="background-story" role="status"><span>{sim.phase === 'reviewing' ? '后台正在核对情节' : sim.phase === 'executing' ? '后台正在演绎人物行动' : sim.phase === 'conversing' ? '后台正在完成交谈' : '故事任务在后台继续'} · 完成后自动存档</span><button onClick={() => sim.openWorld(sim.journal?.active ?? 'main')}>查看进度</button></div>}
    {!sim.open && sim.phase === 'ready' && sim.error && <div className="background-story" role="status"><span>{sim.error}</span><button onClick={() => sim.openWorld(sim.journal?.active ?? 'main')}>返回故事</button></div>}
    {!sim.open && sim.phase === 'ready' && !sim.error && sim.backgroundNotice && <div className="background-story" role="status"><span>{sim.backgroundNotice}</span><button onClick={() => sim.openWorld(sim.journal?.active ?? 'main')}>查看结果</button></div>}
  </header>;
}

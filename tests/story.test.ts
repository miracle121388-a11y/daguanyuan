import {readFileSync} from 'node:fs';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {CanonData} from '../src/data/types';
import {editionCatalogSchema, storyNodes, type EditionId} from '../src/data/editions';
import {createJournal, currentWorld, forkWorld, readJournal, restoreTick} from '../src/simulation/world';
import {forkStory} from '../src/simulation/story';
import {conversationContext, localConversation} from '../src/simulation/participation';
import {perceive} from '../src/simulation/perception';
import {useSimulation, EDITION_KEY, editionStorageKey} from '../src/simulation/store';
import {useGarden} from '../src/state/store';
import {compareBranches} from '../src/simulation/insights';

const read = (name: string) => JSON.parse(readFileSync(name, 'utf8'));
const data = {...Object.fromEntries(['places','characters','events','sources','relations','routes'].map(n => [n, read(`data/canon/${n}.json`)])), manifest: read('public/scene-manifest.json'), editionCatalog: editionCatalogSchema.parse(read('data/canon/editionCatalog.json'))} as unknown as CanonData;
describe('separate literary versions and authored starting points', () => {
  it('filters version-specific continuations and respects spoiler limits', () => {
    expect(storyNodes(data.editionCatalog, 'original80', null).every(n => n.chapter <= 80)).toBe(true);
    expect(storyNodes(data.editionCatalog, 'cheng120', null).map(n => n.id)).toContain('manuscript-97');
    expect(storyNodes(data.editionCatalog, 'guiyou108', null).map(n => n.id)).not.toContain('manuscript-97');
    expect(storyNodes(data.editionCatalog, 'guiyou108', 80).map(n => n.id)).not.toContain('siege-91');
    expect(storyNodes(data.editionCatalog, 'original80', 20)).toHaveLength(0);
  });
  it.each([['original80','flowers-27'],['cheng120','manuscript-97'],['guiyou108','siege-91']] as const)('starts %s with contextual memories and a preserved main world', (edition, node) => {
    const original = createJournal(data, edition), before = JSON.stringify(original);
    const next = forkStory(original, data, node), world = currentWorld(next);
    expect(next.main).toEqual(original.main); expect(JSON.stringify(original)).toBe(before);
    expect(world.editionId).toBe(edition); expect(world.storyNodeId).toBe(node);
    expect(readJournal(JSON.stringify(next), data)).toEqual(next);
  });
  it('rejects wrong-edition starts and tampered mixed-version snapshots', () => {
    expect(() => forkStory(createJournal(data), data, 'manuscript-97')).toThrow('版本');
    const bad = createJournal(data, 'cheng120'); currentWorld(bad).editionId = 'guiyou108';
    expect(() => readJournal(JSON.stringify(bad), data)).toThrow('版本');
    const tooLate = createJournal(data); currentWorld(tooLate).storyChapter = 105;
    expect(() => readJournal(JSON.stringify(tooLate), data)).toThrow('回目');
  });
  it('does not equate Tick zero in different literary chapters',()=>{
    const j=forkStory(createJournal(data,'cheng120'),data,'manuscript-97');
    expect(compareBranches(j)?.main).toBeNull();expect(compareBranches(j)?.changes).toEqual([]);
  });
  it('does not carry future knowledge or conversations into an earlier literary start', () => {
    const late = forkWorld(forkStory(createJournal(data,'cheng120'),data,'manuscript-97'),{type:'knowledge',target:'baoyu',content:'未来的秘密婚讯'},'提前知道');
    const early = forkStory(late,data,'poetry-37'), world = currentWorld(early);
    expect(JSON.stringify(world)).not.toContain('未来的秘密婚讯');
    expect(world.storyChapter).toBe(37); expect(early.archives).toHaveLength(2);
  });
  it('retains selected edition through IF creation and restore', () => {
    const base=forkStory(createJournal(data,'guiyou108'),data,'hope-90');
    const next=forkWorld(base,{type:'mood',target:'daiyu',field:'calm',value:30},'静心');
    expect(currentWorld(restoreTick(next,0)).editionId).toBe('guiyou108');
    expect(currentWorld(next).storyChapter).toBe(90);
  });
  it('passes only version boundaries and personal memories to action/conversation providers', () => {
    const world=currentWorld(forkStory(createJournal(data,'cheng120'),data,'manuscript-97'));
    const own=conversationContext(world,'daiyu','你在想什么？','chat',data), other=perceive(world,'baoyu',data);
    expect(own.literary).toEqual({id:'cheng120',title:'程高本 · 一百二十回',chapter:97,maxChapter:120});
    expect(JSON.stringify(other)).not.toContain('正在犹豫是否毁去');
    expect(localConversation(own).reply).toContain('诗稿');
  });
  it('retires Daiyu from the late Cheng node using chapter 98 evidence', () => {
    const world=currentWorld(forkStory(createJournal(data,'cheng120'),data,'raid-105'));
    expect(world.agents.daiyu.alive).toBe(false);
    expect(()=>conversationContext(world,'daiyu','你好','chat',data)).toThrow('无法交谈');
  });
  it('preserves and reads old unversioned saves as the eighty-chapter workspace', () => {
    const old=createJournal(data); delete old.editionId; delete currentWorld(old).editionId; delete currentWorld(old).storyChapter;
    expect(readJournal(JSON.stringify(old),data)).toEqual(old);
  });
});
describe('edition persistence and comic trigger guards', () => {
  const items=new Map<string,string>();
  beforeEach(()=>{
    items.clear(); vi.stubGlobal('localStorage',{getItem:(key:string)=>items.get(key)??null,setItem:(key:string,value:string)=>items.set(key,value)});
    useGarden.setState({data,spoilerLimit:null});
    useSimulation.setState({journal:null,editionId:'original80',editionJournals:{},phase:'ready',comicCue:null,open:false,ifComposerOpen:false,comicAutomatic:true,error:'',provider:'mock'});
    useSimulation.getState().initialize(data);
  });
  afterEach(()=>vi.unstubAllGlobals());
  it('opens IF creation directly without creating or altering a world until submitted', async ()=>{
    const s=useSimulation.getState(), before=JSON.stringify(s.journal);
    s.openWorld('if');
    expect(useSimulation.getState()).toMatchObject({open:true,ifComposerOpen:true,recordView:'events'});
    expect(JSON.stringify(useSimulation.getState().journal)).toBe(before);
    await useSimulation.getState().createIf('如果黛玉的精力降到30');
    expect(useSimulation.getState().ifComposerOpen).toBe(false);
    expect(useSimulation.getState().journal?.active).toBe('if');
    expect(currentWorld(useSimulation.getState().journal!).agents.daiyu.mood.energy).toBe(30);
    expect(useSimulation.getState().journal?.main).toEqual(JSON.parse(before).main);
  });
  it('returns to an existing IF from the main entry without duplicating or losing its snapshots', async ()=>{
    await useSimulation.getState().createIf('如果黛玉的精力降到30');
    const saved=JSON.stringify(useSimulation.getState().journal?.if);
    useSimulation.getState().openWorld('main');
    expect(useSimulation.getState().journal?.active).toBe('main');
    useSimulation.getState().openWorld('if');
    expect(useSimulation.getState().ifComposerOpen).toBe(false);
    expect(JSON.stringify(useSimulation.getState().journal?.if)).toBe(saved);
    expect(useSimulation.getState().journal?.archives).toHaveLength(0);
  });
  it('blocks top-level branch changes during execution and closes an unfinished composer on leaving', ()=>{
    useSimulation.getState().openWorld('if');
    useSimulation.setState({phase:'executing'});
    useSimulation.getState().openWorld('main');
    expect(useSimulation.getState().ifComposerOpen).toBe(true);
    useSimulation.setState({phase:'ready'});
    useSimulation.getState().toggle();
    expect(useSimulation.getState()).toMatchObject({open:false,ifComposerOpen:false});
  });
  it('opens a scene interaction from the IF composer without changing the saved world', ()=>{
    useSimulation.getState().openWorld('if');
    const before=JSON.stringify(useSimulation.getState().journal);
    useSimulation.getState().participate('daiyu');
    expect(useSimulation.getState()).toMatchObject({ifComposerOpen:false,recordView:'participate',focused:'daiyu'});
    expect(JSON.stringify(useSimulation.getState().journal)).toBe(before);
  });
  it('keeps all three journals when switching, and restores the last selected version after reload', ()=>{
    for(const id of ['original80','cheng120','guiyou108'] as EditionId[]){useSimulation.getState().selectEdition(id); currentWorld(useSimulation.getState().journal!).agents.baoyu.mood.calm=id==='cheng120'?31:id==='guiyou108'?62:73;}
    useSimulation.getState().selectEdition('cheng120'); expect(currentWorld(useSimulation.getState().journal!).agents.baoyu.mood.calm).toBe(31);
    expect(items.get(EDITION_KEY)).toBe('cheng120'); expect(items.has(editionStorageKey('guiyou108'))).toBe(true);
    useSimulation.setState({journal:null,editionJournals:{}});useSimulation.getState().initialize(data);
    expect(useSimulation.getState().editionId).toBe('cheng120');expect(currentWorld(useSimulation.getState().journal!).agents.baoyu.mood.calm).toBe(31);
  });
  it('blocks chapter spoilers and edition switching during an unfinished action', ()=>{
    useSimulation.getState().selectEdition('cheng120');useGarden.setState({spoilerLimit:80});
    const before=useSimulation.getState().journal;useSimulation.getState().enterStory('manuscript-97');useSimulation.getState().openComic('manuscript-97');
    expect(useSimulation.getState().journal).toBe(before);expect(useSimulation.getState().comicCue).toBeNull();
    useSimulation.setState({phase:'conversing'});useSimulation.getState().selectEdition('guiyou108');expect(useSimulation.getState().editionId).toBe('cheng120');
  });
  it('backs up an unreadable version save before starting a replacement',()=>{
    items.set(editionStorageKey('guiyou108'),'invalid old save');
    useSimulation.getState().selectEdition('guiyou108');
    expect(items.get(editionStorageKey('guiyou108')+'.unreadable-backup')).toBe('invalid old save');
  });
  it('opens the keyed comic on entry and allows disabling automatic comic opening', ()=>{
    useSimulation.getState().enterStory('flowers-27');expect(useSimulation.getState().comicCue?.nodeId).toBe('flowers-27');
    useSimulation.getState().closeComic();useSimulation.setState({comicAutomatic:false});useSimulation.getState().enterStory('poetry-37');
    expect(useSimulation.getState().comicCue).toBeNull();expect(currentWorld(useSimulation.getState().journal!).storyNodeId).toBe('poetry-37');
  });
});

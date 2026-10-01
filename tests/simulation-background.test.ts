import {readFileSync} from 'node:fs';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {CanonData} from '../src/data/types';
import {useGarden} from '../src/state/store';
import {editionStorageKey, useSimulation} from '../src/simulation/store';
import {PlaybackTimeline} from '../src/simulation/playback';
import {createJournal, currentBranch, currentWorld, forkWorld, readJournal} from '../src/simulation/world';
import {approvedReview} from './review-fixture';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const data = Object.fromEntries([...['places','characters','events','sources','routes','relations','editionCatalog'].map(k => [k, read(`data/canon/${k}.json`)]), ['manifest', read('public/scene-manifest.json')]]) as unknown as CanonData;
const story = {title:'竹窗书信', narrative:'黛玉在竹窗下展卷，宝玉在院外候了一刻，待紫鹃传话方才进来。'.repeat(16), memory:'黛玉读书，宝玉候在院外。', threads:['次日的书信'], causality:'院外等候后得到传话，才在窗边读书。', review:approvedReview(), characterStates:['baoyu','daiyu','baochai','wangxifeng'].map(agent => ({agent, alive:true})), consequences:[], staging:[{agent:'daiyu',place:'xiaoxiangguan',action:'read',caption:'在窗下展卷。'},{agent:'baoyu',place:'xiaoxiangguan',action:'read',caption:'循径来访，再在窗边展卷。'}]};
const initialSimulation = useSimulation.getState(), initialGarden = useGarden.getState();
let saves: Map<string, string>;
beforeEach(() => {
  vi.useFakeTimers(); saves = new Map();
  vi.stubGlobal('localStorage', {getItem:(key:string) => saves.get(key) ?? null, setItem:(key:string, value:string) => saves.set(key, value)});
  useGarden.setState({...initialGarden, data, loaded:true});
  useSimulation.setState({...initialSimulation, journal:createJournal(data), editionId:'original80', open:true, phase:'ready', sceneReady:true, accessToken:'fixture', comicAutomatic:false, error:'', backgroundNotice:''});
});
afterEach(() => {useSimulation.getState().cancel(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); useSimulation.setState(initialSimulation, true); useGarden.setState(initialGarden, true);});
const respond = () => new Response(JSON.stringify({result:story}));

describe('background story tasks remain transactional', () => {
  it('continues delayed generation/review and commits movement without any scene frames', async () => {
    let release!: (response:Response) => void, signal!: AbortSignal;
    const fetch = vi.fn((_url, init) => {signal = init.signal; return fetch.mock.calls.length === 1 ? new Promise<Response>(resolve => {release=resolve;}) : Promise.resolve(respond());});
    vi.stubGlobal('fetch', fetch);
    const original = useSimulation.getState().journal!, work = useSimulation.getState().next();
    useSimulation.getState().toggle(); useGarden.getState().home();
    const focusRevision = useSimulation.getState().focusRevision;
    expect(signal.aborted).toBe(false); expect(useSimulation.getState().phase).toBe('deciding');
    useSimulation.getState().selectEdition('cheng120'); useSimulation.getState().openWorld('if');
    expect(useSimulation.getState().editionId).toBe('original80'); expect(useSimulation.getState().open).toBe(false);
    release(respond()); await vi.advanceTimersByTimeAsync(50_000); await work;
    const state = useSimulation.getState(), saved = readJournal(saves.get(editionStorageKey('original80'))!, data);
    expect(state.open).toBe(false); expect(state.phase).toBe('ready'); expect(state.error).toBe(''); expect(state.backgroundNotice).toContain('已存到本机');
    expect(state.focusRevision).toBe(focusRevision);
    expect(currentBranch(saved).snapshots).toHaveLength(2); expect(currentWorld(saved).agents.baoyu.location).toBe('xiaoxiangguan'); expect(currentWorld(saved).continuation?.sequence).toBe(1);
    expect(original.main.snapshots).toHaveLength(1); expect(fetch.mock.calls.map(([,init]) => JSON.parse(init.body).operation)).toEqual(['story-continue','story-review']);
    useSimulation.getState().openWorld('main'); expect(useSimulation.getState().open).toBe(true); expect(useSimulation.getState().backgroundNotice).toBe('');
  });
  it('returns to the same in-flight IF task, resumes paused movement when leaving, and preserves main', async () => {
    const base = createJournal(data), fork = forkWorld(base, {type:'knowledge',target:'baoyu',content:'凤姐正在查账'}, '如果宝玉提前知道凤姐查账');
    useSimulation.setState({journal:fork}); vi.stubGlobal('fetch', vi.fn(async () => respond()));
    const work = useSimulation.getState().next(); await vi.advanceTimersByTimeAsync(200);
    expect(useSimulation.getState().phase).toBe('executing'); useSimulation.getState().pause();
    await vi.advanceTimersByTimeAsync(10_000); expect(useSimulation.getState().phase).toBe('executing');
    useSimulation.getState().toggle(); expect(useSimulation.getState().paused).toBe(false);
    await vi.advanceTimersByTimeAsync(500); const playback = useSimulation.getState().playback;
    useSimulation.getState().openWorld('if'); expect(useSimulation.getState().playback).toBe(playback); expect(useSimulation.getState().open).toBe(true);
    useSimulation.getState().toggle(); await vi.advanceTimersByTimeAsync(50_000); await work;
    expect(useSimulation.getState().journal!.main).toEqual(base.main); expect(currentWorld(useSimulation.getState().journal!).continuation?.sequence).toBe(1);
  });
  it('an explicit cancel rolls back even if a provider responds later', async () => {
    let release!: (response:Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => {release=resolve;})));
    const journal = useSimulation.getState().journal!, work = useSimulation.getState().next();
    useSimulation.getState().toggle(); useSimulation.getState().cancel(); release(respond()); await work;
    expect(useSimulation.getState().journal).toBe(journal); expect(saves.has(editionStorageKey('original80'))).toBe(false); expect(vi.getTimerCount()).toBe(0);
  });
  it('cancel during autonomous playback cleans the timer and leaves no partial arrival or snapshot', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respond()));
    const journal = useSimulation.getState().journal!, work = useSimulation.getState().next();
    await vi.advanceTimersByTimeAsync(300); expect(useSimulation.getState().playback).not.toBeNull();
    useSimulation.getState().toggle(); useSimulation.getState().cancel(); await work; await vi.advanceTimersByTimeAsync(50_000);
    expect(useSimulation.getState().journal).toBe(journal); expect(useSimulation.getState().playback).toBeNull(); expect(vi.getTimerCount()).toBe(0);
  });
  it('completes an in-flight conversation while browsing without reopening its panel', async () => {
    let release!: (response:Response) => void; vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => {release=resolve;})));
    const work = useSimulation.getState().converse('baoyu','你好','chat'); useSimulation.getState().toggle();
    release(new Response(JSON.stringify({result:{reply:'请在这里坐一坐。',evidenceIds:[]}}))); expect(await work).toBe(true);
    expect(useSimulation.getState().open).toBe(false); expect(currentWorld(useSimulation.getState().journal!).conversations).toHaveLength(1);
  });
  it('reports a failed local save instead of claiming a background task was saved', async () => {
    vi.stubGlobal('localStorage', {getItem:() => null, setItem:() => {throw new Error('quota');}});
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({result:{reply:'请坐。',evidenceIds:[]}}))));
    const work=useSimulation.getState().converse('baoyu','你好','chat'); useSimulation.getState().toggle(); expect(await work).toBe(true);
    expect(useSimulation.getState().backgroundNotice).toContain('存档未写入'); expect(useSimulation.getState().storageNotice).toContain('导出');
  });
});
describe('playback timing is independent of render frequency', () => {
  it('counts a throttled interval once, honors pause and speed, and clamps completion', () => {
    let now=0; const timeline = new PlaybackTimeline(10, () => now);
    now=2000; expect(timeline.sample(false,1)).toBe(.2);
    now=7000; expect(timeline.sample(true,1)).toBe(.2);
    now=8000; expect(timeline.sample(false,2)).toBe(.4);
    expect(timeline.sample(false,2)).toBe(.4);
    now=60_000; expect(timeline.sample(false,4)).toBe(1);
  });
});

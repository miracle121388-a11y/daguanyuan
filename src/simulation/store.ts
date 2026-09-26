import {create} from 'zustand';
import type {CanonData} from '../data/types';
import {useGarden} from '../state/store';
import {runTick} from './engine';
import {MockProvider, RemoteProvider} from './providers';
import {interventionSchema, type AgentId, type ConversationTurn, type Gathering, type Journal, type PlayerDirective, type SceneCommand, type WorldState} from './types';
import {cancelGathering, chooseEncounter, conversationContext, forkMoment, inviteGathering, recordConversation} from './participation';
import {clone, createJournal, currentBranch, currentWorld, forkWorld, queueDirective, readJournal, restoreTick, resumeArchive} from './world';
import {evidenceReport} from './insights';
import {editionIdSchema, type EditionId} from '../data/editions';
import {forkStory} from './story';
import {useDreams} from '../dreams/store';
import {captureMoment} from '../dreams/moments';

export const STORAGE_KEY = 'daguanyuan.simulation.v1';
export const EDITION_KEY = 'daguanyuan.edition.v1';
export const editionStorageKey = (id: EditionId) => id === 'original80' ? STORAGE_KEY : `${STORAGE_KEY}.${id}`;
export interface ComicCue {nodeId: string; serial: number; kind: 'story' | 'if'; text?: string}
interface Playback {id: number; command: SceneCommand; done: () => void}
interface SimulationState {
  editionId: EditionId; editionJournals: Partial<Record<EditionId, Journal>>;
  libraryOpen: boolean; comicCue: ComicCue | null; comicAutomatic: boolean;
  selectEdition: (id: EditionId) => void; enterStory: (id: string, play?: boolean) => void;
  openComic: (id: string, kind?: 'story' | 'if', text?: string) => void; closeComic: () => void;
  open: boolean; ifComposerOpen: boolean; openWorld: (branch: 'main' | 'if') => void; journal: Journal | null; preview: WorldState | null;
  phase: 'ready' | 'deciding' | 'executing' | 'parsing' | 'conversing'; actor: AgentId | null;
  paused: boolean; automatic: boolean; playback: Playback | null; playbackProgress: number; director: boolean; sceneReady: boolean;
  focused: AgentId | null; focusRevision: number; sceneRevision: number;
  immersive: boolean; cameraMode: 'follow' | 'close'; playbackRate: 1 | 2 | 4;
  recordView: 'events' | 'people' | 'history' | 'flow' | 'worlds' | 'participate';
  participationView: 'chat' | 'choice' | 'gathering';
  conversationDrafts: Partial<Record<AgentId, {message: string; tone: ConversationTurn['tone']}>>;
  inspectionTarget: AgentId | null; inspectionRevision: number;
  provider: 'mock' | 'remote'; remoteLabel: string; accessToken: string; error: string; storageNotice: string;
  initialize: (data: CanonData) => void; toggle: () => void; next: () => Promise<void>;
  createIf: (prompt: string) => Promise<void>; switchBranch: (id: 'main' | 'if') => void;
  restore: (index: number) => void; pause: () => void; cancel: () => void;
  focus: (id: AgentId | null) => void;
  inspect: (id: AgentId) => void;
  participate: (id: AgentId) => void;
  converse: (id: AgentId, message: string, tone: ConversationTurn['tone']) => Promise<boolean>;
  choose: (agent: AgentId, encounter: string, choice: string) => void;
  forkHere: () => void;
  invite: (input: Pick<Gathering, 'place' | 'kind' | 'participants'>) => void;
  dismissGathering: () => void;
  issueDirective: (input: Omit<PlayerDirective, 'id' | 'tick'>) => boolean;
  withdrawDirective: (id: AgentId) => void;
  resumeBranch: (id: string) => void; deleteArchive: (id: string) => void;
}
let controller: AbortController | null = null;
let playbackId = 0;
let previousTime: 'day' | 'night' = 'day';
const unreadableSaves = new Set<string>();
const providerFor = () => useSimulation.getState().provider === 'remote' ? new RemoteProvider(useSimulation.getState().accessToken, useSimulation.getState().remoteLabel) : new MockProvider();

function persist(journal: Journal) {
  const editionId = journal.editionId ?? 'original80';
  useSimulation.setState(s => ({editionJournals: {...s.editionJournals, [editionId]: journal}}));
  try {
    const key = editionStorageKey(editionId);
    if (unreadableSaves.has(key)) { const raw = localStorage.getItem(key); if (raw) localStorage.setItem(`${key}.unreadable-backup`, raw); unreadableSaves.delete(key); }
    localStorage.setItem(key, JSON.stringify(journal)); localStorage.setItem(EDITION_KEY, editionId); useSimulation.setState({storageNotice: ''});
  }
  catch { useSimulation.setState({storageNotice: '浏览器空间不足或禁止存储。本次可继续推演，请导出存档以免关闭后丢失。'}); }
}
function commit(journal: Journal) { useSimulation.setState({journal}); persist(journal); }
function execute(command: SceneCommand, signal: AbortSignal): Promise<void> {
  if (!useSimulation.getState().sceneReady) return Promise.reject(new Error('三维场景尚未就绪，请等待园林载入后重试。'));
  return new Promise((resolve, reject) => {
    let settled = false;
    const abort = () => { if (!settled) { settled = true; reject(new DOMException('本步已取消', 'AbortError')); } };
    signal.addEventListener('abort', abort, {once: true});
    if (signal.aborted) { abort(); return; }
    useSimulation.setState({playbackProgress: 0, playback: {id: ++playbackId, command, done: () => {
      if (settled) return;
      settled = true; signal.removeEventListener('abort', abort);
      useSimulation.setState({playback: null}); resolve();
    }}});
  });
}

export const useSimulation = create<SimulationState>((set, get) => ({
  editionId: 'original80', editionJournals: {}, libraryOpen: false, comicCue: null, comicAutomatic: true,
  open: false, ifComposerOpen: false, journal: null, preview: null, phase: 'ready', actor: null,
  paused: false, automatic: false, playback: null, playbackProgress: 0, director: true, sceneReady: false,
  focused: null, focusRevision: 0, sceneRevision: 0, provider: 'mock', remoteLabel: '服务器模型', accessToken: '', error: '', storageNotice: '',
  immersive: false, cameraMode: 'close', playbackRate: 1, recordView: 'events', participationView: 'chat',
  conversationDrafts: {},
  inspectionTarget: null, inspectionRevision: 0,
  initialize: data => {
    if (get().journal) return;
    let editionId: EditionId = 'original80';
    try { editionId = editionIdSchema.safeParse(localStorage.getItem(EDITION_KEY)).data ?? 'original80'; } catch { /* In-memory mode. */ }
    let journal = createJournal(data, editionId);
    try { const raw = localStorage.getItem(editionStorageKey(editionId)); if (raw) { const saved = readJournal(raw, data); if ((saved.editionId ?? 'original80') !== editionId) throw new Error('版本不符'); journal = saved; } }
    catch { unreadableSaves.add(editionStorageKey(editionId)); set({storageNotice: '旧存档格式或道路版本已变化，已开启新的主世界；旧内容将在下次保存前备份。'}); }
    set({journal, editionId, editionJournals: {[editionId]: journal}});
  },
  selectEdition: id => {
    const data = useGarden.getState().data;
    if (!data || !editionIdSchema.safeParse(id).success || get().phase !== 'ready' || id === get().editionId) return;
    if (get().journal) persist(get().journal!);
    let journal = get().editionJournals[id] ?? createJournal(data, id);
    if (!get().editionJournals[id]) {
      try { const raw = localStorage.getItem(editionStorageKey(id)); if (raw) { const saved = readJournal(raw, data); if ((saved.editionId ?? 'original80') !== id) throw new Error('版本不符'); journal = saved; } }
      catch { unreadableSaves.add(editionStorageKey(id)); set({storageNotice: '此版本存档未能恢复，原存档仍保留；当前使用新世界。'}); }
    }
    set({editionId: id, journal, ifComposerOpen: get().ifComposerOpen && !journal.if, comicCue: null, preview: null, automatic: false, conversationDrafts: {}, error: '', sceneRevision: get().sceneRevision + 1, focusRevision: get().focusRevision + 1});
    useGarden.setState({selectedEventId: null, selectedChapter: null, panelOpen: false});
    persist(journal);
  },
  enterStory: (id, play = true) => {
    const data = useGarden.getState().data, garden = useGarden.getState(), journal = get().journal;
    if (!data || !journal || get().phase !== 'ready') return;
    const node = data.editionCatalog?.nodes.find(n => n.id === id && n.editions.includes(get().editionId));
    if (!node || garden.spoilerLimit !== null && node.chapter > garden.spoilerLimit) return;
    try {
      const next = forkStory(journal, data, id);
      if (!get().open) get().toggle();
      commit(next);
      set({libraryOpen: false, ifComposerOpen: false, comicCue: null, automatic: false, error: '', focused: node.focus, recordView: 'participate', participationView: 'choice', sceneRevision: get().sceneRevision + 1, focusRevision: get().focusRevision + 1});
      useDreams.getState().offer({...captureMoment(next, data, 'story', node.focus), title: node.title});
      if (play && get().comicAutomatic && !(useDreams.getState().config?.configured && useDreams.getState().accessToken && useDreams.getState().automatic)) get().openComic(id);
    } catch (error) { set({error: (error as Error).message}); }
  },
  openComic: (id, kind = 'story', text) => {
    const garden = useGarden.getState(), node = garden.data?.editionCatalog?.nodes.find(n => n.id === id && n.editions.includes(get().editionId));
    if (!node || get().phase !== 'ready' || garden.spoilerLimit !== null && node.chapter > garden.spoilerLimit) return;
    set({automatic: false, comicCue: {nodeId: id, serial: (get().comicCue?.serial ?? 0) + 1, kind, text}});
  },
  closeComic: () => set({comicCue: null}),
  toggle: () => {
    const open = !get().open;
    if (open) previousTime = useGarden.getState().timeOfDay;
    if (!open && get().phase !== 'ready') get().cancel();
    useGarden.getState().exitTour();
    useGarden.setState({panelOpen: false, indexOpen: false, sourcesOpen: false, settingsOpen: false, galleryOpen: false, selectedPlaceId: null, hotspotId: null});
    set({open, ifComposerOpen: false, automatic: false, immersive: false, inspectionTarget: null, focused: open ? 'baoyu' : null, focusRevision: get().focusRevision + 1});
    if (!open) useGarden.setState({timeOfDay: previousTime});
  },
  openWorld: branch => {
    if (get().phase !== 'ready' || !get().journal) return;
    if (!get().open) get().toggle();
    if (get().journal?.[branch]) get().switchBranch(branch);
    set({ifComposerOpen: branch === 'if' && !get().journal?.if, immersive: false, recordView: 'events', automatic: false});
  },
  next: async () => {
    const {journal, phase, sceneReady} = get(), data = useGarden.getState().data;
    if (!journal || !data || phase !== 'ready') return;
    if (!sceneReady) { set({error: '三维园林尚未就绪，请等待载入或重试模型。', automatic: false}); return; }
    const active = new AbortController(); controller = active;
    set({phase: 'deciding', paused: false, error: ''});
    try {
      const result = await runTick(journal, data, providerFor(), execute, active.signal, (world, phase, actor) => set(current => ({preview: world, phase, actor, ...(current.director && current.focused !== actor ? {focused: actor, focusRevision: current.focusRevision + 1} : {})})));
      if (active.signal.aborted) return;
      commit(result);
      const after = currentWorld(result), before = currentWorld(journal);
      if (get().director && after.gathering?.status === 'completed' && before.gathering?.status === 'pending') {
        set({focused:after.gathering.participants[0],cameraMode:'close',focusRevision:get().focusRevision+1});
      }
      if (after.gathering?.status === 'completed' && before.gathering?.status === 'pending') useDreams.getState().offer(captureMoment(result, data, 'gathering', after.gathering.participants[0]));
      if (get().comicAutomatic && !(useDreams.getState().config?.configured && useDreams.getState().accessToken && useDreams.getState().automatic) && after.gathering?.status === 'completed' && before.gathering?.status === 'pending' && (after.storyChapter ?? 23) >= 37) {
        set({phase: 'ready'});
        get().openComic('poetry-37', 'if', after.events.find(e => e.kind === 'gathering')?.text);
      }
    } catch (error) {
      const cancelled = active.signal.aborted;
      set({error: cancelled ? '本步已取消，人物与状态已回到上一个完整快照。' : error instanceof Error ? error.message : '本步未完成，请重试。', automatic: false, sceneRevision: get().sceneRevision + 1});
    } finally {
      if (controller === active) controller = null;
      set({phase: 'ready', actor: null, preview: null, playback: null, paused: false});
    }
  },
  createIf: async prompt => {
    const journal = get().journal;
    if (!journal || get().phase !== 'ready') return;
    if (!prompt.trim() || prompt.length > 400) { set({error: '请写下1至400字的假设条件。'}); return; }
    const active = new AbortController(); controller = active;
    set({phase: 'parsing', error: '', automatic: false});
    try {
      const raw = await providerFor().parseIntervention(prompt, active.signal);
      if (active.signal.aborted) return;
      const parsed = interventionSchema.safeParse(raw);
      if (!parsed.success) throw new Error('条件格式无效。数值应在0至100之间，且只能改变知情、情绪或贾府状态。');
      commit(forkWorld(journal, parsed.data, prompt.trim()));
      set({ifComposerOpen: false, sceneRevision: get().sceneRevision + 1, focused: parsed.data.type === 'world' ? 'wangxifeng' : parsed.data.target, focusRevision: get().focusRevision + 1});
    } catch (error) { if (!active.signal.aborted) set({error: error instanceof Error ? error.message : '条件解析失败，请调整输入。'}); }
    finally { if (controller === active) controller = null; set({phase: 'ready'}); }
  },
  switchBranch: id => {
    if (get().phase !== 'ready' || !get().journal?.[id]) return;
    const journal = clone(get().journal!); journal.active = id;
    commit(journal); set({automatic: false, error: '', sceneRevision: get().sceneRevision + 1, focusRevision: get().focusRevision + 1});
  },
  restore: index => {
    if (get().phase !== 'ready' || !get().journal) return;
    try { commit(restoreTick(get().journal!, index)); set({automatic: false, error: '', sceneRevision: get().sceneRevision + 1, focusRevision: get().focusRevision + 1}); }
    catch (error) { set({error: (error as Error).message}); }
  },
  pause: () => set({paused: !get().paused, automatic: false}),
  cancel: () => { set({automatic: false, ...(get().phase === 'conversing' ? {error: '这次交谈已取消，未写入存档。输入仍可修改后重试。'} : {})}); controller?.abort(); },
  focus: id => {
    useGarden.setState({panelOpen: false, hotspotId: null});
    set({focused: id, director: false, focusRevision: get().focusRevision + 1});
  },
  inspect: id => {
    get().focus(id);
    set({ifComposerOpen: false, recordView: 'people', immersive: false, automatic: false, inspectionTarget: id, inspectionRevision: get().inspectionRevision + 1});
  },
  participate: id => {
    get().focus(id);
    set({ifComposerOpen: false, recordView: 'participate', immersive: false, automatic: false, cameraMode: 'close', participationView: 'chat', inspectionRevision: get().inspectionRevision + 1});
  },
  converse: async (id, message, tone) => {
    const journal = get().journal, data = useGarden.getState().data;
    if (!journal || !data || get().phase !== 'ready') return false;
    const active = new AbortController(); controller = active;
    set({phase: 'conversing', actor: id, automatic: false, error: ''});
    try {
      const context = conversationContext(currentWorld(journal), id, message, tone, data), provider = providerFor();
      const reply = await provider.converse(context, active.signal);
      if (active.signal.aborted || get().journal !== journal) return false;
      commit(recordConversation(journal, context, reply, provider.name));
      return true;
    } catch (error) { if (!active.signal.aborted) set({error: error instanceof Error ? error.message : '这次交谈未保存，请重试。'}); return false; }
    finally { if (controller === active) controller = null; set({phase: 'ready', actor: null}); }
  },
  choose: (agent, encounter, choice) => {
    const journal = get().journal, data = useGarden.getState().data;
    if (!journal || !data || get().phase !== 'ready') return;
    try { const next = chooseEncounter(journal, data, agent, encounter, choice); commit(next); set({automatic: false, error: ''}); const world = currentWorld(next); useDreams.getState().offer(captureMoment(next, data, 'choice', agent)); if (get().comicAutomatic && world.storyNodeId && !(useDreams.getState().config?.configured && useDreams.getState().accessToken && useDreams.getState().automatic)) get().openComic(world.storyNodeId, 'if', world.events.find(e => e.kind === 'choice')?.text); }
    catch (error) { set({error: (error as Error).message}); }
  },
  forkHere: () => {
    if (!get().journal || get().phase !== 'ready') return;
    try { commit(forkMoment(get().journal!)); set({automatic: false, error: '', sceneRevision: get().sceneRevision + 1}); }
    catch (error) { set({error: (error as Error).message}); }
  },
  invite: input => {
    const journal = get().journal, data = useGarden.getState().data;
    if (!journal || !data || get().phase !== 'ready') return;
    try { commit(inviteGathering(journal, data, input)); set({automatic: false, error: ''}); }
    catch (error) { set({error: (error as Error).message}); }
  },
  dismissGathering: () => {
    if (!get().journal || get().phase !== 'ready') return;
    commit(cancelGathering(get().journal!)); set({automatic: false, error: ''});
  },
  issueDirective: input => {
    const journal = get().journal, data = useGarden.getState().data;
    if (!journal || !data || get().phase !== 'ready') return false;
    try { commit(queueDirective(journal, data, input)); set({error: '', automatic: false}); return true; }
    catch (error) { set({error: (error as Error).message}); return false; }
  },
  withdrawDirective: id => {
    if (get().phase !== 'ready' || !get().journal) return;
    const journal = clone(get().journal!);
    currentWorld(journal).directives = currentWorld(journal).directives.filter(d => d.agent !== id);
    const branch = currentBranch(journal); branch.snapshots = branch.snapshots.slice(0, branch.cursor + 1);
    commit(journal); set({automatic: false});
  },
  resumeBranch: id => {
    if (get().phase !== 'ready' || !get().journal) return;
    try { commit(resumeArchive(get().journal!, id)); set({automatic: false, error: '', sceneRevision: get().sceneRevision + 1, focusRevision: get().focusRevision + 1}); }
    catch (error) { set({error: (error as Error).message}); }
  },
  deleteArchive: id => {
    if (get().phase !== 'ready' || !get().journal) return;
    const journal = clone(get().journal!); journal.archives = journal.archives.filter(a => a.id !== id);
    commit(journal); set({automatic: false, error: ''});
  },
}));

export function displayedWorld() {
  const state = useSimulation.getState();
  return state.preview ?? (state.journal ? currentWorld(state.journal) : null);
}
export function exportJournal() {
  const journal = useSimulation.getState().journal;
  if (!journal) return;
  const link = document.createElement('a'), url = URL.createObjectURL(new Blob([JSON.stringify(journal, null, 2)], {type: 'application/json'}));
  link.href = url; link.download = `大观园-${journal.editionId ?? 'original80'}-${journal.active}-Tick${currentWorld(journal).tick}.json`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function activeSnapshot() { const journal = useSimulation.getState().journal!; const branch = currentBranch(journal); return branch.snapshots[branch.cursor]; }
export function exportEvidenceReport() {
  const journal = useSimulation.getState().journal, data = useGarden.getState().data;
  if (!journal || !data) return;
  const link = document.createElement('a'), url = URL.createObjectURL(new Blob([evidenceReport(journal, data)], {type: 'text/markdown;charset=utf-8'}));
  link.href = url; link.download = `大观园-推演纪要-Tick${currentWorld(journal).tick}.md`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

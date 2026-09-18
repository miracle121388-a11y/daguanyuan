import {create} from 'zustand';
import {dreamJobSchema, type ArtMoment, type DreamConfig, type DreamEntry, type DreamJob} from './types';
import {savedDreams, saveDream} from './vault';

const preferenceKey = 'daguanyuan.dream-settings.v1', identityKey = 'daguanyuan.dream-owner.v1';
let initializing: Promise<void> | undefined, timer: ReturnType<typeof setTimeout> | undefined, refreshing = false;
let identity = '', offered = '';
function owner() {
  if (identity) return identity;
  try {identity = localStorage.getItem(identityKey) || '';} catch { /* Memory-only capability. */ }
  if (!/^[a-f0-9]{64}$/.test(identity)) {identity = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join(''); try {localStorage.setItem(identityKey, identity);} catch { /* Local images can still be exported. */ }}
  return identity;
}
async function api(path: string, body?: unknown) {
  const response = await fetch('/api/dreams/' + path, {method: body === undefined ? 'GET' : 'POST', headers: {'X-Dream-Album': owner(), ...(body === undefined ? {} : {'Content-Type': 'application/json', Authorization: `Bearer ${useDreams.getState().accessToken}`})}, ...(body === undefined ? {} : {body: JSON.stringify(body)}), signal: AbortSignal.timeout(20000)});
  if (!response.ok) {const error = await response.json().catch(() => ({})); throw new Error(error.error || '画册连接暂时中断，请稍后刷新。');}
  return response;
}
async function verifiedImage(job: DreamJob) {
  const image = await (await api(`jobs/${job.id}/image`)).blob();
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(image.type) || image.size > 18 * 1048576) throw new Error('收到的图像格式或大小不正确。');
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await image.arrayBuffer())), b => b.toString(16).padStart(2, '0')).join('');
  if (hash !== job.imageSha256) throw new Error('画作校验不一致，尚未收入画册。请刷新重试下载。');
  const bitmap = await createImageBitmap(image); bitmap.close(); return image;
}
async function keep(job: DreamJob) {
  const prior = useDreams.getState().entries.find(e => e.job.id === job.id);
  let entry: DreamEntry = {...prior, job, favorite: prior?.favorite ?? false};
  if (job.status === 'ready' && !entry.image) {
    const image = await verifiedImage(job); entry = {...entry, image, url: URL.createObjectURL(image), savedAt: new Date().toISOString()};
  }
  try {await saveDream(entry);} catch {useDreams.setState({notice: '本机画册未能写入。画作仍可查看，请下载原图留存。'});}
  useDreams.setState(s => ({entries: [entry, ...s.entries.filter(e => e.job.id !== job.id)].sort((a, b) => b.job.createdAt.localeCompare(a.job.createdAt)), ...(entry.image && !prior?.image || job.status === 'failed' && prior?.job.status !== 'failed' ? {arrived: job.id} : {})}));
}
function schedule() {
  if (timer) clearTimeout(timer);
  if (useDreams.getState().entries.some(e => ['queued', 'painting'].includes(e.job.status))) timer = setTimeout(() => void useDreams.getState().refresh(), 3500);
}
interface DreamState {
  config: DreamConfig | null; entries: DreamEntry[]; initialized: boolean; busy: boolean; error: string; notice: string;
  accessToken: string; automatic: boolean; candidate: ArtMoment | null; retrying: string | null; workshopOpen: boolean; collectionOpen: boolean; viewing: string | null; arrived: string | null;
  initialize: () => Promise<void>; refresh: () => Promise<void>; offer: (moment: ArtMoment, quiet?: boolean) => void;
  generate: (moment: ArtMoment) => Promise<boolean>; retry: (id: string) => Promise<void>;
  favorite: (id: string) => Promise<void>; setAutomatic: (automatic: boolean) => void;
}
export const useDreams = create<DreamState>((set, get) => ({
  config: null, entries: [], initialized: false, busy: false, error: '', notice: '', accessToken: '', automatic: true, candidate: null, retrying: null, workshopOpen: false, collectionOpen: false, viewing: null, arrived: null,
  initialize: () => initializing ??= (async () => {
    try {const settings = JSON.parse(localStorage.getItem(preferenceKey) || '{}'); if (typeof settings.automatic === 'boolean') set({automatic: settings.automatic});} catch { /* Default preference. */ }
    try {const entries = await savedDreams(); set({entries: entries.map(e => ({...e, ...(e.image ? {url: URL.createObjectURL(e.image)} : {})})).sort((a, b) => b.job.createdAt.localeCompare(a.job.createdAt))});} catch {set({notice: '本机画册暂不可用，完成后请下载原图留存。'});}
    set({initialized: true}); await get().refresh();
  })(),
  refresh: async () => {
    if (refreshing) return; refreshing = true;
    try {
      const [config, list] = await Promise.all([fetch('/api/dreams/config', {signal: AbortSignal.timeout(15000)}).then(r => {if (!r.ok) throw new Error('无法读取生图服务状态。'); return r.json();}), api('jobs').then(r => r.json())]);
      set({config});
      for (const raw of list.jobs) {const job = dreamJobSchema.parse(raw), prior = get().entries.find(e => e.job.id === job.id); if (!prior || JSON.stringify(prior.job) !== JSON.stringify(job) || job.status === 'ready' && !prior.image) await keep(job);}
      for (const entry of get().entries) if (['queued', 'painting'].includes(entry.job.status) && !list.jobs.some((j: DreamJob) => j.id === entry.job.id)) await keep({...entry.job, status: 'failed', resumeAvailable: false, error: '服务器已找不到这个任务。剧情记录仍在，可以重新作画。'});
    } catch (e) {set({error: e instanceof Error ? e.message : '画册同步暂不可用，已有本机画作仍可查看。'});}
    finally {refreshing = false; schedule();}
  },
  offer: (moment, quiet = false) => {
    const key = JSON.stringify(moment); if (offered === key) return; offered = key;
    set({candidate: moment});
    if (get().automatic && get().config?.configured && get().accessToken && !get().busy) void get().generate(moment);
    else if (!quiet) set({arrived: null});
  },
  generate: async moment => {
    if (get().busy) return false;
    if (!get().accessToken) {set({error: '填写生图访问口令后，即可为这一刻作画。', workshopOpen: true, candidate: moment}); return false;}
    set({busy: true, error: ''});
    try {const result = await (await api('jobs', {moment})).json(); await keep(dreamJobSchema.parse(result.job)); set({candidate: null, workshopOpen: false}); schedule(); void get().refresh(); return true;}
    catch (e) {set({error: e instanceof Error ? e.message : '这次作画未能提交，请重试。'}); return false;}
    finally {set({busy: false});}
  },
  retry: async id => {
    const entry = get().entries.find(e => e.job.id === id); if (!entry) return;
    if (!get().accessToken) {set({candidate: entry.job.moment, retrying: id, workshopOpen: true, error: ''}); return;}
    if (entry.job.error?.startsWith('服务器已找不到')) {await get().generate(entry.job.moment); return;}
    if (get().busy) return; set({busy: true, error: ''});
    try {const result = await (await api(`jobs/${id}/retry`, {})).json(); await keep(dreamJobSchema.parse(result.job)); set({retrying: null, workshopOpen: false, candidate: null}); schedule(); void get().refresh();}
    catch (e) {set({error: e instanceof Error ? e.message : '重试未能提交。'});} finally {set({busy: false});}
  },
  favorite: async id => {
    const entry = get().entries.find(e => e.job.id === id); if (!entry) return;
    const next = {...entry, favorite: !entry.favorite};
    try {await saveDream(next); set(s => ({entries: s.entries.map(e => e.job.id === id ? next : e)}));} catch {set({error: '珍藏标记未能保存，请稍后重试。'});}
  },
  setAutomatic: automatic => {set({automatic}); try {localStorage.setItem(preferenceKey, JSON.stringify({automatic}));} catch {set({notice: '自动作画偏好只在本次打开期间保留。'});}},
}));
export function downloadDream(entry: DreamEntry, metadata = false) {
  const blob = metadata ? new Blob([JSON.stringify({job: entry.job, savedAt: entry.savedAt, favorite: entry.favorite, attribution: '玩家剧情生成画作，非原著证据；收藏编号标识剧情起点或个人画册顺序，不是原著真伪或稀有度。prompt、negativePrompt、referenceSet、seed与imageSha256记录本次创作。'}, null, 2)], {type: 'application/json'}) : entry.image;
  if (!blob) return; const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url;
  link.download = `大观园-${entry.job.cardNo || '旧藏'}-${entry.job.moment.title.replace(/[<>:"/\\|?*]/g, '')}-${entry.job.id.slice(0, 8)}.${metadata ? 'json' : entry.job.mime === 'image/webp' ? 'webp' : entry.job.mime === 'image/jpeg' ? 'jpg' : 'png'}`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}

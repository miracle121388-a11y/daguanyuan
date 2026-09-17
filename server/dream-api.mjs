import {timingSafeEqual, randomUUID} from 'node:crypto';
import {mkdir, readFile, writeFile, readdir, rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {resolveImage} from './dream-download.mjs';
import {renderDream, maximumImageBytes} from './dream-provider.mjs';
import {validMoment, cleanMoment, makeDreamPrompt, digest, promptRevision} from './dream-prompts.mjs';

const validId = s => /^[a-f0-9-]{36}$/.test(s ?? '');
const ownerFor = req => /^[a-f0-9]{64}$/.test(req.headers['x-dream-album'] ?? '') ? digest(req.headers['x-dream-album']) : null;
const matches = (actual, expected) => {const a = Buffer.from(actual ?? ''), b = Buffer.from(`Bearer ${expected}`); return a.length === b.length && timingSafeEqual(a, b);};
const number = (value, fallback, max) => Math.max(1, Math.min(max, Number.parseInt(value, 10) || fallback));
export function imageType(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  throw new Error('生图服务没有返回可识别的PNG、JPEG或WebP图像。');
}
export async function checkedImageUrl(raw, hosts) {
  return (await resolveImage(raw, hosts)).url;
}
/** Private, persistent job queue. Generated art is never published as canon. */
export function createDreamApi(env = process.env, request = fetch, options = {}) {
  const root = resolve(env.DREAM_STORAGE_DIR || '.local/dream-art'), publicRoot = resolve(options.publicRoot || env.STATIC_ROOT || 'public');
  const token = env.IMAGE_ACCESS_TOKEN || env.LLM_ACCESS_TOKEN, dailyLimit = number(env.IMAGE_DAILY_LIMIT, 20, 500), concurrency = number(env.IMAGE_CONCURRENCY, 1, 2);
  const timeout = number(env.IMAGE_TIMEOUT_MS, 600000, 900000), storageLimit = number(env.IMAGE_STORAGE_MB, 512, 4096) * 1048576;
  let endpoint;
  const dashscope = env.IMAGE_PROTOCOL === 'dashscope';
  try {const u = new URL((env.IMAGE_BASE_URL || '').replace(/\/$/, '') + (dashscope ? '/services/aigc/image-generation/generation' : '/images/generations')); if (u.protocol === 'https:' || env.NODE_ENV !== 'production' && u.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(u.hostname)) endpoint = u.href;} catch { /* Optional service. */ }
  const configured = !!(endpoint && env.IMAGE_API_KEY && env.IMAGE_MODEL && token);
  const jobs = new Map(), controllers = new Map(), working = new Set(); let inflight = 0, storageBytes = 0, storageError = '', closed = false;
  let catalog, places;
  const safe = job => {const {owner: _owner, providerResult: _result, providerEndpoint: _endpoint, ...rest} = job; return rest;};
  const today = () => new Date().toISOString().slice(0, 10);
  const attemptsToday = () => [...jobs.values()].reduce((sum, j) => sum + (j.attempts ?? []).filter(at => at.startsWith(today())).length, 0);
  const save = async job => {const path = resolve(root, job.id + '.json'); await writeFile(path + '.next', JSON.stringify(job)); await rename(path + '.next', path);};
  const initialized = (async () => {
    try {
      await mkdir(root, {recursive: true});
      [catalog, places] = await Promise.all(['editionCatalog', 'places'].map(name => readFile(resolve(publicRoot, `data/${name}.json`), 'utf8').then(JSON.parse)));
      for (const file of await readdir(root)) {
        if (!file.endsWith('.json') || !validId(file.slice(0, -5))) continue;
        const j = JSON.parse(await readFile(resolve(root, file), 'utf8'));
        if (j.id !== file.slice(0, -5) || !/^[a-f0-9]{64}$/.test(j.owner)) throw new Error('invalid archive');
        if (j.status === 'painting') {
          if (j.resumeAvailable) j.status = 'queued';
          else {j.status = 'failed'; j.error = '上次生成因服务重启而中断。请先确认服务商记录，再手动重试。';}
          await save(j);
        }
        jobs.set(j.id, j); storageBytes += j.bytes || 0;
      }
    } catch {storageError = '画册存储暂时不可用，请联系管理员检查目录权限与资料。';}
  })();
  const paint = async job => {
    const abort = new AbortController(), timer = setTimeout(() => abort.abort(), timeout); controllers.set(job.id, abort); inflight++;
    try {
      job.status = 'painting'; job.startedAt = new Date().toISOString(); await save(job);
      const bytes = await renderDream(job, {env, endpoint, dashscope, publicRoot, catalog, request, signal: abort.signal, save, checkedImageUrl, pollMs: options.pollMs});
      try {job.mime = imageType(bytes);} catch (error) {job.resumeAvailable = false; delete job.providerResult; throw error;}
      job.imageSha256 = digest(bytes); job.bytes = bytes.length;
      await writeFile(resolve(root, job.id + '.image.next'), bytes); await rename(resolve(root, job.id + '.image.next'), resolve(root, job.id + '.image'));
      job.resumeAvailable = false; delete job.providerResult; job.status = 'ready'; job.finishedAt = new Date().toISOString(); job.error = ''; storageBytes += bytes.length; await save(job);
    } catch (e) {
      if (!(closed && job.resumeAvailable)) {job.status = 'failed'; job.error = abort.signal.aborted ? job.resumeAvailable ? '画师仍在处理中，可继续查询原任务，不会重复生图。' : '生成等待已超时，服务商可能仍在处理。请核对后手动重试。' : e instanceof Error ? e.message : '画作生成失败，请稍后重试。';}
      await save(job).catch(() => {storageError = '画册写入失败，请联系管理员。';});
    }
    finally {clearTimeout(timer); controllers.delete(job.id); inflight--; pump();}
  };
  const pump = () => {if (closed || !configured || storageError) return; for (const job of jobs.values()) {if (inflight >= concurrency) break; if (job.status === 'queued') {job.status = 'painting'; const work = paint(job); working.add(work); void work.finally(() => working.delete(work));}}};
  void initialized.then(() => pump());
  const handler = async (req, res) => {
    const path = req.url?.split('?')[0]; if (!path?.startsWith('/api/dreams/')) return false;
    const send = (status, data, headers = {}) => {if (!res.destroyed) {res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers}); res.end(JSON.stringify(data));}};
    await initialized;
    if (path === '/api/dreams/config') {if (req.method !== 'GET') send(405, {error: '仅支持GET。'}); else send(200, {configured: configured && !storageError, needsToken: true, dailyLimit, remaining: Math.max(0, dailyLimit - attemptsToday()), model: env.IMAGE_MODEL || '', error: storageError}); return true;}
    const owner = ownerFor(req); if (!owner) {send(401, {error: '画册身份无效，请刷新页面后重试。'}); return true;}
    if (storageError) {send(503, {error: storageError}); return true;}
    const parts = path.split('/'), job = validId(parts[4]) ? jobs.get(parts[4]) : null;
    if (path === '/api/dreams/jobs' && req.method === 'GET') {send(200, {jobs: [...jobs.values()].filter(j => j.owner === owner).map(safe)}); return true;}
    if (job && job.owner === owner && req.method === 'GET') {
      if (parts[5] === 'image') {
        if (job.status !== 'ready') send(409, {error: '画作尚未完成。'});
        else try {const bytes = await readFile(resolve(root, job.id + '.image')); res.writeHead(200, {'Content-Type': job.mime, 'Content-Length': bytes.length, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'}); res.end(bytes);} catch {send(404, {error: '原图暂不可用，已保存的本机画册仍可浏览。'});}
      } else send(200, {job: safe(job)});
      return true;
    }
    if (req.method !== 'POST') {send(404, {error: '未找到这幅画作。'}); return true;}
    if (!configured) {send(503, {error: '生图服务尚未接通。你的剧情与画意可以先保留。'}); return true;}
    if (!matches(req.headers.authorization, token)) {send(401, {error: '请填写正确的生图访问口令。'}); return true;}
    try {if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) throw new Error();} catch {send(403, {error: '请求来源不允许。'}); return true;}
    if (path !== '/api/dreams/jobs' && (!job || job.owner !== owner || parts[5] !== 'retry')) {send(404, {error: '未找到这幅画作。'}); return true;}
    if (!req.headers['content-type']?.startsWith('application/json')) {send(415, {error: '需要JSON请求。'}); return true;}
    try {
      let size = 0; const chunks = []; for await (const chunk of req) {size += chunk.length; if (size > 16 * 1024) throw new Error('body-size'); chunks.push(chunk);}
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (job) {
        if (job.status !== 'failed') {send(200, {job: safe(job)}); return true;}
      } else if (!validMoment(body.moment, catalog, places)) {send(400, {error: '剧情快照不完整或与版本不符，请重新选取这一刻。'}); return true;}
      const moment = job?.moment || cleanMoment(body.moment), key = digest(JSON.stringify({owner, moment, promptRevision}));
      const existing = [...jobs.values()].find(j => j.key === key);
      if (!job && existing) {send(200, {job: safe(existing), reused: true}); return true;}
      if (!job?.resumeAvailable && attemptsToday() >= dailyLimit) {send(429, {error: '今日生图次数已用完。已收藏的画作仍可回看。'}); return true;}
      if (storageBytes + ([...jobs.values()].filter(j => ['queued', 'painting'].includes(j.status)).length + 1) * maximumImageBytes > storageLimit || jobs.size >= 1000) {send(507, {error: '画册服务容量已满，请联系管理员扩展当前服务存储。'}); return true;}
      if ([...jobs.values()].filter(j => ['queued', 'painting'].includes(j.status)).length >= 5) {send(429, {error: '画师正在处理其他画作，请稍候再试。'}); return true;}
      const at = new Date().toISOString(), next = job ? {...job, attempts: [...job.attempts]} : {id: randomUUID(), owner, key, moment, createdAt: at, attempts: [], model: env.IMAGE_MODEL, providerOrigin: new URL(endpoint).origin, promptRevision, prompt: makeDreamPrompt(moment, catalog, places), contentType: 'generated-art'};
      next.status = 'queued'; next.error = '';
      if (!next.resumeAvailable) {next.attempts.push(at); delete next.providerTaskId; delete next.providerEndpoint; delete next.providerResult;}
      next.promptSha256 = digest(next.prompt); jobs.set(next.id, next);
      try {await save(next);} catch (error) {if (job) jobs.set(job.id, job); else jobs.delete(next.id); throw error;}
      send(202, {job: safe(next)}); pump();
    } catch (e) {send(e.message === 'body-size' ? 413 : e instanceof SyntaxError ? 400 : 500, {error: '无法保存这次作画请求，请稍后重试。'});}
    return true;
  };
  handler.close = async () => {closed = true; for (const c of controllers.values()) c.abort(); await Promise.allSettled([...working]);};
  return handler;
}

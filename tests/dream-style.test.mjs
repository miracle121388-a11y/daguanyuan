import {afterEach, describe, expect, it, vi} from 'vitest';
import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import {resolve, sep} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {makeDreamPromptSections, makeDreamPrompt, visibleSceneText, digest, promptRevision} from '../server/dream-prompts.mjs';
import {negativePrompt, renderingSettings} from '../server/dream-style.mjs';
import {loadDreamReferences, chooseReferences, materializeReferences, describeReferences} from '../server/dream-references.mjs';
import {assignCard, storyCardNo, migrateDreamJobs} from '../server/dream-cards.mjs';
import {createDreamApi} from '../server/dream-api.mjs';
import {prepareScenePlan, scenePlanSettings, validScenePlan} from '../server/dream-scene-plan.mjs';
import {dreamJobSchema} from '../src/dreams/types.ts';

vi.mock('node:dns/promises', () => ({lookup: vi.fn(async () => [{address: '93.184.216.34', family: 4}])}));
const catalog = JSON.parse(await readFile('public/data/editionCatalog.json', 'utf8')), places = JSON.parse(await readFile('public/data/places.json', 'utf8'));
const moment = {editionId: 'original80', chapter: 27, tick: 4, worldId: 'personal-world', snapshotId: '4:1', branch: 'if', trigger: 'conversation', title: '竹下的一句心声', text: '黛玉说愿你安心，宝玉把诗笺放在案上；赴约仍是未执行的打算。', time: '午后', placeId: 'xiaoxiangguan', cast: ['daiyu', 'baoyu'], nodeId: 'flowers-27', mood: 'poetic', framing: 'scene', note: '雨后竹叶带水。'};
const opening = {...moment, tick: 0, branch: 'main', trigger: 'story', worldId: 'story:original80:flowers-27', snapshotId: 'opening:flowers-27'};
const registry = await loadDreamReferences('public');
const roots = [], servers = [], owner = 'a'.repeat(64), authorization = 'Bearer test-access';
const headers = {'X-Dream-Album': owner, Authorization: authorization, 'Content-Type': 'application/json'};
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1fkAAAAASUVORK5CYII=', 'base64');
const json = value => new Response(JSON.stringify(value));
const env = {IMAGE_PROTOCOL: 'dashscope', IMAGE_MODEL: 'qwen-image-3.0-pro', IMAGE_BASE_URL: 'https://image.example/api/v1', IMAGE_API_KEY: 'not-a-live-key', IMAGE_ACCESS_TOKEN: 'test-access', IMAGE_REFERENCE: 'true'};
const post = (url, body = {moment}) => fetch(url + '/jobs', {method: 'POST', headers, body: JSON.stringify(body)});
async function serve(settings = env, root) {
  if (!root) {root = await mkdtemp(resolve(tmpdir(), 'garden-silk-test-')); roots.push(root);}
  const calls = [], plannerCalls = [];
  const request = vi.fn(async (url, options) => {
    if (options?.method === 'POST') {
      const payload = JSON.parse(options.body);
      if (String(url).endsWith('/chat/completions')) {
        plannerCalls.push(payload);
        return json({choices: [{message: {content: JSON.stringify({cast: moment.cast, setting: 'A bamboo garden study after rain, with a low wooden table beside an open lattice window.', action: 'Daiyu watches Baoyu place a blank sheet on the table. Both stay beside the table, quietly facing one another. They have not yet left for their planned meeting.'})}}]});
      }
      calls.push(payload);
      if (settings.FAIL_IMAGE_ONCE && calls.length === 1) return new Response('{}', {status: 503});
      return json(settings.IMAGE_PROTOCOL === 'dashscope' ? {output: {task_id: 'silk-fixture-task-001'}} : {data: [{b64_json: png.toString('base64')}]});
    }
    if (String(url).includes('/tasks/')) return json({output: {task_status: 'SUCCEEDED', choices: [{message: {content: [{image: 'https://image.example/silk.png'}]}}]}});
    return new Response(png);
  });
  const api = createDreamApi({...settings, DREAM_STORAGE_DIR: root}, request, {publicRoot: 'public', pollMs: 1});
  const server = createServer((req, res) => {void api(req, res);});
  await new Promise(done => server.listen(0, '127.0.0.1', done)); servers.push({server, api});
  return {url: `http://127.0.0.1:${server.address().port}/api/dreams`, root, api, calls, plannerCalls};
}
async function done(url, id) {
  let job;
  await vi.waitFor(async () => {job = (await (await fetch(url + '/jobs/' + id, {headers})).json()).job; expect(job.status).toBe('ready');}, {timeout: 5000, interval: 25});
  return job;
}
afterEach(async () => {
  for (const {api, server} of servers.splice(0)) {await api.close(); server.closeAllConnections(); await new Promise(done => server.close(done));}
  for (const root of roots.splice(0)) {if (!resolve(root).startsWith(resolve(tmpdir()) + sep + 'garden-silk-test-')) throw Error('Unexpected fixture path'); await rm(root, {recursive: true, force: true});}
});

describe('Dream Silk style contract', () => {
  it('builds eight explicit sections without promoting wishes or other-book endings into facts', () => {
    const sections = makeDreamPromptSections(moment, catalog, places, chooseReferences(moment, registry));
    expect(sections.map(p => p.id)).toEqual(['style', 'literature', 'scene', 'characters', 'composition', 'mood', 'snapshot', 'exclusions']);
    const prompt = makeDreamPrompt(moment, catalog, places, chooseReferences(moment, registry));
    for (const text of ['late-Qing gongbi', 'mineral-pigment glazes', 'matte silk', 'no endings from other editions', 'not completed actions', 'No absent characters', 'glass-like eyes']) expect(prompt).toContain(text);
    expect(prompt).not.toContain('精细现代国风漫画'); expect(prompt).not.toContain('电影式中景');
    expect(prompt).toContain('NO text anywhere');
    expect(prompt.indexOf(moment.text)).toBeLessThan(prompt.indexOf('late-Qing gongbi'));
    for (const section of sections) expect(prompt).not.toContain(section.heading);
    expect(prompt).not.toContain('<reference-roles>');
    const staged = {...moment, text: '2014年公开目录第90回仅作为依据。\n舞台演绎：黛玉轻轻抚平纸角。'};
    expect(visibleSceneText(staged)).toBe('黛玉轻轻抚平纸角。');
    expect(makeDreamPrompt(staged, catalog, places)).not.toContain('2014年公开目录');
    const gui = {...moment, editionId: 'guiyou108', chapter: 90, nodeId: 'hope-90'};
    expect(makeDreamPrompt(gui, catalog, places)).toContain('source is a chapter heading');
  });
  it('fits all three roles into three images without leaking absent characters', () => {
    const set = chooseReferences({...moment, cast: ['baoyu', 'daiyu']}, registry);
    expect(set.inputs.map(r => r.role)).toEqual(['style', 'character', 'scene']);
    expect(set.characterSheet.cast).toEqual(['daiyu', 'baoyu']);
    expect(set.characterRefs.map(r => r.characterId)).toEqual(['daiyu', 'baoyu']);
    expect(set.sceneRef.placeId).toBe('xiaoxiangguan');
    expect(materializeReferences(set, registry).images).toHaveLength(3);
    expect(describeReferences(set)).toContain('Image 3 supplies only garden'); expect(describeReferences(set)).not.toContain('Wang Xifeng');
  });
  it('falls back to text for missing assets or changed saved hashes without substituting another place', () => {
    const unknown = chooseReferences({...moment, placeId: 'daguanyuan_gate'}, registry);
    expect(unknown.sceneRef).toBeNull(); expect(unknown.inputs).toHaveLength(2);
    const empty = chooseReferences(moment, {manifest: null, assets: new Map()}); expect(empty.inputs).toHaveLength(0);
    const set = chooseReferences(moment, registry); set.styleRef = {...set.styleRef, sha256: '0'.repeat(64)};
    const missing = materializeReferences(set, registry); expect(missing.images).toHaveLength(0); expect(missing.set.planned).toHaveLength(3);
    expect(chooseReferences(moment, registry, false).inputs).toHaveLength(0);
  });
  it('uses append-only story numbers and persistent per-album personal sequences', () => {
    expect(storyCardNo(opening)).toBe('NO.001'); expect(storyCardNo(moment)).toBeNull();
    expect(storyCardNo({...opening, trigger: 'manual'})).toBeNull();
    expect(assignCard(moment, owner, [{owner, cardNo: 'IF.0007'}, {owner: 'other', cardNo: 'IF.0099'}])).toEqual({cardNo: 'IF.0008', cardKind: 'personal'});
    const jobs = [{id: 'later', owner, createdAt: '2026-09-17', moment}, {id: 'earlier', owner, createdAt: '2026-09-16', moment: {...moment, branch: 'main'}}];
    migrateDreamJobs(jobs); expect(jobs.map(j => j.cardNo)).toEqual(['IF.0002', 'IF.0001']);
    expect(migrateDreamJobs(jobs)).toHaveLength(0); expect(jobs.every(j => j.styleVersion === 'legacy')).toBe(true);
  });
  it('records requested versus effective thinking and accepts a configured seed of zero', () => {
    expect(renderingSettings({...env, IMAGE_SEED: '0'})).toMatchObject({promptExtend: false, enableThinking: true, thinkingEffective: false, configuredSeed: 0});
    expect(renderingSettings({...env, IMAGE_PROMPT_EXTEND: 'true'}).thinkingEffective).toBe(true);
    expect(renderingSettings({...env, IMAGE_SEED: '-1'}).configuredSeed).toBeNull();
    expect(renderingSettings({...env, IMAGE_NATIVE_PARAMETERS: 'false'})).toMatchObject({thinkingEffective: null, negativePromptTransport: 'prompt-only'});
  });
  it('sends real DashScope fields, snapshots metadata and deduplicates concurrent submissions', async () => {
    const {url, calls, root} = await serve({...env, IMAGE_SEED: '0'});
    const [a, b] = await Promise.all([post(url), post(url)]); const [first, second] = await Promise.all([a.json(), b.json()]);
    expect(first.job.id).toBe(second.job.id); const job = await done(url, first.job.id); expect(calls).toHaveLength(1);
    expect(calls[0].parameters).toMatchObject({negative_prompt: negativePrompt, seed: 0, prompt_extend: false, enable_thinking: true});
    expect(calls[0].input.messages[0].content.filter(c => c.image)).toHaveLength(3);
    expect(calls[0].input.messages[0].content.filter(c => c.text)).toHaveLength(1);
    expect(job).toMatchObject({styleVersion: 'honglou-silk-v1', cardNo: 'IF.0001', seed: 0, promptRevision});
    expect(job.promptSha256).toBe(digest(job.prompt)); expect(job.negativePromptSha256).toBe(digest(negativePrompt));
    expect(job.providerPayloadSha256).toBe(digest(JSON.stringify(calls[0]))); expect(job.referenceSet.inputs).toHaveLength(3);
    expect(dreamJobSchema.parse(job).referenceSet.inputs).toHaveLength(3);
    const record = await readFile(resolve(root, job.id + '.json'), 'utf8'); expect(record).not.toContain(env.IMAGE_API_KEY); expect(record).not.toContain('base64,');
  });
  it('keeps generic endpoints runnable with prompt-only exclusions and honest missing seed metadata', async () => {
    const {url, calls} = await serve({...env, IMAGE_PROTOCOL: 'images'});
    const {job: submitted} = await (await post(url)).json(); const job = await done(url, submitted.id);
    expect(calls[0].prompt).toContain(negativePrompt); expect(calls[0]).not.toHaveProperty('negative_prompt'); expect(calls[0]).not.toHaveProperty('seed');
    expect(job.seed).toBeNull(); expect(job.providerSettings.negativePromptTransport).toBe('prompt-only'); expect(job.referenceSet.inputs).toHaveLength(0);
  });
  it('does not reuse an older render when style parameters change, and keeps the previous recipe intact', async () => {
    const first = await serve({...env, IMAGE_SEED: '13'}); const {job: a} = await (await post(first.url, {moment: opening})).json(); await done(first.url, a.id); await first.api.close();
    const next = await serve({...env, IMAGE_SEED: '14', IMAGE_PROMPT_EXTEND: 'true'}, first.root);
    const {job: b} = await (await post(next.url, {moment: opening})).json(); const changed = await done(next.url, b.id);
    expect(b.id).not.toBe(a.id); expect(changed.cardNo).toBe('NO.001'); expect(changed.seed).toBe(14);
    const prior = (await (await fetch(next.url + '/jobs/' + a.id, {headers})).json()).job;
    expect(prior.seed).toBe(13); expect(prior.providerSettings.promptExtend).toBe(false);
  });
  it('migrates a completed v5 record without touching image, prompt or generation attempts', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'garden-silk-test-')); roots.push(root);
    const id = randomUUID(), prompt = 'Existing v5 image prompt remains exact.';
    const old = {id, key: 'legacy-key', owner: digest(owner), moment, status: 'ready', createdAt: new Date().toISOString(), attempts: [], model: env.IMAGE_MODEL, providerOrigin: 'https://image.example', promptRevision: 'dream-atelier-1', prompt, promptSha256: digest(prompt), contentType: 'generated-art', imageSha256: digest(png), bytes: png.length, mime: 'image/png'};
    // An offline v5 browser record remains readable even before server backfill.
    expect(dreamJobSchema.parse(old)).toMatchObject({cardNo: null, styleVersion: 'legacy', seed: null, referenceSet: null});
    await writeFile(resolve(root, id + '.json'), JSON.stringify(old)); await writeFile(resolve(root, id + '.image'), png);
    const {url, calls} = await serve(env, root); const migrated = await done(url, id);
    expect(migrated).toMatchObject({cardNo: 'IF.0001', styleVersion: 'legacy', prompt, promptSha256: old.promptSha256, imageSha256: old.imageSha256, attempts: []});
    expect(await readFile(resolve(root, id + '.image'))).toEqual(png); expect(calls).toHaveLength(0);
  });
  it('persists the visual plan before image submission and reuses it on manual retry', async () => {
    const settings = {...env, LLM_BASE_URL: 'https://text.example/v1', LLM_MODEL: 'existing-text-model', LLM_API_KEY: 'private-text-key', FAIL_IMAGE_ONCE: true};
    const {url, root, calls, plannerCalls} = await serve(settings);
    const {job: submitted} = await (await post(url)).json(); let failed;
    await vi.waitFor(async () => {failed = (await (await fetch(url + '/jobs/' + submitted.id, {headers})).json()).job; expect(failed.status).toBe('failed');});
    expect(failed.scenePlan.status).toBe('ready'); expect(calls).toHaveLength(1);
    const saved = JSON.parse(await readFile(resolve(root, submitted.id + '.json'), 'utf8'));
    expect(saved.scenePlan.contentSha256).toBe(failed.scenePlan.contentSha256);
    expect(saved.prompt).not.toMatch(/[\u4e00-\u9fff]/);
    await fetch(url + '/jobs/' + submitted.id + '/retry', {method: 'POST', headers, body: '{}'});
    const ready = await done(url, submitted.id);
    expect(plannerCalls).toHaveLength(1); expect(calls).toHaveLength(2);
    expect(ready.scenePlan).toEqual(failed.scenePlan); expect(ready.seed).toBe(failed.seed);
    expect(ready.promptSha256).toBe(failed.promptSha256); expect(ready.cardNo).toBe(failed.cardNo);
    expect(dreamJobSchema.parse(ready).scenePlan).toEqual(ready.scenePlan);
    expect(JSON.stringify(ready)).not.toContain(settings.LLM_API_KEY);
    expect(calls[0]).toEqual(calls[1]);
  });
  it('rejects altered casts and nonvisual prose, falling back without sending extra image requests', async () => {
    const settings = scenePlanSettings({...env, LLM_BASE_URL: 'https://text.example', LLM_MODEL: 'text', LLM_API_KEY: 'private'});
    const input = {cast: ['daiyu'], snapshot: '黛玉收拢落花。'};
    const invalid = {cast: ['daiyu'], setting: 'A garden with bamboo and a stone path.', action: 'Baoyu quietly watches the flowers beneath the window.'};
    expect(validScenePlan(invalid, input.cast)).toBe(false);
    expect(validScenePlan({...invalid, cast: ['daiyu', 'baoyu']}, input.cast)).toBe(false);
    const request = vi.fn(async () => json({choices: [{message: {content: JSON.stringify(invalid)}}]}));
    const result = await prepareScenePlan(input, settings, {env: {...env, LLM_BASE_URL: 'https://text.example', LLM_MODEL: 'text', LLM_API_KEY: 'private'}, request, signal: new AbortController().signal});
    expect(result.status).toBe('fallback'); expect(request).toHaveBeenCalledTimes(1);
    expect(result).not.toHaveProperty('action'); expect(result.sourceSha256).toBe(digest(JSON.stringify(input)));
    const changed = await prepareScenePlan(input, settings, {env: {...env, LLM_BASE_URL: 'https://other.example', LLM_MODEL: 'text', LLM_API_KEY: 'private'}, request, signal: new AbortController().signal});
    expect(changed.status).toBe('fallback'); expect(request).toHaveBeenCalledTimes(1);
  });
});

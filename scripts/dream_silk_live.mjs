// Explicit --generate submits one real image; --resume only queries its saved task.
// Credentials and album capabilities never enter the public acceptance report.
import {existsSync, readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
process.loadEnvFile('.env');
const base = (process.env.APP_URL || 'http://127.0.0.1:4291').replace(/\/$/, '');
const trial = process.argv.find(value => value.startsWith('--trial='))?.split('=')[1] || '1';
if (!['1', '2', '3', '4'].includes(trial)) throw Error('Unknown recorded trial.');
const statePath = trial === '1' ? '.local/dream-silk-album.json' : `.local/dream-silk-${trial}-album.json`, reportPath = 'reports/acceptance/dream-silk-live.json';
const prior = JSON.parse(readFileSync('reports/acceptance/dream-live.json', 'utf8'));
const previous = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : null;
if (!process.argv.includes('--generate') && !process.argv.includes('--resume')) throw Error('Choose --generate once, then --resume for the saved task.');
if (process.argv.includes('--generate') && previous) throw Error('A saved style task exists; use --resume, which does not start another generation.');
if (process.argv.includes('--resume') && !previous) throw Error('No saved style task to resume.');
const owner = previous?.owner || JSON.parse(readFileSync('.local/dream-test-album.json', 'utf8')).owner;
const headers = {'Content-Type': 'application/json', 'X-Dream-Album': owner, Authorization: `Bearer ${process.env.IMAGE_ACCESS_TOKEN || process.env.LLM_ACCESS_TOKEN}`};
const hash = value => createHash('sha256').update(value).digest('hex');
const report = {at: new Date().toISOString(), live: true, url: base, checks: [], comparison: {previousReport: 'reports/acceptance/dream-live.json', sameMoment: trial !== '4'}};
const check = (ok, text) => {if (!ok) throw Error(text); report.checks.push(text);};
async function request(path, options = {}) {
  const response = await fetch(base + '/api/dreams' + path, {headers, ...options});
  const body = await response.json(); if (!response.ok) throw Error(body.error || `HTTP ${response.status}`); return body;
}
let job;
try {
  if (previous) {
    job = (await request('/jobs/' + previous.jobId)).job;
    if (job.status === 'failed' && job.resumeAvailable) job = (await request('/jobs/' + job.id + '/retry', {method: 'POST', body: '{}'})).job;
  } else {
    const moment = trial === '4' ? {editionId: 'original80', chapter: 27, tick: 7, worldId: 'silk-action-acceptance', snapshotId: '7:flowers-bag', branch: 'if', trigger: 'manual', title: '花归绢袋', text: '舞台演绎：黛玉在竹篱旁蹲下，将地上的淡粉落花拾入左手撑开的素色绢袋；她低头望着袋口。', time: '雨后午间', placeId: 'xiaoxiangguan', cast: ['daiyu'], nodeId: 'flowers-27', mood: 'poetic', framing: 'scene', note: ''} : prior.job.moment;
    job = (await request('/jobs', {method: 'POST', body: JSON.stringify({moment})})).job;
    mkdirSync('.local', {recursive: true}); writeFileSync(statePath, JSON.stringify({owner, jobId: job.id}));
  }
  report.jobId = job.id;
  check(job.styleVersion === 'honglou-silk-v1', 'real task uses Dream Silk style');
  check(job.promptSections?.length === 8, 'eight prompt sections stored before submission');
  const deadline = Date.now() + 680000; let lastStatus;
  while (['queued', 'painting'].includes(job.status) && Date.now() < deadline) {
    if (job.status !== lastStatus) {console.log('Dream Silk task:', job.status); lastStatus = job.status;}
    await new Promise(done => setTimeout(done, 8000)); job = (await request('/jobs/' + job.id)).job;
  }
  report.job = job;
  if (job.status !== 'ready') throw Error(job.error || 'Task is still running; use --resume.');
  const response = await fetch(base + '/api/dreams/jobs/' + job.id + '/image', {headers});
  check(response.ok, 'original image served from the private album');
  const bytes = Buffer.from(await response.arrayBuffer()), dimensions = await sharp(bytes).metadata();
  check(hash(bytes) === job.imageSha256, 'original image SHA-256 matches saved metadata');
  check(job.referenceSet.inputs.map(r => r.role).join(',') === 'style,character,scene', 'three reference roles used by the real provider task');
  check(job.submittedParameters.prompt_extend === false && job.submittedParameters.enable_thinking === true && job.submittedParameters.seed === job.seed && job.submittedParameters.negative_prompt === job.negativePrompt, 'native exclusions, seed and configured flags saved exactly');
  check(job.promptSha256 === hash(job.prompt), 'stored prompt hash matches its exact text');
  check(job.attempts.length === 1, 'one provider submission for this artwork');
  const duplicate = await request('/jobs', {method: 'POST', body: JSON.stringify({moment: job.moment})});
  check(duplicate.reused && duplicate.job.id === job.id, 'identical recipe reuses the completed image');
  report.image = {width: dimensions.width, height: dimensions.height, bytes: bytes.length, sha256: hash(bytes), path: `output/imagegen/dream-silk/qwen-silk-${trial}.png`};
  mkdirSync('output/imagegen/dream-silk', {recursive: true}); writeFileSync(report.image.path, bytes);
  writeFileSync(report.image.path + '.json', JSON.stringify({contentType: 'generated-art', purpose: 'Private acceptance sample; never default player inventory.', artifact: report.image, job}, null, 2));
  report.passed = true; console.log('Dream Silk real image saved:', dimensions.width, dimensions.height, bytes.length, 'bytes');
} catch (error) {report.job = job; report.passed = false; report.error = String(error); process.exitCode = 1; console.log(report.error);}
finally {mkdirSync('reports/acceptance', {recursive: true}); writeFileSync(reportPath, JSON.stringify(report, null, 2));}

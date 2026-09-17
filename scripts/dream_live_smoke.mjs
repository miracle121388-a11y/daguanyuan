// One explicitly authorized real image call. No provider key or album capability is logged.
import {createServer} from 'node:http';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {createDreamApi} from '../server/dream-api.mjs';
process.loadEnvFile('.env');
const handler = createDreamApi(process.env), server = createServer(async (req, res) => {if (!await handler(req, res)) {res.writeHead(404); res.end();}});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const previous = process.argv.includes('--resume') ? JSON.parse(readFileSync('.local/dream-test-album.json')) : null;
const url = `http://127.0.0.1:${server.address().port}`, owner = previous?.owner || randomBytes(32).toString('hex');
const node = JSON.parse(readFileSync('data/canon/editionCatalog.json')).nodes.find(n => n.id === 'hope-90');
const moment = {editionId: 'guiyou108', chapter: 90, tick: 0, worldId: 'art-acceptance-' + Date.now(), snapshotId: 'opening-hope-90', branch: 'if', trigger: 'story', title: '竹窗雨霁 · 一页新梦', text: node.summary + '\n舞台演绎：黛玉在竹窗前整理诗笺，雨后阳光落在她的手边，她暂且放下心事，轻轻抚平纸角。', time: '雨后午后', placeId: node.place, cast: ['daiyu'], nodeId: node.id, mood: 'warm', framing: 'scene', note: '窗外白海棠含着雨珠，画面温暖、唯美，和已有插画保持同一人物造型。'};
const headers = {'Content-Type': 'application/json', 'X-Dream-Album': owner, Authorization: `Bearer ${process.env.IMAGE_ACCESS_TOKEN || process.env.LLM_ACCESS_TOKEN}`};
const report = {at: new Date().toISOString(), live: true, model: process.env.IMAGE_MODEL, checks: []};
try {
  const response = await fetch(url + '/api/dreams/jobs' + (previous ? '/' + previous.jobId + '/retry' : ''), {method: 'POST', headers, body: JSON.stringify({moment})}), body = await response.json();
  report.submitStatus = response.status; if (![200,202].includes(response.status)) throw Error(body.error || 'Task not submitted');
  let job = body.job; report.jobId = job.id; report.checks.push('real provider job accepted');
  mkdirSync('.local', {recursive: true}); writeFileSync('.local/dream-test-album.json', JSON.stringify({owner, jobId: job.id}));
  const end = Date.now() + 680000;
  while (['queued', 'painting'].includes(job.status) && Date.now() < end) {await new Promise(r => setTimeout(r, 8000)); job = (await (await fetch(url + '/api/dreams/jobs/' + job.id, {headers})).json()).job;}
  report.job = job;
  if (job.status !== 'ready') throw Error(job.error || 'No completed image');
  const image = await fetch(url + '/api/dreams/jobs/' + job.id + '/image', {headers});
  if (!image.ok) throw Error('Generated image unavailable');
  const bytes = Buffer.from(await image.arrayBuffer()); mkdirSync('output/imagegen/dream-live', {recursive: true}); writeFileSync('output/imagegen/dream-live/qwen-first.png', bytes);
  const savedMoment = job.moment;
  const duplicate = await (await fetch(url + '/api/dreams/jobs', {method: 'POST', headers, body: JSON.stringify({moment:savedMoment})})).json();
  if (!duplicate.reused || duplicate.job.id !== job.id) throw Error('Deduplication failed');
  report.checks.push('Qwen generated an actual image', 'same moment reuses the same job with no additional generation'); report.passed = true;
  console.log('Real Qwen image generated and deduplicated:', bytes.length, 'bytes.');
} catch (error) {report.passed = false; report.error = String(error); process.exitCode = 1; console.log('Real image check:', report.error);}
finally {mkdirSync('reports/acceptance', {recursive: true}); writeFileSync('reports/acceptance/dream-live.json', JSON.stringify(report, null, 2)); await new Promise(resolve => server.close(resolve)); await handler.close();}

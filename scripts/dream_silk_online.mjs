// One explicitly authorized online generation; --resume queries its saved ID.
import {request} from 'node:https';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
const host = 'daguanyuan-rumeng.zeabur.app', statePath = '.local/dream-silk-4-online-album.json';
const dns = await (await fetch(`https://dns.google/resolve?name=${host}&type=A`)).json(), ip = dns.Answer.find(answer => answer.type === 1).data;
const token = JSON.parse(readFileSync('.local/dream-online-access.json', 'utf8')).token;
const resume = process.argv.includes('--resume');
if (!resume && !process.argv.includes('--generate')) throw Error('Use --generate once, then --resume.');
if (!resume && existsSync(statePath)) throw Error('Saved online task exists; use --resume.');
const archive = resume ? JSON.parse(readFileSync(statePath, 'utf8')) : {owner: JSON.parse(readFileSync('.local/dream-online-album.json', 'utf8')).owner};
const report = {at: new Date().toISOString(), url: `https://${host}/`, live: true, checks: [], dns: {ip, tlsVerified: true, osChanged: false}};
const hash = value => createHash('sha256').update(value).digest('hex');
const get = (path, body) => new Promise((resolve, reject) => {
  const raw = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
  const req = request(`https://${host}${path}`, {method: raw ? 'POST' : 'GET', headers: {'X-Dream-Album': archive.owner, ...(raw ? {'Content-Type': 'application/json', 'Content-Length': raw.length, Authorization: 'Bearer ' + token} : {})}, lookup: (_host, options, callback) => options.all ? callback(null, [{address: ip, family: 4}]) : callback(null, ip, 4)}, response => {
    const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.on('end', () => resolve({status: response.statusCode, bytes: Buffer.concat(chunks)})); response.on('error', reject);
  });
  req.on('error', reject); req.setTimeout(45000, () => req.destroy(Error('HTTPS request timeout'))); req.end(raw);
});
const check = (ok, label) => {if (!ok) throw Error(label); report.checks.push(label); console.log('PASS ' + label);};
try {
  const config = JSON.parse((await get('/api/dreams/config')).bytes);
    check(config.configured && config.model === 'qwen-image-3.0-pro' && config.styleVersion === 'honglou-silk-v1' && config.promptRevision === 'dream-silk-4', 'production reports current Dream Silk recipe');
  let job;
  if (resume) {
    job = JSON.parse((await get('/api/dreams/jobs/' + archive.jobId)).bytes).job;
    if (job.status === 'failed' && job.resumeAvailable) job = JSON.parse((await get('/api/dreams/jobs/' + job.id + '/retry', {})).bytes).job;
  } else {
    const node = JSON.parse(readFileSync('data/canon/editionCatalog.json', 'utf8')).nodes.find(node => node.id === 'flowers-27');
    const moment = {editionId: 'original80', chapter: node.chapter, tick: 0, worldId: 'story:original80:' + node.id, snapshotId: 'opening:' + node.id, branch: 'main', trigger: 'story', title: node.title, text: node.summary + '\n画面属于本幕的艺术演绎。', time: '日光中', placeId: node.place, cast: [node.focus], nodeId: node.id, mood: 'poetic', framing: 'scene', note: ''};
    const response = await get('/api/dreams/jobs', {moment});
    check(response.status === 202, 'one actual online generation accepted'); job = JSON.parse(response.bytes).job;
    archive.jobId = job.id; writeFileSync(statePath, JSON.stringify(archive));
  }
  report.jobId = job.id;
  const deadline = Date.now() + 680000;
  while (['queued', 'painting'].includes(job.status) && Date.now() < deadline) {await new Promise(done => setTimeout(done, 8000)); job = JSON.parse((await get('/api/dreams/jobs/' + job.id)).bytes).job;}
  report.job = job; if (job.status !== 'ready') throw Error(job.error || 'Image is not ready; use --resume.');
  check(job.cardNo === 'NO.001' && job.styleVersion === 'honglou-silk-v1', 'fixed story node receives stable NO.001 and Dream Silk metadata');
  check(job.referenceSet.inputs.length === 3 && job.submittedParameters.seed === job.seed && job.submittedParameters.negative_prompt === job.negativePrompt, 'real online payload recorded three reference layers, seed and exclusions');
  check(job.scenePlan?.status === 'ready' && job.scenePlan.model === 'deepseek-flash' && !/[\u4e00-\u9fff]/.test(job.prompt) && job.promptSha256 === hash(job.prompt), 'online generation used saved English scene direction from the existing text model');
  const original = await get('/api/dreams/jobs/' + job.id + '/image');
  check(original.status === 200 && hash(original.bytes) === job.imageSha256, 'online private API returns the original verified image');
  const duplicate = JSON.parse((await get('/api/dreams/jobs', {moment: job.moment})).bytes);
  check(duplicate.reused && duplicate.job.id === job.id && job.attempts.length === 1, 'same online recipe reuses one provider submission');
  const legacyId = JSON.parse(readFileSync('.local/dream-online-album.json', 'utf8')).jobId;
  const legacy = JSON.parse((await get('/api/dreams/jobs/' + legacyId)).bytes).job;
  const previous = JSON.parse(readFileSync('reports/acceptance/dream-live-online.json', 'utf8')).job;
  check(legacy.styleVersion === 'legacy' && legacy.imageSha256 === previous.imageSha256 && legacy.promptSha256 === previous.promptSha256 && legacy.attempts.length === previous.attempts.length, 'deployed migration preserves legacy image, prompt and provider submissions');
  mkdirSync('output/imagegen/dream-silk', {recursive: true}); const path = 'output/imagegen/dream-silk/qwen-silk-4-online.png'; writeFileSync(path, original.bytes);
  writeFileSync(path + '.json', JSON.stringify({contentType: 'generated-art', purpose: 'Private production acceptance sample; not default player inventory.', job}, null, 2));
  report.image = {path, bytes: original.bytes.length, sha256: hash(original.bytes)}; report.passed = true;
} catch (error) {report.passed = false; report.error = String(error); process.exitCode = 1; console.log(report.error);}
finally {writeFileSync('reports/acceptance/dream-silk-live-online.json', JSON.stringify(report, null, 2));}

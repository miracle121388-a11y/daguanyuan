// Opt-in live model acceptance: one IF plus two complete ticks (11 small calls).
// Reads only server-side credentials. Reports never contain headers or tokens.
import {chromium} from 'playwright';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.LLM_ACCESS_TOKEN) throw new Error('Set the server-side simulation access token before this opt-in check.');
const base = process.env.APP_URL || 'http://127.0.0.1:4281/';
const output = process.env.MODEL_REPORT_DIR || 'output/playwright/simulation-deepseek-local';
mkdirSync(output, {recursive: true});
const resolveIp = process.env.APP_RESOLVE_IP;
const report = {at: new Date().toISOString(), url: base, dnsOverride: resolveIp ?? null, tlsVerification: new URL(base).protocol === 'https:', checks: [], requests: [], decisions: [], errors: [], screenshots: []};
const browser = await chromium.launch({channel: 'msedge', headless: true, args: resolveIp ? [`--host-resolver-rules=MAP ${new URL(base).hostname} ${resolveIp}`, '--disable-quic'] : []});
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
const key = 'daguanyuan.simulation.v1';
const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const snapshot = journal => journal[journal.active].snapshots[journal[journal.active].cursor];
const check = (condition, label) => { if (!condition) throw new Error(label); report.checks.push(label); };
const shot = async name => { await page.waitForTimeout(800); const path = `${output}/${name}.png`; await page.screenshot({path}); report.screenshots.push(path); };
page.on('pageerror', error => report.errors.push(error.message));
page.on('response', async response => {
  if (!response.url().endsWith('/api/simulation')) return;
  const body = response.request().postDataJSON();
  report.requests.push({operation: body.operation, ...(body.payload?.self?.id ? {agent: body.payload.self.id} : {}), status: response.status()});
  if (body.operation === 'action' && response.status() === 200) { const data = await response.json(); report.decisions.push(data.result); }
});
async function completed(tick) {
  await page.waitForFunction(({key, tick}) => {
    const j = JSON.parse(localStorage.getItem(key) || 'null');
    return j?.[j.active].snapshots[j[j.active].cursor].worldState.tick === tick || !!document.querySelector('.sim-error[role="alert"]');
  }, {key, tick}, {timeout: 180000});
  check(snapshot(await stored()).worldState.tick === tick, `live model completes and saves Tick ${tick}`);
}
try {
  await page.goto(base);
  await page.locator('.canvas-wrap[data-scene-ready="true"]').waitFor({timeout: 90000});
  await page.getByRole('button', {name: '世界推演', exact: true}).click();
  const config = await page.evaluate(async () => (await fetch('/api/simulation/config')).json());
  check(config.configured && config.modelLabel === 'DeepSeek-V4.1-Flash', 'server advertises the configured DeepSeek model without credentials');
  report.modelLabel = config.modelLabel;
  await page.locator('.sim-options > summary').click();
  await page.getByRole('combobox', {name: '决策来源'}).selectOption('remote');
  await page.getByLabel('推演访问口令').fill(process.env.LLM_ACCESS_TOKEN);
  await page.locator('.sim-options').evaluate(el => el.scrollIntoView({block: 'start'}));
  await shot('desktop-model-settings');
  await page.getByRole('button', {name: '创建 IF 世界', exact: true}).click();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.active === 'if' || !!document.querySelector('.sim-error[role="alert"]'), key, {timeout: 40000});
  const fork = await stored();
  check(fork?.active === 'if' && snapshot(fork).worldState.tick === 0, 'real model parses the IF condition without advancing time');
  const world = snapshot(fork).worldState;
  const knowledge = world.agents.baoyu.memories.find(m => m.origin === 'intervention');
  check(!!knowledge && ['daiyu', 'baochai', 'wangxifeng'].every(id => !world.agents[id].memories.some(m => m.knowledgeId && m.knowledgeId === knowledge.knowledgeId)), 'private IF knowledge remains confined to its recipient');
  await page.getByRole('button', {name: '4×', exact: true}).click();
  await page.getByRole('button', {name: '继续故事', exact: true}).click();
  await completed(1);
  check(snapshot(await stored()).provider === config.modelLabel, 'saved snapshot identifies the actual model decision source');
  await page.getByRole('button', {name: '托付与追问', exact: true}).click();
  await page.locator('.sim-request select').first().selectOption('move');
  await page.getByRole('combobox', {name: '前往地点'}).selectOption('qiushuangzhai');
  await page.getByRole('button', {name: '记下托付', exact: true}).click();
  await page.getByRole('button', {name: '继续故事', exact: true}).click();
  await completed(2);
  const final = snapshot(await stored()).worldState;
  check(final.agents.baoyu.location === 'qiushuangzhai' && final.agents.baoyu.spot === 'court', 'model follows the personal request through the existing courtyard route');
  check(!final.directives.some(d => d.agent === 'baoyu'), 'completed request is consumed only after the saved action');
  check(report.requests.length === 11 && report.requests.every(r => r.status === 200), 'one intervention, eight personal decisions and two summaries succeed over real HTTP');
  check(new Set(report.requests.filter(r => r.operation === 'action').map(r => r.agent)).size === 4, 'all four people receive separate model decisions');
  await page.getByRole('button', {name: '托付与追问', exact: true}).click();
  await shot('desktop-model-court');
  await page.setViewportSize({width: 390, height: 844});
  await page.getByRole('button', {name: '展开面板', exact: true}).click();
  await page.locator('.sim-options').evaluate(el => el.scrollIntoView({block: 'start'}));
  await shot('mobile-model-settings');
  check(report.errors.length === 0, 'no browser runtime errors');
  report.final = {tick: final.tick, baoyu: {location: final.agents.baoyu.location, spot: final.agents.baoyu.spot}, provider: snapshot(await stored()).provider};
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = error.message;
  const visible = await page.locator('.sim-error[role="alert"]').allTextContents().catch(() => []);
  report.errors.push(...visible);
  await shot('failure').catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
  let serialized = JSON.stringify(report, null, 2);
  for (const secret of [process.env.LLM_API_KEY, process.env.LLM_ACCESS_TOKEN]) if (secret) serialized = serialized.replaceAll(secret, '[redacted]');
  writeFileSync(`${output}/report.json`, serialized);
  console.log(JSON.stringify({passed: report.passed, checks: report.checks.length, modelRequests: report.requests.length, report: `${output}/report.json`}));
}

import {chooseSpeed} from './ui_navigation.mjs';
// Acceptance through the shipped UI and actual persisted simulation state.
import {chromium} from 'playwright';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
const base = process.env.APP_URL || 'http://127.0.0.1:4291/';
const output = process.env.PARTICIPATION_REPORT_DIR || 'output/playwright/simulation-participation-local';
const live = process.env.PARTICIPATION_MODEL === '1';
if (live && existsSync('.env')) process.loadEnvFile('.env');
if (live && !process.env.LLM_ACCESS_TOKEN) throw new Error('Live model acceptance requires the local server access token.');
mkdirSync(output, {recursive: true});
const ip = process.env.APP_RESOLVE_IP;
const browser = await chromium.launch({channel: process.env.GARDEN_BROWSER_CHANNEL ?? 'chromium', headless: true, args: [...(ip ? [`--host-resolver-rules=MAP ${new URL(base).hostname} ${ip}`, '--disable-quic', '--no-proxy-server'] : []),...(process.env.GARDEN_BROWSER_HTTP1==='1'?['--disable-http2']:[])]});
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
page.setDefaultTimeout(90000);
const report = {revision: 'simulation-participation-20260916-v3', at: new Date().toISOString(), url: base, dnsOverride: ip ?? null, tlsVerification: new URL(base).protocol === 'https:', liveModel: live, checks: [], requests: [], screenshots: [], errors: []};
page.on('pageerror', error => report.errors.push(error.message));
page.on('response', response => { if (response.url().endsWith('/api/simulation')) report.requests.push({operation: response.request().postDataJSON().operation, status: response.status()}); });
const key = 'daguanyuan.simulation.v1';
const journal = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const world = j => j?.[j.active].snapshots[j[j.active].cursor].worldState;
const check = (condition, label) => { if (!condition) throw new Error(label); report.checks.push(label); console.log('PASS ' + label); };
const button = name => page.getByRole('button', {name, exact: true});
const shot = async name => { await page.waitForTimeout(650); const path = `${output}/${name}.png`; await page.screenshot({path}); report.screenshots.push(path); };
const send = async (message, count) => {
  await page.getByLabel(/^想对/).fill(message);
  await button('说给他听').click();
  await page.waitForFunction(({key, count}) => {const j=JSON.parse(localStorage.getItem(key));return j?.[j.active].snapshots[j[j.active].cursor].worldState.conversations?.length === count || !!document.querySelector('.sim-error[role="alert"],.sim-chat-feedback[role="alert"]');}, {key, count}, {timeout: 45000});
  if (live && world(await journal())?.conversations?.length !== count && await page.locator('.sim-chat-feedback').isVisible()) {
    report.recoveredResponses ??= [];
    report.recoveredResponses.push({conversation: count, error: await page.locator('.sim-chat-feedback p').innerText()});
    await button('重试这句话').click();
    await page.waitForFunction(({key, count}) => {const j=JSON.parse(localStorage.getItem(key));return j?.[j.active].snapshots[j[j.active].cursor].worldState.conversations?.length === count || !!document.querySelector('.sim-chat-feedback[role="alert"]');}, {key, count}, {timeout: 45000});
  }
  check(world(await journal())?.conversations?.length === count, `conversation ${count} commits a complete response`);
};
const advance = async tick => {
  await button('继续这场小聚').click();
  await page.waitForFunction(({key, tick}) => {const j=JSON.parse(localStorage.getItem(key));return j[j.active].snapshots[j[j.active].cursor].worldState.tick === tick || !!document.querySelector('.sim-error[role="alert"],.sim-chat-feedback[role="alert"]');}, {key, tick}, {timeout: 180000});
  check(world(await journal()).tick === tick, `gathering saves Tick ${tick} only after scene actions`);
};
try {
  await page.goto(base);
  await page.locator('.canvas-wrap[data-scene-ready="true"]').waitFor();
  await button('世界推演').click();
  await button('交谈入局').click();
  if (live) {
    await page.locator('.sim-options > summary').click();
    await page.getByRole('combobox', {name: '决策来源'}).selectOption('remote');
    await page.getByLabel('推演访问口令').fill(process.env.LLM_ACCESS_TOKEN);
    await page.locator('.sim-options > summary').click();
  }
  await page.getByRole('combobox', {name: '语气', exact: true}).selectOption('comfort');
  await page.getByLabel(/^想对/).fill('园中风轻，你若有牵挂，我愿听你慢慢说。');
  await page.locator('.sim-chat-form').scrollIntoViewIfNeeded(); await shot('desktop-compose');
  await send('园中风轻，你若有牵挂，我愿听你慢慢说。', 1);
  const first = world(await journal());
  check(first.tick === 0 && first.agents.baoyu.mood.calm === 75, 'conversation changes the bounded state without advancing time');
  await send('我刚才说愿意听你说话，你还记得吗？', 2);
  check(world(await journal()).agents.baoyu.mood.calm === 75, 'repeated conversation cannot farm mood in the same tick');
  check(world(await journal()).conversations.at(-1).provider === (live ? 'DeepSeek-V4.1-Flash' : '本地规则'), 'reply source is accurately persisted');
  await page.locator('.sim-chat-transcript article').last().evaluate(el => el.scrollIntoView({block: 'start'}));
  await shot('desktop-chat');
  await page.getByRole('group', {name: '选择交谈人物'}).getByRole('button', {name: '林黛玉'}).click();
  check(await page.locator('.sim-chat-transcript article').count() === 0, 'switching people keeps their conversation histories separate');
  await page.getByRole('group', {name: '选择交谈人物'}).getByRole('button', {name: '贾宝玉'}).click();
  if (live) {
    check(report.requests.filter(r => r.operation === 'conversation' && r.status === 200).length === 2, 'two real DeepSeek conversation calls complete through the UI');
  } else {
    await button('临场抉择').click();
    await page.locator('.sim-choice-list').scrollIntoViewIfNeeded(); await shot('desktop-choices');
    await button('从此刻另开一线').click();
    const mainBefore = JSON.stringify((await journal()).main);
    await page.locator('.sim-choice-list button').first().click();
    check(world(await journal()).directives.some(d => d.agent === 'baoyu' && d.kind === 'write'), 'choice queues a real writing request');
    check(JSON.stringify((await journal()).main) === mainBefore, 'choice leaves the original main branch unchanged');
    await page.locator('.sim-choice-outcome').scrollIntoViewIfNeeded(); await shot('desktop-choice');
    await button('回到选择之前').click();
    check(!world(await journal()).directives.some(d => d.agent === 'baoyu'), 'restoring the moment removes the later choice and pending request');
    await button('世界推演').click();
    await button('入局互动').click();
    await button('邀人小聚').click();
    await page.getByLabel('薛宝钗', {exact: true}).check(); await page.getByLabel('王熙凤', {exact: true}).check();
    await button('发出邀请').click();
    check(world(await journal()).gathering.participants.length === 4, 'invitation includes all four selected people');
    await page.locator('.sim-gathering-status').scrollIntoViewIfNeeded(); await shot('desktop-invitation');
    await chooseSpeed(page, '4×');
    await advance(1);
    const arrived = world(await journal());
    check(arrived.gathering.status === 'pending' && Object.values(arrived.agents).every(a => a.location === 'qiushuangzhai' && a.spot === 'court'), 'all four walk into the existing modeled courtyard before the gathering completes');
    check(arrived.agents.baoyu.relationships.daiyu.trust === 68, 'arrival alone awards no shared trust');
    await advance(2);
    const completed = world(await journal());
    check(completed.gathering.status === 'completed' && completed.agents.baoyu.relationships.daiyu.trust === 70, 'shared writing produces durable memories and bounded trust');
    await page.locator('.sim-gathering-status').scrollIntoViewIfNeeded(); await shot('desktop-gathering');
  }
  await page.setViewportSize({width: 390, height: 844});
  await button('展开面板').click();
  await button('与他交谈').click();
  await page.locator('.sim-chat-transcript article').last().evaluate(el => el.scrollIntoView({block: 'start'})); await shot('mobile-reply');
  await page.getByLabel(/^想对/).fill('这里的景致可入诗？');
  await page.locator('.sim-chat-form').scrollIntoViewIfNeeded(); await shot('mobile-chat');
  for (const width of [390, 320]) {
    await page.setViewportSize({width, height: width === 320 ? 740 : 844});
    await page.locator('.sim-chat-form').scrollIntoViewIfNeeded();
    const bounds = await page.evaluate(() => ({doc: document.documentElement.scrollWidth, width: innerWidth, panel: document.querySelector('.sim-scroll').scrollWidth, client: document.querySelector('.sim-scroll').clientWidth, font: parseFloat(getComputedStyle(document.querySelector('#sim-chat-message')).fontSize), garden: document.querySelector('.garden-main').getBoundingClientRect().height}));
    check(bounds.doc <= bounds.width && bounds.panel <= bounds.client + 1, `${width}px has no document or handbook horizontal overflow`);
    check(bounds.font >= 16 && bounds.garden >= 180, `${width}px keeps readable inputs and a visible modeled garden`);
    if (width === 320) await shot('phone-320-chat');
  }
  if (live) {
    await page.setViewportSize({width: 390, height: 844});
    await page.locator('.sim-options > summary').click();
    await page.getByRole('combobox', {name: '决策来源'}).selectOption('mock');
    await page.locator('.sim-options > summary').click();
    for (let count = 3; count <= 6; count++) await send(`你还记得方才说过的事吗？这是第${count}问。`, count);
    await page.locator('.sim-chat-earlier > summary').click();
    const earlier = page.locator('.sim-chat-earlier');
    const sources = await earlier.locator('.sim-chat-reply > span').allTextContents();
    check(sources.some(s => s.includes('DeepSeek')) && sources.some(s => s.includes('本地规则')), 'expanded history preserves mixed provider attribution');
    check(await earlier.locator('.sim-chat-reply small').count() === 3 && await earlier.locator('.sim-chat-reply details').count() >= 1, 'expanded history preserves every outcome and memory disclosures');
    await earlier.locator('.sim-chat-reply details > summary').last().click();
    await earlier.locator('.sim-chat-entry').last().evaluate(el => el.scrollIntoView({block: 'start'})); await shot('mobile-earlier-evidence');
    await page.locator('.sim-options > summary').click();
    await page.getByRole('combobox', {name: '决策来源'}).selectOption('remote');
    await page.getByLabel('推演访问口令').fill('invalid-access-fixture');
    await page.locator('.sim-options > summary').click();
    const draft = '这句话失败或取消时，请保留在输入框。';
    await page.getByLabel(/^想对/).fill(draft); await button('说给他听').click();
    await page.locator('.sim-chat-feedback').waitFor();
    await page.locator('.sim-chat-feedback').scrollIntoViewIfNeeded();
    check(await page.getByLabel(/^想对/).inputValue() === draft, 'a rejected conversation preserves the draft');
    check(await page.locator('[role="alert"]').count() === 1 && await button('重试这句话').isVisible(), 'one visible error announcement and recovery action sit beside the mobile composer');
    check(world(await journal()).conversations.length === 6, 'authorization failure writes no conversation');
    await shot('mobile-conversation-error');
    let delayedCalls = 0;
    // A bounded delayed fixture exercises cancellation; it never reaches upstream.
    await page.route('**/api/simulation', async route => {
      delayedCalls++;
      await new Promise(resolve => setTimeout(resolve, 3000));
      await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({result: {reply: 'Cancellation test fixture: this late result must not save.', evidenceIds: []}})}).catch(() => {});
    });
    await button('重试这句话').click(); await button('取消这次交谈').waitFor();
    await button('取消这次交谈').scrollIntoViewIfNeeded(); await shot('mobile-conversation-busy');
    await button('取消这次交谈').click();
    await page.unroute('**/api/simulation');
    await page.getByText('这次交谈已取消，未写入存档。输入仍可修改后重试。', {exact: true}).waitFor({timeout: 10000});
    await page.waitForTimeout(3500);
    check(delayedCalls === 1, 'cancelling does not resubmit the conversation form');
    check(await page.getByLabel(/^想对/).inputValue() === draft && world(await journal()).conversations.length === 6, 'cancellation is reachable beside the composer and retains the unsent draft');
    await page.locator('.sim-chat-feedback').scrollIntoViewIfNeeded(); await shot('mobile-conversation-cancelled');
    await button('临场抉择').click(); await button('与他交谈').click();
    check(await page.getByLabel(/^想对/).inputValue() === draft, 'unsent conversation survives switching participation modes');
    report.failureFixture = {authorization: 'real server rejection with deliberately invalid access token', cancellation: 'browser-delayed request, never sent to model'};
  }
  if (!live) {
    await button('邀人小聚').click(); await page.locator('.sim-gathering-status').scrollIntoViewIfNeeded(); await shot('phone-320-gathering');
    await page.reload(); await page.locator('.canvas-wrap[data-scene-ready="true"]').waitFor(); await button('世界推演').click();
    const restored = world(await journal());
    check(restored.tick === 2 && restored.gathering.status === 'completed' && restored.conversations.length === 2, 'reload restores conversations, moments and completed gathering together');
  }
  check(report.errors.length === 0, 'no browser runtime errors');
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = error.message;
  report.errors.push(...await page.locator('.sim-error[role="alert"],.sim-chat-feedback[role="alert"]').allTextContents().catch(() => []));
  await shot('failure').catch(() => {}); process.exitCode = 1;
} finally {
  await browser.close();
  let serialized = JSON.stringify(report, null, 2);
  for (const secret of [process.env.LLM_API_KEY, process.env.LLM_ACCESS_TOKEN]) if (secret) serialized = serialized.replaceAll(secret, '[redacted]');
  writeFileSync(`${output}/report.json`, serialized); console.log(serialized);
}

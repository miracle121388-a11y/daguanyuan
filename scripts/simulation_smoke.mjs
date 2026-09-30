import {recordAction, chooseSpeed, cameraAction, inspectPerson} from './ui_navigation.mjs';
// Browser acceptance against the actual app. Run after starting Vite or npm start.
import {chromium} from 'playwright';
import {mkdirSync, writeFileSync} from 'node:fs';
const base = process.env.APP_URL || 'http://127.0.0.1:5173/';
const output = process.env.SIM_REPORT_DIR || 'output/playwright/simulation';
mkdirSync(output, {recursive: true});
const software = process.env.SIM_SOFTWARE !== '0';
const resolveIp = process.env.APP_RESOLVE_IP;
const report = {renderer: software ? 'Chromium / ANGLE SwiftShader (software)' : 'Chromium / default renderer', at: new Date().toISOString(), url: base, dnsOverride: resolveIp ?? null, tlsVerification: new URL(base).protocol === 'https:', checks: [], errors: [], failedRequests: [], screenshots: []};
const assert = (condition, label) => { if (!condition) throw new Error(label); report.checks.push(label); };
// Optional test-browser DNS override only; TLS checks remain enabled.
const args = [...(software ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), ...(resolveIp ? [`--host-resolver-rules=MAP ${new URL(base).hostname} ${resolveIp}`, '--disable-quic', '--no-proxy-server'] : []), ...(process.env.GARDEN_BROWSER_HTTP1==='1'?['--disable-http2']:[])];
const browser = await chromium.launch({channel: process.env.GARDEN_BROWSER_CHANNEL ?? 'chromium', headless: true, args});
const key = 'daguanyuan.simulation.v1';
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const current = journal => journal[journal.active].snapshots[journal[journal.active].cursor].worldState;
const screenshot = async (page, name) => { await page.waitForTimeout(800); const path = `${output}/${name}.png`; await page.screenshot({path}); report.screenshots.push(path); };
async function start(options) {
  const page = await browser.newPage(options);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.failedRequests.push({url: response.url(), status: response.status()}); });
  await page.goto(base);
  await page.locator('.canvas-wrap[data-scene-ready="true"]').waitFor({timeout: 90000});
  await page.waitForTimeout(2000);
  if (await page.getByRole('button', {name: '重新加载三维场景', exact: true}).isVisible()) {
    report.checks.push('WebGL context loss surfaced with a recovery action');
    await page.getByRole('button', {name: '重新加载三维场景', exact: true}).click();
    await page.locator('.canvas-wrap[data-scene-ready="true"]').waitFor({timeout: 90000});
    report.checks.push('scene recovered using the light preset');
  }
  await page.getByRole('button', {name: '世界推演', exact: true}).click();
  await page.getByRole('heading', {name: '世界推演', exact: true}).waitFor();
  await page.getByRole('button', {name: '继续故事', exact: true}).waitFor();
  if (['2','4'].includes(process.env.SIM_PLAYBACK_RATE)) await chooseSpeed(page, process.env.SIM_PLAYBACK_RATE+'×');
  await page.waitForTimeout(900);
  return page;
}
async function tick(page, target) {
  await page.getByRole('button', {name: '继续故事', exact: true}).click();
  await page.getByText(`故事已记至第 ${target} 步`, {exact: true}).waitFor({timeout: 120000});
}
try {
  const page = await start({viewport: {width: 1440, height: 900}});
  await screenshot(page, 'desktop-initial');
  await page.getByRole('button', {name: 'IF 世界', exact: true}).click();
  assert(await page.locator('textarea').inputValue() === '如果宝玉提前知道贾府准备让他迎娶薛宝钗，会发生什么？', 'required IF example is available');
  await page.getByRole('button', {name: '创建 IF 世界', exact: true}).click();
  await page.getByRole('button', {name: 'IF 世界', exact: true}).filter({has: page.locator('svg')}).waitFor();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.active === 'if', key);
  const forked = await stored(page);
  assert(current(forked).tick === 0 && current(forked).agents.baoyu.location === 'yihongyuan', 'IF changes knowledge without advancing time or moving a character');
  assert(!JSON.stringify(current(forked).agents.daiyu.memories).includes('迎娶'), 'Daiyu does not know the private IF condition');
  await page.getByRole('button', {name: '继续故事', exact: true}).click();
  await page.locator('.sim-person-label[data-agent="baoyu"] small').filter({hasText: '行走'}).waitFor({timeout: 10000});
  const hooks = await page.evaluate(() => !!window.__simulationTest);
  if (hooks) {
    const startPosition = await page.evaluate(() => window.__simulationTest.positions().baoyu);
    await page.waitForFunction(start => { const now = window.__simulationTest.positions().baoyu; return Math.hypot(...now.map((v, i) => v - start[i])) > 5; }, startPosition);
    const motion = await page.evaluate(() => ({position: window.__simulationTest.positions().baoyu, world: window.__simulationTest.world().agents.baoyu.location}));
    assert(motion.world === 'yihongyuan', 'scene traverses the road before logical arrival');
    report.movingPosition = motion.position;
  }
  await page.getByRole('button', {name: '暂停', exact: true}).click();
  const paused = hooks ? await page.evaluate(() => window.__simulationTest.positions().baoyu) : null;
  await screenshot(page, 'desktop-moving-paused');
  if (hooks) {
    // Wait through multiple rendered frames, then verify the same live mesh.
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 350)));
    assert(JSON.stringify(paused) === JSON.stringify(await page.evaluate(() => window.__simulationTest.positions().baoyu)), 'pause freezes the actual 3D character');
  }
  await page.getByRole('button', {name: '继续本步', exact: true}).click();
  await page.getByText('故事已记至第 1 步', {exact: true}).waitFor({timeout: 120000});
  assert(current(await stored(page)).agents.baoyu.location === 'xiaoxiangguan', 'Baoyu arrives in Xiaoxiangguan');
  await page.getByRole('button', {name: '继续故事', exact: true}).click();
  await page.locator('.sim-speech').filter({hasText: '迎娶'}).waitFor({timeout: 20000});
  await screenshot(page, 'desktop-dialogue');
  await page.getByText('故事已记至第 2 步', {exact: true}).waitFor({timeout: 120000});
  const second = await stored(page);
  for (const id of ['baoyu', 'daiyu']) assert(current(second).agents[id].memories.some(m => m.type === 'interaction' && m.content.includes('迎娶')), `${id} stores the conversation in personal memory`);
  assert(!JSON.stringify(second.main).includes('迎娶'), 'the original main world stays isolated');
  await recordAction(page, '人物心迹');
  await page.locator('.sim-person-tabs').getByRole('button', {name: '林黛玉', exact: true}).click();
  await page.locator('.sim-memories').scrollIntoViewIfNeeded();
  await screenshot(page, 'desktop-memory');
  await recordAction(page, '时间快照');
  await page.locator('.sim-history li').first().getByRole('button', {name: '恢复', exact: true}).click();
  assert(current(await stored(page)).tick === 0, 'snapshot restoration restores tick zero');
  if (hooks) {
    await page.waitForFunction(() => {
      const expected = window.__simulationTest.world().agents.baoyu.position, actual = window.__simulationTest.positions().baoyu;
      return JSON.stringify(expected) === JSON.stringify(actual);
    });
    report.checks.push('restoration also resets the rendered character position');
  }
  await page.getByRole('button', {name: '世界推演', exact: true}).click();
  await tick(page, 1);
  assert(current(await stored(page)).agents.baoyu.location === 'yihongyuan', 'main-world behavior differs from IF behavior');
  await page.getByRole('button', {name: '自动运行', exact: true}).click();
  await page.waitForFunction(key => {const journal=JSON.parse(localStorage.getItem(key));return journal.main.snapshots.at(-1).worldState.tick>=2},key,{timeout:120000});
  await page.getByRole('button', {name: '停止自动', exact: true}).click();
  assert(current(await stored(page)).tick === 2, 'automatic mode completes a tick and can be stopped between ticks');
  await page.reload();
  await page.locator('.canvas-wrap[data-scene-ready="true"]').waitFor({timeout: 90000});
  if(await page.getByRole('button', {name: '重新加载三维场景', exact: true}).isVisible()){await page.getByRole('button', {name: '重新加载三维场景', exact: true}).click();await page.locator('.canvas-wrap[data-scene-ready="true"]').waitFor({timeout:90000});}
  await page.getByRole('button', {name: '世界推演', exact: true}).click();
  assert(current(await stored(page)).tick === 2, 'completed snapshots survive page reload');
  await page.getByRole('button', {name: 'IF 世界', exact: true}).click();
  await page.getByRole('button', {name: '继续故事', exact: true}).click();
  await page.getByRole('button', {name: '撤销本步', exact: true}).click();
  await page.getByText('本步已取消，人物与状态已回到上一个完整快照。', {exact: true}).waitFor();
  assert(current(await stored(page)).tick === 0, 'cancel rolls back to the complete IF snapshot');
  // Scene-linked player agency and evidence-based worldlines.
  await page.getByRole('button', {name: '关闭推演提示', exact: true}).click();
  await recordAction(page, '人物心迹');
  await page.locator('.sim-person-tabs').getByRole('button', {name: '贾宝玉', exact: true}).click();
  await page.locator('.sim-request select').nth(1).selectOption('qiushuangzhai');
  await page.getByRole('button', {name: '记下托付', exact: true}).click();
  assert(current(await stored(page)).tick === 0 && current(await stored(page)).directives[0].target === 'qiushuangzhai', 'player request is saved pending without moving or advancing time');
  await chooseSpeed(page, '4×');
  await tick(page, 1);
  let staged = current(await stored(page)).agents.baoyu;
  assert(staged.location === 'qiushuangzhai' && staged.spot === 'court', 'player-directed movement reaches the existing Qiushuangzhai court');
  assert(current(await stored(page)).directives.length === 0, 'completed request is consumed exactly once');
  await cameraAction(page, '临场');
  await page.locator('.sim-request select').first().selectOption('read');
  await page.getByRole('button', {name: '记下托付', exact: true}).click();
  await tick(page, 2);
  assert(current(await stored(page)).agents.baoyu.currentAction.action === 'read', 'court arrival can continue into a requested reading activity');
  await page.getByRole('button', {name: '你听说了什么？', exact: true}).click();
  assert((await page.locator('.sim-answer').innerText()).includes('迎娶'), 'interview returns the selected person’s known message with memory evidence');
  await page.locator('.sim-answer').scrollIntoViewIfNeeded();
  await screenshot(page, 'desktop-interaction');
  await page.getByRole('button', {name: '入园沉浸', exact: true}).click();
  assert(!(await page.locator('.simulation-panel').isVisible()), 'immersive view hides the notebook and keeps scene controls');
  await page.getByRole('button', {name: '下一刻', exact: true}).waitFor();
  await screenshot(page, 'desktop-court-immersive');
  assert(await page.evaluate(() => Math.abs(document.querySelector('canvas').getBoundingClientRect().width - document.querySelector('#garden-main').getBoundingClientRect().width) < 2), 'immersive canvas resizes across the full garden workspace');
  await page.getByRole('button', {name: '打开推演手记', exact: true}).click();
  for (let target = 3; target <= 4; target++) await tick(page, target);
  await recordAction(page, '消息流转');
  assert(await page.locator('.sim-flow-events li').count() >= 1, 'message graph contains only completed knowledge dialogue');
  await page.locator('.sim-flow').scrollIntoViewIfNeeded();
  await screenshot(page, 'desktop-message-flow');
  assert((await page.locator('.sim-flow .sim-export svg').boundingBox()).width <= 20, 'message report export keeps its icon and label readable');
  const downloadReady = page.waitForEvent('download');
  await page.getByRole('button', {name: '导出有事件依据的推演纪要', exact: true}).click();
  const download = await downloadReady; await download.saveAs(`${output}/evidence-report.md`);
  assert(download.suggestedFilename().endsWith('.md'), 'evidence report downloads as Markdown');
  await recordAction(page, '时间快照');
  await page.locator('.sim-history li').filter({hasText: 'Tick 2'}).getByRole('button', {name: '恢复', exact: true}).click();
  await recordAction(page, '世界线');
  assert((await page.locator('.sim-comparison-time').innerText()).includes('Tick 2'), 'world comparison uses main and IF snapshots at exactly the same tick');
  await page.locator('.sim-worldlines').scrollIntoViewIfNeeded();
  await screenshot(page, 'desktop-world-comparison');
  const preservedUid = (await stored(page)).if.uid;
  await page.getByRole('button', {name: '园中纪事', exact: true}).click();
  await page.getByRole('button', {name: '新建假设', exact: true}).click();
  await page.locator('.sim-examples-disclosure > summary').click();
  await page.getByRole('button', {name: '黛玉静养', exact: true}).click();
  await page.getByRole('button', {name: '创建新的 IF 世界', exact: true}).click();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).archives.length === 1, key);
  assert((await stored(page)).archives[0].branch.uid === preservedUid, 'creating another IF preserves the old world and future snapshots');
  await recordAction(page, '世界线');
  await page.getByRole('button', {name: '恢复这条世界线', exact: true}).click();
  assert((await stored(page)).if.uid === preservedUid && (await stored(page)).archives.length === 1, 'restoring an archived world swaps both branches without loss');
  report.style = await page.evaluate(() => {
    const panel = document.querySelector('.simulation-panel'), note = document.querySelector('.sim-note');
    return {panel: getComputedStyle(panel).backgroundColor, muted: getComputedStyle(note).color, font: getComputedStyle(note).fontSize, focus: getComputedStyle(panel).getPropertyValue('--text')};
  });
  await page.getByRole('button', {name: '园林漫游', exact: true}).click();
  assert(await page.getByRole('button', {name: '开始游园', exact: true}).isVisible(), 'original garden touring remains available');
  await page.close();

  const mobile = await start({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, deviceScaleFactor: 1});
  const measure = () => mobile.evaluate(() => ({width: innerWidth, scroll: document.documentElement.scrollWidth, scene: document.querySelector('canvas').getBoundingClientRect().height, panel: document.querySelector('.simulation-panel').getBoundingClientRect().height}));
  let dimensions = await measure();
  assert(dimensions.width === dimensions.scroll && dimensions.scene >= 180 && dimensions.panel >= 250, '390px mobile keeps the scene visible without horizontal overflow');
  await screenshot(mobile, 'mobile-initial');
  await mobile.getByRole('button', {name: 'IF 世界', exact: true}).click();
  await mobile.getByRole('button', {name: '创建 IF 世界', exact: true}).click();
  await mobile.waitForFunction(key => JSON.parse(localStorage.getItem(key) || 'null')?.active === 'if', key);
  await mobile.getByRole('button', {name: '继续故事', exact: true}).click();
  await mobile.getByText('故事已记至第 1 步', {exact: true}).waitFor({timeout: 120000});
  await tick(mobile, 2);
  assert(current(await stored(mobile)).agents.daiyu.memories.some(m => m.type === 'interaction' && m.content.includes('迎娶')), 'mobile scene executes the full IF → walk → dialogue chain');
  await recordAction(mobile, '人物心迹');
  await mobile.getByRole('button', {name: '展开面板', exact: true}).click();
  await mobile.locator('.sim-person-tabs').getByRole('button', {name: '林黛玉', exact: true}).click();
  await mobile.locator('.sim-memories li').filter({hasText: '迎娶'}).first().scrollIntoViewIfNeeded();
  await mobile.waitForTimeout(900);
  await screenshot(mobile, 'mobile-memory');
  await mobile.setViewportSize({width: 320, height: 740});
  dimensions = await measure();
  assert(dimensions.width === dimensions.scroll, '320px screen has no horizontal overflow');
  await mobile.waitForTimeout(900);
  await screenshot(mobile, 'mobile-320');
  await mobile.getByRole('button', {name: '入园沉浸', exact: true}).click();
  await cameraAction(mobile, '临场');
  assert(!(await mobile.locator('.simulation-panel').isVisible()), '320px immersive mode gives the full workspace to the garden');
  assert(await mobile.getByRole('button', {name: '下一刻', exact: true}).isVisible(), 'mobile immersive mode keeps next-step and pause controls within reach');
  await mobile.waitForTimeout(500);
  await screenshot(mobile, 'mobile-320-immersive');
  await mobile.getByRole('button', {name: '打开推演手记', exact: true}).click();
  await inspectPerson(mobile);
  await mobile.locator('.sim-request').scrollIntoViewIfNeeded();
  await screenshot(mobile, 'mobile-320-request');
  assert((await measure()).width === (await measure()).scroll, 'mobile request form does not overflow');
  await mobile.close();
  const linear = c => (c/=255) <= .04045 ? c/12.92 : ((c+.055)/1.055)**2.4;
  const lum = rgb => rgb.match(/[0-9]+/g).slice(0,3).map(Number).map(linear).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
  const foreground=lum(report.style.muted),background=lum(report.style.panel);
  report.mutedContrast = (Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);
  assert(report.mutedContrast >= 4.5, 'secondary reading text meets 4.5:1 contrast against the actual panel');
  assert(report.errors.length === 0, 'no browser runtime errors');
  assert(report.failedRequests.length === 0, 'no failed resource or API requests');
  report.status = 'passed';
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = 'failed'; report.failure = error.stack;
  console.error(error);
  for (const context of browser.contexts()) for (const page of context.pages()) await screenshot(page, 'failure').catch(() => {});
  process.exitCode = 1;
} finally {
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}

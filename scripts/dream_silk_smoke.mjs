import {toolAction} from './ui_navigation.mjs';
// Reads two actual acceptance images. All browser POSTs are blocked: no paid calls.
import {chromium} from 'playwright';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {request as httpsRequest} from 'node:https';
const base = process.env.APP_URL || 'http://127.0.0.1:4291/';
const output = process.env.DREAM_REPORT_DIR || '.impeccable/review/dream-silk-final';
const albumFile = process.env.DREAM_ALBUM_FILE || '.local/dream-silk-4-album.json';
const privateAlbum = JSON.parse(readFileSync(albumFile, 'utf8'));
const live = JSON.parse(readFileSync(process.env.DREAM_LIVE_REPORT || 'reports/acceptance/dream-silk-live.json', 'utf8'));
if (!live.passed) throw Error('An actual completed Dream Silk sample is required.');
const report = {version: 'honglou-silk-20260917-v6', at: new Date().toISOString(), url: base, checks: [], screenshots: [], errors: [], blockedPosts: 0, liveGenerationCalls: 0, galleryScope: 'Actual current trial and legacy artwork; rejected trial excluded by the test-only list filter, retained on server.'};
mkdirSync(output, {recursive: true});
const ip = process.env.APP_RESOLVE_IP;
const browser = await chromium.launch({channel: 'msedge', headless: true, args: ip ? [`--host-resolver-rules=MAP ${new URL(base).hostname} ${ip}`, '--disable-quic'] : []});
const context = await browser.newContext({viewport: {width: 1440, height: 900}, acceptDownloads: true});
await context.addInitScript(({owner}) => localStorage.setItem('daguanyuan.dream-owner.v1', owner), privateAlbum);
const page = await context.newPage(); page.setDefaultTimeout(30000);
page.on('pageerror', error => report.errors.push(error.message));
await page.route('**/api/dreams/jobs**', async route => {
  if (route.request().method() === 'POST') {report.blockedPosts++; return route.fulfill({status: 409, json: {error: '浏览器验收不提交生图。'}});}
  if (new URL(route.request().url()).pathname === '/api/dreams/jobs') {
    try {
      // Playwright's Node-side route.fetch does not inherit Chromium DNS rules.
      // Pin only this read to the same supplied public IP, with TLS still on.
      const body = ip ? await new Promise((resolve, reject) => {
        const req = httpsRequest(new URL('/api/dreams/jobs', base), {headers: {'X-Dream-Album': privateAlbum.owner}, lookup: (_host, options, callback) => options.all ? callback(null, [{address: ip, family: 4}]) : callback(null, ip, 4)}, response => {
          const chunks = []; let size = 0;
          response.on('data', chunk => {size += chunk.length; if (size > 8 * 1048576) req.destroy(Error('Album response too large')); else chunks.push(chunk);});
          response.on('end', () => {try {if (response.statusCode !== 200) throw Error(); resolve(JSON.parse(Buffer.concat(chunks)));} catch {reject(Error('Album response unavailable'));}});
          response.on('error', () => reject(Error('Album HTTPS read failed')));
        });
        req.on('error', () => reject(Error('Album HTTPS read failed'))); req.setTimeout(45000, () => req.destroy(Error('Album HTTPS timeout'))); req.end();
      }) : await (await route.fetch()).json();
      return route.fulfill({status: 200, json: {...body, jobs: body.jobs.filter(job => job.id === live.jobId || !job.styleVersion || job.styleVersion === 'legacy')}});
    } catch {
      report.errors.push('Acceptance album could not be read; request headers suppressed.');
      return route.fulfill({status: 502, json: {error: '验收画册暂不可读。'}});
    }
  }
  return route.continue();
});
const check = (ok, label) => {if (!ok) throw Error(label); report.checks.push(label); console.log('PASS ' + label);};
const button = name => page.getByRole('button', {name, exact: true});
const album = () => page.locator('.dream-album'), workshop = () => page.locator('.dream-workshop'), comic = () => page.locator('.motion-comic');
const silk = () => page.locator('.dream-painting[data-style-version="honglou-silk-v1"]');
const legacy = () => page.locator('.dream-painting[data-style-version="legacy"]');
const fits = loc => loc.evaluate(e => e.scrollWidth <= e.clientWidth + 1 && e.getBoundingClientRect().right <= innerWidth + 1);
const wholePainting = () => comic().evaluate(e => {
  const art = e.querySelector('.comic-art'), img = art.querySelector('img'), narration = e.querySelector('.comic-bottom');
  return e.classList.contains('is-whole-painting') && getComputedStyle(img).objectFit === 'contain' && getComputedStyle(e.querySelector('.comic-shade')).display === 'none' && art.getBoundingClientRect().bottom <= narration.getBoundingClientRect().top + 1 && art.clientHeight >= 180;
});
async function shot(name) {
  await page.evaluate(async () => {await document.fonts.ready; await Promise.all([...document.querySelectorAll('dialog[open] img, .motion-comic img')].map(img => img.decode().catch(() => {})));});
  const path = `${output}/${name}.png`; await page.screenshot({path, fullPage: true, animations: 'disabled'}); report.screenshots.push(path);
}
async function openAlbum() {await toolAction(page, '剧情画卷'); await page.locator('.story-dream-tools .dream-entry').click(); await silk().locator('img').waitFor();}
try {
  await page.goto(base); await page.locator('.workspace-more > summary').waitFor(); await openAlbum();
  await page.waitForFunction(() => [...document.querySelectorAll('.dream-picture img')].filter(img => img.naturalWidth === 1536).length >= 2);
  check(await silk().count() === 1 && await legacy().count() >= 1, 'real new and legacy artwork coexist in one album');
  check(await silk().getByLabel('收藏编号').textContent() === live.job.cardNo, 'new artwork displays its persisted collection number');
  check((await legacy().textContent()).includes('原画风') && !(await legacy().textContent()).includes('梦绢'), 'old artwork keeps its original style identity');
  check((await silk().textContent()).includes('梦绢 · 剧情新绘'), 'Dream Silk label is visible under the title');
  await shot('desktop-album');
  await silk().getByText('回看这一刻', {exact: true}).click();
  await silk().locator('.dream-colophon').scrollIntoViewIfNeeded();
  check((await silk().locator('.dream-colophon').textContent()).includes('honglou-silk-v1'), 'expanded provenance shows the style version and reference roles');
  await shot('desktop-provenance');
  const downloadReady = page.waitForEvent('download'); await silk().getByRole('button', {name: '剧情记录', exact: true}).click();
  const download = await downloadReady, record = JSON.parse(readFileSync(await download.path(), 'utf8'));
  check(record.job.seed === live.job.seed && record.job.negativePrompt === live.job.negativePrompt && record.job.referenceSet.inputs.length === 3 && record.job.promptSections.length === 8, 'download preserves seed, exclusions, eight sections and all three reference layers');
  check(record.job.imageSha256 === live.job.imageSha256 && record.job.promptSha256 === live.job.promptSha256 && (!live.job.scenePlan || record.job.scenePlan?.contentSha256 === live.job.scenePlan.contentSha256), 'download is tied to the exact real image, prompt and saved scene direction');
  check(download.suggestedFilename().startsWith('大观园-' + live.job.cardNo), 'download filename includes the stable catalog number');
  const originalReady = page.waitForEvent('download'); await silk().getByRole('button', {name: '原图', exact: true}).click();
  const original = await originalReady;
  check(createHash('sha256').update(readFileSync(await original.path())).digest('hex') === live.job.imageSha256, 'original-image download is byte-identical');
  await silk().getByRole('button', {name: '珍藏画作', exact: true}).click();
  await silk().getByRole('button', {name: '取消珍藏', exact: true}).waitFor();
  await page.reload(); await page.locator('.workspace-more > summary').waitFor(); await openAlbum();
  await silk().getByRole('button', {name: '取消珍藏', exact: true}).waitFor();
  check(await silk().getByLabel('收藏编号').textContent() === live.job.cardNo, 'favorite, image and catalog metadata survive IndexedDB reload');
  check(await page.locator('.dream-painting').first().getAttribute('data-style-version') === 'honglou-silk-v1', 'newest artwork remains first after a full reload');
  await silk().locator('.dream-picture').click(); await comic().locator('img').waitFor(); await button('暂停漫画').click();
  check((await comic().textContent()).includes(live.job.cardNo) && (await comic().textContent()).includes('梦绢'), 'dynamic comic carries the artwork number and style');
  check(await wholePainting(), 'desktop opening shot preserves the whole action outside the narration');
  await shot('desktop-comic');
  await button('下一镜').click(); check(await comic().getByRole('button', {name: '第2镜：心事'}).getAttribute('aria-pressed') === 'true', 'generated artwork retains manual shot navigation');
  await page.keyboard.press('Escape');
  await page.setViewportSize({width: 390, height: 844}); await album().evaluate(e => e.scrollTop = 0); await shot('mobile-album');
  check(await fits(album()), '390px album has no horizontal overflow');
  await silk().locator('.dream-picture').click(); await button('暂停漫画').click(); await shot('mobile-comic');
  check(await wholePainting(), '390px opening shot preserves hands and props without cropping or shade');
  check(await fits(comic()), '390px comic fits with the new catalog metadata');
  await page.setViewportSize({width: 320, height: 720}); await shot('compact-comic');
  check(await wholePainting(), '320px opening shot preserves the whole painting above the controls');
  check(await fits(comic()), '320px comic remains inside the viewport');
  check(await button('下一镜').evaluate(e => {const b = e.getBoundingClientRect(); return b.width >= 44 && b.height >= 44 && b.right <= innerWidth;}), 'compact comic controls remain touch sized');
  await page.emulateMedia({reducedMotion: 'reduce'}); await page.waitForFunction(() => document.querySelector('.motion-comic')?.classList.contains('reduced-motion'));
  check(await button('播放漫画').isDisabled(), 'reduced motion disables automatic playback'); await page.keyboard.press('Escape');
  await album().evaluate(e => e.scrollTop = 0); await shot('compact-album'); check(await fits(album()), '320px catalog labels and actions do not overflow');
  await page.setViewportSize({width: 441, height: 694}); await album().evaluate(e => e.scrollTop = 0); await shot('user-441'); check(await fits(album()), 'actual in-app 441x694 viewport fits the album');
  await button('关闭梦藏').click(); await button('为此幕作画').click(); await workshop().waitFor();
  check((await workshop().locator('.dream-style-intro').textContent()).includes('梦绢'), 'creation form introduces the new art treatment');
  await page.setViewportSize({width: 1440, height: 900}); await workshop().evaluate(e => e.scrollTop = 0); await shot('desktop-workshop');
  await page.setViewportSize({width: 390, height: 844}); await workshop().evaluate(e => e.scrollTop = 0); await shot('mobile-workshop'); check(await fits(workshop()), '390px creation form remains readable');
  await page.setViewportSize({width: 320, height: 720}); await button('生成这一幅').scrollIntoViewIfNeeded(); await shot('compact-workshop-submit'); check(await fits(workshop()), '320px submit is reachable by scrolling');
  await page.keyboard.press('Escape'); await page.locator('.story-dream-tools .dream-entry').click(); await silk().locator('img').waitFor();
  await context.setOffline(true); await album().getByRole('button', {name: '只看珍藏', exact: true}).click();
  check(await silk().count() === 1 && await legacy().count() === 0, 'saved favorite remains available without network in the open album');
  check(report.blockedPosts === 0, 'browser checks submitted no image requests'); check(report.errors.length === 0, 'no runtime errors in the album, provenance, comic or workshop'); report.passed = true;
} catch (error) {report.passed = false; report.error = String(error); process.exitCode = 1; console.log(report.error); await shot('failure').catch(() => {});}
finally {writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2)); await browser.close();}

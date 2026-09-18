import {test, expect} from '@playwright/test';
import {mkdirSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {shot} from './artifacts';

// Reuse committed acceptance images as explicit fixtures. No account or provider calls.
const silkReport = JSON.parse(readFileSync('reports/acceptance/dream-silk-live.json', 'utf8'));
const legacyReport = JSON.parse(readFileSync('reports/acceptance/dream-live.json', 'utf8'));
const samples = [
  {job: silkReport.job, image: readFileSync(silkReport.image.path)},
  {job: legacyReport.job, image: readFileSync('output/imagegen/dream-live/qwen-first.png')},
];

test('merged Dream Silk album and comics coexist with the Sun Wen garden on desktop and phones', async ({page}) => {
  test.setTimeout(150000);
  mkdirSync('reports/browser/remote-merge-20260918', {recursive: true});
  const errors: string[] = [], posts: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const sample of samples) expect(createHash('sha256').update(sample.image).digest('hex')).toBe(sample.job.imageSha256);
  await page.route('**/api/dreams/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (request.method() !== 'GET') {
      posts.push(path);
      return route.fulfill({status: 409, json: {error: 'Merge regression uses saved fixtures only.'}});
    }
    if (path.endsWith('/config')) return route.fulfill({json: {configured: true, needsToken: true, dailyLimit: 20, remaining: 20, model: 'qwen-image-3.0-pro', styleVersion: 'honglou-silk-v1', styleName: '梦绢'}});
    if (path.endsWith('/jobs')) return route.fulfill({json: {jobs: samples.map(sample => sample.job)}});
    const sample = samples.find(sample => path === `/api/dreams/jobs/${sample.job.id}/image`);
    if (sample) return route.fulfill({contentType: 'image/png', body: sample.image});
    return route.fulfill({status: 404, json: {error: 'Unknown fixture request'}});
  });
  const button = (name: string) => page.getByRole('button', {name, exact: true});
  const comic = page.locator('.motion-comic');
  const silk = page.locator('.dream-painting[data-style-version="honglou-silk-v1"]');
  const openAlbum = async () => {await button('剧情画卷').click(); await page.locator('.story-dream-tools .dream-entry').click(); await expect(silk.locator('img')).toBeVisible();};
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__gardenTest?.state().loaded);
  const gallery = await (await page.request.get('/art/manifest.json')).json();
  expect(gallery).toHaveLength(15);
  expect(gallery.every((item: {artist: string; kind: string}) => item.artist === '孙温' && item.kind === 'historical-painting')).toBe(true);
  await openAlbum();
  await expect(page.locator('.dream-painting[data-style-version="legacy"] img')).toBeVisible();
  await expect(silk.getByLabel('收藏编号')).toHaveText(silkReport.job.cardNo);
  await silk.getByRole('button', {name: '珍藏画作', exact: true}).click();
  await expect(silk.getByRole('button', {name: '取消珍藏', exact: true})).toBeVisible();
  await page.reload(); await openAlbum();
  await expect(silk.getByRole('button', {name: '取消珍藏', exact: true})).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await silk.getByRole('button', {name: '剧情记录', exact: true}).click();
  const download = await downloadPromise, record = JSON.parse(readFileSync((await download.path())!, 'utf8'));
  expect(record.job.promptSha256).toBe(silkReport.job.promptSha256);
  expect(record.job.referenceSet.inputs).toHaveLength(3);
  expect(record.job.scenePlan.contentSha256).toBe(silkReport.job.scenePlan.contentSha256);
  await silk.locator('.dream-picture').click(); await button('暂停漫画').click();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({width, height: width === 1440 ? 900 : 844});
    await expect(comic).toHaveClass(/is-whole-painting/);
    await expect(comic.locator('.comic-art img')).toHaveCSS('object-fit', 'contain');
    expect(await comic.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await shot(page, `reports/browser/remote-merge-20260918/dream-${width}.png`);
  }
  await button('下一镜').click();
  await expect(comic.getByRole('button', {name: '第2镜：心事'})).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape'); await button('关闭梦藏').click(); await button('为此幕作画').click();
  await expect(page.locator('.dream-style-intro')).toContainText('梦绢');
  await page.keyboard.press('Escape'); await button('关闭剧情画卷').click();
  await page.setViewportSize({width: 1440, height: 900});
  await button('大观园入梦，回到全园').click();
  await page.waitForFunction(() => (window as any).__gardenTest?.state().loaded);
  await shot(page, 'reports/browser/remote-merge-20260918/garden-after-dream.png');
  expect(posts).toEqual([]);
  expect(errors).toEqual([]);
});

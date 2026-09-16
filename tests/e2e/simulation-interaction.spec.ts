import {expect, test, type Page} from '@playwright/test';

async function clickGardenMesh(page: Page, id: string) {
  const target = () => page.evaluate(id => {
    const canvas = document.querySelector('canvas')!, box = canvas.getBoundingClientRect();
    const projected = (window as any).__gardenTest.project(id);
    const x = box.x + projected.x, y = box.y + projected.y;
    return {x, y, clear: document.elementFromPoint(x, y) === canvas};
  }, id);
  let point = await target();
  for (let attempt = 0; !point.clear && attempt < 2; attempt++) {
    const box = (await page.locator('canvas').boundingBox())!;
    await page.mouse.move(box.x + box.width * .45, box.y + box.height * .4);
    await page.mouse.wheel(0, 280); await page.waitForTimeout(1800);
    point = await target();
  }
  expect(point.clear).toBe(true);
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(300);
}

test('simulation keeps its scene and returns repeated interaction requests to the form', async ({page}) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__gardenTest?.state().loaded);
  await page.getByRole('button', {name: '世界推演', exact: true}).click();
  await page.getByRole('button', {name: '托付与追问', exact: true}).click();
  const firstField = page.locator('.sim-request select').first();
  await expect(firstField).toBeFocused(); await expect(firstField).toBeInViewport();
  await page.locator('.sim-scroll').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect(firstField).not.toBeInViewport();
  await page.getByRole('button', {name: '托付与追问', exact: true}).click();
  await expect(firstField).toBeFocused(); await expect(firstField).toBeInViewport();

  await page.getByRole('button', {name: '全园', exact: true}).click();
  await page.waitForTimeout(1800);
  await clickGardenMesh(page, 'xiaoxiangguan');
  expect(await page.evaluate(() => { const s = (window as any).__gardenTest.state(); return [s.selectedPlaceId, s.panelOpen]; })).toEqual([null, false]);
  await page.locator('.sim-stage-roster').getByRole('button', {name: '贾宝玉', exact: true}).click();
  await expect.poll(() => page.evaluate(() => (window as any).__gardenTest.state().selectedPlaceId)).toBe('yihongyuan');

  // The same scene remains pickable after leaving simulation.
  await page.getByRole('button', {name: '退出世界推演', exact: true}).click();
  await page.getByRole('button', {name: '切换地点名签', exact: true}).click();
  await page.waitForTimeout(1800);
  await clickGardenMesh(page, 'xiaoxiangguan');
  await expect.poll(() => page.evaluate(() => (window as any).__gardenTest.state().selectedPlaceId)).toBe('xiaoxiangguan');

  await page.setViewportSize({width: 320, height: 740});
  await page.getByRole('button', {name: '世界推演', exact: true}).click();
  await page.getByRole('button', {name: '展开面板', exact: true}).click();
  await page.getByRole('button', {name: '托付与追问', exact: true}).click();
  await expect(firstField).toBeFocused(); await expect(firstField).toBeInViewport();
  await page.locator('.sim-scroll').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await page.getByRole('button', {name: '托付与追问', exact: true}).click();
  await expect(firstField).toBeFocused(); await expect(firstField).toBeInViewport();
});

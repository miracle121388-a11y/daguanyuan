import {expect, test} from '@playwright/test';
import {recordAction, toolAction} from '../../scripts/ui_navigation.mjs';

test('primary navigation keeps versions and saved worlds separate, including on narrow screens', async ({page}) => {
  await page.goto('/');
  const header = page.locator('.workspace-header');
  const nav = page.getByRole('navigation', {name: '主导航'});
  await expect(nav.getByRole('button')).toHaveCount(3);
  await expect(header.getByRole('button', {name: '八十回本', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await nav.getByRole('button', {name: 'IF 世界', exact: true}).click();
  await expect(page.getByLabel('写下你的「如果」')).toBeVisible();
  await page.getByLabel('写下你的「如果」').fill('如果黛玉的精力降到30');
  await page.getByRole('button', {name: '创建 IF 世界', exact: true}).click();
  await expect(page.locator('.sim-condition')).toContainText('30');
  await header.getByRole('button', {name: '程高本', exact: true}).click();
  await expect(page.getByLabel('写下你的「如果」')).toBeVisible();
  await header.getByRole('button', {name: '癸酉本', exact: true}).click();
  await expect(page.getByLabel('写下你的「如果」')).toBeVisible();
  await header.getByRole('button', {name: '八十回本', exact: true}).click();
  await expect(page.locator('.sim-condition')).toContainText('30');
  await nav.getByRole('button', {name: '世界推演', exact: true}).click();
  await expect(page.locator('.sim-condition')).toHaveCount(0);
  await nav.getByRole('button', {name: 'IF 世界', exact: true}).click();
  await expect(page.locator('.sim-condition')).toContainText('30');
  await page.locator('.workspace-more > summary').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.simulation-panel')).toBeVisible();
  await expect(page.locator('.workspace-more')).not.toHaveAttribute('open');
  await recordAction(page, '世界线');
  await expect(page.locator('.sim-worldlines')).toBeVisible();
  await toolAction(page, '游园设置');
  await page.getByRole('button', {name: '关闭设置', exact: true}).click();
  await expect(page.locator('.simulation-panel')).toBeVisible();
  for (const width of [390, 320]) {
    await page.setViewportSize({width, height: 844});
    for (const name of ['八十回本', '程高本', '癸酉本', '世界推演', 'IF 世界', '园林漫游']) {
      await expect(header.getByRole('button', {name, exact: true})).toBeInViewport();
    }
    await expect(page.getByRole('button', {name: '继续故事', exact: true})).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await toolAction(page, '剧情画卷');
    await expect(page.getByRole('button', {name: '关闭剧情画卷', exact: true})).toBeInViewport();
    await page.getByRole('button', {name: '关闭剧情画卷', exact: true}).click();
  }
});

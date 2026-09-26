import {toolAction} from '../../scripts/ui_navigation.mjs';
import {test,expect} from '@playwright/test';

test('a failed full-size reference image can be retried without leaving the viewer',async({page})=>{
 let fail=true;
 await page.route('**/art/*.webp',route=>route.request().url().includes('thumb')||!fail?route.continue():route.abort());
 await page.goto('/');
 await toolAction(page, '园景图录');
 await page.locator('.reference-grid button').first().click();
 await expect(page.getByText('这幅园景暂时未能载入。')).toBeVisible();
 fail=false;
 await page.getByRole('button',{name:'重新载入这幅图片',exact:true}).click();
 await expect(page.locator('.gallery-image')).toHaveAttribute('aria-busy','false');
 await expect(page.locator('.image-status')).not.toBeVisible();
 expect(await page.locator('.gallery-image img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
});
test('gallery retries a failed manifest and filters original plates by chapter',async({page})=>{
 let fail=true;await page.route('**/art/manifest.json',r=>fail?r.abort():r.continue());await page.goto('/');await toolAction(page, '园景图录');await expect(page.getByText('图录暂时未能载入。')).toBeVisible();fail=false;await page.getByRole('button',{name:'重新载入图录'}).click();await expect(page.locator('.reference-grid button')).toHaveCount(15);
 await page.locator('.reference-grid button').filter({hasText:'大观楼'}).click();await page.getByRole('button',{name:'进入此处三维园景'}).click();await expect(page.locator('.detail-scroll h2')).toHaveText('大观楼');
 await toolAction(page, '游园设置');await page.getByRole('checkbox',{name:'避免剧透',exact:true}).check();await page.getByRole('slider',{name:'阅读进度'}).fill('1');await page.getByRole('button',{name:'关闭设置'}).click();await toolAction(page, '园景图录');await expect(page.locator('.reference-grid button')).toHaveCount(1);await expect(page.locator('.reference-grid button')).toContainText('孙温全景');
});
test('320px sources entry retains its accessible name',async({page})=>{await page.setViewportSize({width:320,height:740});await page.goto('/');await toolAction(page, '来源与说明');await expect(page.locator('.sources-page h1')).toBeVisible()});

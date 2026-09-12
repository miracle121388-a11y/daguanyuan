# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: garden.spec.ts >> the overhead garden view opens by keyboard and a map destination returns to its courtyard
- Location: tests\e2e\garden.spec.ts:33:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByRole('button', { name: '俯瞰全园布局', exact: true })
Expected: "true"
Received: ""
Timeout:  20000ms

Call log:
  - Expect "toHaveAttribute" getByRole('button', { name: '俯瞰全园布局', exact: true }) with timeout 20000ms
  - waiting for getByRole('button', { name: '俯瞰全园布局', exact: true })
    43 × locator resolved to <button title="俯瞰全园布局" aria-label="俯瞰全园布局" class="icon-button active">…</button>
       - unexpected value "null"

```

```yaml
- button "俯瞰全园布局":
  - img
```

# Test source

```ts
  1  | import {shot,writeArtifact} from './artifacts';
  2  | import {test,expect,type Page} from '@playwright/test';
  3  | const state=async(p:Page)=>p.evaluate(()=>{const s=(window as any).__gardenTest.state();return {place:s.selectedPlaceId,event:s.selectedEventId,person:s.selectedCharacterId,chapter:s.selectedChapter,tour:s.tourState,quality:s.qualityLevel,spoiler:s.spoilerLimit}});
  4  | async function ready(p:Page){await p.goto('/');await p.waitForFunction(()=>(window as any).__gardenTest?.state().loaded);await p.locator('canvas').waitFor();}
  5  | async function place(p:Page,name:string){if(await p.getByRole('button',{name:'展开索引',exact:true}).isVisible())await p.getByRole('button',{name:'展开索引',exact:true}).click();await p.getByRole('tab',{name:'地点',exact:true}).click();await p.locator('.place-row').filter({hasText:name}).click();await expect(p.locator('.detail-scroll h2')).toHaveText(name);await p.waitForTimeout(2000)}
  6  | test('published scene, real canvas picking, literary links, all tours, settings and screenshots',async({page})=>{
  7  |  const errors:string[]=[],failed:string[]=[],external:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url())});page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1')&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))external.push(r.url())});await ready(page);await page.waitForTimeout(1800);
  8  |  await shot(page,'reports/browser/01-overview.png');
  9  |  for(const id of ['xiaoxiangguan','yihongyuan','qiushuangzhai']){await page.getByRole('button',{name:'回到全园',exact:true}).click();await page.waitForTimeout(2000);const point=await page.evaluate(id=>(window as any).__gardenTest.project(id),id);const box=(await page.locator('canvas').boundingBox())!;await page.mouse.click(box.x+point.x,box.y+point.y);await expect.poll(async()=>(await state(page)).place).toBe(id)}
  10 |  for(const [i,name]of ['潇湘馆','怡红院','蘅芜苑','秋爽斋'].entries()){await place(page,name);await shot(page,`reports/browser/0${i+2}-${['xiaoxiangguan','yihongyuan','hengwuyuan','qiushuangzhai'][i]}.png`)}
  11 |  await page.getByRole('button',{name:'人物群像',exact:true}).click();await page.locator('.character-list button').filter({hasText:'林黛玉'}).click();await expect.poll(async()=>(await state(page)).person).toBe('daiyu');await expect(page.locator('.related-places')).toContainText('潇湘馆');await shot(page,'reports/browser/06-character.png');
  12 |  await page.getByRole('button',{name:'回目拾遗',exact:true}).click();await page.locator('.chapter-list button').filter({hasText:'第三十七回'}).click();await page.locator('.event-row').filter({hasText:'海棠结社'}).click();await expect.poll(async()=>(await state(page)).place).toBe('qiushuangzhai');await expect(page.locator('.detail-panel')).toContainText('探春');await page.locator('.source-list summary').first().click();await expect(page.locator('.source-body blockquote')).toBeVisible();await page.waitForTimeout(1800);await shot(page,'reports/browser/07-event.png');
  13 |  for(const id of ['first-look','poetry','granny']){if(await page.getByRole('button',{name:'关闭详情',exact:true}).isVisible())await page.getByRole('button',{name:'关闭详情',exact:true}).click();await page.selectOption('#route-select',id);await page.getByRole('button',{name:'开始游园',exact:true}).click();await expect.poll(async()=>(await state(page)).tour.status).toBe('playing');await page.getByRole('button',{name:'暂停',exact:true}).click();await expect.poll(async()=>(await state(page)).tour.status).toBe('paused');await page.getByRole('button',{name:'下一站',exact:true}).click();await expect.poll(async()=>(await state(page)).tour.index).toBe(1);await page.getByRole('button',{name:'上一站',exact:true}).click();await expect.poll(async()=>(await state(page)).tour.index).toBe(0);await page.getByRole('button',{name:'继续',exact:true}).click();await page.getByRole('button',{name:'退出导览',exact:true}).click();await expect.poll(async()=>(await state(page)).tour.status).toBe('idle')}
  14 |  await page.getByRole('button',{name:'游园设置',exact:true}).click();await page.getByRole('checkbox',{name:'避免剧透',exact:true}).check();await page.getByRole('slider',{name:'阅读进度'}).fill('37');await expect.poll(async()=>(await state(page)).spoiler).toBe(37);await page.getByRole('combobox',{name:'画面精度'}).selectOption('low');await page.getByRole('button',{name:'关闭设置',exact:true}).click();await page.getByRole('button',{name:'回目拾遗',exact:true}).click();await expect(page.locator('.chapter-list')).not.toContainText('第七十六回');await page.getByRole('button',{name:'人物群像',exact:true}).click();await page.locator('.character-list button').filter({hasText:'妙玉'}).click();await expect(page.locator('.detail-prose')).toContainText('第41回解锁');await expect(page.locator('.detail-panel')).not.toContainText('茶具与品茗');
  15 |  await page.getByRole('button',{name:'来源与说明',exact:true}).click();await expect(page.locator('.sources-page')).toContainText('Poly Haven');await expect(page.locator('.source-chapter')).toHaveCount(6);await page.getByRole('button',{name:'返回园林',exact:true}).click();await page.getByRole('button',{name:'回到全园',exact:true}).click();
  16 |  const metrics=await page.evaluate(()=>(window as any).__gardenMetrics);writeArtifact('reports/acceptance/performance-low.json',JSON.stringify({at:new Date().toISOString(),userAgent:await page.evaluate(()=>navigator.userAgent),viewport:page.viewportSize(),...metrics},null,2));
  17 |  expect(errors).toEqual([]);expect(failed).toEqual([]);expect(external).toEqual([]);
  18 | });
  19 | test('mobile bottom drawer and usable controls',async({page})=>{await page.setViewportSize({width:390,height:844});await ready(page);await expect(page.locator('.index')).toHaveClass(/closed/);await page.getByRole('button',{name:'展开索引',exact:true}).click();await page.locator('.place-row').filter({hasText:'潇湘馆'}).click();await expect(page.locator('.detail-panel')).toBeVisible();await page.waitForTimeout(1600);await shot(page,'reports/browser/08-mobile.png');const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));expect(dimensions.scroll).toBe(dimensions.width);await page.getByRole('button',{name:'关闭详情',exact:true}).click();await page.getByRole('button',{name:'开始游园',exact:true}).click();await page.getByRole('button',{name:'暂停',exact:true}).click();await page.getByRole('button',{name:'退出导览',exact:true}).click()});
  20 | test('model failure exposes retry and recovers',async({page})=>{let fail=true;await page.route('**/models/overview.glb',route=>fail?route.abort():route.continue());await page.goto('/');await expect(page.getByText('模型文件加载失败，请重试。')).toBeVisible();fail=false;await page.getByRole('button',{name:'重新加载',exact:true}).click();await page.waitForFunction(()=>(window as any).__gardenTest?.state().loaded);await expect(page.getByText('模型文件加载失败，请重试。')).not.toBeVisible()});
  21 | test('tour shows sourced stop content, travels, and arrives at the next stop',async({page})=>{
  22 |  await ready(page);await page.getByRole('button',{name:'开始游园',exact:true}).click();
  23 |  await expect(page.locator('.detail-scroll h2')).toHaveText('大观园入口');
  24 |  await expect(page.locator('.detail-panel')).toContainText('地点来源');
  25 |  await expect(page.locator('.detail-panel')).not.toBeVisible({timeout:12000});
  26 |  await expect.poll(async()=>(await state(page)).tour.index,{timeout:30000}).toBe(1);
  27 |  await expect(page.locator('.detail-scroll h2')).toHaveText('曲径通幽');
  28 |  await page.getByRole('button',{name:'暂停',exact:true}).click();
  29 |  await shot(page,'reports/browser/09-tour-stop.png');
  30 |  await page.getByRole('button',{name:'退出导览',exact:true}).click();
  31 | });
  32 | 
  33 | test('the overhead garden view opens by keyboard and a map destination returns to its courtyard',async({page})=>{
  34 |  await ready(page);
  35 |  const control=page.getByRole('button',{name:'俯瞰全园布局',exact:true});await control.focus();await page.keyboard.press('Enter');
  36 |  await expect.poll(()=>page.evaluate(()=>(window as any).__gardenTest.state().planView)).toBe(true);
> 37 |  await expect(control).toHaveAttribute('aria-pressed','true');
     |                        ^ Error: expect(locator).toHaveAttribute(expected) failed
  38 |  const water=page.locator('.minimap svg path');await expect(water).toHaveAttribute('fill-rule','evenodd');
  39 |  await page.getByRole('button',{name:'地图选择潇湘馆',exact:true}).focus();await page.keyboard.press('Enter');
  40 |  await expect(page.locator('.detail-scroll h2')).toHaveText('潇湘馆');
  41 |  await expect.poll(()=>page.evaluate(()=>(window as any).__gardenTest.state().planView)).toBe(false);
  42 | });
  43 | 
```
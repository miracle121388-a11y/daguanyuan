import {viewAction} from '../../scripts/ui_navigation.mjs';
import {test,expect} from '@playwright/test';
import {mkdirSync,readFileSync} from 'node:fs';
import {shot,writeArtifact} from './artifacts';
const revision=JSON.parse(readFileSync('config/garden.layout.json','utf8')).assetRevision.split('-').at(-1);

test('distinct court architecture, open water pavilion and cutaway stay usable',async({page})=>{
 test.setTimeout(210000);
 const errors:string[]=[],failed:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url())});
 mkdirSync(`reports/browser/${revision}`,{recursive:true});
 await page.goto('/');await page.waitForFunction(()=>(window as any).__gardenTest?.state().loaded);
 await page.waitForLoadState('networkidle');await page.waitForTimeout(1800);
 await shot(page,`reports/browser/${revision}/overview.png`);
 const places=[['yihongyuan','怡红院'],['xiaoxiangguan','潇湘馆'],['hengwuyuan','蘅芜苑'],['qiushuangzhai','秋爽斋'],['daoxiangcun','稻香村'],['ouxiangxie','藕香榭'],['longcuian','栊翠庵'],['nuanxiangwu','暖香坞'],['tubishanzhuang','凸碧山庄'],['aojingxiguan','凹晶溪馆'],['dicuiting','滴翠亭'],['daguanlou','大观楼']];
 for(const [id,name] of places){
  await page.getByRole('button',{name:'回到全园',exact:true}).click();
  await page.getByRole('button',{name:'地图选择'+name,exact:true}).click();
  await expect(page.locator('.canvas-wrap')).toHaveAttribute('data-detail-ready',id);
  await expect(page.locator('.detail-scroll h2')).toHaveText(name);
  await page.waitForLoadState('networkidle');await page.waitForTimeout(1500);
  await shot(page,`reports/browser/${revision}/${id}.png`);
 }
 await page.getByRole('button',{name:'回到全园',exact:true}).click();
 await viewAction(page, '月夜');await page.waitForTimeout(1500);
 await shot(page,`reports/browser/${revision}/night.png`);
 expect(errors).toEqual([]);expect(failed).toEqual([]);
 writeArtifact(`reports/acceptance/${revision}-architecture-browser.json`,JSON.stringify({views:['overview',...places.map(([id])=>id),'night'],errors,failed},null,2));
});

test('three new scenery assemblies are discoverable and focus independently',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>(window as any).__gardenTest?.state().loaded);
 mkdirSync(`reports/browser/${revision}`,{recursive:true});
 for(const [id,name] of [['zilingzhou','紫菱洲'],['zhuijinlou','缀锦楼'],['jiayintang','嘉荫堂']]){
  await page.getByRole('button',{name:'回到全园',exact:true}).click();
  await page.getByRole('button',{name:'展开索引',exact:true}).click();
  await page.getByRole('textbox',{name:'搜索园中内容',exact:true}).fill(name);
  await expect(page.getByText('未找到“'+name+'”。试试地点、姓名或回目数字。',{exact:true})).toHaveCount(0);
  await page.locator('.architectural-scene').filter({hasText:name}).click();
  await expect(page.locator('.scene-heading h1')).toHaveText(name);
  await page.waitForLoadState('networkidle');await page.waitForTimeout(1800);
  expect(await page.evaluate(()=>(window as any).__gardenTest.state().selectedPlaceId)).toBeNull();
  expect(await page.evaluate(()=>(window as any).__gardenTest.state().data.manifest.places.length)).toBe(15);
  await shot(page,`reports/browser/${revision}/${id}.png`);
 }
 await page.getByRole('button',{name:'回到全园',exact:true}).click();
 await expect(page.locator('.scene-heading h1')).toHaveText('一园山水');
});

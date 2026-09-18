import {test,expect} from '@playwright/test';
import {mkdirSync,readFileSync} from 'node:fs';
import {shot,writeArtifact} from './artifacts';
const revision=JSON.parse(readFileSync('config/garden.layout.json','utf8')).assetRevision.split('-').at(-1);
const screenshots=`reports/browser/${revision}`;

test('tended garden, five planting characters and night scene load without missing assets',async({page})=>{
 test.setTimeout(150000);
 const errors:string[]=[],failed:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)failed.push(r.url())});
 mkdirSync(screenshots,{recursive:true});
 await page.goto('/');
 await page.waitForFunction(()=>(window as any).__gardenTest?.state().loaded);
 await page.waitForLoadState('networkidle');
 await page.waitForTimeout(1800);
 await shot(page,`${screenshots}/overview.png`);
 const places=[['yihongyuan','怡红院'],['xiaoxiangguan','潇湘馆'],['hengwuyuan','蘅芜苑'],['daoxiangcun','稻香村'],['ouxiangxie','藕香榭']];
 for(const [id,name] of places){
  await page.getByRole('button',{name:'回到全园',exact:true}).click();
  await page.getByRole('button',{name:'地图选择'+name,exact:true}).click();
  await expect(page.locator('.detail-scroll h2')).toHaveText(name);
  await expect(page.locator('.canvas-wrap')).toHaveAttribute('data-detail-ready',id);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1800);
  await shot(page,`${screenshots}/${id}.png`);
 }
 await page.getByRole('button',{name:'回到全园',exact:true}).click();
 await page.getByRole('button',{name:'月夜',exact:true}).click();
 await page.waitForTimeout(1800);
 await shot(page,`${screenshots}/night.png`);
 expect(errors).toEqual([]);expect(failed).toEqual([]);
 writeArtifact(`reports/acceptance/${revision}-landscape-browser.json`,JSON.stringify({views:['overview',...places.map(([id])=>id),'night'],errors,failed,viewport:page.viewportSize()},null,2));
});

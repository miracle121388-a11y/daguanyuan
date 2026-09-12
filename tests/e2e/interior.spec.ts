import {shot} from './artifacts';
import {test,expect} from '@playwright/test';
test('interior inspection lifts the roof and restores the complete courtyard',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>(window as any).__gardenTest?.state().loaded);
 await page.getByRole('button',{name:'展开索引',exact:true}).click();await page.locator('.place-row').filter({hasText:'秋爽斋'}).click();await page.getByRole('button',{name:'剖视结构',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__gardenTest.state().hotspotId)).toBe('qiushuangzhai-study');
 await page.waitForTimeout(2000);await shot(page,'reports/browser/12-interior.png');
 const hidden=await page.evaluate(()=>{let count=0;(window as any).__gardenTest.scene.traverse((o:any)=>{if(o.isMesh&&o.material?.name==='roof'&&!o.visible)count++});return count});expect(hidden).toBeGreaterThan(0);
 await page.getByRole('button',{name:'院落全貌',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__gardenTest.state().hotspotId)).toBeNull();
});

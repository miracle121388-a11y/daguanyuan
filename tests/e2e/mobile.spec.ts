import {test,expect} from '@playwright/test';
import fs from 'node:fs';
test('touch phone on throttled 4G loads the small overview and mobile courtyard',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 const page=await context.newPage(),requests:string[]=[];page.on('request',r=>requests.push(r.url()));
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:9_000_000/8,uploadThroughput:1_500_000/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.goto('/');await page.waitForFunction(()=>(window as any).__gardenTest?.state().loaded);
 const initial=await page.evaluate(()=>({loadedMs:performance.now(),resources:performance.getEntriesByType('resource').map(r=>({url:r.name,bytes:(r as PerformanceResourceTiming).transferSize})),metrics:(window as any).__gardenMetrics}));
 expect(requests.some(r=>r.includes('overview-low.glb'))).toBe(true);expect(requests.some(r=>r.endsWith('/overview.glb'))).toBe(false);
 expect(initial.resources.reduce((sum,r)=>sum+r.bytes,0)).toBeLessThan(3*1024*1024);
 await page.getByRole('button',{name:'展开索引',exact:true}).tap();await page.locator('.place-row').filter({hasText:'潇湘馆'}).tap();await expect(page.locator('.index')).toHaveClass(/closed/);
 await expect(page.locator('.detail-scroll h2')).toHaveText('潇湘馆');await expect.poll(()=>requests.some(r=>r.includes('places-low/xiaoxiangguan.glb'))).toBe(true);
 await page.waitForTimeout(1800);await page.screenshot({path:'reports/browser/10-phone-4g.png'});
 const maxDpr=await page.evaluate(()=>(window as any).__gardenMetrics.dpr);expect(maxDpr).toBe(1);
 await page.getByRole('button',{name:'关闭详情',exact:true}).tap();await page.getByRole('button',{name:'回到全园',exact:true}).tap();
 const before=await page.evaluate(()=>(window as any).__gardenTest.project('xiaoxiangguan'));
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:70,y:290}]});
 for(let i=1;i<=12;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:70+i*9,y:290+i}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(400);
 const after=await page.evaluate(()=>(window as any).__gardenTest.project('xiaoxiangguan'));expect(Math.abs(before.x-after.x)+Math.abs(before.y-after.y)).toBeGreaterThan(3);
 fs.writeFileSync('reports/acceptance/mobile-4g.json',JSON.stringify({conditions:{viewport:[390,844],deviceScaleFactor:3,renderDpr:1,latencyMs:80,downloadMbps:9,cpuSlowdown:4,realMobileHardware:false},initial,touchOrbitChanged:true,mobilePartitionLoaded:true},null,2));await context.close();
});
test('320px phone controls remain inside the viewport',async({browser})=>{
 const context=await browser.newContext({viewport:{width:320,height:740},isMobile:true,hasTouch:true});const page=await context.newPage();await page.goto('/');await page.waitForFunction(()=>(window as any).__gardenTest?.state().loaded);
 await page.getByRole('button',{name:'开始游园',exact:true}).tap();await page.getByRole('button',{name:'暂停',exact:true}).tap();
 for(const name of ['上一站','下一站','退出导览']){const box=await page.getByRole('button',{name,exact:true}).boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(320);expect(box!.height).toBeGreaterThanOrEqual(44)}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);await page.screenshot({path:'reports/browser/11-phone-320.png'});await context.close();
});

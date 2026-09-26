import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const url=process.env.APP_URL||'http://127.0.0.1:4317/';
const output=process.env.ACCESS_REPORT_DIR||'reports/acceptance/access-20260924/local';mkdirSync(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});const checks=[];
try{
 // A single compressed HTML response must work without JavaScript or subresources.
 for(const width of [1440,320]){
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:900}});const page=await context.newPage();const requests=[];page.on('request',r=>requests.push(r.url()));
  const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:400,downloadThroughput:50000,uploadThroughput:25000});
  const start=Date.now();const response=await page.goto(new URL('reading.html',url).href);await page.getByRole('heading',{name:'大观园 · 轻量阅读',exact:true}).waitFor();const readyMs=Date.now()-start;
  assert.equal(response.status(),200);assert.equal(requests.length,1);assert.equal(await page.locator('article').count(),28);
  await page.getByRole('link',{name:'园中人物',exact:true}).click();assert.ok(page.url().endsWith('#characters'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`${output}/reading-${width}.png`});checks.push({name:`reading-${width}`,javascript:false,downloadKbps:400,latencyMs:400,readyMs,requests:requests.length,passed:true});await context.close();
 }
 {
  const page=await browser.newPage();await page.route('**/assets/*.js',route=>route.abort());await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.getByRole('link',{name:'打开轻量阅读',exact:true}).waitFor();await page.getByRole('link',{name:'打开轻量阅读',exact:true}).click();await page.getByRole('heading',{name:'大观园 · 轻量阅读',exact:true}).waitFor();checks.push({name:'entry-script-failure-reading-recovery',passed:true});await page.close();
 }
 {
  const page=await browser.newPage();let tries=0;await page.route('**/data/places.json',route=>++tries===1?route.fulfill({status:503,body:'temporary'}):route.continue());await page.route('**/assets/GardenScene-*.js',route=>route.abort());await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'园景暂未载入',exact:true}).waitFor();assert.equal(tries,2);await page.getByRole('button',{name:'园林漫游',exact:true}).click();await page.getByRole('button',{name:'展开索引',exact:true}).click();await page.locator('.place-row').filter({hasText:'潇湘馆'}).first().click();await page.getByTestId('detail-panel').waitFor();checks.push({name:'transient-data-and-scene-script-failure-keeps-reading',passed:true});await page.screenshot({path:`${output}/scene-failure.png`});await page.close();
 }
}finally{await browser.close();writeFileSync(`${output}/report.json`,JSON.stringify({at:new Date().toISOString(),url,checks},null,2))}
console.log(`Access recovery checks passed: ${checks.length}`);

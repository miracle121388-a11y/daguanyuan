import {chromium} from '@playwright/test';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const oldOrigin='https://daguanyuan-rumeng.zeabur.app',newOrigin='https://daguanyuan.inspiralai.com';
const browser=await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {})});
const checks=[];
try {
 for(const conflict of [false,true]) {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if([oldOrigin,newOrigin].includes(u.origin)&&['/migrate.html','/migration.js'].includes(u.pathname))return route.fulfill({status:200,contentType:u.pathname.endsWith('.js')?'text/javascript':'text/html',body:readFileSync('public'+u.pathname)});
   return route.abort();
  });
  const page=await context.newPage();await page.goto(oldOrigin+'/migrate.html');
  const bytes=Buffer.from('fixture painting bytes');const sha=createHash('sha256').update(bytes).digest('hex');
  await page.evaluate(async({bytes,sha})=>{
   localStorage.setItem('daguanyuan.simulation.v2.original80','{"fixture":"old journal"}');
   localStorage.setItem('daguanyuan.dream-owner.v1','a'.repeat(64));
   localStorage.setItem('daguanyuan.access.v1','fixture-access');localStorage.setItem('unrelated-secret','must not move');
   const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('daguanyuan-dream-album',1);r.onupgradeneeded=()=>r.result.createObjectStore('paintings',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
   await new Promise((resolve,reject)=>{const t=db.transaction('paintings','readwrite');t.objectStore('paintings').put({id:'fixture',job:{id:'fixture',imageSha256:sha},image:new Blob([new Uint8Array(bytes)],{type:'image/png'}),favorite:true});t.oncomplete=resolve;t.onabort=()=>reject(t.error)});db.close();
  },{bytes:[...bytes],sha});
  const seed=await context.newPage();await seed.goto(newOrigin+'/migrate.html');
  await seed.evaluate(conflict=>{localStorage.setItem('daguanyuan.dream-owner.v1','b'.repeat(64));if(conflict)localStorage.setItem('daguanyuan.simulation.v2.original80','{"fixture":"new journal"}')},conflict);await seed.close();
  const popupPromise=page.waitForEvent('popup');await page.getByRole('button',{name:'带上存档，进入新园'}).click();const popup=await popupPromise;
  await popup.waitForFunction(()=>/搬迁完成|已有不同存档/.test(document.querySelector('#status').textContent));
  const result=await popup.evaluate(async()=>({storage:{...localStorage},text:document.querySelector('#status').textContent,overflow:document.documentElement.scrollWidth>innerWidth}));
  assert.equal(result.overflow,false);assert.equal(result.storage['unrelated-secret'],undefined);
  if(conflict){assert.match(result.text,/已有不同存档/);assert.equal(result.storage['daguanyuan.dream-owner.v1'],'b'.repeat(64));assert.equal(result.storage['daguanyuan.access.v1'],undefined);checks.push('Conflicting new saves are preserved without partial import');}
  else {
   assert.match(result.text,/3 项本机存档与设置、1 幅/);assert.equal(result.storage['daguanyuan.dream-owner.v1'],'a'.repeat(64));assert.equal(result.storage['daguanyuan.access.v1'],'fixture-access');
   const album=await popup.evaluate(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('daguanyuan-dream-album',1);r.onsuccess=()=>resolve(r.result)});const rows=await new Promise(resolve=>{const r=db.transaction('paintings').objectStore('paintings').getAll();r.onsuccess=()=>resolve(r.result)});db.close();return {count:rows.length,favorite:rows[0].favorite,bytes:Array.from(new Uint8Array(await rows[0].image.arrayBuffer()))}});assert.equal(album.count,1);assert.equal(album.favorite,true);assert.deepEqual(album.bytes,[...bytes]);checks.push('Real cross-origin popup handshake preserves settings, journal, identity and exact image bytes');
   mkdirSync('reports/acceptance/aliyun-20261024',{recursive:true});await popup.screenshot({path:'reports/acceptance/aliyun-20261024/migration-mobile.png'});
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('daguanyuan.access.v1')),'fixture-access');
  await context.close();
 }
 // A direct visit without the source opener cannot import an unsolicited message.
 const context=await browser.newContext();await context.route('**/*',route=>route.fulfill({status:200,contentType:route.request().url().includes('migration.js')?'text/javascript':'text/html',body:readFileSync(route.request().url().includes('migration.js')?'public/migration.js':'public/migrate.html')}));
 const page=await context.newPage();await page.goto(newOrigin+'/migrate.html');await page.evaluate(()=>window.postMessage({type:'garden-migration-data',payload:{format:'daguanyuan-domain-migration-v1',storage:{'daguanyuan.access.v1':'attacker'},paintings:[]}},location.origin));assert.equal(await page.evaluate(()=>localStorage.getItem('daguanyuan.access.v1')),null);checks.push('Unsolicited messages cannot import storage');await context.close();
 checks.push('Old-origin storage retained; unrelated keys excluded; mobile layout has no overflow');
 writeFileSync('reports/acceptance/aliyun-20261024/migration.json',JSON.stringify({at:new Date().toISOString(),checks,fixtures:true},null,2)+'\n');console.log(checks.join('\n'));
}finally{await browser.close()}

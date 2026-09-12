import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
const url=process.env.APP_URL||'https://daguanyuan-rumeng.zeabur.app/';
const ip=process.env.APP_RESOLVE_IP;
const browser=await chromium.launch({channel:'msedge',headless:true,args:ip?[`--host-resolver-rules=MAP ${new URL(url).hostname} ${ip}`,'--disable-quic']:[]});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const start=Date.now(),pending=new Map(),events=[];
const path=r=>new URL(r.url()).pathname;
page.on('request',r=>pending.set(r,{path:path(r),at:Date.now()-start}));
page.on('response',r=>events.push({path:new URL(r.url()).pathname,at:Date.now()-start,status:r.status()}));
page.on('requestfinished',r=>{events.push({path:path(r),at:Date.now()-start,status:'finished'});pending.delete(r)});
page.on('requestfailed',r=>{events.push({path:path(r),at:Date.now()-start,status:'failed',error:r.failure()});pending.delete(r)});
page.on('pageerror',e=>events.push({at:Date.now()-start,error:e.message}));
page.on('console',m=>{if(m.type()==='error'||m.type()==='warn')events.push({at:Date.now()-start,console:m.text()})});
try{
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('canvas').waitFor({state:'visible',timeout:60000}).catch(e=>events.push({error:e.message}));
 await page.locator('.loading').waitFor({state:'hidden',timeout:60000}).catch(e=>events.push({error:e.message}));
 writeFileSync('reports/browser/spatial-production-diagnostic.png',await page.screenshot());
 const report={at:new Date().toISOString(),url,dnsOverride:ip??null,tlsVerification:true,body:await page.locator('body').innerText(),pending:[...pending.values()],events};
 writeFileSync('reports/acceptance/spatial-production-diagnostic.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({pending:report.pending,body:report.body,errors:events.filter(e=>e.error||e.console)}));
}finally{await browser.close()}

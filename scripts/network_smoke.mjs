import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const url=process.env.APP_URL||'https://daguanyuan-rumeng.zeabur.app/';
const output=process.env.NETWORK_REPORT_DIR||'reports/acceptance/network-20260924';
mkdirSync(output,{recursive:true});
const modes=process.env.GARDEN_SYSTEM_MOBILE==='1'?[{name:'system-mobile',mobile:true}]:[{name:'system'},...(process.env.GARDEN_TEST_PROXY?[{name:'explicit-proxy',mobile:true,proxy:{server:process.env.GARDEN_TEST_PROXY}}]:[])];
const checks=[];
for(const mode of modes){
 const browser=await chromium.launch({channel:process.env.GARDEN_BROWSER_CHANNEL||'msedge',headless:true,...(mode.proxy?{proxy:mode.proxy}:{})});
 const result={mode:mode.name,dnsOverride:false,tlsVerified:new URL(url).protocol==='https:'?true:null,httpVersionOverride:false,failures:[],passed:false};checks.push(result);
 try{
  const context=await browser.newContext({viewport:mode.mobile?{width:390,height:844}:{width:1440,height:900},...(mode.mobile?{isMobile:true,hasTouch:true}:{})});
  const page=await context.newPage();const pending=new Set();
  page.on('request',req=>pending.add(new URL(req.url()).pathname));
  page.on('requestfinished',req=>pending.delete(new URL(req.url()).pathname));
  page.on('pageerror',e=>result.failures.push(e.message));
  page.on('requestfailed',req=>{pending.delete(new URL(req.url()).pathname);result.failures.push(`${new URL(req.url()).pathname}: ${req.failure()?.errorText}`)});
  page.on('response',res=>{if(res.status()>=400)result.failures.push(`${new URL(res.url()).pathname}: ${res.status()}`)});
  const start=Date.now();
  try{
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
   await page.locator('.canvas-wrap[data-scene-ready="true"]').waitFor({timeout:Number(process.env.GARDEN_SCENE_TIMEOUT_MS)||120000});
   result.readyMs=Date.now()-start;
   result.health=await page.evaluate(()=>fetch('/healthz',{signal:AbortSignal.timeout(10000)}).then(r=>r.json()));
   result.passed=result.health.status==='ok'&&!result.failures.length;
  }catch(error){result.error=error.message;result.elapsedMs=Date.now()-start;result.pending=[...pending]}
  result.resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname,duration:Math.round(r.duration),transferSize:r.transferSize,protocol:r.nextHopProtocol}))).catch(()=>[]);
  await page.screenshot({path:`${output}/${mode.name}.png`,timeout:10000}).catch(e=>{result.screenshotError=e.message});
  if(process.env.GARDEN_CHECK_READING==='1'){
   const reading=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const reader=await reading.newPage();const begin=Date.now();
   try{const response=await reader.goto(new URL('reading.html',url).href,{timeout:30000});await reader.getByRole('heading',{name:'大观园 · 轻量阅读',exact:true}).waitFor();result.reading={passed:response.ok(),readyMs:Date.now()-begin,javascriptEnabled:false};await reader.screenshot({path:`${output}/${mode.name}-reading.png`,timeout:10000})}catch(e){result.reading={passed:false,error:e.message}}finally{await reading.close()}
   result.passed&&=result.reading.passed;
  }
 }catch(e){result.error=e.message}finally{await browser.close();writeFileSync(`${output}/report.json`,JSON.stringify({at:new Date().toISOString(),url,checks},null,2))}
}
if(checks.some(c=>!c.passed)){console.error('Network checks failed; observations saved to '+output);process.exitCode=1}else console.log(`Network browser checks passed: ${checks.length}`);

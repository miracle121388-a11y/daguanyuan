import {chromium} from 'playwright';
import {readFileSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.APP_URL||'http://127.0.0.1:4175/');
 await page.waitForFunction(()=>window.__gardenTest?.state().loaded,null,{timeout:90000});
 await page.getByRole('button',{name:'展开索引',exact:true}).click();
 await page.locator('.place-row').filter({hasText:'潇湘馆'}).click();
 await page.locator('[data-detail-ready="xiaoxiangguan"]').waitFor();
 await page.waitForLoadState('networkidle');await page.waitForTimeout(6000);
 await page.evaluate(()=>{window.__gardenMetrics.frames.length=0});
 const client=await page.context().newCDPSession(page);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:185,y:260}]});
 for(let i=0;i<150;i++){
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:185+Math.sin(i/25)*75,y:260+Math.sin(i/39)*20}]});
  await page.waitForTimeout(16);
 }
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForTimeout(500);
 const result=await page.evaluate(()=>{
  const m=window.__gardenMetrics,frames=m.frames.slice(1).filter(x=>x>0).slice(-300),sorted=[...frames].sort((a,b)=>a-b);
  const gl=document.querySelector('canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
  const plants=[];window.__gardenTest.scene.traverse(o=>{if(o.isInstancedMesh&&o.name.startsWith('Source fern '))plants.push({species:o.userData.species,visible:o.count})});
  return {viewport:[innerWidth,innerHeight],dpr:m.dpr,quality:window.__gardenTest.state().qualityLevel,place:window.__gardenTest.state().selectedPlaceId,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),sampleCount:frames.length,meanFrameMs:frames.reduce((a,b)=>a+b,0)/frames.length,p95FrameMs:sorted[Math.floor(sorted.length*.95)],intervalsOver250ms:frames.filter(x=>x>250).length,triangles:m.triangles,drawCalls:m.drawCalls,plants,frames};
 });
 if(errors.length||result.sampleCount<30)throw Error(JSON.stringify({errors,samples:result.sampleCount}));
 const revision=JSON.parse(readFileSync('public/scene-manifest.json','utf8')).assetRevision;
 const path=process.env.GARDEN_COURTYARD_PERF_REPORT||'reports/acceptance/courtyard-performance.json';
 writeFileSync(path,JSON.stringify({at:new Date().toISOString(),revision,method:'Windows Edge headless,390x844 touch emulation,DPR1,local HTTP without CPU/network throttling. Real UI selection, network idle and6s settle, then150 CDP touch moves with16ms waits. Positive callback intervals retain stalls; first idle-boundary interval omitted. Not actual phone GPU, display FPS or an isolated before/after comparison.',errors,...result},null,2));
 console.log({meanFrameMs:result.meanFrameMs,p95FrameMs:result.p95FrameMs,triangles:result.triangles,drawCalls:result.drawCalls,plants:result.plants});
}finally{await browser.close()}

import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4175/');await page.waitForFunction(()=>window.__gardenTest?.state().loaded,null,{timeout:90000});await page.waitForLoadState('networkidle');await page.waitForTimeout(6000);
await page.evaluate(()=>{
 const saved={earth:[],water:[],renderer:null};window.__profileSaved=saved;
 window.__gardenTest.scene.traverse(o=>{
  if(!o.isMesh)return;
  if(o.material?.uniforms?.mirrorSampler)saved.water.push(o);
  for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name==='earth')saved.earth.push({m,compile:m.onBeforeCompile,key:m.customProgramCacheKey});
  if(!saved.hook){saved.hook=o;const prior=o.onBeforeRender;o.onBeforeRender=function(renderer,...args){saved.renderer=renderer;prior.call(this,renderer,...args);o.onBeforeRender=prior};}
 });
});
const rows=[];
async function measure(name){await page.waitForTimeout(1500);await page.evaluate(()=>window.__gardenMetrics.frames.length=0);await page.waitForTimeout(4000);rows.push(await page.evaluate(name=>{const m=window.__gardenMetrics,f=m.frames.slice(1).filter(x=>x>0),s=[...f].sort((a,b)=>a-b);return {name,samples:f.length,mean:f.reduce((a,b)=>a+b,0)/f.length,median:s[Math.floor(s.length*.5)],p95:s[Math.floor(s.length*.95)],stallsOver250ms:f.filter(x=>x>250).length,triangles:m.triangles,drawCalls:m.drawCalls}},name));}
await measure('current');
await page.evaluate(()=>{for(const x of window.__profileSaved.earth){x.m.onBeforeCompile=()=>{};x.m.customProgramCacheKey=()=> 'diagnostic-plain-earth';x.m.needsUpdate=true}});await measure('same grass map without ground noise, soil blend or baked shadow shader');
await page.evaluate(()=>{for(const x of window.__profileSaved.earth){x.m.onBeforeCompile=x.compile;x.m.customProgramCacheKey=x.key;x.m.needsUpdate=true}for(const w of window.__profileSaved.water)w.visible=false});await measure('current ground; water reflection disabled');
await page.evaluate(()=>{for(const w of window.__profileSaved.water)w.visible=true;window.__profileSaved.renderer.setPixelRatio(.6)});await measure('current scene at diagnostic DPR 0.6');
writeFileSync('reports/acceptance/r7-runtime-profile.json',JSON.stringify({at:new Date().toISOString(),conditions:'Single isolated local test page; 1440x900; high quality; 6-second settle; each temporary condition 1.5-second settle then4-second sample; no production asset or configuration mutations',rows,errors},null,2));console.log(rows);await browser.close();

import {chromium} from 'playwright';
import {mkdirSync,writeFileSync,readFileSync,renameSync} from 'node:fs';
const url=process.env.APP_URL||'http://127.0.0.1:4174/';
mkdirSync('.impeccable/review',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const narrowOnly=process.env.CAPTURE_ONLY==='narrow';
const errors=[],failed=[],results=narrowOnly?JSON.parse(readFileSync('reports/acceptance/reference-smoke.json','utf8')):{url,revision:JSON.parse(readFileSync('public/scene-manifest.json','utf8')).assetRevision,capturedAt:new Date().toISOString(),captures:[],checks:[]};
const setup=async(options)=>{const page=await browser.newPage(options);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE.WebGLProgram|shader error|GL_INVALID/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)failed.push(r.url())});await page.goto(url);await page.waitForFunction(()=>window.__gardenTest?.state().loaded,null,{timeout:90000});await page.waitForLoadState('networkidle');await page.locator('.loading').waitFor({state:'hidden',timeout:90000});await page.waitForTimeout(2400);return page};
const shot=async(page,name)=>{const path='.impeccable/review/'+name+'.png';writeFileSync(path+'.next',await page.screenshot());renameSync(path+'.next',path);if(!results.captures.includes(name))results.captures.push(name)};
const foliage=async(page,label)=>{
 const observed=await page.evaluate(()=>{
  const state=window.__gardenTest.state(),plants=[];
  window.__gardenTest.scene.traverse(o=>{if(o.isInstancedMesh&&o.name.startsWith('Source fern '))plants.push({species:o.userData.species,visibleInstances:o.count,capacity:o.instanceMatrix.count})});
  return {place:state.selectedPlaceId,quality:state.qualityLevel,plants,triangles:window.__gardenMetrics.triangles,drawCalls:window.__gardenMetrics.drawCalls};
 });
 (results.foliage??=[]).push({label,...observed});
 if(observed.plants.reduce((n,p)=>n+p.visibleInstances,0)<1)throw Error('Selected courtyard source foliage missing: '+label);
};
try{
 if(!narrowOnly){
 const page=await setup({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await shot(page,'desktop');await page.getByRole('button',{name:'俯瞰全园布局',exact:true}).click();await page.waitForTimeout(1500);await shot(page,'plan');await page.getByRole('button',{name:'回到全园',exact:true}).click();await page.waitForTimeout(1500);
 await page.getByRole('button',{name:'定位潇湘馆',exact:true}).click();await page.locator('.detail-scroll h2').filter({hasText:'潇湘馆'}).waitFor();await page.locator('[data-detail-ready="xiaoxiangguan"]').waitFor();await page.waitForLoadState('networkidle');await page.waitForTimeout(2000);await shot(page,'courtyard');await foliage(page,'desktop-courtyard');
 await page.getByRole('button',{name:'游园设置',exact:true}).click();await page.getByRole('checkbox',{name:'水面与路径动态',exact:true}).uncheck();await page.getByRole('button',{name:'游园设置',exact:true}).click();
 await page.getByRole('button',{name:'屋内陈设',exact:true}).click();await page.waitForTimeout(2500);await shot(page,'interior');await page.getByRole('button',{name:'剖视结构',exact:true}).click();await page.waitForTimeout(1500);await shot(page,'cutaway');results.checks.push('courtyard, eye-level room and reversible cutaway');
 await page.getByRole('button',{name:'回到全园',exact:true}).click();await page.getByRole('button',{name:'月夜',exact:true}).click();await page.waitForTimeout(1800);await shot(page,'night');results.checks.push('night lighting');
 await page.getByRole('button',{name:'园景图录',exact:true}).click();await page.locator('.reference-grid button').first().waitFor();if(await page.locator('.reference-grid button').count()!==15)throw Error('Missing gallery images');await page.locator('.reference-grid button').filter({hasText:'大观楼'}).click();await page.getByRole('button',{name:'进入此处三维园景'}).click();await page.locator('.detail-scroll h2').filter({hasText:'大观楼'}).waitFor();await page.locator('[data-detail-ready="daguanlou"]').waitFor();await page.waitForLoadState('networkidle');results.checks.push('15-image catalogue links to 3D destinations');
 await page.getByRole('button',{name:'晨光',exact:true}).click();await page.waitForTimeout(1800);await shot(page,'central-ensemble');await foliage(page,'central-ensemble');
 // The brief's four featured courts and literary states join the same bounded
 // capture matrix. Wait for actual detail geometry and local images, not a timer alone.
 for(const [id,name] of [['yihongyuan','怡红院'],['hengwuyuan','蘅芜苑'],['qiushuangzhai','秋爽斋']]){
  if(await page.getByRole('button',{name:'展开索引',exact:true}).isVisible())await page.getByRole('button',{name:'展开索引',exact:true}).click();
  await page.getByRole('tab',{name:'地点',exact:true}).click();await page.locator('.place-row').filter({hasText:name}).click();
  await page.locator(`[data-detail-ready="${id}"]`).waitFor();await page.waitForLoadState('networkidle');await page.waitForTimeout(1800);await shot(page,id);await foliage(page,id);
 }
 await page.getByRole('button',{name:'人物群像',exact:true}).click();await page.locator('.character-list button').filter({hasText:'林黛玉'}).click();await page.waitForLoadState('networkidle');await page.waitForTimeout(1800);await shot(page,'character');
 await page.getByRole('button',{name:'回目拾遗',exact:true}).click();await page.locator('.chapter-list button').filter({hasText:'第三十七回'}).click();await page.locator('.event-row').filter({hasText:'海棠结社'}).click();await page.locator('[data-detail-ready="qiushuangzhai"]').waitFor();await page.locator('.source-list summary').first().click();await page.locator('.source-body blockquote').waitFor();await page.waitForLoadState('networkidle');await page.waitForTimeout(1800);await shot(page,'event');
 results.checks.push('four featured courts, character links and original event source');
 results.metrics=await page.evaluate(()=>window.__gardenMetrics??null);await page.close();
 const actual=await setup({viewport:{width:1266,height:712},deviceScaleFactor:1});await shot(actual,'user-1266');await actual.close();
 const mobile=await setup({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});await shot(mobile,'mobile');await mobile.getByRole('button',{name:'展开索引',exact:true}).click();await mobile.locator('.place-row').filter({hasText:'潇湘馆'}).click();await mobile.locator('[data-detail-ready="xiaoxiangguan"]').waitFor();await mobile.waitForLoadState('networkidle');await mobile.waitForTimeout(2000);await shot(mobile,'mobile-courtyard');await mobile.getByRole('button',{name:'看全院',exact:true}).tap();await mobile.waitForTimeout(1800);await shot(mobile,'mobile-whole-courtyard');results.checks.push('mobile close and full courtyard views');
 await foliage(mobile,'mobile-whole-courtyard');const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('Mobile horizontal overflow');results.checks.push('390px touch selection and no overflow');
 await mobile.close();
 }
 const narrow=await setup({viewport:{width:320,height:740},deviceScaleFactor:1,isMobile:true,hasTouch:true});await shot(narrow,'narrow');if(await narrow.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('320px overflow');results.checks.push('320px layout');
}finally{results.errors=errors;results.failed=failed;writeFileSync('reports/acceptance/reference-smoke.json',JSON.stringify(results,null,2));await browser.close()}
if(errors.length||failed.length)throw Error(JSON.stringify({errors,failed}));
console.log('Reference smoke passed:',results.checks.join('; '));

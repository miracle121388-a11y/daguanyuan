// Real Qwen art is read from the private acceptance album. Later lifecycle cases
// use explicitly intercepted test jobs so UI regression checks incur no charges.
import {chromium} from 'playwright';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
process.loadEnvFile('.env');
const base=process.env.APP_URL||'http://127.0.0.1:4291/', output=process.env.DREAM_REPORT_DIR||'.impeccable/review/dream-first';
const privateAlbum=JSON.parse(readFileSync(process.env.DREAM_ALBUM_FILE||'.local/dream-test-album.json'));
const report={version:'qwen-dream-album-20260917-v5',at:new Date().toISOString(),url:base,checks:[],screenshots:[],errors:[],fixturePosts:[],liveGenerationCalls:0};
mkdirSync(output,{recursive:true});
const ip=process.env.APP_RESOLVE_IP;
const browser=await chromium.launch({channel:'msedge',headless:true,args:ip?[`--host-resolver-rules=MAP ${new URL(base).hostname} ${ip}`,'--disable-quic']:[]});
const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
await context.addInitScript(({owner})=>localStorage.setItem('daguanyuan.dream-owner.v1',owner),privateAlbum);
const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>report.errors.push(e.message));
const check=(ok,label)=>{if(!ok)throw Error(label);report.checks.push(label);console.log('PASS '+label);};
const button=name=>page.getByRole('button',{name,exact:true});
const album=()=>page.locator('.dream-album'),workshop=()=>page.locator('.dream-workshop'),comic=()=>page.locator('.motion-comic');
const shot=async name=>{await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(180);const path=`${output}/${name}.png`;await page.screenshot({path});report.screenshots.push(path);};
const fits=loc=>loc.evaluate(e=>e.scrollWidth<=e.clientWidth+1&&e.getBoundingClientRect().right<=innerWidth+1);
const openAlbum=async()=>{await button('剧情画卷').click();await page.locator('.story-dream-tools .dream-entry').click();await album().waitFor();};
try{
 await page.goto(base);await button('剧情画卷').waitFor();await openAlbum();
 await album().locator('.dream-picture img').waitFor();await page.waitForFunction(()=>document.querySelector('.dream-picture img')?.naturalWidth===1536);
 check(await album().locator('.dream-picture').count()===1,'actual Qwen image downloaded, verified and collected');
 check((await album().textContent()).includes('已收 1 幅'),'collection count reflects generated art only');
 await shot('desktop-album');await album().getByRole('button',{name:'珍藏画作',exact:true}).click();
 await album().getByRole('button',{name:'取消珍藏',exact:true}).waitFor();
 const downloadPromise=page.waitForEvent('download');await album().getByRole('button',{name:'剧情记录',exact:true}).click();const download=await downloadPromise;
 const text=readFileSync(await download.path(),'utf8'),record=JSON.parse(text);
 check(record.job.model==='qwen-image-3.0-pro'&&record.job.imageSha256?.length===64&&record.job.prompt.includes('雨后'),'downloaded provenance includes Qwen model, exact prompt, plot and image hash');
 check(!text.includes(process.env.IMAGE_API_KEY),'downloaded metadata contains no image key');
 await album().locator('.dream-picture').click();await comic().locator('img').waitFor();await button('暂停漫画').click();await shot('desktop-generated-comic');
 check((await comic().textContent()).includes('剧情新绘 · IF线'),'generated comic preserves the original edition and IF branch');
 const frozen=await comic().locator('img').evaluate(e=>({scale:getComputedStyle(e).scale,transform:getComputedStyle(e).transform}));await page.waitForTimeout(250);
 check(JSON.stringify(frozen)===JSON.stringify(await comic().locator('img').evaluate(e=>({scale:getComputedStyle(e).scale,transform:getComputedStyle(e).transform}))),'pause freezes the real generated illustration');
 await button('下一镜').click();check(await comic().getByRole('button',{name:'第2镜：心事'}).getAttribute('aria-pressed')==='true','generated image supports sequential narration');
 await page.keyboard.press('Escape');check(await album().isVisible()&&await comic().count()===0,'Escape returns to the collection without changing the world');
 await page.reload();await button('剧情画卷').waitFor();await openAlbum();await album().getByRole('button',{name:'取消珍藏',exact:true}).waitFor();
 check(await album().locator('.dream-picture').count()===1,'original image and favorite survive reload in IndexedDB');
 await album().getByRole('combobox',{name:'文学版本'}).selectOption('original80');check(await album().locator('.dream-picture').count()===0,'edition filter isolates collected story contexts');await album().getByRole('combobox',{name:'文学版本'}).selectOption('all');
 await page.setViewportSize({width:390,height:844});await shot('mobile-album');check(await fits(album()),'390px collection fits without horizontal overflow');
 await album().locator('.dream-picture').click();await button('暂停漫画').click();await shot('mobile-generated-comic');
 await page.setViewportSize({width:320,height:720});await shot('compact-generated-comic');check(await fits(comic()),'320px generated comic remains inside viewport');
 check(await comic().getByRole('button',{name:'下一镜'}).evaluate(e=>{const b=e.getBoundingClientRect();return b.width>=44&&b.height>=44&&b.right<=innerWidth;}),'compact comic playback remains touch sized');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('.motion-comic')?.classList.contains('reduced-motion'));check(await comic().getByRole('button',{name:'播放漫画'}).isDisabled(),'reduced-motion preference stops generated image animation');await shot('compact-static-comic');await page.keyboard.press('Escape');
 await page.setViewportSize({width:1440,height:900});await page.emulateMedia({reducedMotion:'no-preference'});await button('关闭梦藏').click();
 await button('为此幕作画').click();await workshop().waitFor();check((await workshop().textContent()).includes('八十回本'),'workshop shows the chosen book and captured scene');
 await workshop().getByRole('button',{name:'温暖相逢',exact:true}).click();await workshop().getByLabel('想留下的细节',{exact:false}).fill('白海棠含着雨珠，两人相视而笑。');
 await workshop().getByLabel('作画口令',{exact:true}).fill(process.env.IMAGE_ACCESS_TOKEN||process.env.LLM_ACCESS_TOKEN);
 await shot('desktop-workshop');await page.setViewportSize({width:390,height:844});await workshop().evaluate(e=>e.scrollTop=0);await shot('mobile-workshop');check(await fits(workshop()),'390px workshop preserves scene and usable form');
 await page.setViewportSize({width:320,height:720});await workshop().getByRole('button',{name:'生成这一幅',exact:true}).scrollIntoViewIfNeeded();await shot('compact-workshop-submit');check(await fits(workshop()),'320px submit remains reachable with scrolling');
 // Explicit fixture boundary: actual provider calls are intercepted from here.
 let fixtures=[];const actualList=await page.evaluate(async()=>{const r=await fetch('/api/dreams/jobs',{headers:{'X-Dream-Album':localStorage.getItem('daguanyuan.dream-owner.v1')}});return r.json();});
 await page.route('**/api/dreams/jobs',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{jobs:[...actualList.jobs,...fixtures]}});
  const {moment}=route.request().postDataJSON();report.fixturePosts.push({moment,authorized:!!route.request().headers().authorization});
  const job={...actualList.jobs[0],id:randomUUID(),moment,status:'queued',createdAt:new Date().toISOString(),imageSha256:undefined,mime:undefined,bytes:undefined,resumeAvailable:true};fixtures.push(job);
  return route.fulfill({status:202,json:{job}});
 });
 await button('生成这一幅').click();await workshop().waitFor({state:'detached'});
 check(report.fixturePosts[0]?.moment.mood==='warm'&&report.fixturePosts[0]?.moment.note.includes('白海棠'),'manual submission carries chosen mood and personal visual detail (intercepted fixture)');
 await button('从此幕入局').click();await page.waitForFunction(()=>!document.querySelector('.story-library'));
 check(report.fixturePosts.length===2&&report.fixturePosts[1].moment.worldId!==report.fixturePosts[0].moment.worldId,'entering an actual plot node automatically offers its distinct world snapshot (intercepted fixture)');
 check(await comic().count()===0,'live generation leaves the garden usable while waiting');
 await page.setViewportSize({width:390,height:844});await openAlbum();await shot('mobile-pending-fixture');
 fixtures=fixtures.map(j=>({...j,status:'failed',error:'测试状态：服务连接暂时中断，可继续查询原任务。'}));await album().getByRole('button',{name:'刷新画册',exact:true}).click();await album().getByRole('button',{name:'继续查询原画',exact:true}).first().waitFor();await shot('mobile-recovery-fixture');
 check(await album().getByRole('button',{name:'继续查询原画',exact:true}).count()===2,'temporary failures retain a recoverable original-task action (fixture)');
 await context.setOffline(true);await album().getByRole('combobox',{name:'文学版本'}).selectOption('guiyou108');check(await album().locator('.dream-picture').count()===1,'already-open collection keeps its verified local image without network');await context.setOffline(false);
 check(report.errors.length===0,'no browser runtime errors through collection, playback and submission');report.passed=true;
}catch(e){report.passed=false;report.error=String(e);await shot('failure').catch(()=>{});process.exitCode=1;console.log(report.error);}
finally{writeFileSync(`${output}/report.json`,JSON.stringify(report,null,2));await browser.close();}

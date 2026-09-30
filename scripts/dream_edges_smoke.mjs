import {toolAction} from './ui_navigation.mjs';
import {chromium} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const base=process.env.APP_URL||'http://127.0.0.1:4291/', out=process.env.DREAM_REPORT_DIR||'.impeccable/review/dream-final';mkdirSync(out,{recursive:true});
const ip=process.env.APP_RESOLVE_IP,browser=await chromium.launch({channel:'msedge',headless:true,args:ip?[`--host-resolver-rules=MAP ${new URL(base).hostname} ${ip}`,'--disable-quic']:[]});
const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(30000);
const report={at:new Date().toISOString(),url:base,checks:[],screenshots:[],errors:[],liveGenerationCalls:0};page.on('pageerror',e=>report.errors.push(e.message));
const b=name=>page.getByRole('button',{name,exact:true}),check=(ok,label)=>{if(!ok)throw Error(label);report.checks.push(label);console.log('PASS '+label);};
const shot=async name=>{const path=`${out}/${name}.png`;await page.screenshot({path});report.screenshots.push(path);};
try{
 await page.goto(base);await toolAction(page, '剧情画卷');await page.locator('.story-dream-tools .dream-entry').click();await page.getByText('空白的一页，等你入梦',{exact:true}).waitFor();await shot('mobile-empty-album');
 check(await page.locator('.dream-picture').count()===0,'fresh visitor sees an honest empty album');await b('关闭梦藏').click();await b('从此幕入局').click();await b('关闭动态漫画').click();await b('与他交谈').click();
 await page.locator('#sim-chat-message').fill('愿你今晚安心入梦');await b('说给他听').click();await b('将这句心声入画').click();await page.locator('.dream-workshop').waitFor();
 check((await page.locator('.dream-scene').textContent()).includes('玩家说：愿你今晚安心入梦'),'personal conversation capture contains the actual user line');await shot('mobile-conversation-workshop');await page.getByText('阅读完整剧情',{exact:true}).click();check(await page.locator('.dream-full-scene p').evaluate(e=>e.scrollHeight<=e.clientHeight+1),'expanded conversation is complete in one scrolling dialog');await shot('mobile-conversation-expanded');await b('关闭作画').click();
 // Failed task fixture: reauthentication must resume that ID, not create a duplicate.
 const job={...JSON.parse(readFileSync('reports/acceptance/dream-live.json')).job,status:'failed',resumeAvailable:true,error:'测试状态：暂时中断，继续查询原画。'};let retry=0,created=0;
 await page.route('**/api/dreams/jobs',async route=>{if(route.request().method()==='POST')created++;await route.fulfill({json:{jobs:[job]}});});
 await page.route(`**/api/dreams/jobs/${job.id}/retry`,async route=>{retry++;await route.fulfill({status:202,json:{job:{...job,status:'queued'}}});});
 await toolAction(page, '剧情画卷');await page.locator('.story-dream-tools .dream-entry').click();await b('刷新画册').click();await b('继续查询原画').click();
 await page.getByLabel('作画口令',{exact:true}).fill('test-access-only');await b('继续这幅画作').click();await page.locator('.dream-workshop').waitFor({state:'detached'});
 check(retry===1&&created===0,'reauthentication resumes the original job ID without a new-generation POST (fixture)');
 await b('关闭梦藏').click();await b('关闭剧情画卷').click();await toolAction(page, '游园设置');await page.getByLabel('避免剧透',{exact:true}).check();await page.getByRole('slider',{name:'阅读进度'}).fill('40');await b('关闭设置').click();
 check(!(await page.locator('.dream-toast').textContent())?.includes(job.moment.title),'late-chapter arrival and pending prompts respect spoiler setting');
 await toolAction(page, '剧情画卷');await page.locator('.story-dream-tools .dream-entry').click();check(await page.locator('.dream-painting').count()===0,'spoiler setting hides later collected and unfinished artwork');
 check(report.errors.length===0,'edge flows have no browser runtime errors');report.passed=true;
}catch(error){report.passed=false;report.error=String(error);await shot('edge-failure').catch(()=>{});process.exitCode=1;console.log(report.error);}
finally{writeFileSync(`${out}/edges-report.json`,JSON.stringify(report,null,2));await browser.close();}

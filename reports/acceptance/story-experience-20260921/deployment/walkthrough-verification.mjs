import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root='reports/acceptance/story-experience-20260921/deployment';
const shots='reports/browser/story-experience-20260921';
const base='https://daguanyuan-rumeng.zeabur.app/';
const ip=JSON.parse(fs.readFileSync('.local/story-experience/dns.json')).Answer.find(a=>a.type===1).data;
const report={at:new Date().toISOString(),url:base,checks:[],screenshots:[],characterResponses:[],errors:[],failed:[],paidModelCalls:0,dnsOverride:ip,tlsVerification:true};
const browser=await chromium.launch({channel:'chromium',headless:true,args:[`--host-resolver-rules=MAP ${new URL(base).hostname} ${ip}`,'--no-proxy-server','--disable-quic','--disable-http2']});
const check=(condition,label)=>{assert(condition,label);report.checks.push(label);console.log('PASS',label);};
const observe=page=>{
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('response',r=>{
    if(r.status()>=400)report.failed.push({path:new URL(r.url()).pathname,status:r.status()});
    if(r.url().includes('/models/characters/'))report.characterResponses.push({path:new URL(r.url()).pathname,status:r.status()});
  });
  page.setDefaultTimeout(30000);
};
const button=(page,name)=>page.getByRole('button',{name,exact:true});
const screenshot=async(page,name)=>{const file=shots+'/online-'+name+'.png';await page.screenshot({path:file});report.screenshots.push(file);};
const key='daguanyuan.simulation.v1';
try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();observe(page);
  await page.goto(base);await page.locator('.canvas-wrap[data-scene-ready="true"]').waitFor({timeout:180000});
  check(report.characterResponses.length===0,'normal garden defers character model downloads');
  await button(page,'世界推演').click();
  await page.waitForFunction(()=>document.querySelectorAll('.sim-stage-roster img').length===4&&[...document.querySelectorAll('.sim-stage-roster img')].every(im=>im.complete&&im.naturalWidth>0));
  await page.waitForLoadState('networkidle');await page.waitForTimeout(2000);
  check(new Set(report.characterResponses.filter(r=>r.status===200).map(r=>r.path)).size===4,'all four new local character models load over HTTPS');
  check(await page.getByLabel('入园玩法').isVisible(),'guided story entry is visible');
  await screenshot(page,'story-entry');
  await page.getByRole('button',{name:/竹下问安/}).click();
  await page.getByLabel(/^想对/).fill('今日竹影正好，你可想歇一歇？');
  await button(page,'说给他听').click();
  await page.waitForFunction(key=>{const j=JSON.parse(localStorage.getItem(key));return j?.[j.active].snapshots[j[j.active].cursor].worldState.conversations?.length===1;},key);
  const conversation=await page.evaluate(key=>{const j=JSON.parse(localStorage.getItem(key));return j[j.active].snapshots[j[j.active].cursor].worldState.conversations[0];},key);
  check(conversation.agent==='daiyu'&&conversation.provider==='本地规则','new greeting entry saves a real local conversation with Daiyu');
  await button(page,'园中纪事').click();
  await page.getByRole('button',{name:/邀一席茶/}).click();
  await button(page,'4×').click();
  for(let tick=1;tick<=6;tick++){
    const pending=await page.evaluate(key=>{const j=JSON.parse(localStorage.getItem(key));return j[j.active].snapshots[j[j.active].cursor].worldState.gathering?.status==='pending';},key);
    if(!pending)break;
    await button(page,'继续这场小聚').click();
    await page.waitForFunction(({key,tick})=>{const j=JSON.parse(localStorage.getItem(key));return j?.[j.active].snapshots[j[j.active].cursor].worldState.tick===tick;},{key,tick},{timeout:180000});
    console.log('Tea story saved step',tick);
  }
  const gathering=await page.evaluate(key=>{const j=JSON.parse(localStorage.getItem(key));return j[j.active].snapshots[j[j.active].cursor].worldState.gathering;},key);
  check(gathering.kind==='tea'&&gathering.status==='completed'&&gathering.participants.length===3,'new tea entry completes real walks and a saved three-person gathering');
  await button(page,'入园沉浸').click();await page.waitForTimeout(1800);await screenshot(page,'tea-desktop');
  const storageState=await context.storageState();await context.close();
  const mobileContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,storageState});
  const mobile=await mobileContext.newPage();observe(mobile);
  await mobile.goto(base);await mobile.locator('.canvas-wrap[data-scene-ready="true"]').waitFor({timeout:180000});
  await button(mobile,'世界推演').tap();
  await button(mobile,'入园沉浸').tap();
  await mobile.locator('.sim-stage-roster').getByRole('button',{name:'林黛玉',exact:true}).tap();
  await mobile.waitForLoadState('networkidle');await mobile.waitForTimeout(2000);
  check(await button(mobile,'打开推演手记').isVisible()&&await button(mobile,'下一刻').isVisible(),'390px touch scene retains handbook and story controls');
  check(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px scene has no horizontal overflow');
  await screenshot(mobile,'tea-mobile');
  check(report.errors.length===0&&report.failed.length===0,'walkthrough has no page or HTTP resource errors');
  report.passed=true;
}catch(error){report.passed=false;report.failure=String(error);console.error(report.failure);const last=browser.contexts().at(-1)?.pages().at(-1);if(last)await last.screenshot({path:'.local/story-experience/online-walkthrough-failure.png'}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();fs.writeFileSync(root+'/walkthrough.json',JSON.stringify(report,null,2));}

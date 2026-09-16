import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
await page.goto('http://127.0.0.1:4275/');
await page.locator('.canvas-wrap[data-scene-ready="true"]').waitFor({timeout:90000});
await page.getByRole('button',{name:'世界推演',exact:true}).click();
await page.getByRole('button',{name:'创建 IF 世界',exact:true}).click();
await page.getByRole('button',{name:'替换 IF 分支',exact:true}).waitFor();
await page.locator('#sim-if-input').fill('如果宝玉知道黛玉想与他谈一谈');
await page.getByRole('button',{name:'替换 IF 分支',exact:true}).click();
await page.locator('.sim-condition').getByText('贾宝玉得知：黛玉想与他谈一谈',{exact:true}).waitFor();
for(const n of [1,2]){await page.getByRole('button',{name:'运行下一 Tick',exact:true}).click();await page.getByText(`已保存至 Tick ${n}`,{exact:true}).waitFor({timeout:60000});}
const j=await page.evaluate(()=>JSON.parse(localStorage.getItem('daguanyuan.simulation.v1')));
const world=j.if.snapshots[j.if.cursor].worldState;
if(!world.agents.daiyu.memories.some(m=>m.type==='knowledge'&&m.content==='黛玉想与他谈一谈'))throw new Error('Replacement knowledge did not arrive');
if(new Set(world.agents.baoyu.memories.filter(m=>m.type==='knowledge').map(m=>m.knowledgeId)).size!==2)throw new Error('Knowledge collision');
if(await page.evaluate(()=>!!window.__simulationTest||!!window.__gardenTest))throw new Error('Production test hook leak');
if(errors.length)throw new Error(errors.join('\n'));
const report={at:new Date().toISOString(),url:page.url(),status:'passed',twoInterventionsSameTick:true,distinctKnowledgeIds:true,correctReceivedKnowledge:true,productionHooksAbsent:true,errors};
writeFileSync('reports/acceptance/simulation-final-package.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close()}

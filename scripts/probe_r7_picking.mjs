import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
const b=await chromium.launch({channel:'msedge',headless:true}),p=await b.newPage({viewport:{width:1440,height:900}}),rows=[];
await p.goto('http://127.0.0.1:4175/');await p.waitForFunction(()=>window.__gardenTest?.state().loaded,null,{timeout:90000});await p.waitForLoadState('networkidle');await p.waitForTimeout(2000);
const target=()=>p.evaluate(()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect(),v=window.__gardenTest.project('yihongyuan'),e=document.elementFromPoint(r.x+v.x,r.y+v.y);return {x:r.x+v.x,y:r.y+v.y,topTag:e?.tagName,topClass:e?.className,topLabel:e?.getAttribute('aria-label'),topText:e?.innerText?.slice(0,150),state:window.__gardenTest.state().selectedPlaceId}});
rows.push({action:'initial',...await target()});
for(const delta of [280,280,600,-1160]){await p.mouse.move(640,350);await p.mouse.wheel(0,delta);await p.waitForTimeout(2000);rows.push({action:'wheel '+delta,...await target()})}
writeFileSync('reports/acceptance/r7-picking-observation.json',JSON.stringify(rows,null,2));console.log(rows);await b.close();

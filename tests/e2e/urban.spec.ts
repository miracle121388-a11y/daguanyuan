import {test,expect} from '@playwright/test';
import {mkdirSync,readFileSync} from 'node:fs';
import {shot,writeArtifact} from './artifacts';
const urban=JSON.parse(readFileSync('public/urban-context.json','utf8')) as {revision:string;instances:{kind:string}[]};
const overview=JSON.parse(readFileSync('public/scene-manifest.json','utf8')).overviewCamera;

test('mansion roof setting renders at high and garden eye levels through day and night',async({page})=>{
 test.setTimeout(180000);const folder=`reports/browser/${urban.revision}`;mkdirSync(folder,{recursive:true});
 const errors:string[]=[],failed:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url())});
 await page.goto('/');await page.waitForFunction(()=>(window as any).__gardenTest?.state().loaded);
 await page.waitForLoadState('networkidle');
 await page.getByRole('button',{name:'切换地点名签',exact:true}).click();
 const native=await page.evaluate(()=>{
  const meshes:any[]=[];(window as any).__gardenTest.scene.traverse((o:any)=>{if(o.userData.urbanContext)meshes.push({name:o.name,kind:o.userData.urbanPrototype,instances:o.count,role:o.userData.urbanRole,vertices:o.geometry.attributes.position.count})});
  return meshes;
 });
 for(const kind of new Set(urban.instances.map(r=>r.kind))){
  const parts=native.filter(m=>m.kind===kind);expect(parts.length).toBeGreaterThan(0);
  expect(parts.every(p=>p.instances===urban.instances.filter(r=>r.kind===kind).length)).toBe(true);
 }
 await page.waitForTimeout(1300);await shot(page,`${folder}/urban-overview.png`);
 const views=[
  {name:'garden-eye-east',eye:[52,2.2,-20],target:[140,1,-22]},
  {name:'upper-gallery-east',eye:[52,27,-20],target:[175,5,-22]},
  {name:'upper-storey-glimpse',eye:[65,12,-20],target:[170,6,-30]},
  {name:'wall-grove-east',eye:[128,3.1,65],target:[142,5,36]},
  {name:'wall-grove-north',eye:[5,3.1,-126],target:[-35,6,-142]},
  {name:'private-backrange',eye:[176,29,62],target:[143,3,34]},
  {name:'water-eye-north',eye:[20,2.5,-28],target:[20,1.1,-143]},
  {name:'mansion-aerial',eye:[-165,130,175],target:[-30,0,-15]},
  {name:'capital-skyline',eye:[130,155,260],target:[-125,0,-185]},
  {name:'temple-quarter',eye:[-190,83,-78],target:[-242,0,-221]},
  {name:'front-street',eye:[-64,42,270],target:[0,2,204]},
  {name:'market-courts',eye:[125,76,350],target:[224,0,237]},
 ];
 for(const view of views){
  await page.evaluate(v=>(window as any).__gardenTest.controls.setLookAt(...v.eye,...v.target,false),view);
  await page.waitForTimeout(1300);await shot(page,`${folder}/${view.name}.png`);
  const camera=await page.evaluate(()=>(window as any).__gardenTest.camera.position.toArray());
  expect(camera.every((v:number,i:number)=>Math.abs(v-view.eye[i])<.15)).toBe(true);
 }
 await page.getByRole('button',{name:'回到全园',exact:true}).click();
 // These inspection cameras are set directly through the test hook. Restore
 // the authored overview explicitly before checking the night composition.
 await page.evaluate(v=>(window as any).__gardenTest.controls.setLookAt(...v.position,...v.target,false),overview);
 await page.getByRole('button',{name:'月夜',exact:true}).click();await page.waitForTimeout(1300);await shot(page,`${folder}/urban-night.png`);
 expect(errors).toEqual([]);expect(failed).toEqual([]);
 writeArtifact(`reports/acceptance/${urban.revision}-urban-browser.json`,JSON.stringify({views,native,errors,failed},null,2));
});

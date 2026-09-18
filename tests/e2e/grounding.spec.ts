import {test,expect} from '@playwright/test';
import {mkdirSync,readFileSync} from 'node:fs';
import {shot,writeArtifact} from './artifacts';
const revision=JSON.parse(readFileSync('config/garden.layout.json','utf8')).assetRevision.split('-').at(-1);
const vegetation=JSON.parse(readFileSync('public/scene-manifest.json','utf8')).vegetation as {position:number[]}[];
const focalRoots=(JSON.parse(readFileSync('assets/processed/grounding-r21/plan.json','utf8')).focalRoots as {position:number[]}[]).map(({position:p})=>({position:[p[0],p[2],-p[1]]}));

test('root gardens connect soft ground, low planting and retained courts in the delivered scene',async({page})=>{
 test.setTimeout(150000);
 const errors:string[]=[],failed:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url())});
 await page.goto('/');await page.waitForFunction(()=>(window as any).__gardenTest?.state().loaded);
 await page.waitForLoadState('networkidle');
 await page.getByRole('button',{name:'切换地点名签',exact:true}).click();
 const layer=await page.evaluate(()=>{
  const meshes:any[]=[];(window as any).__gardenTest.scene.traverse((o:any)=>{
   if(o.isMesh&&o.name.includes('Sunwen21_'))meshes.push({name:o.name,vertices:o.geometry.attributes.position.count,colors:o.geometry.attributes.color?.count??0});
  });return meshes;
 });
 expect(layer.some(m=>m.name.includes('Root_Surface')&&m.colors>0)).toBe(true);
 expect(layer.filter(m=>!m.name.includes('Root_Surface')).length).toBeGreaterThanOrEqual(5);
 const rootCoverage=await page.evaluate(async roots=>{
  const response=await fetch('/textures/ground/garden-ground-zones.png');
  const bitmap=await createImageBitmap(await response.blob());
  const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
  const context=canvas.getContext('2d')!;context.drawImage(bitmap,0,0);
  const pixels=context.getImageData(0,0,bitmap.width,bitmap.height).data;
  return roots.map(({position:p})=>{
   const x=Math.floor((p[0]+384)/768*bitmap.width),y=Math.floor((384+p[2])/768*bitmap.height);
   return pixels[(y*bitmap.width+x)*4];
  });
 },[...vegetation,...focalRoots]);
 expect(rootCoverage.every(value=>value>200)).toBe(true);
 const folder=`reports/browser/${revision}`;mkdirSync(folder,{recursive:true});
 const views=[
  {name:'ground-overview',eye:[170,165,218],target:[0,0,0]},
  {name:'connected-west-groves',eye:[-52,18,114],target:[-72,1.2,90]},
  {name:'root-eye-west',eye:[-61,4.2,122],target:[-68,2.5,113]},
  {name:'soft-east-courts',eye:[138,39,96],target:[97,0,52]},
  {name:'moss-north-wall',eye:[50,9,-128],target:[25,1,-139]},
  {name:'water-ground-transition',eye:[52,3,-20],target:[90,1,-35]},
  {name:'courtyard-flowering-tree-base',eye:[104,2.4,105],target:[98,.65,100]},
 ];
 for(const view of views){
  await page.evaluate(v=>(window as any).__gardenTest.controls.setLookAt(...v.eye,...v.target,false),view);
  await page.waitForTimeout(1400);await shot(page,`${folder}/${view.name}.png`);
 }
 expect(errors).toEqual([]);expect(failed).toEqual([]);
 writeArtifact(`reports/acceptance/${revision}-grounding-browser.json`,JSON.stringify({layer,rootCount:vegetation.length,builtInCourtRoots:focalRoots.length,minimumRootMask:Math.min(...rootCoverage),views,errors,failed},null,2));
});

// Remove only obsolete submerged lotus discs from combined overview plant meshes.
// Their editable source is retained in a hidden native layer; complete lotus
// plants replace them. Terrain, architecture and navigation geometry are untouched.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import {readFileSync,writeFileSync} from 'node:fs';
import {replaceFile} from './atomic_replace.mjs';

const layout=JSON.parse(readFileSync('config/garden.layout.json','utf8'));
const inside=(ring,x,y)=>{
 let value=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])value=!value;
 }
 return value;
};
const wet=(x,y)=>inside(layout.terrain.lake.outline,x,y)&&!layout.terrain.lake.holes.some(r=>inside(r,x,y));
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule()});
const reports=[];
for(const file of ['public/models/overview.glb','public/models/overview-low.glb']){
 const doc=await io.read(file);let removed=0;
 for(const node of doc.getRoot().listNodes()){
  if(!node.getMesh()?.getName().startsWith('Mobile_landscape_plants'))continue;
  const matrix=node.getWorldMatrix();
  for(const p of node.getMesh().listPrimitives()){
   const index=p.getIndices(),position=p.getAttribute('POSITION');if(!index||!position)continue;
   const values=index.getArray(),xyz=position.getArray(),keep=[];
   const world=i=>{const x=xyz[i*3],y=xyz[i*3+1],z=xyz[i*3+2];return [matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12],matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13],matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14]]};
   for(let i=0;i<values.length;i+=3){
    const points=[values[i],values[i+1],values[i+2]].map(world);
    // The incumbent simplifier displaced the old discs by up to 8 cm.
    const legacy=points.every(v=>v[1]<.12&&v[1]>-.10)&&wet(points.reduce((s,v)=>s+v[0],0)/3,-points.reduce((s,v)=>s+v[2],0)/3);
    if(legacy)removed++;else keep.push(values[i],values[i+1],values[i+2]);
   }
   if(keep.length!==values.length)p.setIndices(index.clone().setArray(new values.constructor(keep)));
  }
 }
 if(removed){
  for(const extension of doc.getRoot().listExtensionsUsed())if(extension.extensionName==='KHR_draco_mesh_compression')extension.dispose();
  await io.write(file+'.lotus.glb',doc);replaceFile(file+'.lotus.glb',file);
 }
 reports.push({file,removedTriangles:removed,scope:'Only combined legacy plant triangles at water height within the reviewed lake polygon'});
 console.log('Replaced legacy lotus discs',file,removed);
}
writeFileSync('reports/acceptance/r17-retired-lotus.json',JSON.stringify(reports,null,2)+'\n');

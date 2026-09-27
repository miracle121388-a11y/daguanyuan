import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import draco from 'draco3dgltf';

const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco.createDecoderModule()});
const manifest=JSON.parse(fs.readFileSync('public/textures/characters/manifest.json'));
const results=[];
for(const entry of manifest.files.filter(f=>f.path.endsWith('.glb'))){
 const document=await io.read(entry.path),root=document.getRoot();
 let triangles=0;const expressions=[];
 for(const mesh of root.listMeshes())for(const primitive of mesh.listPrimitives()){
  const position=primitive.getAttribute('POSITION'),count=position.getCount();
  for(const semantic of primitive.listSemantics()){
   const attribute=primitive.getAttribute(semantic);
   assert.equal(attribute.getCount(),count,`${entry.path} ${semantic} count`);
   assert(Array.from(attribute.getArray()).every(Number.isFinite),`${entry.path} ${semantic} finite`);
  }
  const weights=primitive.getAttribute('WEIGHTS_0');
  if(weights)for(let i=0;i<count;i++){
   const value=weights.getElement(i,[]);
   assert(value.every(w=>w>=0&&w<=1),'cloth skin weights bounded');
   assert(Math.abs(value.reduce((a,b)=>a+b,0)-1)<.002,'cloth skin weights normalized');
  }
  const indices=primitive.getIndices();assert(indices);assert(Array.from(indices.getArray()).every(i=>i<count));triangles+=indices.getCount()/3;
  for(const target of primitive.listTargets()){
   const deltas=target.getAttribute('POSITION');assert(deltas&&deltas.getCount()===count);
   const array=Array.from(deltas.getArray());assert(array.every(Number.isFinite));
   const max=Math.max(...array.map(Math.abs));assert(max>0&&max<.2,`${entry.path} expression displacement ${max}`);
   expressions.push({mesh:mesh.getName(),maxDisplacement:max});
  }
 }
 assert(root.listNodes().find(n=>n.getName()===`${entry.agent}_face`)?.getExtras().collarProtectedFaceVertices>100,'face and jaw protected from collar compression');
 const neckMount=root.listNodes().find(n=>n.getName()===`${entry.agent}_neckMount`);
 assert(neckMount?.listChildren().some(n=>n.getName()===`${entry.agent}_head`),'head animation retains the fixed cervical mount');
 assert(neckMount.getTranslation().every((v,i)=>Math.abs(v-neckMount.getExtras().fixedCollarAnchor[i])<1e-6),'cervical correction keeps the collar attachment fixed');
 assert(expressions.length>=4,'blink, speak and two hand grasps');
 assert(root.listTextures().every(t=>t.getImage()?.length>0),'embedded textures decoded');
 const rightForearm=root.listNodes().find(n=>n.getName()===`${entry.agent}_rightForearm`);
 assert(rightForearm.getExtras().handAnchorY<-.2&&rightForearm.getExtras().handAnchorY>-.4,'cup anchor follows anatomical forearm');
 assert(rightForearm.listChildren().some(n=>n.getName()===`${entry.agent}_brush`),'writing brush stays attached to hand');
 {
  assert(root.listSkins().length>0,'Ming clothing has a deformation skeleton');
  for(const part of ['leftArm','rightArm','leftForearm','rightForearm']){
   const bone=root.listNodes().find(n=>n.getName()===`${entry.agent}_cloth_${part}`),driver=root.listNodes().find(n=>n.getName()===`${entry.agent}_${part}`);
   assert(bone,'cloth animation joint '+part);
   assert(bone.getTranslation().every((v,i)=>Math.abs(v-driver.getTranslation()[i])<1e-5),'cloth and anatomical joint rest positions agree');
  }
 }
 if(entry.agent==='baoyu')for(const side of ['left','right']){
  const sleeve=root.listNodes().find(n=>n.getName()===`baoyu_${side}_continuousSleeve`);
  assert(sleeve?.getSkin(),'male sleeve is a single skinned shoulder-to-cuff mesh');
  assert.equal(sleeve.getMesh().listPrimitives().length,1,'no separate elbow segment');
  const p=sleeve.getMesh().listPrimitives()[0],position=p.getAttribute('POSITION'),weights=p.getAttribute('WEIGHTS_0');
  const ys=Array.from({length:position.getCount()},(_,i)=>position.getElement(i,[])[1]);
  assert(Math.max(...ys)-Math.min(...ys)>.45,'sleeve covers upper arm and forearm');
  assert(Array.from({length:weights.getCount()},(_,i)=>weights.getElement(i,[])).some(w=>w.filter(v=>v>.1).length>1),'smooth joint weights');
 }
 results.push({path:entry.path,triangles,meshes:root.listMeshes().length,textures:root.listTextures().length,expressions});
}
for(const agent of ['baoyu','daiyu','baochai','wangxifeng'])assert(results.find(r=>r.path.endsWith(`/${agent}.glb`)).triangles>results.find(r=>r.path.endsWith(`/${agent}-low.glb`)).triangles*2);
const baselinePath=process.env.GARDEN_CHARACTER_BASELINE;
const baseline=baselinePath?JSON.parse(fs.readFileSync(baselinePath,'utf8')):[];
const preserved=baseline.filter(f=>!f.path.startsWith('public/models/characters/')&&!f.path.startsWith('public/textures/characters/'));
for(const file of preserved)assert.equal(createHash('sha256').update(fs.readFileSync(file.path)).digest('hex'),file.sha256,`Preserve ${file.path}`);
fs.mkdirSync('reports/acceptance/characters-ming-20260927',{recursive:true});
fs.writeFileSync('reports/acceptance/characters-ming-20260927/models.json',JSON.stringify({revision:manifest.revision,models:results,unchangedOtherPublicFiles:preserved.length},null,2)+'\n');
console.log(`Decoded ${results.length} character GLBs; morphs, attributes, indices, textures valid. ${preserved.length} other public files unchanged.`);

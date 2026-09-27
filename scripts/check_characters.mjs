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
  const indices=primitive.getIndices();assert(indices);assert(Array.from(indices.getArray()).every(i=>i<count));triangles+=indices.getCount()/3;
  for(const target of primitive.listTargets()){
   const deltas=target.getAttribute('POSITION');assert(deltas&&deltas.getCount()===count);
   const array=Array.from(deltas.getArray());assert(array.every(Number.isFinite));
   const max=Math.max(...array.map(Math.abs));assert(max>0&&max<.2,`${entry.path} expression displacement ${max}`);
   expressions.push({mesh:mesh.getName(),maxDisplacement:max});
  }
 }
 assert(expressions.length>=4,'blink, speak and two hand grasps');
 assert(root.listTextures().every(t=>t.getImage()?.length>0),'embedded textures decoded');
 results.push({path:entry.path,triangles,meshes:root.listMeshes().length,textures:root.listTextures().length,expressions});
}
for(const agent of ['baoyu','daiyu','baochai','wangxifeng'])assert(results.find(r=>r.path.endsWith(`/${agent}.glb`)).triangles>results.find(r=>r.path.endsWith(`/${agent}-low.glb`)).triangles*2);
const baselinePath=process.env.GARDEN_CHARACTER_BASELINE;
const baseline=baselinePath?JSON.parse(fs.readFileSync(baselinePath,'utf8')):[];
const preserved=baseline.filter(f=>!f.path.startsWith('public/models/characters/')&&!f.path.startsWith('public/textures/characters/'));
for(const file of preserved)assert.equal(createHash('sha256').update(fs.readFileSync(file.path)).digest('hex'),file.sha256,`Preserve ${file.path}`);
fs.mkdirSync('reports/acceptance/characters-20260926',{recursive:true});
fs.writeFileSync('reports/acceptance/characters-20260926/models.json',JSON.stringify({revision:manifest.revision,models:results,unchangedOtherPublicFiles:preserved.length},null,2)+'\n');
console.log(`Decoded ${results.length} character GLBs; morphs, attributes, indices, textures valid. ${preserved.length} other public files unchanged.`);

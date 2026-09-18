import {readFileSync} from 'node:fs';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {mergeDocuments,prune,unpartition} from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import {replaceFile} from './atomic_replace.mjs';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule()});
const urban=JSON.parse(readFileSync('config/garden.urban.json','utf8'));
for(const file of ['public/models/overview.glb','public/models/overview-low.glb']){
 const doc=await io.read(file),source=await io.read(`assets/processed/urban-${urban.revision}/garden-ground.glb`);
 const groundMaterial=doc.getRoot().listMaterials().find(m=>m.getName()==='earth');
 if(!groundMaterial)throw Error('Missing existing garden ground material: '+file);
 let removed=0;
 for(const node of [...doc.getRoot().listNodes()]){
  const mesh=node.getMesh();
  if(mesh?.listPrimitives().some(p=>p.getMaterial()?.getName()==='earth')){node.dispose();removed++}
 }
 if(removed!==1)throw Error(`Expected one unified garden ground in ${file}, got ${removed}`);
 const scene=doc.getRoot().listScenes()[0],map=mergeDocuments(doc,source);
 for(const node of source.getRoot().listNodes()){
  const added=map.get(node);for(const primitive of added.getMesh()?.listPrimitives()??[])primitive.setMaterial(groundMaterial);
 }
 for(const sourceScene of source.getRoot().listScenes()){
  const added=map.get(sourceScene);for(const node of [...added.listChildren()])scene.addChild(node);added.dispose();
 }
 for(const extension of doc.getRoot().listExtensionsUsed())if(extension.extensionName==='KHR_draco_mesh_compression')extension.dispose();
 await doc.transform(prune({keepLeaves:true,keepAttributes:true,keepSolidTextures:true}),unpartition());
 await io.write(file+'.urban.glb',doc);replaceFile(file+'.urban.glb',file);
 console.log('Replaced only the outer ground:',file);
}

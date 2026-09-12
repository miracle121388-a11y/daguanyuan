import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {mergeDocuments,prune,unpartition} from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import {readFileSync,writeFileSync} from 'node:fs';
import {replaceFile} from './atomic_replace.mjs';
import {createHash} from 'node:crypto';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule()});
const layout=JSON.parse(readFileSync('config/garden.layout.json','utf8'));
const revision='r'+layout.assetRevision.split('-r').at(-1);
const semantics=doc=>doc.getRoot().listNodes().filter(n=>n.getExtras().placeId||n.getExtras().hotspotId).map(n=>({name:n.getName(),extras:n.getExtras(),t:n.getTranslation(),r:n.getRotation(),s:n.getScale()})).sort((a,b)=>a.name.localeCompare(b.name));
const botanical=n=>n.getMesh()?.listPrimitives().every(p=>/^(botanical_|Mobile_VertexColor)/.test(p.getMaterial()?.getName()??''));
function geometryHash(node){const hash=createHash('sha256');for(const p of node.getMesh().listPrimitives()){for(const a of [p.getIndices(),...p.listAttributes()])if(a){const v=a.getArray();hash.update(new Uint8Array(v.buffer,v.byteOffset,v.byteLength))}}return hash.digest('hex')}
const jobs=[...layout.places.map(p=>['public/models/places-low/'+p.id+'.glb',p.id+'.glb']),['public/models/overview.glb','overview.glb'],['public/models/overview-low.glb','overview.glb']];
const rows=[];
for(const [file,patch] of jobs){
 const doc=await io.read(file),source=await io.read('assets/processed/botanical-patch-'+revision+'/'+patch),scene=doc.getRoot().listScenes()[0],before=semantics(doc);
 const retained=doc.getRoot().listNodes().filter(n=>n.getMesh()&&!botanical(n));const retainedHashes=new Map(retained.map(n=>[n,geometryHash(n)]));
 const roots=new Map(doc.getRoot().listNodes().filter(n=>n.getExtras().entityType==='place').map(n=>[n.getExtras().placeId,n]));
 for(const n of doc.getRoot().listNodes())if(botanical(n))n.dispose();
 const map=mergeDocuments(doc,source),moved=new Set();let added=0,omittedSubpixelStems=0;
 for(const src of source.getRoot().listNodes()){
  if(!src.getMesh())continue;
  if(patch==='overview.glb'&&src.getMesh().listPrimitives().every(p=>p.getMaterial()?.getName()==='botanical_stem')){omittedSubpixelStems++;continue}
  const dest=map.get(src),parent=src.getParentNode();
  for(const p of dest.listParents())if(p.propertyType==='Scene')p.removeChild(dest);
  if(parent?.getExtras().placeId){const target=roots.get(parent.getExtras().placeId);if(!target)throw Error('Missing existing place root');target.addChild(dest)}else scene.addChild(dest);
  moved.add(dest);added++;
 }
 for(const src of source.getRoot().listScenes())map.get(src).dispose();
 for(const src of source.getRoot().listNodes())if(!moved.has(map.get(src)))map.get(src).dispose();
 for(const [n,hash] of retainedHashes)if(geometryHash(n)!==hash)throw Error('Retained architecture/terrain geometry changed');
 if(JSON.stringify(before)!==JSON.stringify(semantics(doc)))throw Error('Place/hotspot semantics changed: '+file);
 for(const e of doc.getRoot().listExtensionsUsed())if(e.extensionName==='KHR_draco_mesh_compression')e.dispose();
 // Empty semantic anchors stay; unreferenced old materials and their origin
 // extras must not keep obsolete leaf images in the delivered model.
 await doc.transform(prune({keepLeaves:true,keepAttributes:true,keepSolidTextures:true,keepExtras:false}),unpartition());
 if(JSON.stringify(before)!==JSON.stringify(semantics(doc)))throw Error('Pruning changed anchors');
 await io.write(file+'.botanical.glb',doc);replaceFile(file+'.botanical.glb',file);
 rows.push({file,retainedMeshes:retained.length,retainedGeometryHashesMatch:true,semanticNodes:before.length,addedBotanicalMeshes:added,omittedSubpixelStemMeshes:omittedSubpixelStems});
}
writeFileSync('reports/acceptance/'+revision+'-botanical-export-preservation.json',JSON.stringify({at:new Date().toISOString(),revision:layout.assetRevision,rows},null,2));
console.log('Replaced botanical LOD only; cached architecture, terrain and anchor semantics preserved in',rows.length,'models.');

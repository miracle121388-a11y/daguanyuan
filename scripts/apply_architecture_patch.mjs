import {NodeIO,PropertyType} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {mergeDocuments,prune,unpartition,dedup} from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {replaceFile} from './atomic_replace.mjs';

const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule()});
const layout=JSON.parse(readFileSync('config/garden.layout.json','utf8'));
const revision=JSON.parse(readFileSync(process.argv.includes('--sunwen')?'config/garden.sunwen.json':'config/qing.palette.json','utf8')).revision;
const semantics=doc=>doc.getRoot().listNodes().filter(n=>n.getExtras().placeId||n.getExtras().hotspotId).map(n=>({name:n.getName(),extras:n.getExtras(),t:n.getTranslation(),r:n.getRotation(),s:n.getScale()})).sort((a,b)=>a.name.localeCompare(b.name));
const placeId=n=>{for(let p=n;p;p=p.getParentNode())if(p.getExtras().placeId)return p.getExtras().placeId;return null};
const replaced=n=>!!placeId(n)&&!!n.getMesh()&&(n.getExtras().qingArchitecture||n.getExtras().enclosureRevision||n.getMesh().listPrimitives().every(p=>(/^(Baked_Mobile_(?!landscape)|Baked_.*_screen(?:\.\d+)?$|roof$|screen$|lantern$|silk$)/.test(p.getMaterial()?.getName()??'')||['roof','screen','lantern','silk'].includes(p.getMaterial()?.getExtras().sunwenRole))));
function geometryHash(node){const hash=createHash('sha256');for(const p of node.getMesh().listPrimitives())for(const a of [p.getIndices(),...p.listAttributes()])if(a){const v=a.getArray();hash.update(new Uint8Array(v.buffer,v.byteOffset,v.byteLength))}return hash.digest('hex')}
const jobs=[...layout.places.map(p=>['public/models/places-low/'+p.id+'.glb',p.id+'.glb']),['public/models/overview.glb','overview.glb'],['public/models/overview-low.glb','overview.glb']];
const rows=[];
for(const [file,patch] of jobs){
 const doc=await io.read(file),source=await io.read(`assets/processed/architecture-${revision}/${patch}`),before=semantics(doc);
 const retained=new Map(doc.getRoot().listNodes().filter(n=>n.getMesh()&&!replaced(n)).map(n=>[n,geometryHash(n)]));
 const roots=new Map(doc.getRoot().listNodes().filter(n=>n.getExtras().entityType==='place').map(n=>[n.getExtras().placeId,n]));
 let removed=0;for(const n of doc.getRoot().listNodes())if(replaced(n)){n.dispose();removed++}
 const map=mergeDocuments(doc,source),moved=new Set();
 for(const src of source.getRoot().listNodes()){
  if(!src.getMesh())continue;
  const dest=map.get(src),target=roots.get(placeId(src));
  if(!target)throw Error('Missing existing place root: '+file);
  for(const p of dest.listParents())if(p.propertyType==='Scene')p.removeChild(dest);
  target.addChild(dest);moved.add(dest);
 }
 for(const src of source.getRoot().listScenes())map.get(src).dispose();
 for(const src of source.getRoot().listNodes())if(!moved.has(map.get(src)))map.get(src).dispose();
 for(const [node,hash] of retained)if(geometryHash(node)!==hash)throw Error('Retained geometry changed: '+node.getName());
 for(const e of doc.getRoot().listExtensionsUsed())if(e.extensionName==='KHR_draco_mesh_compression')e.dispose();
 await doc.transform(prune({keepLeaves:true,keepAttributes:true,keepSolidTextures:true,keepExtras:false}),dedup({propertyTypes:[PropertyType.MATERIAL,PropertyType.TEXTURE]}),unpartition());
 if(JSON.stringify(before)!==JSON.stringify(semantics(doc)))throw Error('Place/hotspot semantics changed: '+file);
 await io.write(file+'.architecture.glb',doc);replaceFile(file+'.architecture.glb',file);
 rows.push({file,removedArchitectureMeshes:removed,addedArchitectureMeshes:moved.size,retainedMeshes:retained.size,retainedGeometryHashesMatch:true,semanticNodes:before.length});
 console.log('Architecture patched:',file);
}
writeFileSync(`reports/acceptance/${revision}-architecture-preservation.json`,JSON.stringify({revision:layout.assetRevision,rows},null,2)+'\n');

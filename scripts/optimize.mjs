import {NodeIO,PropertyType} from '@gltf-transform/core';
import {dedup,weld,getBounds,draco} from '@gltf-transform/functions';
import {KHRDracoMeshCompression} from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import {readdirSync,mkdirSync,copyFileSync,writeFileSync,statSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const io=new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule(),'draco3d.encoder':await draco3d.createEncoderModule()});
const files=['public/models/overview.glb','public/models/overview-low.glb',...['places','places-low'].flatMap(dir=>readdirSync('public/models/'+dir).filter(f=>f.endsWith('.glb')).map(f=>'public/models/'+dir+'/'+f))];
mkdirSync('public/draco',{recursive:true});for(const f of ['draco_decoder.js','draco_decoder.wasm','draco_wasm_wrapper.js'])copyFileSync('node_modules/three/examples/jsm/libs/draco/gltf/'+f,'public/draco/'+f);
for(const f of ['LICENSE','AUTHORS'])copyFileSync('references/licenses/draco-'+f,'public/draco/'+f);
const reports=[];mkdirSync('assets/processed/baseline',{recursive:true});
function semantics(doc){return doc.getRoot().listNodes().filter(n=>n.getExtras().placeId||n.getExtras().hotspotId).map(n=>({name:n.getName(),extras:n.getExtras(),translation:n.getTranslation(),rotation:n.getRotation(),scale:n.getScale()})).sort((a,b)=>a.name.localeCompare(b.name))}
for(const file of files){
 copyFileSync(file,'assets/processed/baseline/'+file.replaceAll('/','_'));
 const doc=await io.read(file),before=semantics(doc),bounds=getBounds(doc.getRoot().listScenes()[0]),materials=doc.getRoot().listMaterials().map(m=>m.getName()).sort(),bytes=statSync(file).size;
 if(bounds.max[1]>30)throw Error('Unexpected geometry above the garden height envelope: '+file+' '+bounds.max[1]);
 await doc.transform(dedup({propertyTypes:[PropertyType.ACCESSOR,PropertyType.TEXTURE]}),weld(),draco({method:'edgebreaker',encodeSpeed:5,decodeSpeed:5,quantizePosition:16,quantizeNormal:10,quantizeTexcoord:12}));
 await io.write(file,doc);const after=await io.read(file);
 if(JSON.stringify(before)!==JSON.stringify(semantics(after)))throw Error('Metadata changed: '+file);
 if(JSON.stringify(materials)!==JSON.stringify(after.getRoot().listMaterials().map(m=>m.getName()).sort()))throw Error('Materials changed');
 const nextBounds=getBounds(after.getRoot().listScenes()[0]);if([...bounds.min,...bounds.max].some((v,i)=>Math.abs(v-[...nextBounds.min,...nextBounds.max][i])>.012))throw Error('Bounds changed beyond 12mm quantization tolerance');
 reports.push({file,beforeBytes:bytes,afterBytes:statSync(file).size,sha256:createHash('sha256').update(readFileSync(file)).digest('hex'),semanticNodes:before.length,bounds:nextBounds,materials:materials.length,steps:['dedup accessors/textures','weld','Draco with local decoder'],compression:'Draco; 16-bit positions; measured bounds tolerance 12mm',passed:true});
}
writeFileSync('reports/acceptance/model-optimization.json',JSON.stringify(reports,null,2));console.log('Optimized and re-read',reports.length,'GLBs; IDs, anchors, materials and bounds preserved.');
await import('./record_derivatives.mjs');

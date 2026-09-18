import {NodeIO,PropertyType} from '@gltf-transform/core';
import {dedup,weld,getBounds,draco} from '@gltf-transform/functions';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import {readdirSync,mkdirSync,copyFileSync,writeFileSync,statSync,readFileSync,unlinkSync,existsSync} from 'node:fs';
import {replaceFile as renameSync} from './atomic_replace.mjs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {shareTextures} from './shared_gltf_textures.mjs';
import {execFileSync} from 'node:child_process';
const worker=process.env.GARDEN_MODEL_WORKER;
const filter=process.env.GARDEN_MODEL_FILTER?.split(',');
const previous=filter?JSON.parse(readFileSync('reports/acceptance/model-optimization.json','utf8')):[];
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule(),'draco3d.encoder':await draco3d.createEncoderModule()});
const files=['public/models/overview.glb','public/models/overview-low.glb',...(existsSync('public/models/urban-context.glb')?['public/models/urban-context.glb']:[]),...(existsSync('public/models/sunwen-architecture.glb')?['public/models/sunwen-architecture.glb','public/models/sunwen-architecture-low.glb']:[]),...(existsSync('public/models/sunwen-landscape.glb')?['public/models/sunwen-landscape.glb','public/models/sunwen-landscape-low.glb']:[]),...['places','places-low','vegetation'].flatMap(dir=>readdirSync('public/models/'+dir).filter(f=>f.endsWith('.glb')).map(f=>'public/models/'+dir+'/'+f))];
mkdirSync('public/draco',{recursive:true});for(const f of ['draco_decoder.js','draco_decoder.wasm','draco_wasm_wrapper.js'])copyFileSync('node_modules/three/examples/jsm/libs/draco/gltf/'+f,'public/draco/'+f);
for(const f of ['LICENSE','AUTHORS'])copyFileSync('references/licenses/draco-'+f,'public/draco/'+f);
const reports=[];mkdirSync('assets/processed/baseline',{recursive:true});
function semantics(doc){return doc.getRoot().listNodes().filter(n=>n.getExtras().placeId||n.getExtras().hotspotId).map(n=>({name:n.getName(),extras:n.getExtras(),translation:n.getTranslation(),rotation:n.getRotation(),scale:n.getScale()})).sort((a,b)=>a.name.localeCompare(b.name))}
for(const file of files){
 if(worker&&worker!==file)continue;
 if(!worker&&filter&&!filter.includes(file.replace('public/models/',''))){reports.push(previous.find(row=>row.file===file));continue}
 if(!worker){
  const baseline='assets/processed/baseline/reference-'+file.replaceAll('/','_');
  const original=readFileSync(file),header=JSON.parse(original.subarray(20,20+original.readUInt32LE(12)));
  if(header.images?.some(image=>image.uri)){
   // Re-optimizing a delivery must not archive links relative to public/models
   // inside another folder. Keep a self-contained editable baseline instead.
   const source=await io.read(file);
   for(const extension of source.getRoot().listExtensionsUsed())if(extension.extensionName==='KHR_draco_mesh_compression')extension.dispose();
   writeFileSync(baseline+'.next',await io.writeBinary(source));
  }else copyFileSync(file,baseline+'.next');
  renameSync(baseline+'.next',baseline);
  // A worker exits before replacement, releasing Windows mapped input buffers.
  const resultPath=file+'.result.json';if(existsSync(resultPath))unlinkSync(resultPath);
  try{execFileSync(process.execPath,[import.meta.filename],{env:{...process.env,GARDEN_MODEL_WORKER:file},stdio:'inherit',timeout:60000})}
  catch(error){
   // Some Windows native encoder workers stall while exiting. Accept only the
   // completed, semantically validated artifact written by this exact run.
   if(!existsSync(resultPath)||!existsSync(file+'.final.glb'))throw error;
   const completed=JSON.parse(readFileSync(resultPath,'utf8'));
   if(!completed.passed||completed.sha256!==createHash('sha256').update(readFileSync(file+'.final.glb')).digest('hex'))throw error;
   console.log('Encoder exit timeout; completed artifact independently hash-checked:',file);
  }
  renameSync(file+'.final.glb',file);reports.push(JSON.parse(readFileSync(file+'.result.json','utf8')));unlinkSync(file+'.result.json');unlinkSync(file+'.optimizing.glb');
  continue;
 }
 const doc=await io.read(file),before=semantics(doc),bounds=getBounds(doc.getRoot().listScenes()[0]),materials=doc.getRoot().listMaterials().map(m=>m.getName()).sort(),bytes=statSync(file).size;
 if(bounds.max[1]>85)throw Error('Unexpected geometry above the planted hill envelope: '+file+' '+bounds.max[1]);
 const far=/\/overview(?:-low)?\.glb$/.test(file);
 await doc.transform(dedup({propertyTypes:[PropertyType.ACCESSOR,PropertyType.TEXTURE]}),weld(),draco({method:'edgebreaker',encodeSpeed:far?0:5,decodeSpeed:far?0:5,quantizePosition:16,quantizeNormal:10,quantizeTexcoord:far?11:12}));
 await io.write(file+'.optimizing.glb',doc);await shareTextures(file+'.optimizing.glb',file+'.final.glb');const after=await io.read(file+'.final.glb');
 if(JSON.stringify(before)!==JSON.stringify(semantics(after)))throw Error('Metadata changed: '+file);
 if(JSON.stringify(materials)!==JSON.stringify(after.getRoot().listMaterials().map(m=>m.getName()).sort()))throw Error('Materials changed');
 const nextBounds=getBounds(after.getRoot().listScenes()[0]);if([...bounds.min,...bounds.max].some((v,i)=>Math.abs(v-[...nextBounds.min,...nextBounds.max][i])>.012))throw Error('Bounds changed beyond 12mm quantization tolerance');
 const result={file,beforeBytes:bytes,afterBytes:statSync(file+'.final.glb').size,sha256:createHash('sha256').update(readFileSync(file+'.final.glb')).digest('hex'),semanticNodes:before.length,bounds:nextBounds,materials:materials.length,steps:['dedup accessors/textures','weld','Draco with local decoder'],compression:`Draco; 16-bit positions; ${far?11:12}-bit UV; measured bounds tolerance 12mm`,passed:true};
 writeFileSync(file+'.result.json',JSON.stringify(result));console.log('Validated',file);
}
if(worker)process.exit(0);
const sharedRoot=path.resolve('public/textures/shared'),usedImages=new Set();
for(const file of files){const b=readFileSync(file),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));for(const img of j.images??[])if(img.uri)usedImages.add(path.resolve(path.dirname(file),img.uri))}
for(const name of readdirSync(sharedRoot)){const target=path.resolve(sharedRoot,name),image=target.endsWith('.json')?target.slice(0,-5):target;if(target.startsWith(sharedRoot+path.sep)&&/^[a-f0-9]{64}\.(jpg|png|webp)(\.json)?$/.test(name)&&!usedImages.has(image))unlinkSync(target)}
writeFileSync('reports/acceptance/model-optimization.json.next',JSON.stringify(reports,null,2));renameSync('reports/acceptance/model-optimization.json.next','reports/acceptance/model-optimization.json');console.log('Optimized and re-read',reports.length,'GLBs; IDs, anchors, materials and bounds preserved.');
await import('./record_derivatives.mjs');

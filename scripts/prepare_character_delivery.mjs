/** Externalize identical character maps across LODs; preserve every geometry/morph/skin byte. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const hash=b=>createHash('sha256').update(b).digest('hex');
const directory='public/textures/characters-shared';fs.mkdirSync(directory,{recursive:true});
fs.mkdirSync('public/models/characters-stream',{recursive:true});
const encoded=new Map(),reports=[];
for(const agent of ['baoyu','daiyu','baochai','wangxifeng'])for(const suffix of ['', '-low']){
 const source=`public/models/characters/${agent}${suffix}.glb`,target=`public/models/characters-stream/${agent}${suffix}.glb`;
 const input=fs.readFileSync(source),size=input.readUInt32LE(12),doc=JSON.parse(input.subarray(20,20+size)),bin=input.subarray(28+size),removed=new Set(),maps=[];
 for(const image of doc.images??[]){
  if(image.bufferView===undefined)throw Error('Expected reviewed self-contained source character');
  const view=doc.bufferViews[image.bufferView],original=bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength),key=hash(original);
  if(!encoded.has(key)){
   const jpeg=image.mimeType==='image/jpeg';
   const pixels=jpeg?await sharp(original).webp({quality:92,effort:6}).toBuffer():original;
   const extension=jpeg?'webp':'png',sha256=hash(pixels),file=`${directory}/${sha256}.${extension}`;
   fs.writeFileSync(file,pixels);
   fs.writeFileSync(file+'.json',JSON.stringify({source,sourcePixelSha256:key,sha256,sourceLicenseEvidence:'public/textures/characters/manifest.json; assets/manifest.json and references/licenses/',modifications:jpeg?'JPEG -> WebP quality92, unchanged dimensions; identical textures shared across high/low characters.':'Lossless relocation of original PNG; unchanged alpha and dimensions.'})+'\n');
   encoded.set(key,{file,bytes:pixels.length,mimeType:jpeg?'image/webp':'image/png'});
  }
  const delivery=encoded.get(key);maps.push(delivery.file);removed.add(image.bufferView);delete image.bufferView;image.uri=path.relative(path.dirname(target),delivery.file).replaceAll('\\','/');image.mimeType=delivery.mimeType;
 }
 const used=new Set();function scan(value){if(!value||typeof value!=='object')return;for(const [k,v]of Object.entries(value)){if(k==='bufferView')used.add(v);else scan(v);}}scan(doc);for(const index of used)removed.delete(index);
 const remap=new Map(),views=[],chunks=[];let offset=0;
 for(const [index,view]of doc.bufferViews.entries()){
  if(removed.has(index))continue;
  const data=bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength),padding=(4-data.length%4)%4;
  remap.set(index,views.length);views.push({...view,byteOffset:offset});chunks.push(data,Buffer.alloc(padding));offset+=data.length+padding;
 }
 function rewrite(value){if(!value||typeof value!=='object')return;for(const [k,v]of Object.entries(value)){if(k==='bufferView')value[k]=remap.get(v);else rewrite(v);}}
 rewrite(doc);doc.bufferViews=views;doc.buffers=[{byteLength:offset}];
 if(doc.images.some(i=>i.mimeType==='image/webp')){
  doc.extensionsUsed=[...new Set([...(doc.extensionsUsed??[]),'EXT_texture_webp'])];
  doc.extensionsRequired=[...new Set([...(doc.extensionsRequired??[]),'EXT_texture_webp'])];
  for(const texture of doc.textures??[])if(doc.images[texture.source]?.mimeType==='image/webp'){texture.extensions={...texture.extensions,EXT_texture_webp:{source:texture.source}};delete texture.source;}
 }
 let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);
 const header=Buffer.alloc(20),binary=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+offset,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);binary.writeUInt32LE(offset);binary.writeUInt32LE(0x004e4942,4);
 const bytes=Buffer.concat([header,json,binary,...chunks]);fs.writeFileSync(target,bytes);
 reports.push({source,sourceSha256:hash(input),target,sha256:hash(bytes),sourceBytes:input.length,geometryBytes:bytes.length,maps:[...new Set(maps)],unchangedGeometryMorphsAndSkinBytes:true});
 console.log(target,(bytes.length/1048576).toFixed(2)+' MiB geometry');
}
fs.mkdirSync('reports/acceptance/loading-20261009',{recursive:true});
fs.writeFileSync('reports/acceptance/loading-20261009/character-delivery.json',JSON.stringify({models:reports,sharedMaps:[...encoded.values()].map(e=>({...e,sha256:hash(fs.readFileSync(e.file))})),uniqueMapBytes:[...encoded.values()].reduce((n,e)=>n+e.bytes,0)},null,2)+'\n');

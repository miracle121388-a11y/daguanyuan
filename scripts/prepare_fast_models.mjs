/** Derived first-view LODs. Editable Blender masters and detailed deliveries remain intact. */
import {NodeIO} from '@gltf-transform/core';
import {KHRDracoMeshCompression} from '@gltf-transform/extensions';
import {dedup, weld, simplify, prune, draco, getBounds} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';

await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({
 'draco3d.decoder':await draco3d.createDecoderModule(), 'draco3d.encoder':await draco3d.createEncoderModule(),
});
const hash = b => createHash('sha256').update(b).digest('hex');
const inputs=['overview-low','sunwen-architecture-low','sunwen-landscape-low',...JSON.parse(readFileSync('public/scene-manifest.json')).places.map(p=>'places-low/'+p.id)];
const reports=[];
for (const name of inputs) {
 const source=`public/models/${name}.glb`, target=`public/models/${name.replace('-low','-fast')}.glb`;
 mkdirSync(target.slice(0,target.lastIndexOf('/')),{recursive:true});
 const doc=await io.read(source), bounds=getBounds(doc.getRoot().listScenes()[0]);
 const metadata=()=>JSON.stringify(doc.getRoot().listNodes().map(n=>[n.getName(),n.getExtras(),n.getTranslation(),n.getRotation(),n.getScale()]));
 const before=metadata(), colors=new Map();
 for(const material of doc.getRoot().listMaterials()) {
  material.setExtras({...material.getExtras(),deliveryPigment:true});
  const texture=material.getBaseColorTexture();
  if(texture) {
   if(!colors.has(texture)) {
    const {data,info}=await sharp(texture.getImage()).resize(16,16,{fit:'fill'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const rgb=[0,0,0];let weight=0;
    for(let i=0;i<data.length;i+=info.channels){const a=data[i+3]/255;weight+=a;for(let c=0;c<3;c++){const s=data[i+c]/255;rgb[c]+=(s<=.04045?s/12.92:((s+.055)/1.055)**2.4)*a;}}
    colors.set(texture,rgb.map(c=>c/Math.max(weight,1)));
   }
   const factor=material.getBaseColorFactor(), rgb=colors.get(texture);
   material.setBaseColorFactor([factor[0]*rgb[0],factor[1]*rgb[1],factor[2]*rgb[2],factor[3]]);
  }
  // Pigment averages preserve Sun Wen colors without fetching 100+ tiny maps.
  // The original maps return in the next LOD; never strip the editable source.
  for(const slot of ['BaseColor','Normal','Occlusion','Emissive','MetallicRoughness'])material[`set${slot}Texture`](null);
 }
 await doc.transform(dedup(),weld(),simplify({simplifier:MeshoptSimplifier,ratio:.28,error:.002,lockBorder:true}),prune({keepLeaves:true,keepExtras:true}),draco({method:'edgebreaker',encodeSpeed:5,decodeSpeed:8,quantizePosition:14,quantizeNormal:8,quantizeTexcoord:10}));
 if(before!==metadata())throw Error('First-view LOD changed semantic nodes: '+source);
 await io.write(target,doc);
 const result=await io.read(target), deliveredBounds=getBounds(result.getRoot().listScenes()[0]);
 if(result.getRoot().listTextures().length)throw Error('First-view LOD must not require material textures');
 const bytes=readFileSync(target);
 reports.push({source,sourceSha256:hash(readFileSync(source)),target,sha256:hash(bytes),bytes:bytes.length,bounds,deliveredBounds,textureRequests:0,method:'28% target / 0.2% mesh-radius error, locked borders, linear-light average pigments, Draco decodeSpeed 8',interpretation:'First-view delivery LOD of the authored Sun Wen garden, not new literary evidence.'});
 console.log(target,(bytes.length/1048576).toFixed(2)+' MiB');
}
mkdirSync('reports/acceptance/loading-20261009',{recursive:true});
writeFileSync('reports/acceptance/loading-20261009/fast-models.json',JSON.stringify(reports,null,2)+'\n');
if(reports.slice(0,3).reduce((n,r)=>n+r.bytes,0)>5*1048576)throw Error('First-view geometry exceeds 5 MiB budget');

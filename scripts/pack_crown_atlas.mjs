// Pack the 40 Blender crown and shrub views into one locally hosted RGBA atlas.
import sharp from 'sharp';
import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {replaceFile} from './atomic_replace.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const revision=process.argv.includes('--sunwen')?'r17':JSON.parse(readFileSync('config/craft.materials.json','utf8')).revision;
const source=JSON.parse(readFileSync(`assets/processed/crown-${revision}/manifest.json`,'utf8'));
const layers=source.renders.map((r,i)=>{if(hash(readFileSync(r.file))!==r.sha256)throw Error('Changed source render '+r.file);return {input:r.file,left:(i%5)*384,top:Math.floor(i/5)*384}});
const rows=source.renders.length/5;
const pixels=await sharp({create:{width:1920,height:rows*384,channels:4,background:'#00000000'}}).composite(layers).webp({quality:88,alphaQuality:100,effort:6}).toBuffer();
const target='public/textures/vegetation/canopy-atlas.webp';
mkdirSync(path.dirname(target),{recursive:true});writeFileSync(target+'.next',pixels);replaceFile(target+'.next',target);
const origin={origin:`Orthographic Cycles renders of local tree meshes, packed into a 5-column, ${rows}-row WebP atlas. All rows are project-authored editable botanical geometry informed by Sun Wen paintings.`,prompt:source.method,sha256:hash(pixels),columns:5,rows,tile:384,...source};
writeFileSync(target+'.json.next',JSON.stringify(origin,null,2));replaceFile(target+'.json.next',target+'.json');
// Preserve the previous generated views outside public before retiring them.
const archive=path.resolve('assets/processed/legacy-canopy-r4');mkdirSync(archive,{recursive:true});
for(const name of ['canopy-render','canopy-east','canopy-back','canopy-west','canopy-top'])for(const ext of ['.png','.png.json']){
 const file=path.resolve('public/textures/vegetation',name+ext);
 if(!file.startsWith(path.resolve('public/textures/vegetation')+path.sep))throw Error('Unexpected texture path');
 if(existsSync(file)){copyFileSync(file,path.join(archive,name+ext));unlinkSync(file)}
}
console.log('CANOPY ATLAS',pixels.length,'bytes;',source.renders.length,'source views');
if(process.argv.includes('--sunwen')){
 const small=await sharp({create:{width:1920,height:rows*384,channels:4,background:'#00000000'}}).composite(layers).png().toBuffer();
 const mobile=await sharp(small).resize(960,rows*192).webp({quality:82,alphaQuality:100,effort:6}).toBuffer();
 const mobileTarget='public/textures/vegetation/canopy-atlas-low.webp';
 writeFileSync(mobileTarget,mobile);
 writeFileSync(mobileTarget+'.json',JSON.stringify({...origin,origin:origin.origin+' Mobile distance tier, 192px tiles; close views retain local 3D crowns.',tile:192,sha256:hash(mobile)},null,2)+'\n');
 console.log('MOBILE CANOPY ATLAS',mobile.length,'bytes');
}

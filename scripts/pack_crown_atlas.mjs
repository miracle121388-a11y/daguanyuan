// Pack the 20 Blender crown and shrub views into one locally hosted RGBA atlas.
import sharp from 'sharp';
import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {replaceFile} from './atomic_replace.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const {revision}=JSON.parse(readFileSync('config/craft.materials.json','utf8'));
const source=JSON.parse(readFileSync(`assets/processed/crown-${revision}/manifest.json`,'utf8'));
const layers=source.renders.map((r,i)=>{if(hash(readFileSync(r.file))!==r.sha256)throw Error('Changed source render '+r.file);return {input:r.file,left:(i%5)*384,top:Math.floor(i/5)*384}});
const pixels=await sharp({create:{width:1920,height:1536,channels:4,background:'#00000000'}}).composite(layers).webp({quality:88,alphaQuality:100,effort:6}).toBuffer();
const target='public/textures/vegetation/canopy-atlas.webp';
mkdirSync(path.dirname(target),{recursive:true});writeFileSync(target+'.next',pixels);replaceFile(target+'.next',target);
const origin={origin:'Orthographic Cycles renders of three CC0 Poly Haven tree meshes and one reprofiled shrub, packed into a 5-column, 4-row WebP atlas. This is a distance LOD of the local 3D trees, with their source alpha and UVs. No generative or painted tree images.',prompt:'Source geometry rendered by blender/render_crown_atlas.py; '+source.method,sha256:hash(pixels),columns:5,rows:4,tile:384,...source};
writeFileSync(target+'.json.next',JSON.stringify(origin,null,2));replaceFile(target+'.json.next',target+'.json');
// Preserve the previous generated views outside public before retiring them.
const archive=path.resolve('assets/processed/legacy-canopy-r4');mkdirSync(archive,{recursive:true});
for(const name of ['canopy-render','canopy-east','canopy-back','canopy-west','canopy-top'])for(const ext of ['.png','.png.json']){
 const file=path.resolve('public/textures/vegetation',name+ext);
 if(!file.startsWith(path.resolve('public/textures/vegetation')+path.sep))throw Error('Unexpected texture path');
 if(existsSync(file)){copyFileSync(file,path.join(archive,name+ext));unlinkSync(file)}
}
console.log('CANOPY ATLAS',pixels.length,'bytes; 20 source views');

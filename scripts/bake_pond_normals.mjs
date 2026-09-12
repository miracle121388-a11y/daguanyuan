// A deterministic capillary-wave normal field, not an illustration of water.
import sharp from 'sharp';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const size=256,period=24,terms=[];
let state=12092026;
const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
for(let k=0;k<43;k++){
 const angle=random()*Math.PI*2,frequency=2+random()*27;
 const x=Math.round(Math.cos(angle)*frequency),y=Math.round(Math.sin(angle)*frequency);
 terms.push({x,y,phase:random()*Math.PI*2,amplitude:1/Math.sqrt(1+x*x+y*y)});
}
const pixels=Buffer.alloc(size*size*3);
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 let dx=0,dy=0;
 for(const wave of terms){const derivative=Math.cos((x*wave.x+y*wave.y)/size*Math.PI*2+wave.phase)*wave.amplitude;dx+=derivative*wave.x;dy+=derivative*wave.y}
 dx*=.055;dy*=.055;const length=Math.hypot(dx,dy,1),offset=(y*size+x)*3;
 pixels[offset]=Math.round((dx/length*.5+.5)*255);pixels[offset+1]=Math.round((dy/length*.5+.5)*255);pixels[offset+2]=Math.round((1/length*.5+.5)*255);
}
const target='public/textures/ground/pond-normal.png';mkdirSync('public/textures/ground',{recursive:true});
const output=await sharp(pixels,{raw:{width:size,height:size,channels:3}}).png().toBuffer();writeFileSync(target,output);
const sha=b=>createHash('sha256').update(b).digest('hex');
writeFileSync(target+'.json',JSON.stringify({origin:'Original deterministic Fourier capillary-wave normal field, authored as a physical shading input.',prompt:'Evaluate 43 seeded periodic Fourier derivatives on a256x256 normal field, seed12092026;24m fundamental world period; exact terms and gradient amplitude .055 in scripts/bake_pond_normals.mjs. The runtime combines rotated scales with small normal slopes; no photograph or scene image.',sourceFile:'scripts/bake_pond_normals.mjs',sourceSha256:sha(readFileSync(import.meta.filename)),sha256:sha(output),worldPeriodMetres:period,terms},null,2));
console.log('Pond normal field',output.length,'bytes;43 spectral modes');

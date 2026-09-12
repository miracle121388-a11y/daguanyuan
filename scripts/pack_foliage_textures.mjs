// Deterministic colour/alpha channel packing for native model textures.
// Decode the 16-bit source PNGs once; never copy and merge their Blender buffers.
import sharp from 'sharp';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const {revision}=JSON.parse(readFileSync('config/craft.materials.json','utf8'));
const output=`assets/processed/foliage-${revision}`;mkdirSync(output,{recursive:true});
const specs=[['fern_02','',512],['island_tree_01','leaves',256],['island_tree_02','leaves',256],['pine_sapling_small','twig',256]];
const hash=buffer=>createHash('sha256').update(buffer).digest('hex'),records=[];
for(const [assetId,part,size] of specs){
 const stem=assetId+(part?'_'+part:'');
 const diffuse=`assets/source/${assetId}/textures/${stem}_diff_1k.png`,mask=`assets/source/${assetId}/textures/${stem}_alpha_1k.png`;
 const alpha=await sharp(mask).resize(size,size).extractChannel(0).raw().toBuffer();
 if(alpha.length!==size*size)throw new Error(`Unexpected alpha depth: ${mask}`);
 // Materialize RGB first: removeAlpha and joinChannel on one lazy Sharp
 // pipeline can otherwise discard the alpha that was just joined.
 const rgb=await sharp(diffuse).resize(size,size).removeAlpha().toColourspace('srgb').raw().toBuffer();
 if(rgb.length!==size*size*3)throw new Error(`Unexpected RGB depth: ${diffuse}`);
 const result=await sharp(rgb,{raw:{width:size,height:size,channels:3}}).joinChannel(alpha,{raw:{width:size,height:size,channels:1}}).png().toBuffer();
 const {data}=await sharp(result).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const sum=[0,0,0];let visible=0,lo=255,hi=0;
 for(let i=0;i<data.length;i+=4){lo=Math.min(lo,data[i+3]);hi=Math.max(hi,data[i+3]);if(data[i+3]>128){visible++;for(let c=0;c<3;c++)sum[c]+=data[i+c]}}
 const mean=sum.map(v=>v/Math.max(visible,1));
 if(visible<100||Math.max(...mean)<35||lo>16||hi<240)throw new Error(`Broken foliage texture: ${stem}, ${mean}, ${lo}/${hi}`);
 const path=`${output}/${stem}_rgba.png`;writeFileSync(path,result);
 records.push({assetId,file:path,sha256:hash(result),diffuse,sourceSha256:hash(readFileSync(diffuse)),mask,maskSha256:hash(readFileSync(mask)),size,visibleLeafRgbMean:mean,alphaExtrema:[lo,hi]});
}
writeFileSync(`${output}/manifest.json`,JSON.stringify({method:'Native texture channel packing: source sRGB diffuse decoded to an 8-bit PNG with its separately supplied alpha at matching resolution. No recolouring, synthetic foliage or screenshot texture.',revision,files:records},null,2));
console.log(JSON.stringify(records.map(({assetId,size,visibleLeafRgbMean})=>({assetId,size,visibleLeafRgbMean}))));

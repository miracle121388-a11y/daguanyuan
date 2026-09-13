import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {replaceFile} from './atomic_replace.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const assets=read('assets/manifest.json'),places=read('public/scene-manifest.json').places;
const craftConfig=read('config/craft.materials.json'),craft=craftConfig.materials,revision=craftConfig.revision;
const swatches=read(`assets/processed/materials-${revision}/manifest.json`).files;
const foliageRevision=craftConfig.foliageRevision??revision;
const foliage=read(`assets/processed/foliage-${foliageRevision}/manifest.json`).files;
const crowns={island_tree_01:['broadleaf','broadleaf-low','shrub'],island_tree_02:['broadleaf-2'],pine_sapling_small:['pine']};
const buildings=['public/models/overview.glb','public/models/overview-low.glb',...places.flatMap(p=>['public/models/places/'+p.id+'.glb','public/models/places-low/'+p.id+'.glb'])];
for(const a of assets.filter(a=>a.status==='approved')){
 if(['wood_planks','leafy_grass','wood_cabinet_worn_long','coast_rocks_02','forest_ground_05','dark_wood','lacquered_cherry_wood','slate_floor_02','stone_wall_02','mossy_rock','mossy_cobblestone','fine_grained_wood','rosewood_veneer_02'].includes(a.assetId)){a.usedByPlaceIds=[];a.derivativeFiles=[];a.derivativeSha256=[];a.usage='Historical source retained; replaced in the current runtime.';continue}
 a.usedByPlaceIds=places.map(p=>p.id);
 if(a.assetId==='forest_ground_06'){
  a.usage='Local soil map blended with the grass geometry bake on the unified landscape.';
  a.modifications='Reviewed 1K source retained; local 512px JPEG quality85. Source roughness and normal files retained for editing.';
  a.derivativeFiles=['public/textures/ground/soil.jpg'];
 }else if(a.assetId==='fern_02'){
  a.usage='Local near-camera fern geometry and linked, terrain-seated editable master plants.';
  a.modifications='Two complete native 784/816 triangle variants centered at their roots without nonuniform scaling. Source UVs and 512px RGBA texture retained. 999 native instances include623 connected-court additions in the existing bed map. Overview budgets are64 desktop/28 mobile; selected-court budgets are512/320, prioritized by projected visibility, selected courtyard and camera distance, refreshing for camera translation and rotation. The selected courtyard is included up to200m; low-quality overview defers the fern models until a place is selected; other plants render within46/29m and scale out over the last8m. Source instances are grounded by rays against actual native earth; unchanged source meshes are shared. Web thin-leaf lighting follows actual scene light/shadow response with zero emissive output; native materials retain source textures and their own rendering. Placements and artistic plant mixtures are interpretation, not botanical evidence.';
  a.derivativeFiles=['public/models/vegetation/fern-0.glb','public/models/vegetation/fern-1.glb','public/textures/landscape-light.webp'];
 }else if(a.assetId==='grass_medium_01'){
  a.usage='Linked, editable shoreline grass; the same curved source clump is instanced in WebGL. Its top-down material bake supplies the continuous ground.';
  a.modifications='Original scale retained; one 290-face clump with 512px maps exported for instancing. Seeded 760-tuft 2.8m wrapped patch rendered at 1024 square in Cycles8 emission pass. Runtime placements are published from the Blender master. Planting is spatial interpretation, not botanical evidence.';
  a.derivativeFiles=['public/models/vegetation/ground-cover.glb','public/models/overview.glb','public/models/overview-low.glb','assets/processed/ground-r7/turf.png','public/textures/landscape-light.webp'];
 }else if(crowns[a.assetId]){
  a.usage='Local source-tree geometry instanced near the camera, with linked editable copies in the Blender master; distant views rendered from the same sources.';
  a.modifications='Source tree normalized to 5.1 m largest extent. Broadleaf lower-trunk width changes smoothly from22%at the foot to100%at45%height; the same authored deformation is used by close geometry and the distant atlas. Native editable master instances use complete source crowns. Web LODs begin with the entire leaf surface, simplify coplanar faces while retaining UV seams, then apply bounded geometric reduction (22000 broadleaf,10000 pine,9000 shrub and6500 middle-LOD leaf triangles); the former random omission of over99%of source leaves is removed. Source UVs and256px alpha maps retained; trunk decimated. Three source crowns and a reprofiled low shrub rendered from four azimuths and above in Cycles at 384px, 24 samples, AgX exposure+.4; packed in a 1920 x 1536 WebP atlas at quality 88. The r12 master rebuilds connected drifts and mixed-height low woody planting patches using a dedicated squat crown derived from the same source leaf geometry, reproduced in the fourth atlas row, a planted distant ridge and clustered shore margins. These are artistic understory forms, not species identification or botanical evidence from the novel.';
  a.derivativeFiles=[...crowns[a.assetId].map(n=>'public/models/vegetation/'+n+'.glb'),'public/textures/vegetation/canopy-atlas.webp'];
 }else if(a.assetId==='forest_grove'){
  a.usage='Locally hosted HDR for browser environment lighting.';
  a.modifications='Original HDR preserved; Blender resizes a lighting-only derivative to 256 x 128. Runtime intensity varies with time of day.';
  a.derivativeFiles=['public/textures/forest_grove.hdr'];
 }else{
  a.usage=a.assetId==='rock_moss_set_01'?'CC0 scanned rock geometry instanced into authored shorelines and rockeries.':'CC0 source surface map on authored architecture and terrain.';
  a.modifications=a.assetId==='rock_moss_set_01'?'Five separate scanned stones, decimated to about900 faces each and uniformly normalized to2.5m horizontal extent; actual aspect ratios and source UVs retained. Rotated and uniformly scaled along the interpreted bank.':a.assetId==='stone_wall_02'?'Base-color source desaturated and tinted grey green by scripts/process_assets.py; source retained.':'Source retained; UV projection, physical scale, tint and roughness adjusted on authored meshes.';
  a.modifications+=' Architectural surfaces in low partitions and both overview tiers use Blender Cycles color plus geometric occlusion atlases, 1K per partition and 2K for the landscape structures; source materials and geometric contact shading are baked before the overview LOD. Atlas delivery sizes are 512px per partition and 1024px for landscape; baked maps are encoded as JPEG at quality 80 and source maps at quality 83. Thin foliage retains authored vertex colors; earth, scanned rocks and floorboards retain their source UVs and material maps to avoid subpixel atlas islands. Roofs keep independent meshes for cutaway.';
  a.derivativeFiles=[...(a.assetId==='stone_wall_02'?['assets/processed/stone_wall_02.jpg']:[]),...buildings];
 }
 if(crowns[a.assetId]||a.assetId==='rock_moss_set_01'){
  a.derivativeFiles.push('public/textures/landscape-light.webp');
  a.modifications+=' The actual planted master also casts shadows into a local 2048px world-space light atlas: Cycles16 samples, orthographic720m; source master and render hashes are in the atlas provenance sidecar.';
 }
 const roles=Object.entries(craft).filter(([,spec])=>spec.source===a.assetId).map(([name])=>name);
 if(roles.length){
  a.derivativeFiles.push(...buildings);
  a.derivativeFiles.push(...swatches.filter(s=>s.sourceAsset===a.assetId).map(s=>s.file));
  a.modifications+=' '+revision+': independent '+roles.join(', ')+' surface roles use512px Blender swatches. Optional contrast compression around the actual crop linear-light RGB mean, hue/saturation, physical UV period, roughness and any in-tile crop are recorded in config/craft.materials.json. The gardenstone role maps source sandstone colour onto locally authored voxel-unioned stone with irregular Boolean cavities; its geometry is an interpretation. Detailed gate, main hall and Xiaoxiang surfaces retain source UVs and actual geometry AO in COLOR_0; the mobile atlases retain their own geometric AO. No building screenshot is used as a surface.';
 }
 if(a.assetId==='rock_moss_set_01')a.modifications+=' r9 replaces the deformed coastal terrain patch with independent boulder silhouettes.';
 const packedLeaves=foliage.filter(item=>item.assetId===a.assetId);
 if(packedLeaves.length){a.derivativeFiles.push(...packedLeaves.map(item=>item.file));a.modifications+=' r11 decodes the 16-bit sRGB diffuse once to8-bit and joins the separately supplied alpha before Blender import; one packed RGBA node supplies both Colour and Alpha, avoiding the previous near-black exported RGB. The packed source, mask and output hashes are in assets/processed/foliage-'+foliageRevision+'/manifest.json. Visible leaf RGB as well as alpha are verified in delivered GLBs.';}
 if(existsSync('config/qing.palette.json')&&roles.length){a.modifications+=' r15 supersedes the architecture-atlas description above: occupied-room envelopes and polychrome material roles retain source UVs and shared PBR swatches in both low and high models. 36cm walls and opaque window backing bypass geometric simplification. Lacquer/mineral pigment is authored in a Blender material shader over unchanged source grain; settings and original hashes are recorded per swatch. The landscape and foliage keep their existing pipelines.';}
 a.derivativeFiles=a.derivativeFiles.filter(existsSync);
 const textures=new Set();
 for(const file of a.derivativeFiles){
  if(!file.endsWith('.glb'))continue;
  const b=readFileSync(file),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
  for(const img of j.images??[])if(img.uri&&(img.name?.includes(a.assetId)||roles.some(role=>(img.name?.startsWith(revision+'_'+role+'_')||img.name?.startsWith(role+'_')))||(a.assetId==='grass_medium_01'&&img.name?.startsWith('turf'))||(!crowns[a.assetId]&&img.name?.startsWith('Baked_'))))textures.add(path.relative('.',path.resolve(path.dirname(file),img.uri)).replaceAll('\\','/'));
 }
 a.derivativeFiles=[...new Set([...a.derivativeFiles,...textures])];a.derivativeSha256=a.derivativeFiles.map(hash);
}
writeFileSync('assets/manifest.json.next',JSON.stringify(assets,null,2));replaceFile('assets/manifest.json.next','assets/manifest.json');

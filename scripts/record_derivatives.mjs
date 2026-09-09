import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const assets=read('assets/manifest.json'),places=read('public/scene-manifest.json').places;
for(const a of assets.filter(a=>a.status==='approved')){
 const rock=a.assetId==='coast_rocks_02',hdr=a.assetId==='forest_grove';
 a.usedByPlaceIds=hdr?[]:rock?['qujingtongyou','xiaoxiangguan','hengwuyuan']:places.map(p=>p.id);
 a.usage=hdr?'Unmodified HDR packed into Blender Render_Setup world; not loaded by the website.':'Embedded in local GLB material/mesh data; source files retained.';
 a.modifications=rock?'Mesh decimated to approximately 1,000 faces, scaled and recolored grey green.':hdr?'No pixel modification; environment intensity adjusted in Blender.':a.assetId==='wood_planks'?'Base-color image embedded unchanged; shader tint and UV scale adjusted.':'Desaturated and tinted grey green by scripts/process_assets.py.';
 a.derivativeFiles=hdr?[]:[...(a.assetId==='stone_wall_02'?['assets/processed/stone_wall_02.jpg']:[]),'public/models/overview.glb',...a.usedByPlaceIds.flatMap(id=>['public/models/places/'+id+'.glb','public/models/places-low/'+id+'.glb'])].filter(existsSync);
 if(!hdr)a.usage+=' Mobile overview uses authored vertex colors and does not embed the source textures.';
 a.derivativeSha256=a.derivativeFiles.map(hash);
}
writeFileSync('assets/manifest.json',JSON.stringify(assets,null,2));

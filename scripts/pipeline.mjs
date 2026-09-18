import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
export function blenderBin(){
 const executable=process.platform==='win32'?'blender.exe':'blender';
 const locations=['.tools',...(process.platform==='win32'?['C:/Program Files/Blender Foundation']:[])];
 const candidates=[process.env.BLENDER_BIN,'blender',...(process.platform==='darwin'?['/Applications/Blender.app/Contents/MacOS/Blender']:[]),...locations.flatMap(p=>existsSync(p)?readdirSync(p).filter(n=>n.toLowerCase().includes('blender')).map(n=>path.join(p,n,executable)):[])].filter(Boolean);
 for(const c of candidates){const r=spawnSync(c,['--version'],{encoding:'utf8',timeout:10000});if(r.status===0)return c==='blender'?c:path.resolve(c)}
 throw new Error('Blender not found. Set BLENDER_BIN to the Blender executable; installation links and commands are in docs/MIGRATION.md.');
}
const action=process.argv[2];
const run=(cmd,args,env={})=>{const r=spawnSync(cmd,args,{stdio:'inherit',shell:false,env:{...process.env,...env}});if(r.status!==0)throw new Error(`${cmd} exited ${r.status}`)};
const gardenGrounding=(finish=true)=>{
 const blend=script=>run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python',script]);
 blend('blender/extract_garden_grounding.py');
 run(process.platform==='win32'?'python':'python3',['scripts/prepare_sunwen_ground.py']);
 blend('blender/install_garden_grounding.py');
 if(finish){
  blend('blender/bake_landscape_light.py');run(process.execPath,['scripts/pack_landscape_light.mjs']);
  run(process.execPath,['scripts/optimize.mjs'],{GARDEN_MODEL_FILTER:'sunwen-landscape.glb,sunwen-landscape-low.glb'});
 }
};
if(action==='models-grounding')gardenGrounding();
if(action==='verify-grounding')run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/check_garden_grounding.py']);
if(action==='models-grounding-lod'){
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/install_garden_grounding.py','--','--lod-only']);
 run(process.execPath,['scripts/optimize.mjs'],{GARDEN_MODEL_FILTER:'sunwen-landscape-low.glb'});
}
const urbanContext=()=>{
 const blend=script=>run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python',script]);
 blend('blender/urban_context.py');run(process.execPath,['scripts/apply_urban_ground.mjs']);
 blend('blender/bake_landscape_light.py');run(process.execPath,['scripts/pack_landscape_light.mjs']);
 run(process.execPath,['scripts/optimize.mjs'],{GARDEN_MODEL_FILTER:'overview.glb,overview-low.glb,urban-context.glb'});
};
if(action==='models-urban')urbanContext();
if(action==='verify-urban')run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/check_urban_context.py']);
const qingArchitecture=()=>{
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/refresh_qing_architecture.py']);
 run(process.execPath,['scripts/apply_architecture_patch.mjs']);
};
const qingArchitectureLod=()=>{
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/refresh_qing_architecture.py','--','--lod-only']);
 run(process.execPath,['scripts/apply_architecture_patch.mjs']);
};
const sunwenGarden=(optimize=true,landscapeOnly=false)=>{
 const python=process.platform==='win32'?'python':'python3';
 for(const script of ['scripts/compose_sunwen_planting.py','scripts/prepare_sunwen_surfaces.py'])run(python,[script]);
 const blend=(script,args=[])=>run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python',script,...(args.length?['--',...args]:[])]);
 blend('blender/refine_sunwen_garden.py');blend('blender/extract_garden_grounding.py');
 run(python,['scripts/prepare_sunwen_ground.py']);
 for(const script of ['blender/install_sunwen_landscape.py','blender/sunwen_ornaments.py','blender/bake_surface_zones.py'])blend(script);
 if(!landscapeOnly)blend('blender/export_mobile_overview.py');
 blend('blender/refresh_qing_architecture.py',['--lod-only','--sunwen']);
 run(process.execPath,['scripts/apply_architecture_patch.mjs','--sunwen']);
 run(python,['scripts/apply_sunwen_surfaces.py']);
 blend('blender/reduce_sunwen_mobile.py');
 run(process.execPath,['scripts/retire_legacy_lotus.mjs']);
 blend('blender/render_sunwen_atlas.py');
 run(process.execPath,['scripts/pack_crown_atlas.mjs','--sunwen']);
 if(existsSync('config/garden.urban.json')){blend('blender/urban_context.py');run(process.execPath,['scripts/apply_urban_ground.mjs'])}
 if(existsSync('config/garden.grounding.json'))gardenGrounding(false);
 blend('blender/bake_landscape_light.py');
 run(process.execPath,['scripts/pack_landscape_light.mjs']);
 if(optimize)run(process.execPath,['scripts/optimize.mjs']);
};
if(action==='models-sunwen')sunwenGarden();
if(action==='models-sunwen-landscape')sunwenGarden(true,true);
if(action==='models-sunwen-architecture'||action==='models-sunwen-architecture-lod'){
 const lodOnly=action.endsWith('-lod');
 const python=process.platform==='win32'?'python':'python3';
 const blend=(script,args=[])=>run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python',script,...(args.length?['--',...args]:[])]);
 if(!lodOnly)run(python,['scripts/prepare_sunwen_surfaces.py']);
 blend('blender/sunwen_architecture.py',lodOnly?['--lod-only']:[]);
 blend('blender/refresh_qing_architecture.py',['--lod-only','--sunwen']);
 run(process.execPath,['scripts/apply_architecture_patch.mjs','--sunwen']);
 run(python,['scripts/apply_sunwen_surfaces.py']);
 if(!lodOnly){blend('blender/bake_landscape_light.py');run(process.execPath,['scripts/pack_landscape_light.mjs'])}
 const files=['overview.glb','overview-low.glb','sunwen-architecture.glb','sunwen-architecture-low.glb',...['places','places-low'].flatMap(dir=>readdirSync('public/models/'+dir).filter(f=>f.endsWith('.glb')).map(f=>dir+'/'+f))];
 run(process.execPath,['scripts/optimize.mjs'],{GARDEN_MODEL_FILTER:files.join(',')});
}
if(action==='models-architecture-lod')qingArchitectureLod();
if(action==='models-architecture'){
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_craft_surfaces.py']);
 qingArchitecture();
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_landscape_light.py']);
 run(process.execPath,['scripts/pack_landscape_light.mjs']);
}
if(action==='canopy'){
 run(process.platform==='win32'?'python':'python3',['scripts/fetch_tree_alpha.py']);
 run(process.platform==='win32'?'python':'python3',['scripts/fetch_canopy_variants.py']);
 run(process.execPath,['scripts/pack_foliage_textures.mjs']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/render_crown_atlas.py']);
 run(process.execPath,['scripts/pack_crown_atlas.mjs']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_environment.py']);
}
if(action==='models'){
 if(!process.argv.includes('--sample'))run(process.platform==='win32'?'python':'python3',['scripts/bake_focal_foliage.py']);
 if(!process.argv.includes('--sample'))run(process.execPath,['scripts/pack_foliage_textures.mjs']);
 run(process.platform==='win32'?'python':'python3',['scripts/process_assets.py']);
 if(!process.argv.includes('--sample'))run(process.platform==='win32'?'python':'python3',['scripts/prepare_shore_fill.py']);
 if(!process.argv.includes('--sample')){
  run(process.execPath,['scripts/bake_pond_normals.mjs']);
  run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/render_crown_atlas.py']);
  run(process.execPath,['scripts/pack_crown_atlas.mjs']);
  run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_craft_surfaces.py']);
  run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_ground_cover.py']);
  run(process.execPath,['scripts/pack_ground_cover.mjs']);
 }
 const blend=process.argv.includes('--sample')?'blender/xiaoxiangguan_sample.blend':'blender/daguanyuan_master.blend';
 run(blenderBin(),['--background',...(existsSync(blend)?[blend]:[]),'--disable-autoexec','--python-exit-code','1','--python',process.argv.includes('--sample')?'blender/build_scene.py':'blender/reference_scene.py','--',...process.argv.slice(3)]);
 if(!process.argv.includes('--sample')&&existsSync('config/qing.palette.json'))qingArchitecture();
 if(!process.argv.includes('--sample')&&existsSync('config/garden.sunwen.json'))sunwenGarden(false);
 if(!process.argv.includes('--sample')&&!existsSync('config/garden.sunwen.json')){
  run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_landscape_light.py']);
  run(process.execPath,['scripts/pack_landscape_light.mjs']);
  run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_surface_zones.py']);
 }
}
if(action==='models-materials'){
 run(process.execPath,['scripts/pack_foliage_textures.mjs']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_craft_surfaces.py']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/refresh_craft_materials.py']);
 if(existsSync('config/qing.palette.json'))qingArchitecture();
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_landscape_light.py']);
 run(process.execPath,['scripts/pack_landscape_light.mjs']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_surface_zones.py']);
}
if(action==='models-roofs'){
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/repair_roof_shells.py']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_landscape_light.py']);
 run(process.execPath,['scripts/pack_landscape_light.mjs']);
}
if(action==='models-seat'){
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/seat_ground_cover.py']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_landscape_light.py']);
 run(process.execPath,['scripts/pack_landscape_light.mjs']);
 run(process.execPath,['scripts/record_derivatives.mjs']);
}
if(action==='verify-models'){
 if(existsSync('config/sunwen.architecture.json'))run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/check_sunwen_architecture.py']);
 if(existsSync('config/qing.palette.json'))run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/check_enclosures.py']);
 for(const script of ['blender/validate_scene.py','blender/check_terrain_paths.py','blender/check_roof_coverage.py'])run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python',script]);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/check_terrain_paths.py','--','--mobile']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/check_roof_coverage.py','--','--floors']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/check_roof_coverage.py','--','--paving']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/check_route_surfaces.py']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/check_water_surface.py']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/check_court_features.py']);
 run(process.platform==='win32'?'python':'python3',['scripts/check_craft_pixels.py']);
 if(existsSync('assets/processed/focal-r12-fix2/manifest.json'))run(process.platform==='win32'?'python':'python3',['scripts/check_focal_foliage.py']);
}
if(action==='model-views')run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/render_model_evidence.py']);
if(action==='model-portability')run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/check_portability.py']);
if(action==='models-understory')run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/refresh_court_understory.py']);
if(action==='models-overview-budget')run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/refine_overview_budget.py']);
if(action==='models-crowns'){
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/refresh_crown_geometry.py']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_landscape_light.py']);
 run(process.execPath,['scripts/pack_landscape_light.mjs']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_surface_zones.py']);
}
if(action==='models-mobile'){
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/export_mobile_overview.py']);
 if(existsSync('config/qing.palette.json'))qingArchitectureLod();
}
if(action==='models-ground')run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_surface_zones.py']);
if(action==='models-finish'){
 run(process.platform==='win32'?'python':'python3',['scripts/bake_focal_foliage.py']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/refresh_focal_landscape.py']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_landscape_light.py']);
 run(process.execPath,['scripts/pack_landscape_light.mjs']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_surface_zones.py']);
}
if(action==='models-planting'||action==='models-planting-resume'){
 if(action==='models-planting'){
 if(!existsSync('assets/processed/focal-r12-fix2/manifest.json'))run(process.platform==='win32'?'python':'python3',['scripts/bake_focal_foliage.py']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/refresh_focal_landscape.py','--','--botanical-only']);
 }
 run(process.execPath,['scripts/apply_botanical_patch.mjs']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_landscape_light.py']);
 run(process.execPath,['scripts/pack_landscape_light.mjs']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_surface_zones.py']);
}
if(action==='models-planting-lod'){
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/export_botanical_patch.py']);
 run(process.execPath,['scripts/apply_botanical_patch.mjs']);
}
if(action==='doctor'){
 const report={node:process.version,platform:process.platform,blender:blenderBin(),required:['config/garden.layout.json','data/canon/events.json','public/models/overview.glb','blender/daguanyuan_master.blend'].map(file=>({file,exists:existsSync(file)}))};
 writeFileSync('reports/acceptance/doctor.json',JSON.stringify(report,null,2));console.log(report);
}
if(action==='all'){
 const results=[];
 for(const stage of ['assets:fetch','content:prepare','textures:bake','models:build','models:optimize','models:verify','spatial:check','data:build','typecheck','lint','test','verify','build','test:e2e']){
  const r=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['run',stage],{stdio:'inherit',shell:process.platform==='win32'});results.push({stage,exitCode:r.status});writeFileSync('reports/acceptance/pipeline.json',JSON.stringify(results,null,2));if(r.status!==0)process.exit(r.status??1);
 }
}

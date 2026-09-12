import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
export function blenderBin(){
 const candidates=[process.env.BLENDER_BIN,'blender',...['.tools','C:/Program Files/Blender Foundation'].flatMap(p=>existsSync(p)?readdirSync(p).filter(n=>n.toLowerCase().includes('blender')).map(n=>path.join(p,n,'blender.exe')):[])].filter(Boolean);
 for(const c of candidates){const r=spawnSync(c,['--version'],{encoding:'utf8'});if(r.status===0)return path.resolve(c==='blender'?spawnSync('where',['blender'],{encoding:'utf8'}).stdout.trim().split('\n')[0]:c)}
 throw new Error('Blender not found. Set BLENDER_BIN or run python scripts/bootstrap.py on Windows.');
}
const action=process.argv[2];
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{stdio:'inherit',shell:false});if(r.status!==0)throw new Error(`${cmd} exited ${r.status}`)};
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
 if(!process.argv.includes('--sample')){
  run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_landscape_light.py']);
  run(process.execPath,['scripts/pack_landscape_light.mjs']);
  run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_surface_zones.py']);
 }
}
if(action==='models-materials'){
 run(process.execPath,['scripts/pack_foliage_textures.mjs']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_craft_surfaces.py']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/refresh_craft_materials.py']);
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
if(action==='models-overview-budget')run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/refine_overview_budget.py']);
if(action==='models-crowns'){
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/refresh_crown_geometry.py']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_landscape_light.py']);
 run(process.execPath,['scripts/pack_landscape_light.mjs']);
 run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/bake_surface_zones.py']);
}
if(action==='models-mobile')run(blenderBin(),['--background','--disable-autoexec','--python-exit-code','1','--python','blender/export_mobile_overview.py']);
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
 run(process.platform==='win32'?'python':'python3',['scripts/bake_focal_foliage.py']);
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

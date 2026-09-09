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
if(action==='models'){
 run(process.platform==='win32'?'python':'python3',['scripts/process_assets.py']);
 const blend=process.argv.includes('--sample')?'blender/xiaoxiangguan_sample.blend':'blender/daguanyuan_master.blend';
 run(blenderBin(),['--background',...(existsSync(blend)?[blend]:[]),'--disable-autoexec','--python-exit-code','1','--python','blender/build_scene.py','--',...process.argv.slice(3)]);
}
if(action==='doctor'){
 const report={node:process.version,platform:process.platform,blender:blenderBin(),required:['config/garden.layout.json','data/canon/events.json','public/models/overview.glb','blender/daguanyuan_master.blend'].map(file=>({file,exists:existsSync(file)}))};
 writeFileSync('reports/acceptance/doctor.json',JSON.stringify(report,null,2));console.log(report);
}
if(action==='all'){
 const results=[];
 for(const stage of ['assets:fetch','content:prepare','models:build','models:optimize','data:build','typecheck','lint','test','verify','build','test:e2e']){
  const r=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['run',stage],{stdio:'inherit',shell:process.platform==='win32'});results.push({stage,exitCode:r.status});writeFileSync('reports/acceptance/pipeline.json',JSON.stringify(results,null,2));if(r.status!==0)process.exit(r.status??1);
 }
}

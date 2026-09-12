from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
p=R/'src/data/types.ts';s=p.read_text(encoding='utf8').replace('export interface Manifest {overview:',"export interface Manifest {vegetation?:{position:Vec3;scale:Vec3;rotation:number;placeId?:string|null}[];overview:");p.write_text(s,encoding='utf8')
p=R/'src/scene/GardenScene.tsx';s=p.read_text(encoding='utf8')
s=s.replace('<Lake/><Markers','<Suspense fallback={null}><LivingTrees manifest={manifest}/></Suspense><Lake/><Markers')
s=s.replace("o.castShadow=true;o.receiveShadow=true;", "o.castShadow=!o.name.includes('landscape_earth');o.receiveShadow=true;")
s=s.replace("'#192a3a':'#cbd3ce',190,510", "'#192a3a':'#cbd3ce',280,650")
s=s.replace('shadow-normalBias={.1}', 'shadow-normalBias={.3}')
s=s.replace("const position:Vec3=h?[target[0]+8,target[1]+5,target[2]+13]", "const position:Vec3=h?[target[0]+(h.id.endsWith('-study')?5:8),target[1]+(h.id.endsWith('-study')?13:5),target[2]+(h.id.endsWith('-study')?8:13)]")
p.write_text(s,encoding='utf8')
p=R/'scripts/optimize.mjs';s=p.read_text(encoding='utf8').replace("['places','places-low'].flatMap", "['places','places-low','vegetation'].flatMap");p.write_text(s,encoding='utf8')
p=R/'config/garden.layout.json';j=json.loads(p.read_text(encoding='utf8'));j['overviewCamera']={'position':[108,95,179],'target':[-4,2,-17]};p.write_text(json.dumps(j,ensure_ascii=False,indent=2),encoding='utf8')
# The reconstruction uses the approved foliage asset; runtime source attribution is explicit.
p=R/'src/App.tsx';s=p.read_text(encoding='utf8').replace('古建模块、庭院组合与植物为本项目程序化自建。','乔木使用 Poly Haven 的 CC0 Island Tree 01，经简化后以实例化绘制；草地、苔石与旧灰墙亦使用其 CC0 材质。古建模块、院落、竹、蕉、花木与松枝为本项目自建。');p.write_text(s,encoding='utf8')

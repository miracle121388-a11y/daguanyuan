from pathlib import Path
R=Path(__file__).resolve().parents[1]
p=R/'src/scene/GardenScene.tsx';s=p.read_text(encoding='utf8')
s=s.replace("const place=manifest.places.find(p=>p.id===selected);", "const place=manifest.places.find(p=>p.id===selected);const modelManifest=useMemo(()=>quality==='low'?{...manifest,overview:'models/overview-low.glb'}:manifest,[quality,manifest]);")
s=s.replace("<ModelBoundary onRetry={()=>useGLTF.clear(base+manifest.overview)}><Suspense fallback={null}><Overview manifest={manifest}","<ModelBoundary key={modelManifest.overview} onRetry={()=>useGLTF.clear(base+modelManifest.overview)}><Suspense fallback={null}><Overview manifest={modelManifest}")
s=s.replace("export default function GardenScene({manifest}:{manifest:Manifest}){const quality=useGarden(s=>s.qualityLevel);", "export default function GardenScene({manifest}:{manifest:Manifest}){const quality=useGarden(s=>s.qualityLevel);const motion=useGarden(s=>s.motion);const playing=useGarden(s=>s.tourState.status==='playing');")
s=s.replace("<Canvas camera=", "<Canvas frameloop={playing||(motion&&quality==='high')?'always':'demand'} camera=")
p.write_text(s,encoding='utf8')
p=R/'src/App.tsx';s=p.read_text(encoding='utf8')
s=s.replace("芦雪庵的异名与第50回活动的精确地点仍待进一步核对；不作为确定地点发布。", "芦雪庵名称与形制已在第49回核对；雪日联诗地点依据第49—50回的连续场景确定。未核实的其他底本异名不进入默认数据。")
s=s.replace("s.spoilerLimit!==null&&s.spoilerLimit<23?", "s.spoilerLimit!==null&&s.spoilerLimit<({daguanyuan_gate:17,qujingtongyou:17,xiaoxiangguan:40,yihongyuan:23,hengwuyuan:40,qiushuangzhai:37,daoxiangcun:23,ouxiangxie:38,dicuiting:27,luxuean:49,tubishanzhuang:76,aojingxiguan:76}[place.id]??23)?")
s=s.replace("person.aliases.join(' · ')||'《红楼梦》人物'", "s.spoilerLimit!==null&&s.spoilerLimit<37?'《红楼梦》人物':person.aliases.join(' · ')||'《红楼梦》人物'")
s=s.replace("c.aliases[0]??'原著人物'", "s.spoilerLimit!==null&&s.spoilerLimit<37?'原著人物':c.aliases[0]??'原著人物'")
p.write_text(s,encoding='utf8')

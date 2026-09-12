"""One-time overview LOD migration; native and near partitions stay intact."""
import bpy,sys,json,hashlib,shutil
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
from export_scene import export_selected
source=R/'assets/processed/r12-fix1-pre-budget-overview.glb'
if not source.exists():shutil.copy2(R/'public/models/overview.glb',source)
bpy.ops.wm.read_factory_settings(use_empty=True)
payload=source.read_bytes();doc=json.loads(payload[20:20+int.from_bytes(payload[12:16],'little')])
for item in doc.get('images',[]):
 if 'uri' not in item:continue
 target=(R/'public/models'/item['uri']).resolve()
 assert target.is_relative_to(R/'public/textures/shared')
 if not target.exists():
  matches=list((R/'.deploy').glob('*/dist/textures/shared/'+target.name))
  assert matches,'Missing original source map: '+target.name
  shutil.copy2(matches[0],target)
  if Path(str(matches[0])+'.json').exists():shutil.copy2(Path(str(matches[0])+'.json'),Path(str(target)+'.json'))
 assert hashlib.sha256(target.read_bytes()).hexdigest()==target.stem
temp=R/'public/models/overview-budget-source.glb';shutil.copy2(source,temp)
try:bpy.ops.import_scene.gltf(filepath=str(temp))
finally:temp.unlink()
assert all(im.packed_file or (im.source!='FILE') or Path(bpy.path.abspath(im.filepath)).is_file() for im in bpy.data.images),'An imported map is missing'
rows=[]
for ob in bpy.context.scene.objects:
 if ob.type!='MESH' or not ob.get('focalBotany'):continue
 md=ob.modifiers.new('FarBotanicalBudget','DECIMATE');md.ratio=.010/.11
 bpy.context.view_layer.update()
 evaluated=ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
 rows.append({'name':ob.name,'beforeFaces':len(ob.data.polygons),'afterFaces':len(evaluated.data.polygons)})
objects=list(bpy.context.scene.objects)
export_selected(R/'public/models/overview-low.glb',objects)
shutil.copy2(R/'public/models/overview-low.glb',R/'public/models/overview.glb')
(R/'reports/acceptance/r12-fix1-overview-budget.json').write_text(json.dumps({'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'method':'Further decimate only distant focal botanical meshes from ratio .11 to .010; native and both near partitions unchanged. Future fresh exports use .010 directly.','rows':rows},indent=2),encoding='utf8')
print('FAR BOTANICAL LOD',rows,flush=True)

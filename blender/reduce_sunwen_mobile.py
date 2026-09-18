"""Simplify distant stones and low beds; preserve buildings and the native master."""
import hashlib,json,sys
from pathlib import Path
import bpy

R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
from export_scene import export_selected
from sunwen_landscape_lod import export_low_beds

source=R/'public/models/overview.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
rows=[]
for ob in bpy.context.scene.objects:
    if ob.type!='MESH':continue
    roles={m.get('sunwenRole',m.name) for m in ob.data.materials}
    ratio=.15 if roles=={'limestone'} else .16 if roles=={'botanical_stem'} else None
    if ratio is None or len(ob.data.polygons)<500:continue
    modifier=ob.modifiers.new('Distant_Stone_And_Stem','DECIMATE');modifier.ratio=ratio
    bpy.context.view_layer.update();ev=ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
    rows.append({'mesh':ob.name,'beforeFaces':len(ob.data.polygons),'afterFaces':len(ev.data.polygons),'roles':sorted(roles)})
export_selected(R/'public/models/overview-low.glb',list(bpy.context.scene.objects))

master=R/'blender/daguanyuan_master.blend';master_hash=hashlib.sha256(master.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(master),load_ui=False,use_scripts=False)
objects=list(bpy.data.collections['Sunwen_Garden_Details'].objects)
export_low_beds(R/'public/models/sunwen-landscape-low.glb',objects)
assert hashlib.sha256(master.read_bytes()).hexdigest()==master_hash
(R/'reports/acceptance/r17-mobile-landscape.json').write_text(json.dumps({'source':'public/models/overview.glb','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'masterSha256':master_hash,'masterUnchanged':True,'method':__doc__,'rows':rows},indent=2)+'\n')
print('MOBILE GARDEN REDUCED',len(rows),'distant stone/stem meshes; native and detailed buildings unchanged',flush=True)

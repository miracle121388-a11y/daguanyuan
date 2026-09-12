"""Re-export distant LODs from the unmodified detailed master."""
import bpy,sys,json
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
from export_scene import export_selected
from mobile_export import build_mobile
bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
objects=list(dict.fromkeys(o for c in bpy.data.collections if c.name.startswith('Place_') or c.name in ['Garden_Landscape','Manual_Adjustments'] for o in c.all_objects))
mods=[]
for ob in objects:
 if ob.type=='MESH' and len(ob.data.polygons)>1000:
  md=ob.modifiers.new('OverviewLOD','DECIMATE');md.ratio=.40 if any(m.name in ['roof','tile','tilelight','tiledark'] for m in ob.data.materials) else .27;mods.append((ob,md))
bpy.context.view_layer.update();export_selected(R/'public/models/overview.glb',objects)
for ob,md in mods:ob.modifiers.remove(md)
c=bpy.data.collections.new('Temporary_Low_Export');bpy.context.scene.collection.children.link(c)
low=build_mobile(objects,c);export_selected(R/'public/models/overview-low.glb',low+[o for o in objects if o.type=='EMPTY'])
from reference_vegetation import build_tree_prototype
build_tree_prototype(export_high=False)
p=R/'public/scene-manifest.json';m=json.loads(p.read_text(encoding='utf8'));m['assetRevision']='reference-world-20260910-r3';p.write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf8')
print('PERFORMANCE LODS REEXPORTED; detailed master and selected-place models unchanged',flush=True)

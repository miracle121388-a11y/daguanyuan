import bpy,sys
from pathlib import Path
r=Path.cwd();sys.path.insert(0,str(r/'blender'))
from mobile_export import build_mobile
from export_scene import export_selected
bpy.ops.wm.open_mainfile(filepath=str(r/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
c=bpy.data.collections.new('Test_Bake');bpy.context.scene.collection.children.link(c)
objects=list(bpy.data.collections['Place_xiaoxiangguan'].all_objects)
low=build_mobile(objects,c)
export_selected(r/'reports/blender/r5-bake-probe.glb',low)
for o in low:
 for m in o.data.materials:
  for node in m.node_tree.nodes:
   if node.type=='TEX_IMAGE':
    node.image.filepath_raw=str(r/'reports/blender/r5-bake-probe.png');node.image.file_format='PNG';node.image.save()
print('BAKE PROBE SUCCESS',flush=True)

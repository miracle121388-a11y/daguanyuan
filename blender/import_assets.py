import bpy
from pathlib import Path
def import_rock(collection):
 path=Path(__file__).resolve().parents[1]/'assets/source/coast_rocks_02/coast_rocks_02.gltf'
 if not path.exists():return None
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(path));new=[o for o in bpy.data.objects if o not in before]
 meshes=[o for o in new if o.type=='MESH']
 if not meshes:return None
 for o in new:
  for c in list(o.users_collection):c.objects.unlink(o)
  collection.objects.link(o)
 bpy.ops.object.select_all(action='DESELECT')
 for o in meshes:o.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();o=bpy.context.object
 mod=o.modifiers.new('Web rock simplification','DECIMATE');mod.ratio=min(1,1000/max(1,len(o.data.polygons)));bpy.ops.object.modifier_apply(modifier=mod.name)
 o.name='PolyHaven_coast_rocks_02';o.hide_render=True;o.hide_set(True)
 return o

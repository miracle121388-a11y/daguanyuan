"""Reduce a completed baked overview without rebaking or changing the master."""
import bpy,sys,os,shutil
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
from export_scene import export_selected
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(R/'assets/processed/baseline/reference-public_models_overview-low.glb'))
objects=list(bpy.context.scene.objects)
for ob in objects:
 if ob.type=='MESH' and len(ob.data.polygons)>500:
  md=ob.modifiers.new('Overview_budget','DECIMATE');md.ratio=.55 if ob.name.startswith('Mobile_landscape') else .5
export_selected(R/'public/models/overview-low.glb',objects)
shutil.copyfile(R/'public/models/overview-low.glb',R/'public/models/overview.next.glb');os.replace(R/'public/models/overview.next.glb',R/'public/models/overview.glb')
print('BAKED OVERVIEW BUDGET RECOVERY COMPLETE',flush=True)

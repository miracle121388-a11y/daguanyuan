import bpy,sys
from pathlib import Path
R=Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_cube_add();bpy.context.object['placeId']='pipeline_probe'
bpy.ops.wm.save_as_mainfile(filepath=str(R/'reports/blender/pipeline-probe.blend'))
bpy.ops.export_scene.gltf(filepath=str(R/'public/models/pipeline-probe.glb'),export_format='GLB',export_extras=True)

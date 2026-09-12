import bpy,sys
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'blender'))
from bake_detail_contact import bake_contact
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_grid_add(x_subdivisions=12,y_subdivisions=12,size=4);floor=bpy.context.object;floor.name='Probe_Floor'
m=bpy.data.materials.new('floorwood');m.use_nodes=True;floor.data.materials.append(m)
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,.5));cube=bpy.context.object
bake_contact([floor,cube],'xiaoxiangguan')
attr=floor.data.color_attributes['ContactAO'];v=[i.color[0] for i in attr.data]
assert min(v)<max(v)-.15,(min(v),max(v))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(Path.cwd()/'reports/blender/r8-contact-probe.glb'),export_format='GLB',use_selection=True,export_vertex_color='ACTIVE')
print('CONTACT PROBE PASS',min(v),max(v))

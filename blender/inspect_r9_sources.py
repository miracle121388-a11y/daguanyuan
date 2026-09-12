"""Review source geometry at uniform horizontal scale before using it in the garden."""
import bpy,sys,json,math
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
records=[]
for i,aid in enumerate(['fern_02','shrub_01','shrub_03','rock_moss_set_01','rock_07','coast_rocks_02']):
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(R/'assets/source'/aid/(aid+'.gltf')))
 objects=[o for o in bpy.data.objects if o not in before and o.type=='MESH']
 ob=max(objects,key=lambda o:len(o.data.polygons))
 for other in objects:
  if other!=ob:bpy.data.objects.remove(other,do_unlink=True)
 matrix=ob.matrix_world.copy()
 for v in ob.data.vertices:v.co=matrix@v.co
 ob.matrix_world.identity()
 lo=Vector(tuple(min(v.co[k] for v in ob.data.vertices) for k in range(3)));hi=Vector(tuple(max(v.co[k] for v in ob.data.vertices) for k in range(3)))
 records.append({'id':aid,'mesh':ob.name,'sourceExtent':list(hi-lo),'polygons':len(ob.data.polygons)})
 factor=2.5/max((hi-lo).x,(hi-lo).y);center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
 for v in ob.data.vertices:v.co=(v.co-center)*factor
 ob.location=((i%3-1)*3.4,(1-i//3)*3.4,0)
 for m in ob.data.materials:
  if not m.use_nodes:continue
  bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Roughness'].default_value=.85
  for node in m.node_tree.nodes:
   if node.type=='TEX_IMAGE' and node.image and 'diff' in node.image.name:
    png=R/'assets/source'/aid/'textures'/f'{aid}_diff_1k.png'
    if png.exists():node.image=bpy.data.images.load(str(png));m.node_tree.links.new(node.outputs['Alpha'],bs.inputs['Alpha'])
  m.surface_render_method='DITHERED';m.use_backface_culling=False
 bpy.ops.object.text_add(location=(ob.location.x-1.15,ob.location.y-1.6,.015));txt=bpy.context.object;txt.data.body=f'{i+1}. {aid}';txt.data.size=.22
 mat=bpy.data.materials.get('Ink') or bpy.data.materials.new('Ink');mat.diffuse_color=(.08,.08,.07,1);txt.data.materials.append(mat)
bpy.ops.mesh.primitive_plane_add(size=200);ground=bpy.context.object;ground.location.z=-.02
mat=bpy.data.materials.new('Neutral');mat.diffuse_color=(.32,.34,.29,1);ground.data.materials.append(mat)
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.64,.72,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
bpy.ops.object.light_add(type='AREA',location=(-4,-2,8));bpy.context.object.data.energy=1800;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=6
bpy.ops.object.camera_add(location=(0,-11,11));camera=bpy.context.object;camera.rotation_euler=(Vector((0,1.5,.4))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=12
scene=bpy.context.scene;scene.camera=camera;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.threads_mode='FIXED';scene.render.threads=8;scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.filepath=str(R/'reports/browser/r9-source-shapes.png');bpy.ops.render.render(write_still=True)
(R/'reports/acceptance/r9-source-shapes.json').write_text(json.dumps(records,indent=2))

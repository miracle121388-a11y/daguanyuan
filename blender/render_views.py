import bpy,math,sys
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1]
def render(blend,output,position,target,scale):
 bpy.ops.wm.open_mainfile(filepath=str(R/'blender'/blend),load_ui=False,use_scripts=False)
 scene=bpy.context.scene
 if 'Render_Setup' in bpy.data.collections:
  c=bpy.data.collections['Render_Setup']
  for o in list(c.objects):bpy.data.objects.remove(o,do_unlink=True)
  bpy.data.collections.remove(c)
 c=bpy.data.collections.new('Render_Setup');scene.collection.children.link(c)
 camera=bpy.data.objects.new('Garden_Editorial_Camera',bpy.data.cameras.new('Garden Camera'));c.objects.link(camera);camera.location=position;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=scale;scene.camera=camera
 light=bpy.data.objects.new('Afternoon_Sun',bpy.data.lights.new('Afternoon Sun','SUN'));c.objects.link(light);light.rotation_euler=(.4,-.6,-.4);light.data.energy=2.4;light.data.angle=.15
 world=bpy.data.worlds.new('Garden World');world.use_nodes=True;scene.world=world;bg=world.node_tree.nodes.get('Background');bg.inputs['Strength'].default_value=.45
 hdr=R/'assets/source/forest_grove.hdr'
 if hdr.exists():
  tex=world.node_tree.nodes.new('ShaderNodeTexEnvironment');tex.image=bpy.data.images.load(str(hdr),check_existing=True);tex.image.pack();world.node_tree.links.new(tex.outputs['Color'],bg.inputs['Color'])
 # Master water is editable; browser supplies its own animated equivalent.
 if blend.startswith('daguanyuan'):
  bpy.ops.mesh.primitive_circle_add(vertices=96,radius=1,fill_type='NGON',location=(0,14,-.16));water=bpy.context.object;water.name='Water_Master_Editable';water.scale=(34,53,1)
  for coll in list(water.users_collection):coll.objects.unlink(water)
  c.objects.link(water);wm=bpy.data.materials.get('water') or bpy.data.materials.new('water');wm.diffuse_color=(.23,.38,.31,1);wm.use_nodes=True;wm.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.23,.38,.31,1);water.data.materials.append(wm)
 scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=4;scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100
 scene.render.image_settings.file_format='PNG';scene.render.filepath=str(R/'reports/blender'/output);scene.render.film_transparent=True
 bpy.ops.file.make_paths_relative();bpy.ops.wm.save_as_mainfile(filepath=str(R/'blender'/blend));bpy.ops.render.render(write_still=True)
render('xiaoxiangguan_sample.blend','xiaoxiangguan.png',(35,-45,34),(0,0,2),59)
render('daguanyuan_master.blend','overview.png',(170,-218,175),(0,0,0),300)

"""Render a real source tree into an overview LOD; close views keep 3D crowns.
This is a derivative of Poly Haven's CC0 island_tree_01, not a generated picture.
"""
import bpy, math, json, hashlib, os
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(R/'assets/source/island_tree_01/island_tree_01.gltf'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
for m in bpy.data.materials:
 if not m.use_nodes:continue
 bs=m.node_tree.nodes.get('Principled BSDF')
 if 'leaves' in m.name:
  tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(R/'assets/source/island_tree_01/textures/island_tree_01_leaves_diff_1k.png'))
  alpha=m.node_tree.nodes.new('ShaderNodeTexImage');alpha.image=bpy.data.images.load(str(R/'assets/source/island_tree_01/textures/island_tree_01_leaves_alpha_1k.png'));alpha.image.colorspace_settings.name='Non-Color'
  m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color']);m.node_tree.links.new(alpha.outputs['Color'],bs.inputs['Alpha']);m.surface_render_method='DITHERED'
  bs.inputs['Roughness'].default_value=.8
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100
scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.56,.65,.72,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
light=bpy.data.lights.new('Soft morning sun','AREA');light.energy=1700;light.shape='DISK';light.size=9
ob=bpy.data.objects.new('Soft morning sun',light);scene.collection.objects.link(ob);ob.location=(-8,-9,16);ob.rotation_euler=(Vector((0,0,4))-ob.location).to_track_quat('-Z','Y').to_euler()
points=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box];low=Vector(tuple(min(p[i] for p in points) for i in range(3)));high=Vector(tuple(max(p[i] for p in points) for i in range(3)));center=(low+high)/2
cam=bpy.data.cameras.new('CanopyCamera');camera=bpy.data.objects.new('CanopyCamera',cam);scene.collection.objects.link(camera);scene.camera=camera;cam.type='ORTHO';cam.ortho_scale=max(high.x-low.x,high.z-low.z)*1.15
camera.location=center+Vector((0,-24,12));camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.55
out=R/'public/textures/vegetation';out.mkdir(parents=True,exist_ok=True)
for name,offset in [('canopy-render',(0,-24,12)),('canopy-east',(24,0,12)),('canopy-back',(0,24,12)),('canopy-west',(-24,0,12)),('canopy-top',(0,-.01,26))]:
 camera.location=center+Vector(offset);camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(out/(name+'.next.png'));bpy.ops.render.render(write_still=True);os.replace(out/(name+'.next.png'),out/(name+'.png'))
 record={'origin':f'Blender Cycles render of Poly Haven island_tree_01, CC0 1.0; original leaves alpha restored; 24 samples, 512 square, transparent background, camera {offset}, exposure +0.55. Source https://polyhaven.com/a/island_tree_01', 'sourceAsset':'island_tree_01','license':'CC0-1.0','sha256':hashlib.sha256((out/(name+'.png')).read_bytes()).hexdigest(),'center':list(center),'size':cam.ortho_scale}
 record['prompt']=record['origin'];temp=out/(name+'.json.next');temp.write_text(json.dumps(record,indent=2),encoding='utf8');os.replace(temp,out/(name+'.png.json'))
 print('CANOPY RENDERED',name,flush=True)

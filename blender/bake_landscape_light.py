"""Render real scene shadows onto the earth, using the saved editable master."""
import bpy,math,json,hashlib,os,sys
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1]
REVISION=json.loads((R/'public/scene-manifest.json').read_text(encoding='utf-8'))['assetRevision'].rsplit('-',1)[-1]
master=R/'blender/daguanyuan_master.blend'
bpy.ops.wm.open_mainfile(filepath=str(master))
# Complete older masters with the editable native counterpart before recording
# the source hash. The subsequent shadow-only replacements are never saved.
sys.path.insert(0,str(R/'blender'))
if 'Reference_Water_Surface' not in bpy.data.collections:
 from native_water import build as build_native_water
 build_native_water(json.loads((R/'config/garden.layout.json').read_text(encoding='utf-8')))
 bpy.ops.wm.save_as_mainfile(filepath=str(master))
# The overview atlas depicts the complete source canopy. Cast its actual leaf
# silhouette as well, instead of the sparse subset used for interactive meshes.
# Linked datablocks keep thousands of trees instanced; this changes only the
# temporary shadow-render scene, never the saved editable master.
sys.path.insert(0,str(R/'blender'))
planted=[ob for ob in bpy.context.scene.objects if ob.name.startswith('LivingTree_')]
native_full=bool(planted) and all(ob.get('nativeGeometry') in ['full-source-crown','authored-sunwen-crown'] for ob in planted)
if not native_full:
 from source_crowns import source,shrub_source,SOURCES
 crowns={}
 for aid,_ in SOURCES:
  prototype=source(aid);prototype.hide_render=True;crowns[aid]=prototype.data
 prototype=shrub_source();prototype.hide_render=True;crowns['shrub']=prototype.data
 for ob in planted:
  key='shrub' if ob.get('plantingLayer')=='understorey' else ob.get('sourceAsset')
  if key in crowns:ob.data=crowns[key]
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED';scene.render.threads=8
scene.render.resolution_x=2048;scene.render.resolution_y=2048;scene.render.resolution_percentage=100
scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
for ob in list(scene.objects):
 if ob.type=='LIGHT':bpy.data.objects.remove(ob,do_unlink=True)
white=bpy.data.materials.new('Lightmap_White_Receiver');white.use_nodes=True
bs=white.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(1,1,1,1);bs.inputs['Roughness'].default_value=1
bs.inputs['Specular IOR Level'].default_value=0
for ob in scene.objects:
 if ob.type in ['CURVE','SURFACE','FONT','META']:
  ob.visible_camera=False
  continue
 if ob.type!='MESH' or ob.hide_render:continue
 ground=any(m.name=='earth' for m in ob.data.materials)
 ob.visible_camera=ground
 if ground:
  for i in range(len(ob.data.materials)):ob.data.materials[i]=white
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(1,1,1,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.14
sun_data=bpy.data.lights.new('Garden_Sun_Shadow','SUN');sun_data.energy=2.8;sun_data.angle=math.radians(2.5)
sun=bpy.data.objects.new('Garden_Sun_Shadow',sun_data);scene.collection.objects.link(sun);sun.location=(-80,-42,62);sun.rotation_euler=(-sun.location).to_track_quat('-Z','Y').to_euler()
camera_data=bpy.data.cameras.new('World_Light_Atlas');camera_data.type='ORTHO';camera_data.ortho_scale=720;camera_data.clip_end=1600
camera=bpy.data.objects.new('World_Light_Atlas',camera_data);scene.collection.objects.link(camera);camera.location=(0,30,700);camera.rotation_euler=(0,0,0);scene.camera=camera
folder=R/f'assets/processed/landscape-{REVISION}';folder.mkdir(parents=True,exist_ok=True);target=folder/'light.png';temporary=folder/'light.next.png'
scene.render.filepath=str(temporary);bpy.ops.render.render(write_still=True);os.replace(temporary,target)
record={'origin':'Cycles shadow render of the editable Daguanyuan master. The camera sees only white earth receivers; the actual local buildings, source trees, bamboo, stones and furniture cast shadows. No painted replacement scene.',
 'method':'2048 square; orthographic 720m; camera [0,30,700]; Cycles 16 samples with denoising; world .14; sun2.8 at[-80,-42,62], angular size2.5deg; Standard color transform. Actual planted transforms use linked complete source crowns matching the distance atlas, instead of interactive sparse leaf subsets. Saved master unchanged.',
 'nativeFullCrowns':native_full,'worldBounds':{'x':[-360,360],'blenderY':[-330,390]},'sourceMaster':'blender/daguanyuan_master.blend','sourceMasterSha256':hashlib.sha256(master.read_bytes()).hexdigest(),'renderSha256':hashlib.sha256(target.read_bytes()).hexdigest()}
(folder/'manifest.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
print('LANDSCAPE SHADOW RENDER COMPLETE',flush=True)

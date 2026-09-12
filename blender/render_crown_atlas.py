"""Render 3 source crowns and one derived low shrub x 5 directions; no painted tree stand-ins."""
import bpy,sys,json,math,os,hashlib
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1]
REVISION=json.loads((R/'config/craft.materials.json').read_text(encoding='utf-8'))['revision'];sys.path.insert(0,str(R/'blender'))
from source_crowns import source,SOURCES,shrub_source
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED';scene.render.threads=8
scene.render.resolution_x=384;scene.render.resolution_y=384;scene.render.resolution_percentage=100
scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.62,.71,.80,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
light=bpy.data.lights.new('Diffuse daylight','AREA');light.energy=1800;light.shape='DISK';light.size=9
sun=bpy.data.objects.new('Diffuse daylight',light);scene.collection.objects.link(sun);sun.location=(-8,-9,15);sun.rotation_euler=(Vector((0,0,2.5))-sun.location).to_track_quat('-Z','Y').to_euler()
cam=bpy.data.cameras.new('Source crown camera');camera=bpy.data.objects.new('Source crown camera',cam);scene.collection.objects.link(camera);scene.camera=camera;cam.type='ORTHO';cam.ortho_scale=6.25
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.4
output=R/f'assets/processed/crown-{REVISION}';output.mkdir(parents=True,exist_ok=True);records=[]
for row,(aid,name) in enumerate(SOURCES+[('island_tree_01','shrub')]):
 ob=shrub_source() if name=='shrub' else source(aid)
 for col,offset in enumerate([(0,-24,10),(24,0,10),(0,24,10),(-24,0,10),(0,-.01,26)]):
  camera.location=Vector((0,0,2.5))+Vector(offset);camera.rotation_euler=(Vector((0,0,2.5))-camera.location).to_track_quat('-Z','Y').to_euler()
  target=output/f'{row}-{col}.png';scene.render.filepath=str(target.with_suffix('.next.png'));bpy.ops.render.render(write_still=True);os.replace(target.with_suffix('.next.png'),target)
  records.append({'file':target.relative_to(R).as_posix(),'sourceAsset':aid,'form':name,'license':'CC0-1.0','camera':offset,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
 bpy.data.objects.remove(ob,do_unlink=True)
(output/'manifest.json').write_text(json.dumps({'method':'Cycles 24 samples; source colour and alpha packed once at256 with scripts/pack_foliage_textures.mjs; r8 slender lower-trunk deformation; r10 fourth row uses the exact low shrub deformation from source_crowns.shrub_source (source_crowns.py); 384 square; orthographic6.25m; AgX exposure+.4; sources normalized to5.1m largest extent.','renders':records},indent=2),encoding='utf8')
print('CROWN ATLAS SOURCE RENDERS COMPLETE',flush=True)

"""Render two current-master evidence views; never overwrite the editable file.

These are native Cycles renders, not browser captures or performance evidence.
They use the actual saved meshes/materials and the published camera coordinates.
"""
import bpy,json,hashlib,math,datetime,os
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];master=R/'blender/daguanyuan_master.blend'
manifest=json.loads((R/'public/scene-manifest.json').read_text(encoding='utf-8'))
revision=manifest['assetRevision'].rsplit('-',1)[-1]
bpy.ops.wm.open_mainfile(filepath=str(master),load_ui=False,use_scripts=False)
assert 'Reference_Water_Surface' in bpy.data.collections,'Native water counterpart must be present in the saved master'
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED';scene.render.threads=8
scene.render.resolution_x=1280;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB';scene.render.film_transparent=False
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.4
for ob in list(scene.objects):
 if ob.type=='LIGHT':bpy.data.objects.remove(ob,do_unlink=True)
scene.world.use_nodes=True;nodes=scene.world.node_tree.nodes;nodes.clear();links=scene.world.node_tree.links
background=nodes.new('ShaderNodeBackground');background.inputs[0].default_value=(.80,.82,.75,1);background.inputs[1].default_value=.85
output=nodes.new('ShaderNodeOutputWorld');links.new(background.outputs[0],output.inputs['Surface'])
light=bpy.data.lights.new('Evidence_Daylight','SUN');light.energy=2.6;light.angle=math.radians(2.5);light.color=(1.0,.92,.79)
sun=bpy.data.objects.new('Evidence_Daylight',light);scene.collection.objects.link(sun);sun.location=(-80,-42,62);sun.rotation_euler=(-sun.location).to_track_quat('-Z','Y').to_euler()
camera_data=bpy.data.cameras.new('Evidence_Camera');camera=bpy.data.objects.new('Evidence_Camera',camera_data);scene.collection.objects.link(camera);scene.camera=camera;camera_data.clip_end=1600
unweb=lambda p:Vector((p[0],-p[2],p[1]))
place=next(p for p in manifest['places'] if p['id']=='xiaoxiangguan')
views=[('full',manifest['overviewCamera']['position'],manifest['overviewCamera']['target'],48),('xiaoxiang',place['cameraPosition'],place['cameraTarget'],43)]
records=[]
for name,eye,aim,fov in views:
 camera.location=unweb(eye);camera.rotation_euler=(unweb(aim)-camera.location).to_track_quat('-Z','Y').to_euler()
 # Three.js uses vertical FOV; Blender's horizontal sensor fit uses horizontal.
 camera_data.sensor_fit='HORIZONTAL';camera_data.angle=2*math.atan(math.tan(math.radians(fov)/2)*scene.render.resolution_x/scene.render.resolution_y)
 target=R/f'reports/blender/{revision}-master-{name}.png';temporary=target.with_suffix('.next.png');scene.render.filepath=str(temporary)
 bpy.ops.render.render(write_still=True);os.replace(temporary,target)
 records.append({'file':target.relative_to(R).as_posix(),'width':1280,'height':800,'cameraWeb':eye,'targetWeb':aim,'verticalFovDegrees':fov,'horizontalFovDegrees':math.degrees(camera_data.angle),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
record={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'revision':manifest['assetRevision'],'masterSha256':hashlib.sha256(master.read_bytes()).hexdigest(),'method':'Actual saved master meshes and materials; Cycles24, denoised, native physical water; AgX Medium High Contrast exposure+.4; dedicated light/camera exist only in this unsaved render session. No browser UI, no real-phone or performance claim. Runtime water uses planar scene reflection, while native water uses Cycles transmission.','renders':records}
(R/f'reports/acceptance/{revision}-master-render-evidence.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
print('CURRENT MASTER VIEWS COMPLETE',revision,flush=True)

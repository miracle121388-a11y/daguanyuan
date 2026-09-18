"""Extend the existing four-species atlas with the actual authored plant meshes."""
import hashlib
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'blender'))
from sunwen_botany import prototype

records = []
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 20
scene.cycles.use_denoising = True
scene.render.threads_mode = 'FIXED'
scene.render.threads = 8
scene.render.resolution_x = scene.render.resolution_y = 384
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.62, .71, .80, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .8
light = bpy.data.lights.new('Diffuse daylight', 'AREA')
light.energy = 1800
light.shape = 'DISK'
light.size = 9
sun = bpy.data.objects.new('Diffuse daylight', light)
scene.collection.objects.link(sun)
sun.location = (-8, -9, 15)
sun.rotation_euler = (Vector((0, 0, 2.5)) - sun.location).to_track_quat('-Z', 'Y').to_euler()
cam = bpy.data.cameras.new('Sunwen crown camera')
camera = bpy.data.objects.new('Sunwen crown camera', cam)
scene.collection.objects.link(camera)
scene.camera = camera
cam.type = 'ORTHO'
cam.ortho_scale = 6.25
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = .65
out = ROOT / 'assets/processed/crown-r17'
out.mkdir(parents=True, exist_ok=True)
for row, name in enumerate(['scholar-tree','ginkgo','chinese-pine','shrub','willow','crabapple','white-blossom','red-maple']):
    ob = prototype(name, scene.collection)
    for column, offset in enumerate([(0, -24, 10), (24, 0, 10), (0, 24, 10), (-24, 0, 10), (0, -.01, 26)]):
        camera.location = Vector((0, 0, 2.5)) + Vector(offset)
        camera.rotation_euler = (Vector((0, 0, 2.5)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        target = out / f'{row}-{column}.png'
        scene.render.filepath = str(target)
        bpy.ops.render.render(write_still=True)
        records.append({'file': target.relative_to(ROOT).as_posix(), 'sourceAsset': 'authored_sunwen_' + name, 'form': name, 'license': 'Project-authored geometry; no external image', 'camera': offset, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
    bpy.data.objects.remove(ob, do_unlink=True)
(out / 'manifest.json').write_text(json.dumps({'method': 'All eight rows: Cycles20 actual authored meshes, same 6.25m orthographic camera and 384px tile. Sunwen images are reference only.', 'renders': records}, indent=2) + '\n')
print('ALBUM ATLAS READY', len(records), flush=True)

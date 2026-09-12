"""Local ground-cover assets rendered from the reviewed CC0 grass geometry.

This is a material bake, not a garden illustration. The editable garden remains
fully geometric; the top-down patch supplies metre-scale turf variation.
"""
import bpy, math, random, json, hashlib, sys
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
from export_scene import export_selected
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(R/'assets/source/grass_medium_01/grass_medium_01.gltf'))
source=[o for o in bpy.context.scene.objects if o.type=='MESH']
source.sort(key=lambda o:len(o.data.polygons))
for ob in source:
    ob.location=(0,0,0);ob.rotation_euler=(0,0,0);ob.scale=(1,1,1)
    lo=Vector(tuple(min(v.co[i] for v in ob.data.vertices) for i in range(3)))
    hi=Vector(tuple(max(v.co[i] for v in ob.data.vertices) for i in range(3)))
    mid=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
    for v in ob.data.vertices:v.co-=mid
    ob.hide_render=True;ob.hide_set(True)
for mat in bpy.data.materials:
    if not mat.use_nodes:continue
    bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.96
    bs.inputs['Alpha'].default_value=1
    for link in list(bs.inputs['Alpha'].links):mat.node_tree.links.remove(link)
    for node in mat.node_tree.nodes:
        if node.type=='TEX_IMAGE' and node.image:
            node.image.scale(512,512);node.image.pack()

# One compact, genuinely curved grass mesh for near-bank instancing.
small=next(o for o in source if 150<=len(o.data.polygons)<=450)
small.hide_set(False);small.hide_render=False;small.name='Source_Grass_Clump'
export_selected(R/'public/models/vegetation/ground-cover.glb',[small])
small.hide_render=True;small.hide_set(True)

# A seamless crop of one seeded 3D patch. Wrapped copies close all four borders.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=8
scene.render.threads_mode='FIXED';scene.render.threads=8
scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
scene.render.resolution_x=1024;scene.render.resolution_y=1024;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
for mat in bpy.data.materials:
    if not mat.use_nodes:continue
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
    emission=nodes.new('ShaderNodeEmission');emission.inputs['Color'].default_value=(.17,.22,.08,1)
    if bs.inputs['Base Color'].is_linked:links.new(bs.inputs['Base Color'].links[0].from_socket,emission.inputs['Color'])
    output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL');links.new(emission.outputs[0],output.inputs['Surface'])
bpy.ops.mesh.primitive_plane_add(size=2.8,location=(0,0,-.01));ground=bpy.context.object
mat=bpy.data.materials.new('Turf_Underlayer');mat.use_nodes=True
nodes=mat.node_tree.nodes;em=nodes.new('ShaderNodeEmission');em.inputs['Color'].default_value=(.065,.09,.029,1)
mat.node_tree.links.new(em.outputs[0],nodes.get('Material Output').inputs['Surface']);ground.data.materials.append(mat)
rng=random.Random(7112026);choices=[o for o in source if len(o.data.polygons)>200]
for i in range(760):
    base=choices[i%len(choices)];x,y=rng.uniform(-1.4,1.4),rng.uniform(-1.4,1.4)
    scale=rng.uniform(1.0,1.7);angle=rng.random()*math.tau
    for dx in [-2.8,0,2.8]:
        for dy in [-2.8,0,2.8]:
            if abs(x+dx)>1.8 or abs(y+dy)>1.8:continue
            ob=bpy.data.objects.new('Turf_Bake_'+str(i),base.data);scene.collection.objects.link(ob)
            ob.location=(x+dx,y+dy,.002);ob.rotation_euler.z=angle;ob.scale=(scale,scale,scale)
camera_data=bpy.data.cameras.new('Ground_Albedo_Camera');camera_data.type='ORTHO';camera_data.ortho_scale=2.8
camera=bpy.data.objects.new('Ground_Albedo_Camera',camera_data);scene.collection.objects.link(camera)
camera.location=(0,0,8);camera.rotation_euler=(0,0,0);scene.camera=camera
folder=R/'assets/processed/ground-r7';folder.mkdir(parents=True,exist_ok=True)
scene.render.filepath=str(folder/'turf.png');bpy.ops.render.render(write_still=True)
record={'origin':'Local colour-only orthographic material bake from Poly Haven grass_medium_01 geometry and its source diffuse map; not a garden image.',
 'source':'assets/source/grass_medium_01/grass_medium_01.gltf','sourceSha256':hashlib.sha256((R/'assets/source/grass_medium_01/grass_medium_01.gltf').read_bytes()).hexdigest(),
 'method':'760 seeded tufts, wrapped 2.8m patch, Cycles8 emission pass, 1024 square, Standard color transform; seed7112026.',
 'renderSha256':hashlib.sha256((folder/'turf.png').read_bytes()).hexdigest()}
(folder/'manifest.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
print('R7 GROUND COVER COMPLETE',flush=True)

"""Extract the licensed standing Ming outfit; retain UVs and local textures."""
import bpy,json,hashlib,numpy as np
from pathlib import Path
from mathutils import Matrix
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'.local/characters-ming-20260927/style3d-standing.glb'
OUT=ROOT/'assets/characters/style3d';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
# Only garment panels, bindings and fasteners. Remove the source model's body,
# modern hairstyle and footwear; project anatomy and hairstyles are independent.
kept=[]
for obj in list(bpy.data.objects):
    if obj.type!='MESH':continue
    name=obj.data.materials[0].name
    keep=name.startswith(('1_front','11_front','12_front')) or name in ['material','material_50','material_51','material_52','material_53','material_54']
    if not keep:bpy.data.objects.remove(obj,do_unlink=True);continue
    matrix=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=Matrix.Identity(4)
    # Blender importer yields Z-up millimetres. Authoring asset uses app Y-up m.
    for v in obj.data.vertices:
        p=matrix@v.co;v.co=(p.x*.001,p.z*.001,-p.y*.001)
    obj.name='ming_'+name;obj['sourceMaterial']=name
    bpy.context.view_layer.objects.active=obj
    if len(obj.data.polygons)>600:
        dec=obj.modifiers.new('Web garment topology','DECIMATE');dec.ratio=.10 if name.startswith('material') else .30
        bpy.ops.object.modifier_apply(modifier=dec.name)
    for p in obj.data.polygons:p.use_smooth=True
    kept.append(obj)
# Reduce photographic texture payload once, preserving embroidery and normals.
used={node.image for obj in kept for mat in obj.data.materials for node in mat.node_tree.nodes if node.type=='TEX_IMAGE' and node.image}
for index,img in enumerate(sorted(used,key=lambda x:x.name)):
    size=max(img.size);ratio=min(1,2048/size)
    img.scale(max(1,int(img.size[0]*ratio)),max(1,int(img.size[1]*ratio)))
    pixels=np.empty(len(img.pixels),dtype=np.float32);img.pixels.foreach_get(pixels)
    has_alpha=img.channels==4 and pixels[3::4].min()<.999
    ext='png' if has_alpha else 'jpg'
    path=OUT/f'standing-texture-{index:02}.{ext}';img.filepath_raw=str(path);img.file_format='PNG' if has_alpha else 'JPEG';img.save();img.pack()
bpy.ops.object.select_all(action='DESELECT')
for obj in kept:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'ming-standing-clothing.glb'),export_format='GLB',use_selection=True,export_yup=False,export_extras=True)
print('GARMENT_SOURCE',json.dumps({'objects':len(kept),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in kept),'textures':len(used)}))

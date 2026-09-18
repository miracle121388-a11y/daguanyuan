"""Semantic mobile meshes with baked source materials and contact shading.
Every modifier is evaluated after depsgraph update. No hidden full-detail mesh.
"""
import bpy
from mathutils import Vector

def role(m):return m.get('sunwenRole',m.name)

def build_mobile(objects,collection,bake=True,ratio=.07,split_roof=False,defer_bake=False):
 mat=bpy.data.materials.get('Mobile_VertexColor') or bpy.data.materials.new('Mobile_VertexColor');mat.use_nodes=True
 nodes=mat.node_tree.nodes;bs=nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.95
 color=nodes.new('ShaderNodeVertexColor');color.layer_name='GardenColor';mat.node_tree.links.new(color.outputs['Color'],bs.inputs['Base Color'])
 groups={};lamps=[]
 for ob in objects:
  if ob.type!='MESH':continue
  if any(role(m) in ['lantern','screen','silk'] for m in ob.data.materials):
   copy=ob.copy();copy.data=ob.data;collection.objects.link(copy);lamps.append(copy);continue
  parent=ob.parent if ob.parent and ob.parent.get('placeId') else None
  is_roof=all(role(m) in ['roof','tile','tilelight','tiledark'] for m in ob.data.materials)
  roof_shell=all(role(m)=='roof' for m in ob.data.materials)
  vegetation=all(role(m).startswith(('leaf','lightleaf','canopy','bark','bamboo','flower','creamflower','moss')) for m in ob.data.materials)
  surface=role(ob.data.materials[0]) if all(role(m) in ['earth','limestone','bankstone','gardenstone','roof','floorwood','courtbase','paving'] for m in ob.data.materials) else None
  if ob.data.materials and all(m.get('focalBotany') for m in ob.data.materials):surface=role(ob.data.materials[0])
  key=(parent.name if parent else 'landscape')+('_plants' if vegetation else '_roofshell' if roof_shell else '_'+surface if surface else '_roof' if parent and split_roof and is_roof else '')
  bucket=groups.setdefault(key,{'vs':[],'fs':[],'colors':[],'smooth':[],'uv':[],'materials':[],'indices':[],'parent':parent,'roof':is_roof and split_roof,'vegetation':vegetation,'surface':surface,'roofShell':roof_shell})
  modifier=ob.modifiers.new('Mobile_Overview','DECIMATE');modifier.ratio=1 if roof_shell or surface in ['floorwood','courtbase','paving','bankstone'] else (.62 if surface and surface.startswith('botanical_') else .60 if surface=='gardenstone' else .34 if surface=='limestone' else .22 if ob.name.startswith('landscape_earth') else ratio) if len(ob.data.polygons)>200 else 1
  bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();deps.update();ev=ob.evaluated_get(deps);mesh=ev.to_mesh()
  matrix=ob.matrix_world;origin=parent.matrix_world.translation if parent else Vector((0,0,0));offset=len(bucket['vs'])
  bucket['vs'].extend(tuple(matrix@v.co-origin) for v in mesh.vertices)
  for p in mesh.polygons:
   # Board undersides and tiny edge faces are hidden by the plinth in this LOD.
   # Keep every original upward face and UV, with no simplification of its cover.
   if surface in ['floorwood','courtbase','paving'] and p.normal.z<.75:continue
   bucket['fs'].append(tuple(i+offset for i in p.vertices))
   bucket['smooth'].append(p.use_smooth)
   material=ob.data.materials[min(p.material_index,len(ob.data.materials)-1)] if ob.data.materials else None
   # Source colors are retained for the optional unbaked diagnostic export.
   bucket['colors'].append(tuple(material.diffuse_color) if material else (.4,.5,.35,1))
   if material not in bucket['materials']:bucket['materials'].append(material)
   bucket['indices'].append(bucket['materials'].index(material))
   uv=mesh.uv_layers.active
   bucket['uv'].append([tuple(uv.data[li].uv) if uv else (0,0) for li in p.loop_indices])
  ev.to_mesh_clear();ob.modifiers.remove(modifier)
 result=[]
 for key,bucket in groups.items():
  color_only=bucket['vegetation'] or not bake
  mesh=bpy.data.meshes.new('Mobile_'+key);mesh.from_pydata(bucket['vs'],[],bucket['fs']);mesh.update();colors=mesh.color_attributes.new(name='GardenColor',type='BYTE_COLOR',domain='CORNER')
  for p,c,smooth in zip(mesh.polygons,bucket['colors'],bucket['smooth']):
   p.use_smooth=smooth
   for li in p.loop_indices:colors.data[li].color=c
  uv=mesh.uv_layers.new(name='UVMap')
  for poly,coords,mi in zip(mesh.polygons,bucket['uv'],bucket['indices']):
   poly.material_index=0 if color_only else mi
   for li,co in zip(poly.loop_indices,coords):uv.data[li].uv=co
  ob=bpy.data.objects.new('Mobile_'+key,mesh);collection.objects.link(ob)
  for material in [mat] if color_only else bucket['materials']:ob.data.materials.append(material)
  if bucket['surface']:
   for attr in list(ob.data.color_attributes):ob.data.color_attributes.remove(attr)
  ob.parent=bucket['parent'];ob['roof']=bucket['roof'];ob['roofShell']=bucket['roofShell'];ob['preserveMaterial']=bool(bucket['vegetation'] or bucket['surface']);ob['floorSurface']=bucket['surface']=='floorwood';ob['pavingSurface']=bucket['surface'] in ['courtbase','paving'];ob['gardenStone']=bucket['surface']=='gardenstone';result.append(ob)
  ob['focalBotany']=bool(bucket['surface'] and bucket['surface'].startswith('botanical_'))
 if bake and not defer_bake:
  from bake_material_atlas import bake_group
  bake_group(result+lamps)
  for ob in result:
   if not ob.get('preserveMaterial'):
    for attr in list(ob.data.color_attributes):ob.data.color_attributes.remove(attr)
 return result+lamps

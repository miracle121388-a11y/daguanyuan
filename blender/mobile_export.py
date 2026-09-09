"""Small semantic mobile overview: one vertex-coloured mesh per destination.
Every modifier is evaluated after depsgraph update. No hidden full-detail mesh.
"""
import bpy
from mathutils import Vector

def build_mobile(objects,collection):
 mat=bpy.data.materials.get('Mobile_VertexColor') or bpy.data.materials.new('Mobile_VertexColor');mat.use_nodes=True
 nodes=mat.node_tree.nodes;bs=nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.95
 color=nodes.new('ShaderNodeVertexColor');color.layer_name='GardenColor';mat.node_tree.links.new(color.outputs['Color'],bs.inputs['Base Color'])
 groups={}
 for ob in objects:
  if ob.type!='MESH':continue
  parent=ob.parent if ob.parent and ob.parent.get('placeId') else None
  key=parent.name if parent else 'landscape';bucket=groups.setdefault(key,{'vs':[],'fs':[],'colors':[],'parent':parent})
  modifier=ob.modifiers.new('Mobile_Overview','DECIMATE');modifier.ratio=.075 if len(ob.data.polygons)>200 else .6
  bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();deps.update();ev=ob.evaluated_get(deps);mesh=ev.to_mesh()
  matrix=ob.matrix_world;origin=parent.matrix_world.translation if parent else Vector((0,0,0));offset=len(bucket['vs'])
  bucket['vs'].extend(tuple(matrix@v.co-origin) for v in mesh.vertices)
  for p in mesh.polygons:
   bucket['fs'].append(tuple(i+offset for i in p.vertices))
   material=ob.data.materials[min(p.material_index,len(ob.data.materials)-1)] if ob.data.materials else None
   # Intentional mobile material simplification; original textures remain in detail partitions.
   bucket['colors'].append(tuple(material.diffuse_color) if material else (.4,.5,.35,1))
  ev.to_mesh_clear();ob.modifiers.remove(modifier)
 result=[]
 for key,bucket in groups.items():
  mesh=bpy.data.meshes.new('Mobile_'+key);mesh.from_pydata(bucket['vs'],[],bucket['fs']);mesh.update();colors=mesh.color_attributes.new(name='GardenColor',type='BYTE_COLOR',domain='CORNER')
  for p,c in zip(mesh.polygons,bucket['colors']):
   for li in p.loop_indices:colors.data[li].color=c
  ob=bpy.data.objects.new('Mobile_'+key,mesh);collection.objects.link(ob);ob.data.materials.append(mat);ob.parent=bucket['parent'];result.append(ob)
 return result

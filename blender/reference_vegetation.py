"""Canopy-preserving authored LODs sampled from the CC0 source crown.
Complete leaf clusters preserve foliage coverage instead of decimating leaves.
"""
import bpy,math,random
import numpy as np
from pathlib import Path
from mathutils import Vector
from export_scene import export_selected
R=Path(__file__).resolve().parents[1]

def build_tree_prototype(export_high=True):
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(R/'assets/source/island_tree_01/island_tree_01.gltf'))
 imported=[o for o in bpy.data.objects if o not in before];source=next(o for o in imported if o.type=='MESH');mesh=source.data
 coords=np.empty(len(mesh.vertices)*3,dtype=np.float32);mesh.vertices.foreach_get('co',coords);coords=coords.reshape((-1,3))
 matrix=np.array(source.matrix_world,dtype=np.float32);coords=coords@matrix[:3,:3].T+matrix[:3,3]
 loops=np.empty(len(mesh.loops),dtype=np.int32);mesh.loops.foreach_get('vertex_index',loops)
 starts=np.empty(len(mesh.polygons),dtype=np.int32);mesh.polygons.foreach_get('loop_start',starts)
 mats=np.empty(len(mesh.polygons),dtype=np.int32);mesh.polygons.foreach_get('material_index',mats)
 leaf_index=next(i for i,m in enumerate(mesh.materials) if '_leaves' in m.name);trunk_index=next(i for i,m in enumerate(mesh.materials) if m.name.startswith('island_tree_01') and not any(k in m.name for k in ['leaves','branches']))
 leaf_faces=np.where(mats==leaf_index)[0];trunk_faces=np.where(mats==trunk_index)[0]
 uv_source=np.empty(len(mesh.loops)*2,dtype=np.float32);mesh.uv_layers.active.data.foreach_get('uv',uv_source);uv_source=uv_source.reshape((-1,2))
 trunkmat=mesh.materials[trunk_index]
 for n in trunkmat.node_tree.nodes:
  if n.type=='TEX_IMAGE' and n.image:n.image.pack()
 foliage=bpy.data.materials.get('Living_Foliage') or bpy.data.materials.new('Living_Foliage');foliage.use_nodes=True;bs=foliage.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.92
 color=foliage.node_tree.nodes.new('ShaderNodeVertexColor');color.layer_name='CrownColor';foliage.node_tree.links.new(color.outputs['Color'],bs.inputs['Base Color']);foliage.use_backface_culling=False
 def lod(name,leaf_count,spread,trunk_ratio):
  indices=np.concatenate([loops[starts[p]:starts[p]+3] for p in trunk_faces]);unique,inverse=np.unique(indices,return_inverse=True)
  data=bpy.data.meshes.new(name+'_trunk');data.from_pydata(coords[unique].tolist(),[],inverse.reshape((-1,3)).tolist());data.materials.append(trunkmat)
  uv=data.uv_layers.new(name='UVMap');uv.data.foreach_set('uv',np.concatenate([uv_source[starts[p]:starts[p]+3] for p in trunk_faces]).reshape(-1))
  trunk=bpy.data.objects.new(name+'_trunk',data);bpy.context.scene.collection.objects.link(trunk);bpy.context.view_layer.objects.active=trunk;trunk.select_set(True)
  mod=trunk.modifiers.new('BarkLOD','DECIMATE');mod.ratio=trunk_ratio;bpy.ops.object.modifier_apply(modifier=mod.name)
  rng=random.Random(901);chosen=rng.sample(leaf_faces.tolist(),leaf_count);verts=[];faces=[];colors=[]
  for i,p in enumerate(chosen):
   tri=coords[loops[starts[p]:starts[p]+3]];center=Vector(tri.mean(axis=0));a=rng.random()*math.tau;u=Vector((math.cos(a),math.sin(a),rng.uniform(-.4,.4))).normalized()*spread;v=Vector((-math.sin(a)*.5,math.cos(a)*.5,rng.uniform(.4,1))).normalized()*spread*.52
   index=len(verts);verts.extend([tuple(center-u),tuple(center+v),tuple(center+u),tuple(center-v)]);faces.extend([(index,index+1,index+2),(index,index+2,index+3)])
   shade=rng.uniform(.60,1.15)*(0.7+min(1,max(0,center.z/7))*.3);colors.extend([(0.105*shade,.215*shade,.058*shade,1)]*2)
  data=bpy.data.meshes.new(name+'_leaves');data.from_pydata(verts,[],faces);data.materials.append(foliage);col=data.color_attributes.new(name='CrownColor',type='BYTE_COLOR',domain='CORNER')
  for face,c in zip(data.polygons,colors):
   for li in face.loop_indices:col.data[li].color=c
  leaves=bpy.data.objects.new(name+'_leaves',data);bpy.context.scene.collection.objects.link(leaves)
  bpy.ops.object.select_all(action='DESELECT');trunk.select_set(True);leaves.select_set(True);bpy.context.view_layer.objects.active=trunk;bpy.ops.object.join();trunk.name=name
  return trunk
 high=lod('Reference_Tree_Prototype',3000,.21,.12)
 if export_high:export_selected(R/'public/models/vegetation/broadleaf.glb',[high])
 low=lod('Reference_Tree_Mobile',64,1.15,.0025);export_selected(R/'public/models/vegetation/broadleaf-low.glb',[low]);bpy.data.objects.remove(low,do_unlink=True)
 for ob in imported:bpy.data.objects.remove(ob,do_unlink=True)
 high.hide_render=True;high.hide_set(True);print('CANOPY LOD',len(high.data.polygons),flush=True);return high

def populate_master(prototype,points,layout):
 collection=bpy.data.collections.new('Reference_Living_Trees');collection['generated']=True;bpy.context.scene.collection.children.link(collection)
 place_map={p['id']:p['position'] for p in layout['places']};published=[]
 for i,p in enumerate(points):
  parent=place_map.get(p.get('placeId'),[0,0,0]);pos=[p['x']+parent[0],p['y']+parent[1],p.get('z',0)+parent[2]];s=p['size']*1.5
  variant=3 if p.get('layer')=='understorey' else 2 if p['seed']%7==0 else p['seed']%2
  source=prototype[variant] if isinstance(prototype,list) else prototype
  if variant==2:s*=.6
  tree=source.copy();tree.data=source.data;tree.name=f'LivingTree_{i:03}';collection.objects.link(tree);tree.hide_render=False;tree.hide_set(False);tree.location=pos;tree.scale=(s*(.83+(i%5)*.065),s,s*(.85+(i%3)*.1));tree.rotation_euler.z=p['seed']*2.399;tree['plantingLayer']=p.get('layer','canopy')
  tree['nativeGeometry']='full-source-crown'
  published.append({'position':[pos[0],pos[2],-pos[1]],'scale':[tree.scale.x,tree.scale.z,tree.scale.y],'rotation':tree.rotation_euler.z,'placeId':p.get('placeId'),'species':variant})
 return published

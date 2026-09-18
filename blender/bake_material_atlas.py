"""Bake local material colour and geometric AO into a portable mobile atlas.

The atlas comes from authored geometry and reviewed source materials, not a
painted stand-in for the building. Directional light remains live in WebGL.
"""
import bpy, math
from pathlib import Path
R=Path(__file__).resolve().parents[1]

def bake_object(ob,resolution=1024):
 scene=bpy.context.scene
 scene.render.engine='CYCLES';scene.cycles.samples=24
 scene.render.threads_mode='FIXED';scene.render.threads=8
 scene.render.bake.margin=2;scene.render.bake.use_clear=True
 scene.render.bake.use_selected_to_active=False
 ob.data.validate(verbose=True,clean_customdata=True);ob.data.update()
 bpy.ops.object.select_all(action='DESELECT');ob.hide_set(False);ob.select_set(True);bpy.context.view_layer.objects.active=ob
 source_uv=ob.data.uv_layers.get('UVMap')
 if source_uv is None:raise ValueError('Source UVs are required for baking')
 if ob.data.uv_layers.get('BakeUV') is None:ob.data.uv_layers.new(name='BakeUV')
 ob.data.uv_layers.active=ob.data.uv_layers['BakeUV']
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
 bpy.ops.uv.smart_project(angle_limit=math.radians(72),island_margin=.00035,area_weight=.5,scale_to_bounds=True)
 bpy.ops.object.mode_set(mode='OBJECT')
 ob.data.uv_layers['BakeUV'].active_render=True
 print('ATLAS UV',ob.name,[(l.name,l.active_render) for l in ob.data.uv_layers],len(ob.data.polygons),flush=True)
 uvdata=ob.data.uv_layers['BakeUV'].data
 area=0
 for poly in ob.data.polygons:
  pts=[uvdata[li].uv.copy() for li in poly.loop_indices]
  area+=abs(sum(a.x*c.y-a.y*c.x for a,c in zip(pts,pts[1:]+pts[:1])))/2
 print('ATLAS AREA',area,flush=True)
 target=bpy.data.images.new('Baked_'+ob.name,width=resolution,height=resolution,alpha=False)
 target.colorspace_settings.name='sRGB'
 original=list(ob.data.materials);temporary=[]
 for index,mat in enumerate(original):
  m=mat.copy();m.name='Bake_Work_'+mat.name;temporary.append(m);ob.data.materials[index]=m
  nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF')
  uv=nodes.new('ShaderNodeUVMap');uv.uv_map='UVMap'
  for node in nodes:
   if node.type=='TEX_IMAGE':links.new(uv.outputs['UV'],node.inputs['Vector'])
  ao=nodes.new('ShaderNodeAmbientOcclusion');ao.inputs['Distance'].default_value=1.5;ao.samples=12
  mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=.38
  mix.inputs[1].default_value=bs.inputs['Base Color'].default_value
  if bs.inputs['Base Color'].is_linked:
   source=bs.inputs['Base Color'].links[0].from_socket
   if mat.name=='plaster':
    wash=nodes.new('ShaderNodeMixRGB');wash.inputs[0].default_value=.22;wash.inputs[1].default_value=(.78,.74,.65,1);links.new(source,wash.inputs[2]);source=wash.outputs[0]
   elif mat.name in ['wood','darkwood','floorwood','latticewood'] and not mat.get('craftSurface'):
    tint=nodes.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1;tint.inputs[2].default_value=(.47,.44,.39,1) if mat.name=='darkwood' else (.78,.83,.86,1);links.new(source,tint.inputs[1]);source=tint.outputs[0]
   links.new(source,mix.inputs[1])
  links.new(ao.outputs['AO'],mix.inputs[2])
  emission=nodes.new('ShaderNodeEmission');links.new(mix.outputs[0],emission.inputs['Color'])
  output=next(n for n in nodes if n.type=='OUTPUT_MATERIAL');links.new(emission.outputs[0],output.inputs['Surface'])
  image=nodes.new('ShaderNodeTexImage');image.image=target;nodes.active=image
 print('BAKING MATERIAL ATLAS',ob.name,resolution,flush=True)
 bpy.ops.object.bake(type='EMIT',uv_layer='BakeUV')
 # One final material and one UV set keep the atlas portable and draw-call cheap.
 mat=bpy.data.materials.new('Baked_'+ob.name);mat.use_nodes=True
 bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.79
 tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=target;target.pack()
 mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 ob.data.materials.clear();ob.data.materials.append(mat)
 for poly in ob.data.polygons:poly.material_index=0
 # Edit-mode UV packing rebuilds RNA storage; reacquire layers by name.
 ob.data.uv_layers.remove(ob.data.uv_layers['UVMap']);ob.data.uv_layers.active=ob.data.uv_layers['BakeUV'];ob.data.uv_layers['BakeUV'].active_render=True
 for m in temporary:bpy.data.materials.remove(m)
 for attr in list(ob.data.color_attributes):ob.data.color_attributes.remove(attr)
 print('MATERIAL ATLAS COMPLETE',ob.name,flush=True)
 return target

def bake_group(objects,resolution=1024):
 # Hide coincident high-poly originals; AO is evaluated on the final low meshes.
 visible=set(objects);previous={o:o.hide_render for o in bpy.context.scene.objects}
 try:
  for o in bpy.context.scene.objects:
   if o.type=='MESH':o.hide_render=o not in visible
  for ob in objects:
   if ob.type=='MESH' and not ob.get('preserveMaterial') and not any(m.name in ['lantern','screen','silk'] for m in ob.data.materials):
    size=2048 if ob.name=='Mobile_landscape' else resolution
    bake_object(ob,size)
 finally:
  for ob,hidden in previous.items():ob.hide_render=hidden

"""Independent material roles, directional timber grain, and exportable PBR."""
import bpy,json,bmesh
from pathlib import Path
import build_modules as core
R=Path(__file__).resolve().parents[1]
CONFIG=json.loads((R/'config/craft.materials.json').read_text(encoding='utf-8'))
SPEC=CONFIG['materials'];REVISION=CONFIG['revision']

def install():
 original=core.materials
 for key,setting in SPEC.items():
  if key not in core.PALETTE:core.PALETTE[key]=setting.get('pigment','#ffffff').lstrip('#')
 core.PALETTE.update({'furniture':'69513b','paper':'e2d8bc','bookcover':'526677','bookcloth':'a08d6e','ivory':'bfb492','cutstone':'a9aaa0','courtbase':'aaa998'})
 def materials():
  out=original()
  for key,setting in SPEC.items():
   m=out[key];m['craftSurface']=REVISION;nodes=m.node_tree.nodes;links=m.node_tree.links;nodes.clear()
   bs=nodes.new('ShaderNodeBsdfPrincipled');end=nodes.new('ShaderNodeOutputMaterial');links.new(bs.outputs[0],end.inputs['Surface'])
   bs.inputs['Roughness'].default_value=setting['roughness']
   for channel,socket in [('diff','Base Color'),('nor_gl','Normal'),('rough','Roughness')]:
    path=R/f'assets/processed/materials-{REVISION}'/f'{key}_{channel}.png'
    if not path.exists():continue
    # The open master can contain a packed copy from an earlier swatch bake.
    # Always read this build's pixels; check_existing would silently reuse it.
    tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(path),check_existing=False);tex.image.name=f'{REVISION}_{key}_{channel}';tex.image.pack()
    if channel!='diff':tex.image.colorspace_settings.name='Non-Color'
    if channel=='nor_gl':
     normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=setting.get('normalStrength',.08 if setting.get('grain') else .20)
     links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs[socket])
    else:links.new(tex.outputs['Color'],bs.inputs[socket])
  return out
 core.materials=materials
 original_finish=core.Batch.finish
 def finish(batch):
  objects=original_finish(batch)
  for ob in objects:
   key=ob.data.materials[0].name;setting=SPEC.get(key)
   if key=='roof':
    bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001);bm.to_mesh(ob.data);bm.free();ob.data.update();ob['roofShell']=True
   if not setting:continue
   if key=='gardenstone':
    for face in ob.data.polygons:face.use_smooth=True
   mesh=ob.data;uv=mesh.uv_layers.get('UVMap');period=setting['period'];periods=period if isinstance(period,list) else [period,period];grain=setting.get('grain')
   for face in mesh.polygons:
    axis=max(range(3),key=lambda i:abs(face.normal[i]));axes=[i for i in range(3) if i!=axis]
    if grain:
     extent={i:max(mesh.vertices[v].co[i] for v in face.vertices)-min(mesh.vertices[v].co[i] for v in face.vertices) for i in axes}
     length=max(axes,key=lambda i:extent[i]);cross=next(i for i in axes if i!=length)
     axes=[cross,length] if grain=='v' else [length,cross]
    for li in face.loop_indices:
     co=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=(co[axes[0]]/periods[0],co[axes[1]]/periods[1])
   ob['materialRole']=key;ob['uvPeriodMetres']=period
  return objects
 core.Batch.finish=finish

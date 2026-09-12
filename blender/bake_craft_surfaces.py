"""Bake source PBR swatches at useful physical scales; preserve upstream pixels.

This is a Blender material bake, not a generated illustration or a building decal.
"""
import bpy, json, hashlib, os
import numpy as np
from pathlib import Path
R=Path(__file__).resolve().parents[1]
spec=json.loads((R/'config/craft.materials.json').read_text(encoding='utf-8'))
revision=spec['revision'];out=R/f'assets/processed/materials-{revision}';out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_plane_add(size=2);plane=bpy.context.object
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=1
scene.render.threads_mode='FIXED';scene.render.threads=6;scene.render.bake.margin=0
records=[];means={}
def crop_mean(image,crop):
 key=(image.filepath,tuple(crop))
 if key not in means:
  width,height=image.size;pixels=np.empty(width*height*4,dtype=np.float32);image.pixels.foreach_get(pixels)
  pixels=pixels.reshape(height,width,4);x,y,w,h=crop
  sample=pixels[int(y*height):max(int(y*height)+1,int((y+h)*height)),int(x*width):max(int(x*width)+1,int((x+w)*width)),:3]
  # Byte-backed JPEG pixels are exposed in their source transfer space by the
  # image API. The texture node decodes sRGB, so the constant must match it.
  if not image.is_float and image.colorspace_settings.name=='sRGB':
   sample=np.where(sample<=.04045,sample/12.92,((sample+.055)/1.055)**2.4)
  means[key]=tuple(float(v) for v in sample.mean(axis=(0,1)))+(1,)
 return means[key]
for name,settings in spec['materials'].items():
 for channel in ['diff','nor_gl','rough']:
  source=R/'assets/source'/(settings['source']+('' if channel=='diff' else '_'+channel)+'.jpg')
  if not source.exists():continue
  material=bpy.data.materials.new('Swatch_'+name+'_'+channel);material.use_nodes=True
  nodes=material.node_tree.nodes;links=material.node_tree.links;nodes.clear()
  tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(source),check_existing=True)
  if channel!='diff':tex.image.colorspace_settings.name='Non-Color'
  uv=nodes.new('ShaderNodeUVMap');uv.uv_map='UVMap';mapping=nodes.new('ShaderNodeMapping')
  links.new(uv.outputs['UV'],mapping.inputs['Vector']);links.new(mapping.outputs['Vector'],tex.inputs['Vector'])
  x,y,w,h=settings.get('crop',[0,0,1,1]);mapping.inputs['Location'].default_value=(x,y,0);mapping.inputs['Scale'].default_value=(w,h,1)
  result=tex.outputs['Color']
  if channel=='diff':
   # Reduce grain contrast around the crop's actual linear-light mean, before
   # applying the same calibrated colour transform to the entire swatch.
   if settings.get('contrast',1)<1:
    mix=nodes.new('ShaderNodeMixRGB');mix.inputs[0].default_value=settings['contrast'];mix.inputs[1].default_value=crop_mean(tex.image,settings.get('crop',[0,0,1,1]));links.new(result,mix.inputs[2]);result=mix.outputs[0]
   hue=nodes.new('ShaderNodeHueSaturation');hue.inputs['Saturation'].default_value=settings['saturation'];hue.inputs['Value'].default_value=settings['value'];links.new(result,hue.inputs['Color']);result=hue.outputs['Color']
  elif channel=='rough':
   mix=nodes.new('ShaderNodeMixRGB');mix.inputs[0].default_value=settings.get('roughSourceWeight',.15);mix.inputs[1].default_value=(settings['roughness'],)*3+(1,);links.new(result,mix.inputs[2]);result=mix.outputs[0]
  emission=nodes.new('ShaderNodeEmission');links.new(result,emission.inputs['Color']);output=nodes.new('ShaderNodeOutputMaterial');links.new(emission.outputs[0],output.inputs['Surface'])
  image=bpy.data.images.new(f'{revision}_{name}_{channel}',width=512,height=512,alpha=False)
  image.colorspace_settings.name='sRGB' if channel=='diff' else 'Non-Color'
  target=nodes.new('ShaderNodeTexImage');target.image=image;nodes.active=target
  plane.data.materials.clear();plane.data.materials.append(material)
  bpy.ops.object.bake(type='EMIT');path=out/f'{name}_{channel}.png';image.filepath_raw=str(path);image.file_format='PNG';image.save()
  records.append({'file':path.relative_to(R).as_posix(),'material':name,'channel':channel,'sourceAsset':settings['source'],'sourceFile':source.relative_to(R).as_posix(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'settings':settings})
  bpy.data.materials.remove(material);bpy.data.images.remove(image)
 print('CRAFT SWATCH',name,flush=True)
(out/'manifest.json').write_text(json.dumps({'method':'Blender Cycles emission bake of source PBR swatches; 512px; physical UV periods in config/craft.materials.json; optional contrast reduction around the actual crop linear-light RGB mean, then hue saturation and exposure-like value transform on albedo only. Roof crop samples the clay surface within one source tile, not its Western roof pattern.','files':records},indent=2),encoding='utf-8')

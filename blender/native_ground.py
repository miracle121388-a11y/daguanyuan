"""Native counterpart of the web's geometry-derived soil/shore surface blend."""
import bpy
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def attach(mask):
 if (R/'public/textures/ground/garden-ground.webp').exists():
  attach_tended_garden()
  return
 m=bpy.data.materials['earth'];nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF')
 if 'nativeGroundSource' in m:source=nodes[m['nativeGroundSource']].outputs['Color']
 else:
  source=bs.inputs['Base Color'].links[0].from_socket;m['nativeGroundSource']=source.node.name
 for n in list(nodes):
  if n.name.startswith('NativeGround_'):nodes.remove(n)
 def node(kind,name):
  n=nodes.new(kind);n.name='NativeGround_'+name;return n
 geo=node('ShaderNodeNewGeometry','WorldPosition');scale=node('ShaderNodeVectorMath','MaskScale');scale.operation='MULTIPLY';scale.inputs[1].default_value=(1/768,1/768,0);links.new(geo.outputs['Position'],scale.inputs[0])
 offset=node('ShaderNodeVectorMath','MaskOffset');offset.operation='ADD';offset.inputs[1].default_value=(.5,.5,0);links.new(scale.outputs[0],offset.inputs[0])
 texture=node('ShaderNodeTexImage','Mask');texture.image=mask;mask.pack();links.new(offset.outputs[0],texture.inputs['Vector'])
 separate=node('ShaderNodeSeparateXYZ','Channels');links.new(texture.outputs['Color'],separate.inputs[0])
 edge=node('ShaderNodeMapRange','BedEdge');edge.interpolation_type='SMOOTHSTEP';edge.inputs['From Min'].default_value=.30;edge.inputs['From Max'].default_value=.68;links.new(separate.outputs[0],edge.inputs['Value'])
 wet=node('ShaderNodeMath','WetStrength');wet.operation='MULTIPLY';wet.inputs[1].default_value=.38;links.new(separate.outputs[1],wet.inputs[0])
 shoulder=node('ShaderNodeMath','ShoulderStrength');shoulder.operation='MULTIPLY';shoulder.inputs[1].default_value=.75;links.new(separate.outputs[2],shoulder.inputs[0])
 total=node('ShaderNodeMath','SoilWet');total.operation='MAXIMUM';links.new(edge.outputs[0],total.inputs[0]);links.new(wet.outputs[0],total.inputs[1])
 extent=node('ShaderNodeMath','SoilShoulder');extent.operation='MAXIMUM';links.new(total.outputs[0],extent.inputs[0]);links.new(shoulder.outputs[0],extent.inputs[1])
 factor=node('ShaderNodeMath','Factor');factor.operation='MINIMUM';factor.inputs[1].default_value=.30;links.new(extent.outputs[0],factor.inputs[0])
 soiluv=node('ShaderNodeVectorMath','SoilScale');soiluv.operation='MULTIPLY';soiluv.inputs[1].default_value=(1/1.65,1/1.65,0);links.new(geo.outputs['Position'],soiluv.inputs[0])
 soil=node('ShaderNodeTexImage','Soil');soil.image=bpy.data.images.load(str(R/'public/textures/ground/soil.jpg'),check_existing=False);soil.image.pack();links.new(soiluv.outputs[0],soil.inputs['Vector'])
 blend=node('ShaderNodeMixRGB','Blend');links.new(factor.outputs[0],blend.inputs[0]);links.new(source,blend.inputs[1]);links.new(soil.outputs['Color'],blend.inputs[2]);links.new(blend.outputs[0],bs.inputs['Base Color'])
 m['nativeGroundBlend']='geometry-derived mask; the web applies the same local mask to the source ground'

def attach_tended_garden():
 """Use the same world-registered planted beds and paving atlas as the browser."""
 m=bpy.data.materials['earth'];nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF')
 for n in list(nodes):
  if n.name.startswith('NativeGround_'):nodes.remove(n)
 def node(kind,name):
  n=nodes.new(kind);n.name='NativeGround_'+name;return n
 geo=node('ShaderNodeNewGeometry','WorldPosition')
 scale=node('ShaderNodeVectorMath','Scale');scale.operation='MULTIPLY';scale.inputs[1].default_value=(1/768,1/768,0);links.new(geo.outputs['Position'],scale.inputs[0])
 offset=node('ShaderNodeVectorMath','Offset');offset.operation='ADD';offset.inputs[1].default_value=(.5,.5,0);links.new(scale.outputs[0],offset.inputs[0])
 pigment=node('ShaderNodeTexImage','TendedGarden')
 pigment.image=bpy.data.images.load(str(R/'public/textures/ground/garden-ground.webp'),check_existing=False);pigment.image.pack();links.new(offset.outputs[0],pigment.inputs['Vector'])
 links.new(pigment.outputs['Color'],bs.inputs['Base Color'])
 grain=node('ShaderNodeTexNoise','LeafAndStoneGrain');grain.inputs['Scale'].default_value=5.5;grain.inputs['Detail'].default_value=2;links.new(geo.outputs['Position'],grain.inputs['Vector'])
 bump=node('ShaderNodeBump','FineGrain');bump.inputs['Strength'].default_value=.16;bump.inputs['Distance'].default_value=.024;links.new(grain.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])
 bs.inputs['Roughness'].default_value=.86
 m['nativeGroundBlend']='Sunwen tended garden: shared world-coordinate blue stone, gravel, bounded groundcover, moss and damp shore atlas.'

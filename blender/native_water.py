"""Editable native counterpart of the browser's exact ring-shaped water.

The runtime uses a planar reflection of its live scene; Cycles uses physical
transmission/roughness here. Both retain the same shoreline and water level.
"""
import bpy
from pathlib import Path
R=Path(__file__).resolve().parents[1]


def build(layout):
    col=bpy.data.collections.new('Reference_Water_Surface');col['generated']=True
    bpy.context.scene.collection.children.link(col)
    curve=bpy.data.curves.new('Reviewed_Water_Rings','CURVE');curve.dimensions='2D';curve.fill_mode='BOTH';curve.resolution_u=1
    for i,ring in enumerate([layout['terrain']['lake']['outline']]+layout['terrain']['lake']['holes']):
        area=sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(ring,ring[1:]+ring[:1]))
        points=ring if (area>0)==(i==0) else list(reversed(ring))
        spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
        for p,v in zip(spline.points,points):p.co=(v[0],v[1],0,1)
        spline.use_cyclic_u=True
    ob=bpy.data.objects.new('Reviewed_Lake_Surface',curve);col.objects.link(ob);ob.location.z=-.12;ob.visible_shadow=False
    ob['spatialInterpretation']='interpretive';ob['runtimeCounterpart']='src/scene/GardenWater.tsx; exactly the same lake rings and -0.12m water level'
    mat=bpy.data.materials.new('Native_Pond_Water');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(.08,.135,.10,1);bs.inputs['Roughness'].default_value=.10;bs.inputs['IOR'].default_value=1.333;bs.inputs['Transmission Weight'].default_value=.45
    tex=mat.node_tree.nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=3.2;tex.inputs['Detail'].default_value=3.0;tex.inputs['Roughness'].default_value=.55
    coord=mat.node_tree.nodes.new('ShaderNodeTexCoord');mat.node_tree.links.new(coord.outputs['Object'],tex.inputs['Vector'])
    bump=mat.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.10;bump.inputs['Distance'].default_value=.035
    mat.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']);mat.node_tree.links.new(bump.outputs['Normal'],bs.inputs['Normal']);ob.data.materials.append(mat)
    return ob

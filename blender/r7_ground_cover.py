"""Linked editable ground plants and their exact runtime instance placements."""
import bpy
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1]


def ground_tree():
    vertices=[];faces=[];bpy.context.view_layer.update()
    for ob in bpy.data.collections['Garden_Landscape'].objects:
        if ob.type!='MESH' or not ob.name.startswith('landscape_earth'):continue
        offset=len(vertices);vertices.extend(ob.matrix_world@v.co for v in ob.data.vertices)
        faces.extend(tuple(offset+i for i in p.vertices) for p in ob.data.polygons)
    return BVHTree.FromPolygons(vertices,faces)


def seat_plants():
    tree=ground_tree();changes=[];outside=[]
    for ob in list(bpy.data.collections['Reference_Ground_Cover'].objects):
        hit,_,_,_=tree.ray_cast(Vector((ob.location.x,ob.location.y,250)),Vector((0,0,-1)),500)
        if hit is None:
            outside.append({'name':ob.name,'position':list(ob.location)})
            bpy.data.objects.remove(ob,do_unlink=True)
            continue
        change=hit.z+.005-ob.location.z;changes.append(abs(change));ob.location.z=hit.z+.005
    tree_adjustments=[];outside_trees=[]
    for ob in list(bpy.data.collections['Reference_Living_Trees'].objects):
        hit,_,_,_=tree.ray_cast(Vector((ob.location.x,ob.location.y,250)),Vector((0,0,-1)),500)
        if hit is None:
            outside_trees.append({'name':ob.name,'position':list(ob.location)})
            bpy.data.objects.remove(ob,do_unlink=True)
            continue
        if hit is not None:
            tree_adjustments.append(abs(hit.z-ob.location.z));ob.location.z=hit.z
    return {'count':len(changes),'maxAdjustmentM':max(changes,default=0),'adjustedOver5cm':sum(d>.05 for d in changes),'outsideLandRemoved':outside,'outsideTreesRemoved':outside_trees,'treesSeated':len(tree_adjustments),'maxTreeAdjustmentM':max(tree_adjustments,default=0),'method':'Vertical ray against the actual saved earth mesh; grass root seated 5mm above the hit, tree pivots at the hit. Generated grass offsets without land below are omitted.'}


def populate(points):
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(R/'assets/source/grass_medium_01/grass_medium_01.gltf'))
    imported=[o for o in bpy.data.objects if o not in before]
    choices=sorted([o for o in imported if o.type=='MESH'],key=lambda o:len(o.data.polygons))
    source=next(o for o in choices if 150<=len(o.data.polygons)<=450)
    source.location=(0,0,0);source.rotation_euler=(0,0,0);source.scale=(1,1,1)
    lo=Vector(tuple(min(v.co[i] for v in source.data.vertices) for i in range(3)))
    hi=Vector(tuple(max(v.co[i] for v in source.data.vertices) for i in range(3)))
    mid=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
    for v in source.data.vertices:v.co-=mid
    data=source.data
    col=bpy.data.collections.new('Reference_Ground_Cover');col['generated']=True;bpy.context.scene.collection.children.link(col)
    for i,p in enumerate(points):
        ob=bpy.data.objects.new('Ground_Cover_%04d'%i,data);col.objects.link(ob)
        ob.location=(p['x'],p['y'],p['z']);ob.scale=(p['scale'],)*3;ob.rotation_euler.z=p['rotation'];ob['sourceAsset']='grass_medium_01'
    for ob in imported:bpy.data.objects.remove(ob,do_unlink=True)
    print('GROUND CONTACT',seat_plants(),flush=True)
    for material in data.materials:
        if not material.use_nodes:continue
        bs=material.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.96
        for link in list(bs.inputs['Alpha'].links):material.node_tree.links.remove(link)
        bs.inputs['Alpha'].default_value=1
        for node in material.node_tree.nodes:
            if node.type=='TEX_IMAGE' and node.image:node.image.pack()
    print('EDITABLE GROUND COVER',len(points),len(data.polygons),'faces per source clump',flush=True)

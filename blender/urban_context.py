"""Editable, instanced Beijing mansion setting; authored spatial interpretation."""
import bpy, bmesh, json, math, sys, hashlib
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(R/'blender'))
import build_modules as core
from export_scene import export_selected
from publish_manifest import publish
from urban_layout import compose, validate_plan
from urban_architecture import create_prototypes

def collection(name):
    old=bpy.data.collections.get(name)
    if old:
        bpy.data.batch_remove(ids=list(old.objects))
        return old
    col=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(col);return col

def build():
    cfg=json.loads((R/'config/garden.urban.json').read_text());layout=json.loads((R/'config/garden.layout.json').read_text())
    bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
    col=collection('Urban_Context');protos=collection('Urban_Prototypes');groundcol=collection('Urban_Garden_Ground')
    materials={}
    for role,value in cfg['palette'].items():
        mat=bpy.data.materials.get('Urban_'+role) or bpy.data.materials.new('Urban_'+role);mat.use_nodes=True
        rgb=[int(value[i:i+2],16)/255 for i in (0,2,4)];rgb=[((v+.055)/1.055)**2.4 if v>.04045 else v/12.92 for v in rgb]
        mat.diffuse_color=(*rgb,1);bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb,1);bs.inputs['Roughness'].default_value=.92
        mat['urbanRole']=role;materials[role]=mat
    oldM=core.M;core.M=materials;models=create_prototypes(protos);core.M=oldM
    for name,objects in models.items():
        for ob in objects:ob['urbanPrototype']=name;ob['urbanRevision']=cfg['revision']
    plan=compose(cfg);plan_checks=validate_plan(plan,cfg)
    rows=[];courts=plan['courts']
    def add(kind,x,y,z=0,angle=0,scale=(1,1,1),district='mansion'):
        index=len(rows);rows.append({'kind':kind,'position':[round(x,3),round(z,3),round(-y,3)],'rotation':round(angle,6),'scale':[round(scale[0],3),round(scale[2],3),round(scale[1],3)],'district':district})
        for src in models[kind]:
            ob=src.copy();ob.name=f'Urban_{index:04}_{kind}_{src.data.materials[0]["urbanRole"]}';col.objects.link(ob);ob.location=(x,y,z);ob.rotation_euler.z=angle;ob.scale=scale;ob['urbanInstance']=index
    for row in plan['instances']:
        x,z,ny=row['position'];sx,sz,sy=row['scale']
        add(row['kind'],x,-ny,z,row['rotation'],(sx,sy,sz),row['district'])
    # A physical 6.2 m enclosure does the eye-level screening.
    xmin,ymin,xmax,ymax=cfg['gardenBounds'];height=cfg['wallHeight']
    add('wall',xmin,(ymin+ymax)/2,angle=math.pi/2,scale=(ymax-ymin,1,height),district='garden-enclosure')
    add('wall',xmax,(ymin+ymax)/2,angle=math.pi/2,scale=(ymax-ymin,1,height),district='garden-enclosure')
    add('wall',0,ymax,scale=(xmax-xmin,1,height),district='garden-enclosure')
    for sx in [-1,1]:add('wall',sx*(xmax+12)/2,ymin,scale=(xmax-12,1,height),district='garden-enclosure')
    add('wall',0,-166,scale=(30,1,5.8),district='entrance-screen')
    # Near the viewer, use the garden's complete authored crowns, rather than
    # the reduced silhouette used among the distant city roofs.
    living=bpy.data.collections['Reference_Living_Trees']
    for ob in list(living.objects):
        if ob.get('urbanScreenCrown'):bpy.data.objects.remove(ob,do_unlink=True)
    from sunwen_architecture import ground_tree
    terrain=ground_tree();species=json.loads((R/'config/garden.sunwen.json').read_text())['planting']['species']
    full={ob['sunwenPrototype']:ob for ob in bpy.data.collections['Sunwen_Prototypes'].objects}
    screen_points=[point for t in [-112,-78,-42,38,77,113] for point in [(-141,t+5),(141,t+5),(t,141)]]
    grounding=R/'config/garden.grounding.json'
    root_adjustments=json.loads(grounding.read_text()).get('rootAdjustments',{}) if grounding.exists() else {}
    for i,(x,y) in enumerate(screen_points):
        kind=6 if i%3==2 else 0;prototype=full[species[kind]];ob=prototype.copy();living.objects.link(ob)
        ob.name=f'LivingTree_Urban_{i:03}_{species[kind]}';ob.hide_render=False;ob.hide_set(False)
        x,y=root_adjustments.get(ob.name,(x,y))
        hit=terrain.ray_cast(Vector((x,y,100)),Vector((0,0,-1)),200)[0]
        if hit is None:raise ValueError('Unseated wall-side crown')
        ob.location=(x,y,hit.z+.02);ob.scale=(1.2,1.2,1.15);ob.rotation_euler.z=i*1.73
        ob['urbanScreenCrown']=True;ob['sunwenSpecies']=kind;ob['nativeGeometry']='authored-sunwen-crown';ob['plantingLayer']='canopy'
    extent=cfg['groundExtent']
    # The outside base has a distinct stone material; it never samples garden turf.
    for center,size in [((-(extent+148)/2,0),(extent-148,extent*2)),(((extent+148)/2,0),(extent-148,extent*2)),((0,(extent+148)/2),(296,extent-148)),((0,-(extent+138)/2),(296,extent-138))]:
        add('paving',*center,z=-.11,scale=(*size,1),district='urban-ground')
    source=next(o for o in bpy.data.collections['Garden_Landscape'].objects if o.type=='MESH' and any(m.name=='earth' for m in o.data.materials))
    clipped=source.copy();clipped.data=source.data.copy();clipped.name='Urban_Clipped_Garden_Earth';groundcol.objects.link(clipped)
    clipped.hide_render=False;clipped.hide_set(False);clipped['urbanClippedGround']=True
    if 'urbanRetired' in clipped:del clipped['urbanRetired']
    bm=bmesh.new();bm.from_mesh(clipped.data)
    gxmin,gymin,gxmax,gymax=cfg['groundBounds']
    for point,normal in [((gxmin,0,0),(-1,0,0)),((gxmax,0,0),(1,0,0)),((0,gymin,0),(0,-1,0)),((0,gymax,0),(0,1,0))]:
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=Vector(point),plane_no=Vector(normal),dist=.000001,clear_outer=True,clear_inner=False)
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS');bm.to_mesh(clipped.data);bm.free()
    source['urbanRetired']=True;source.hide_render=True;source.hide_set(True)
    retired=[]
    for tree in bpy.data.collections['Reference_Living_Trees'].objects:
        if abs(tree.location.x)>147 or not -137<=tree.location.y<=147:
            tree['urbanRetired']=True;tree.hide_render=True;tree.hide_set(True);retired.append(tree.name)
    planting=json.loads((R/'config/sunwen.planting.json').read_text())
    planting['vegetation']=[t for t in planting['vegetation'] if abs(t['position'][0])<=147 and -147<=t['position'][2]<=137]
    planting['revision']=layout['assetRevision'];planting['afterCounts']['vegetation']=len(planting['vegetation'])
    (R/'config/sunwen.planting.json').write_text(json.dumps(planting,ensure_ascii=False,indent=2)+'\n')
    bpy.context.view_layer.update()
    folder=R/f"assets/processed/urban-{cfg['revision']}";folder.mkdir(parents=True,exist_ok=True)
    export_selected(folder/'garden-ground.glb',[clipped])
    export_selected(R/'public/models/urban-context.glb',[o for objects in models.values() for o in objects])
    for objects in models.values():
        for ob in objects:ob.hide_render=True;ob.hide_set(True)
    manifest={'revision':cfg['revision'],'interpretation':cfg['basis'],'model':'models/urban-context.glb','gardenBounds':cfg['gardenBounds'],'wallHeight':height,'courts':courts,'streets':plan['streets'],'composition':plan['composition'],'instances':rows}
    (R/'public/urban-context.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+'\n')
    bpy.ops.wm.save_as_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'))
    publish(layout)
    planting['vegetation']=json.loads((R/'public/scene-manifest.json').read_text())['vegetation']
    planting['afterCounts']['vegetation']=len(planting['vegetation'])
    (R/'config/sunwen.planting.json').write_text(json.dumps(planting,ensure_ascii=False,indent=2)+'\n')
    report={'revision':cfg['revision'],'courts':len(courts),'instances':len(rows),'retiredOutsideTrees':retired,'originalEarthArchived':source.name,'clippedEarthVertices':len(clipped.data.vertices),'planChecks':plan_checks,'masterSha256':hashlib.file_digest((R/'blender/daguanyuan_master.blend').open('rb'),'sha256').hexdigest()}
    (R/f"reports/acceptance/{cfg['revision']}-urban-generation.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print('URBAN CONTEXT',report,flush=True)

if __name__=='__main__':build()

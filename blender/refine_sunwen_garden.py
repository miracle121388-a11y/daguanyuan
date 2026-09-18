"""Apply Sun Wen pigment surfaces and an open, authored garden to the master.

The original architectural topology, routes, water and Manual_Adjustments are
preserved; material slots and the replaceable planting collections are revised.
"""
import hashlib,json,math,random,sys
from array import array
from pathlib import Path
import bpy

R=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(R/'blender'))
from sunwen_botany import prototype,linear
from export_scene import export_selected
from publish_manifest import publish

spec=json.loads((R/'config/garden.sunwen.json').read_text())
layout=json.loads((R/'config/garden.layout.json').read_text())
planting=json.loads((R/'config/sunwen.planting.json').read_text())
surfaces=json.loads((R/'assets/processed/sunwen-r17/manifest.json').read_text())
lookup={(r['profile'],r['role']):r for r in surfaces['files']}
bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)

def geometry_hash(ob):
    h=hashlib.sha256()
    for sequence,prop,multiplier,kind in [(ob.data.vertices,'co',3,'f'),(ob.data.loops,'vertex_index',1,'i')]:
        data=array(kind,[0])*(len(sequence)*multiplier);sequence.foreach_get(prop,data);h.update(data.tobytes())
    h.update(str(tuple(v for row in ob.matrix_world for v in row)).encode())
    return h.hexdigest()

protected={ob.name:geometry_hash(ob) for col in bpy.data.collections if col.name.startswith('Place_') or col.name in ['Garden_Landscape','Manual_Adjustments'] for ob in col.all_objects if ob.type=='MESH' and not ob.get('sunwenOrnament')}
manual=bpy.data.collections.get('Manual_Adjustments')
manual_objects=set(manual.all_objects) if manual else set()
cache={}

def surface(source,profile,role):
    key=(profile,role)
    if key in cache:return cache[key]
    row=lookup[key]
    # The ground receiver keeps its well-known name for baking and exporting.
    m=source if role=='earth' else source.copy()
    m.name='earth' if role=='earth' else f'Sunwen_r17_{profile}_{role}'
    m['sunwenRole']=role;m['sunwenProfile']=profile;m['sunwenSurface']=row['file']
    m.use_nodes=True;nodes=m.node_tree.nodes
    bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    tex=nodes.new('ShaderNodeTexImage');tex.name='Sunwen_Pigment'
    tex.image=bpy.data.images.load(str(R/row['file']),check_existing=True);tex.image.colorspace_settings.name='sRGB';tex.image.pack()
    m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    if role=='earth':m['nativeGroundSource']=tex.name
    for link in list(bs.inputs['Roughness'].links):m.node_tree.links.remove(link)
    bs.inputs['Roughness'].default_value=row['roughness'];bs.inputs['Metallic'].default_value=row['metallic']
    m.diffuse_color=linear(row['pigment']);cache[key]=m
    return m

for ob in list(bpy.data.objects):
    if ob.type!='MESH' or ob in manual_objects or ob.get('sunwenPrototype'):continue
    root=ob
    while root.parent:root=root.parent
    pid=root.get('placeId',root.name if root.name in spec['places'] else None)
    profile=spec['places'].get(pid,'landscape')
    for index,mat in enumerate(ob.data.materials):
        if not mat:continue
        role=mat.get('sunwenRole',mat.name)
        chosen='vermillion-wall' if role=='plaster' and not ob.get('roof') and (pid=='daguanyuan_gate' or (pid=='daguanlou' and not ob.get('preserveEnvelope'))) else profile
        if (chosen,role) in lookup:ob.data.materials[index]=surface(mat,chosen,role)

def collection(name):
    col=bpy.data.collections.get(name)
    if col:
        bpy.data.batch_remove(ids=list(col.objects))
    else:
        col=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(col)
    col['generated']=True
    return col

prototypes={};col=collection('Sunwen_Prototypes')
for name in spec['planting']['species']+['iris','peony','lotus','chrysanthemum','orchid']:
    ob=prototype(name,col)
    export_selected(R/f'public/models/vegetation/{name}.glb',[ob])
    ob.hide_render=True;ob.hide_set(True);prototypes[name]=ob
    print('SUNWEN PROTOTYPE',name,len(ob.data.polygons),flush=True)

def place(ob,row):
    x,z,ny=row['position'];ob.location=(x,-ny,z)
    s=row['scale'];ob.scale=(s[0],s[2],s[1]) if isinstance(s,list) else (s,)*3
    ob.rotation_euler.z=row['rotation'];ob.hide_render=False;ob.hide_set(False)

col=collection('Reference_Living_Trees');counts={}
for i,row in enumerate(planting['vegetation']):
    name=spec['planting']['species'][row['species']];ob=prototypes[name].copy();ob.name=f'LivingTree_SW_{i:04}_{name}';col.objects.link(ob);place(ob,row)
    ob['sunwenSpecies']=row['species'];ob['sunwenTint']=i%5;ob['nativeGeometry']='authored-sunwen-crown'
    ob['plantingLayer']='understorey' if name=='shrub' else 'canopy'
    counts[name]=counts.get(name,0)+1

for cname,key in [('Reference_Ground_Cover','groundCover'),('Reference_Understory','understory')]:
    old=bpy.data.collections[cname];templates={}
    for ob in old.objects:
        species=ob.get('species',0)
        if species not in templates:templates[species]=ob.copy()
    col=collection(cname)
    for i,row in enumerate(planting[key]):
        ob=templates[row.get('species',0)].copy();ob.name=f'Sunwen_{key}_{i:04}';col.objects.link(ob);place(ob,row)
        if 'species' in row:ob['species']=row['species'];ob['placeId']=row.get('placeId','')
    for ob in templates.values():bpy.data.objects.remove(ob)

plants=collection('Reference_Sunwen_Planting');rng=random.Random(170917)
from court_planting import SPEC,walkable
places={p['id']:p for p in layout['places']}
def add(name,position,scale,pid=''):
    if len(plants.objects)>=spec['planting']['perennialLimit']:return
    ob=prototypes[name].copy();ob.name=f'SunwenPlant_{len(plants.objects):04}_{name}';plants.objects.link(ob)
    ob.location=position;ob.scale=(scale,)*3;ob.rotation_euler.z=rng.random()*math.tau;ob.hide_render=False;ob.hide_set(False)
    ob['kind']=name;ob['placeId']=pid
for pid,beds in SPEC['courts'].items():
    if pid in ['xiaoxiangguan','hengwuyuan']:continue
    px,py,pz=places[pid]['position']
    for cx,cy,rx,ry,angle in beds:
        for j in range(max(1,round(rx*ry*.13))):
            a=rng.random()*math.tau;r=math.sqrt(rng.random())*.8;xx,yy=math.cos(a)*rx*r,math.sin(a)*ry*r
            x,y=cx+xx*math.cos(angle)-yy*math.sin(angle),cy+xx*math.sin(angle)+yy*math.cos(angle)
            if not walkable(pid,x,y):add('peony' if pid in ['yihongyuan','daguanlou'] else 'iris',(px+x,py+y,pz+.1),rng.uniform(.85,1.3),pid)
from spatial_world import in_water
rings=[layout['terrain']['lake']['outline']]+layout['terrain']['lake']['holes']
for ring in rings:
    for a,b in zip(ring,ring[1:]+ring[:1]):
        if rng.random()>.50:continue
        x,y=(a[0]+b[0])/2,(a[1]+b[1])/2;dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy)
        for sign in [-1,1]:
            xx,yy=x-dy/length*sign*1.7,y+dx/length*sign*1.7
            if in_water(layout,xx,yy):
                for j in range(2):add('lotus',(xx+j*.8,yy,-.13),rng.uniform(.9,1.35))
                break

for name,digest in protected.items():
    if geometry_hash(bpy.data.objects[name])!=digest:raise RuntimeError('Protected mesh changed: '+name)
layout['assetRevision']=spec['assetRevision']
bpy.context.view_layer.update();publish(layout)
bpy.ops.wm.save_as_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'))
record={'revision':spec['assetRevision'],'protectedMeshCount':len(protected),'geometryAndTransformsUnchanged':True,'manualObjects':len(manual_objects),'treeCounts':counts,'perennialGroups':len(plants.objects),'materials':len(cache),'planting':planting['afterCounts'],'masterSha256':hashlib.sha256((R/'blender/daguanyuan_master.blend').read_bytes()).hexdigest(),'method':__doc__}
(R/'reports/acceptance/r17-native-preservation.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print('SUNWEN MASTER READY',counts,len(plants.objects),flush=True)

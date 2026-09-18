"""Editable low planting, stone-edged beds and grouped flowers, shared with web."""
import hashlib,json,math,random,sys
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
import build_modules as core
from sunwen_botany import materials,linear,blossom
from focal_botany import blade
from court_planting import walkable
from spatial_world import in_water
from export_scene import export_selected
from publish_manifest import publish
from native_ground import attach_tended_garden

bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
layout=json.loads((R/'config/garden.layout.json').read_text())
spec=json.loads((R/'config/garden.sunwen.json').read_text())
plan=json.loads((R/'config/sunwen.landscape.json').read_text())
places={p['id']:p for p in layout['places']}
nodes={p['id']:p['position'] for p in layout['pathNodes']}
routes=[(nodes[e['from']],nodes[e['to']]) for e in layout['pathEdges'] if e['kind']!='connection']
rng=random.Random(9172026)

def distance(x,y,a,b):
    dx,dy=b[0]-a[0],b[1]-a[1];t=max(0,min(1,((x-a[0])*dx+(y-a[1])*dy)/max(.001,dx*dx+dy*dy)))
    return math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)

def generated(name):
    col=bpy.data.collections.get(name)
    if col:bpy.data.batch_remove(ids=list(col.objects))
    else:col=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(col)
    col['generated']=True;col['designBasis']='Sun Wen garden interpretation, user art direction'
    return col

# Read only the actual terrain: roots never use an assumed flat plane.
vertices=[];polygons=[]
for ob in bpy.data.collections['Garden_Landscape'].all_objects:
    if ob.type!='MESH':continue
    slots={i for i,m in enumerate(ob.data.materials) if m and m.get('sunwenRole',m.name)=='earth'}
    if not slots:continue
    offset=len(vertices);vertices.extend(ob.matrix_world@v.co for v in ob.data.vertices)
    polygons.extend(tuple(offset+i for i in p.vertices) for p in ob.data.polygons if p.material_index in slots)
terrain=BVHTree.FromPolygons(vertices,polygons)

def ground(x,y,pid='',court=False):
    hit=terrain.ray_cast(Vector((x,y,90)),Vector((0,0,-1)),180)[0]
    z=hit.z if hit is not None else 0
    if court:z=max(z,places[pid]['position'][2]+.15)
    return z+.018

def valid(x,y,bed):
    if in_water(layout,x,y) or abs(x)>145 or y<-135 or y>145:return False
    if bed['kind']=='court':
        px,py,_=places[bed['placeId']]['position']
        return not walkable(bed['placeId'],x-px,y-py)
    if min(distance(x,y,a,b) for a,b in routes)<3:return False
    if abs(x)<19 and -145<y<-34:return False
    for p in layout['places']:
        px,py,_=p['position']
        if p['id']=='daguanlou':
            if abs(x-px)<39 and -37<y-py<78:return False
        elif abs(x-px)<(19 if p['featured'] else 14) and -18<y-py<23:return False
    return True

col=generated('Sunwen_Garden_Details');plants=generated('Reference_Sunwen_Planting')
# The old low polygon floating discs are superseded by the authored lotus.
# Keep their source geometry in the editable file, but retire its render layer.
retired=[]
for ob in bpy.data.collections['Garden_Landscape'].objects:
    if ob.type!='MESH' or not ob.data.materials:continue
    if not all(m.get('sunwenRole',m.name)=='lightleaf' for m in ob.data.materials):continue
    z=[(ob.matrix_world@v.co).z for v in ob.data.vertices]
    if z and min(z)>-.1 and max(z)<.01:
        ob.hide_render=True;ob.hide_set(True);ob['replacedBy']='Reference_Sunwen_Planting lotus';retired.append(ob.name)
core.M=materials()
for name,color in [('garden_edge','#91aba4'),('garden_moss','#66977c'),('garden_bean','#a4c58f'),('garden_jade','#5c9c8b')]:
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=linear(color)
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.88;m.diffuse_color=linear(color);core.M[name]=m
prototypes={ob.get('sunwenPrototype'):ob for ob in bpy.data.collections['Sunwen_Prototypes'].objects}
records=[];objects=[]

def flower(kind,x,y,z,size,pid):
    if len(plants.objects)>=spec['planting']['perennialLimit']:return
    ob=prototypes[kind].copy();ob.name=f'SunwenPlant_{len(plants.objects):04}_{kind}';plants.objects.link(ob)
    ob.location=(x,y,z);ob.scale=(size,)*3;ob.rotation_euler.z=rng.random()*math.tau
    ob.hide_render=False;ob.hide_set(False);ob['kind']=kind;ob['placeId']=pid

for bed in plan['beds']:
    batch=core.Batch('SunwenBed_'+bed['id'],col)
    cx,cy=bed['center'];rx,ry=bed['radii'];a=bed['angle'];court=bed['kind']=='court';pid=bed['placeId'];style=bed['profile']
    def point(u,v):return cx+u*math.cos(a)-v*math.sin(a),cy+u*math.sin(a)+v*math.cos(a)
    # Small stone edging defines managed court beds; groves have soft leaf edges.
    if court or bed['kind']=='plot':
        count=max(16,round(math.tau*math.sqrt((rx*rx+ry*ry)/2)/.42))
        for i in range(count):
            t=i*math.tau/count;x,y=point(math.cos(t)*rx*.94,math.sin(t)*ry*.94)
            if not valid(x,y,bed):continue
            z=ground(x,y,pid,court)
            batch.ellipsoid('garden_edge',(x,y,z+.08),(.23,.18,.11),seed=i,rings=2,n=5)
    # Interleaved low leaves produce layered beds, not a clipped turf surface.
    count=round(rx*ry*(2.9 if court else .65))
    flowers=0
    for i in range(count):
        t=rng.random()*math.tau;r=math.sqrt(rng.random())*.94
        x,y=point(math.cos(t)*rx*r,math.sin(t)*ry*r)
        if not valid(x,y,bed):continue
        z=ground(x,y,pid,court);size=rng.uniform(.4,.85) if court else rng.uniform(.65,1.1)
        for j in range(6):
            la=j*2.399+rng.uniform(-.2,.2)
            role=['garden_moss','garden_bean','garden_jade'][(i+j)%3]
            blade(batch,(x,y,z),(math.cos(la),math.sin(la),.18),size,size*.28,role,droop=.14,segments=2)
        # Ground-level petals remain visible at overview distance; near the eye
        # the full multi-stem perennial prototypes supply plant detail.
        flower_chance=.62 if style=='crimson' else .34 if style in ['ceremonial','rustic'] else .12 if style=='herbal' else .24
        if rng.random()<flower_chance:
            color='sunwen_pink' if style in ['crimson','ceremonial'] else 'sunwen_gold' if style=='rustic' else 'sunwen_white' if style in ['herbal','bamboo','temple'] else 'sunwen_iris'
            blossom(batch,(x,y,z+.33),size*.36,color,rng,petals=7)
            if flowers < (22 if court else 8):
                kind='peony' if style in ['crimson','ceremonial'] else 'chrysanthemum' if style=='rustic' else 'orchid' if style in ['herbal','bamboo','temple'] else 'iris'
                flower(kind,x,y,z,rng.uniform(1,1.55),pid);flowers+=1
    added=batch.finish();objects.extend(added)
    for ob in added:ob['sunwenLandscape']=True;ob['bedId']=bed['id'];ob['placeId']=pid
    records.append({'id':bed['id'],'profile':style,'perennials':flowers,'faces':sum(len(o.data.polygons) for o in added)})

# Clustered lotus bays: alternate planted coves with clear reflective water.
lotus=0
# Reserve flowering bays beside Ou Xiang Xie before distributing other shores.
for cx,cy in [(90,49),(93,76),(65,50)]:
    count=0
    for i in range(140):
        a=i*2.399;r=3.4*math.sqrt((i+.5)/140)
        x,y=cx+math.cos(a)*r,cy+math.sin(a)*r
        if not in_water(layout,x,y) or min(distance(x,y,c,d) for c,d in routes)<4.5:continue
        if i%3:continue
        flower('lotus',x,y,-.13,rng.uniform(1.25,1.7),'ouxiangxie');lotus+=1;count+=1
        if count==32:break
for ring in [layout['terrain']['lake']['outline']]+layout['terrain']['lake']['holes']:
    for i,(a,b) in enumerate(zip(ring,ring[1:]+ring[:1])):
        x,y=(a[0]+b[0])/2,(a[1]+b[1])/2
        if math.sin(x*.073+y*.061)<-.15:continue
        dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy)
        for j in range(3):
            offset=1.65+j*.87
            for sign in [-1,1]:
                xx,yy=x-dy/length*offset*sign+rng.uniform(-.3,.3),y+dx/length*offset*sign+rng.uniform(-.3,.3)
                if not in_water(layout,xx,yy) or min(distance(xx,yy,c,d) for c,d in routes)<4.5:continue
                flower('lotus',xx,yy,-.13,rng.uniform(1.3,1.8),'ouxiangxie');lotus+=1;break
        if lotus>=240:break
    if lotus>=240:break

bpy.context.view_layer.update()
export_selected(R/'public/models/sunwen-landscape.glb',objects)
from sunwen_landscape_lod import export_low_beds
export_low_beds(R/'public/models/sunwen-landscape-low.glb',objects)
attach_tended_garden();publish(layout)
bpy.ops.wm.save_as_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'))
report={'revision':spec['assetRevision'],'method':__doc__,'beds':records,'lotusGroups':lotus,'retiredLotusMeshes':retired,'perennials':len(plants.objects),'terrainRaycast':True,'routesUnchanged':True,'sourcePlanSha256':hashlib.sha256((R/'config/sunwen.landscape.json').read_bytes()).hexdigest(),'models':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (R/'public/models').glob('sunwen-landscape*.glb')}}
(R/'reports/acceptance/r17-tended-garden.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('TENDED GARDEN NATIVE',len(records),'beds',len(plants.objects),'flowers',lotus,'lotus',flush=True)

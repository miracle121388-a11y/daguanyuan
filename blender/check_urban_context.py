"""Check physical enclosure, roof skyline, flat exterior and retained garden."""
import bpy,json,sys,hashlib,math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
from sunwen_architecture import geometry_hash
from urban_layout import compose, validate_plan, BUILDINGS, FACILITIES
cfg=json.loads((R/'config/garden.urban.json').read_text());data=json.loads((R/'public/urban-context.json').read_text())
checks=[]
def check(ok,message):
    if not ok:raise AssertionError(message)
    checks.append(message)
def protected():
    bpy.context.view_layer.update()
    return {o.name:geometry_hash(o) for col in bpy.data.collections if col.name.startswith('Place_') or col.name in ['Garden_Landscape','Urban_Garden_Ground','Manual_Adjustments','Sunwen_Architectural_Details','Reference_Living_Trees','Sunwen_Garden_Details','Reference_Sunwen_Planting','Sunwen_Root_Gardens'] for o in col.all_objects if o.type=='MESH'}
master=R/'blender/daguanyuan_master.blend'
bpy.ops.wm.open_mainfile(filepath=str(master),load_ui=False,use_scripts=False)
current=protected();baseline=R/cfg['screening']['baseline']
if baseline.exists():
    bpy.ops.wm.open_mainfile(filepath=str(baseline),load_ui=False,use_scripts=False)
    for name,value in protected().items():check(current.get(name)==value,'Garden mesh and transform retained: '+name)
    bpy.ops.wm.open_mainfile(filepath=str(master),load_ui=False,use_scripts=False)
plan=compose(cfg);plan_checks=validate_plan(plan,cfg)
check(plan['instances']==data['instances'][:len(plan['instances'])],'Published city follows the checked plan')
check(len(data['courts'])>=200,'Continuous, dense low-rise courtyard setting')
check(len({c['type'] for c in data['courts']})>=8,'Different compound plans and urban land uses')
check(FACILITIES <= {r['kind'] for r in data['instances']},'Modeled facilities include arches, wells, market equipment and drainage')
for sx,sy in [(1,1),(1,-1),(-1,1),(-1,-1)]:check(sum(c['center'][0]*sx>0 and c['center'][1]*sy>0 for c in data['courts'])>=50,'Courtyard coverage quadrant '+str((sx,sy)))
xmin,ymin,xmax,ymax=cfg['groundBounds']
clipped=bpy.data.objects['Urban_Clipped_Garden_Earth']
check(not clipped.hide_render,'Clipped garden terrain is active')
for v in clipped.data.vertices:check(xmin-.001<=v.co.x<=xmax+.001 and ymin-.001<=v.co.y<=ymax+.001,'No active mountain terrain outside garden '+str(v.index))
archived=[o for o in bpy.context.scene.objects if o.get('urbanRetired')]
check(bool(archived) and all(o.hide_render for o in archived),'Former mountains and outer woodland archived, invisible')
check('Manual_Adjustments' in bpy.data.collections,'Manual adjustments collection retained')
col=bpy.data.collections['Urban_Context'];bpy.context.view_layer.update();vertices=[];faces=[];native_counts={};roof_bounds={};roof_heights={}
for ob in col.objects:
    if ob.type!='MESH':continue
    i=ob['urbanInstance'];native_counts[i]=native_counts.get(i,0)+1
    row=data['instances'][i]
    check(max(abs(a-b) for a,b in zip([ob.location.x,ob.location.z,-ob.location.y],row['position']))<.001,'Native/web placement '+ob.name)
    check(max(abs(a-b) for a,b in zip([ob.scale.x,ob.scale.z,ob.scale.y],row['scale']))<.001,'Native/web scale '+ob.name)
    check(abs(ob.rotation_euler.z-row['rotation'])<.00001,'Native/web rotation '+ob.name)
    if row['kind']!='tree':check(max((ob.matrix_world@Vector(v)).z for v in ob.bound_box)<13,'Traditional low-rise height '+ob.name)
    if row['district']=='urban-ground':check(max((ob.matrix_world@Vector(v)).z for v in ob.bound_box)<.01,'Flat paved exterior '+ob.name)
    if row['kind'] in BUILDINGS and ob.data.materials[0].get('urbanRole') in ['roof','warmroof','slateroof','tile']:
        points=[ob.matrix_world@Vector(v) for v in ob.bound_box]
        box=[min(v.x for v in points),min(v.y for v in points),max(v.x for v in points),max(v.y for v in points)]
        if i in roof_bounds:
            old=roof_bounds[i];box=[min(old[0],box[0]),min(old[1],box[1]),max(old[2],box[2]),max(old[3],box[3])]
        roof_bounds[i]=box
        roof_heights[i]=max(roof_heights.get(i,0),max(v.z for v in points))
    if row['district']=='garden-enclosure':
        offset=len(vertices);vertices.extend([tuple(ob.matrix_world@v.co) for v in ob.data.vertices]);faces.extend([tuple(offset+i for i in p.vertices) for p in ob.data.polygons])
check(len(native_counts)==len(data['instances']),'Every published instance exists in native model')
roof_items=list(roof_bounds.items());collisions=[]
for n,(i,a) in enumerate(roof_items):
    for j,b in roof_items[n+1:]:
        if min(a[2],b[2])-max(a[0],b[0])>.15 and min(a[3],b[3])-max(a[1],b[1])>.15:collisions.append([i,j])
check(not collisions,'Actual native roof bounds do not overlap: '+str(collisions[:20]))
tree=BVHTree.FromPolygons(vertices,faces)
rays=[]
for target in [(186,22,7),(-186,22,7),(0,208,7),(45,-164,7)]:
    for height in [2.2,42]:
        start=Vector((0,0,height));end=Vector(target);delta=end-start;hit=tree.ray_cast(start,delta.normalized(),delta.length)[0]
        check((hit is not None)==(height==2.2),'Eye level screened / elevated roofs revealed: '+str((height,target)))
        rays.append({'eye':list(start),'roof':list(end),'occluded':hit is not None})
# Test real roof vertices from actual near and middle distance buildings,
# sampled from four garden edges. A wall must shield walking eye level while
# a realistic upper-storey view admits scattered rooflines, without hiding
# city instances based on the camera height.
roof_targets=[]
for i,box in roof_bounds.items():
    row=data['instances'][i]
    if max(abs(row['position'][0]),abs(row['position'][2]))>300:continue
    if row['district']!='garden-screen':
        roof_targets.append(Vector(((box[0]+box[2])/2,(box[1]+box[3])/2,roof_heights[i])))
visibility=[]
screen_objects=[o for o in bpy.data.collections['Reference_Living_Trees'].objects if not o.hide_render and (o.get('urbanBoundaryPlant') or o.get('urbanScreenCrown'))]
screen_objects += [o for o in col.objects if data['instances'][o['urbanInstance']]['kind'] in ['tree','bamboo-screen','screen-rock']]
screen_cache={};screen_rays=[]
for ob in screen_objects:
    key=ob.data.as_pointer()
    if key not in screen_cache:
        screen_cache[key]=BVHTree.FromPolygons([v.co for v in ob.data.vertices],[tuple(p.vertices) for p in ob.data.polygons])
    screen_rays.append((ob.matrix_world.inverted(),screen_cache[key]))
def planted_screen_hit(start,end):
    for inverse,bvh in screen_rays:
        a,b=inverse@start,inverse@end;delta=b-a
        if bvh.ray_cast(a,delta.normalized(),delta.length)[0] is not None:return True
    return False
for side,xy,axis,sign in [('east',(65,20),0,1),('west',(-65,20),0,-1),('north',(0,70),1,1),('south',(58,-65),1,-1)]:
    targets=[p for p in roof_targets if p[axis]*sign>150 and abs(p[1-axis]-xy[1-axis])<75]
    for height in [2.2,12,27]:
        start=Vector((*xy,height));clear=0;glimpses=0
        for end in targets:
            delta=end-start
            if tree.ray_cast(start,delta.normalized(),delta.length)[0] is None:
                clear+=1
                if not planted_screen_hit(start,end):glimpses+=1
        check(bool(targets),'Roof targets sampled '+side)
        if height==2.2:check(clear==0,'Walking view shields all near-estate roofs '+side)
        if height==12:
            check(0<glimpses<clear,'Upper storey roof glimpses filtered by real crown geometry '+side)
        visibility.append(dict(side=side,height=height,roofs=len(targets),clearAboveWall=clear,visibleBetweenCrowns=glimpses))
boundary=data['boundaryPlanting']
check(len(boundary)>=65,'Staggered managed boundary groves surround the garden')
for side in ['west','east','north','south']:
    check(sum(r['side']==side for r in boundary)>=10,'Layered planting on '+side)
for row in boundary:
    ob=bpy.data.objects[row['name']];x,y,z=ob.location
    check(ob.get('urbanBoundaryPlant') and not ob.hide_render,'Full authored screening crown '+ob.name)
    check(abs(x)>136 or y>136 or y<-129,'Dense grove confined to wall margin '+ob.name)
    check(any(r['kind']=='screen-bed' and math.hypot(r['position'][0]-x,r['position'][2]+y)<.01 for r in data['instances']),'Underplanting at every new crown '+ob.name)
check(sum(r['district']=='estate-backrange' for r in data['instances'])>=35,'Continuous private back ranges between garden and city')
for role in ['roof','tile']:
    normals=[p.normal.z for ob in bpy.data.collections['Urban_Prototypes'].objects if ob.data.materials[0].get('urbanRole')==role for p in ob.data.polygons]
    check(any(n>.2 for n in normals),'Visible upward '+role+' surfaces')
report={'passed':len(checks),'checks':checks,'courts':len(data['courts']),'instances':len(data['instances']),'plan':plan_checks,'actualRoofOverlaps':collisions,'protectedMeshes':len(current),'occlusionRays':rays,'roofVisibility':visibility,'boundaryTrees':len(boundary),'masterSha256':hashlib.file_digest(master.open('rb'),'sha256').hexdigest()}
(R/f"reports/acceptance/{cfg['revision']}-urban-verification.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('PASS',len(checks),'urban setting and preserved garden checks',flush=True)

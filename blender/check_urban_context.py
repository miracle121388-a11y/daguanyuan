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
    return {o.name:geometry_hash(o) for col in bpy.data.collections if col.name.startswith('Place_') or col.name in ['Garden_Landscape','Urban_Garden_Ground','Manual_Adjustments','Sunwen_Architectural_Details','Reference_Living_Trees','Sunwen_Garden_Details','Reference_Sunwen_Planting'] for o in col.all_objects if o.type=='MESH'}
master=R/'blender/daguanyuan_master.blend'
bpy.ops.wm.open_mainfile(filepath=str(master),load_ui=False,use_scripts=False)
current=protected();baseline=R/'.checkpoints/before-urban-r20/blender/daguanyuan_master.blend'
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
col=bpy.data.collections['Urban_Context'];bpy.context.view_layer.update();vertices=[];faces=[];native_counts={};roof_bounds={}
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
for role in ['roof','tile']:
    normals=[p.normal.z for ob in bpy.data.collections['Urban_Prototypes'].objects if ob.data.materials[0].get('urbanRole')==role for p in ob.data.polygons]
    check(any(n>.2 for n in normals),'Visible upward '+role+' surfaces')
report={'passed':len(checks),'checks':checks,'courts':len(data['courts']),'instances':len(data['instances']),'plan':plan_checks,'actualRoofOverlaps':collisions,'protectedMeshes':len(current),'occlusionRays':rays,'masterSha256':hashlib.file_digest(master.open('rb'),'sha256').hexdigest()}
(R/f"reports/acceptance/{cfg['revision']}-urban-verification.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('PASS',len(checks),'urban setting and preserved garden checks',flush=True)

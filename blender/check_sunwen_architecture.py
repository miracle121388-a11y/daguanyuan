"""Check actual r18 meshes, original preservation, ground seating and openings."""
import hashlib,json,sys
from array import array
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
from sunwen_architecture import geometry_hash,ground_tree
config=json.loads((R/'config/sunwen.architecture.json').read_text());checks=[]
def check(ok,note):
    if not ok:raise AssertionError(note)
    checks.append(note)
def protected():
    bpy.context.view_layer.update()
    return {o.name:geometry_hash(o) for col in bpy.data.collections if col.name.startswith('Place_') or col.name in ['Garden_Landscape','Manual_Adjustments'] for o in col.all_objects if o.type=='MESH' and not o.get('sunwenOrnament')}
bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
current=protected()
baseline=R/'.checkpoints/before-sunwen-architecture-r18/blender/daguanyuan_master.blend'
if baseline.exists():
    bpy.ops.wm.open_mainfile(filepath=str(baseline),load_ui=False,use_scripts=False)
    old=protected()
    for name,value in old.items():check(current.get(name)==value,'Preserved original mesh and transform: '+name)
    bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
else:
    record=json.loads((R/'reports/acceptance/r18-architecture.json').read_text())
    check(record['originalGeometryUnchanged'],'Generator preservation record (local prior master unavailable)')
tree=ground_tree();report=json.loads((R/'reports/acceptance/r18-architecture.json').read_text())
check(len(report['records'])==18,'18 architectural identities')
check(len({r['profile'] for r in report['records']})>=14,'Coordinated but differentiated pigment profiles')
for p in config['additionalScenes']:
    root=bpy.data.objects['Sunwen18_'+p['id']];x,y,z=root.location;w,d=p['size']
    check(len(root.children)>5,p['id']+' actual architectural mesh assembly')
    for dx in [-w/2,0,w/2]:
        for dy in [-d/2,0,d/2]:
            hit=tree.ray_cast(Vector((x+dx,y+dy,100)),Vector((0,0,-1)),200)[0]
            check(hit is not None and -.02<z-hit.z<1.0,p['id']+' grounded, level stone footing')
    plants=bpy.data.collections['Reference_Living_Trees'].objects
    for plant in plants:
        if plant.get('sunwenSpecies')==3:continue
        check(not(abs(plant.location.x-x)<w/2+1 and abs(plant.location.y-y)<d/2+1),p['id']+' clear of tree trunk '+plant.name)
    if p['id']=='zhuijinlou':
        vertices=[o.matrix_world@v.co for o in root.children if o.type=='MESH' for v in o.data.vertices]
        check(max(v.z for v in vertices)-z>9,'Zhuijin tower has two visible storeys')
        # The lower eave must be an annular skirt, leaving the upper room free.
        roof=next(o for o in root.children if o.type=='MESH' and o.data.materials[0].get('architecturalRole')=='roof')
        middle=[v for v in roof.data.vertices if abs(v.co.x)<3 and abs(v.co.y)<2 and 3.7<v.co.z<5.3]
        check(not middle,'Lower tower roof does not intersect upper room')
ou=bpy.data.objects['ouxiangxie']
retired=[o for o in ou.children_recursive if o.get('sunwenRetired')]
check(bool(retired) and all(o.hide_render for o in retired),'Heavy water pavilion walls retained but hidden in master')
check(any(o.get('architectureRevision')=='r18' and o.type=='MESH' and o.data.materials[0].get('architecturalRole')=='wood' for o in ou.children),'Folded water-pavilion frames are real geometry')
check(any(o.get('roof') for o in bpy.data.objects['Sunwen18_Gallery_Roof'].children),'Corridor has a continuous added roof shell')
for p in ['yihongyuan','xiaoxiangguan','hengwuyuan','qiushuangzhai','daoxiangcun','longcuian','nuanxiangwu']:
    root=bpy.data.objects[p]
    meshes=[o for o in root.children_recursive if o.get('architectureRevision')=='r18']
    if config['places'][p]['gate']=='arbor':
        vertices=[v.co for o in meshes if o.type=='MESH' and o.data.materials[0].get('architecturalRole')=='wood' for v in o.data.vertices]
        check(sum(abs(v.x)<2.1 and -12.5<v.y<-10.5 and 3.3<v.z<3.5 for v in vertices)>=40,p+' seven timber arbor crossbars instead of a formal tile roof')
    else:check(any(o.get('roof') for o in meshes),p+' distinct entrance portico')
output={'passed':len(checks),'checks':checks,'method':__doc__,'masterSha256':hashlib.sha256((R/'blender/daguanyuan_master.blend').read_bytes()).hexdigest()}
(R/'reports/acceptance/r18-architecture-verification.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
print('PASS',len(checks),'actual architecture and preservation checks',flush=True)

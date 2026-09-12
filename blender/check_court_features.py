"""Ray-test actual eroded rock holes in the master and both delivered court LODs."""
import bpy,json,datetime
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1]
revision=json.loads((R/'public/scene-manifest.json').read_text(encoding='utf-8'))['assetRevision']
rows=[]
for mode in ['master','detail','mobile','overview']:
    if mode=='master':bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
    else:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        path=R/'public/models/overview-low.glb' if mode=='overview' else R/'public/models'/('places' if mode=='detail' else 'places-low')/'hengwuyuan.glb'
        bpy.ops.import_scene.gltf(filepath=str(path))
    root=next(o for o in bpy.context.scene.objects if o.get('entityType')=='place' and o.get('placeId')=='hengwuyuan')
    rocks=[o for o in bpy.context.scene.objects if o.type=='MESH' and any(m.name=='gardenstone' for m in o.data.materials) and o.parent==root]
    assert rocks,'Missing authored stone in '+mode
    vertices=[];faces=[]
    for ob in rocks:
        matrix=root.matrix_world.inverted()@ob.matrix_world;offset=len(vertices)
        vertices.extend(matrix@v.co for v in ob.data.vertices);faces.extend(tuple(offset+i for i in p.vertices) for p in ob.data.polygons)
    tree=BVHTree.FromPolygons(vertices,faces)
    # Four unequal voids must remain traversable at their actual local centres.
    # A solid-base control ensures a missing/incorrectly transformed object fails.
    checks=[]
    for x,z in [(-.63,1.11),(.59,1.70),(-.10,2.37),(.18,.56)]:
        hit=tree.ray_cast(Vector((x*2.25,-10,z*2.25)),Vector((0,1,0)),15)[0]
        checks.append({'kind':'through-cavity','x':x*2.25,'z':z*2.25,'passed':hit is None})
    hit=tree.ray_cast(Vector((-.60*2.25,-10,.25*2.25)),Vector((0,1,0)),15)[0]
    checks.append({'kind':'solid-base-control','passed':hit is not None})
    rows.append({'mode':mode,'vertices':len(vertices),'faces':len(faces),'checks':checks,'passed':all(c['passed'] for c in checks)})
report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'revision':revision,'method':'Rays through actual Hengwu gardenstone mesh cavities, plus a solid-base negative control; read saved master, detail GLB, mobile GLB and overview GLB separately. This verifies retained openings, not geological authenticity or visual quality.','results':rows,'passed':all(r['passed'] for r in rows)}
(R/f'reports/acceptance/{revision.rsplit("-",1)[-1]}-court-feature-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('ACTUAL COURT CAVITIES',sum(len(r['checks']) for r in rows),'passed',report['passed'],flush=True)
if not report['passed']:raise RuntimeError('An eroded stone opening or its solid base was lost')

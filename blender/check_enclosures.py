"""Ray-check delivered solid wall thickness, window backing and real door voids."""
import bpy,json,sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parents[1]
layout=json.loads((ROOT/'config/garden.layout.json').read_text(encoding='utf-8'))
revision=layout['assetRevision'].rsplit('-',1)[-1]
spec=json.loads((ROOT/f'reports/acceptance/{revision}-enclosure-generation.json').read_text(encoding='utf-8'))
rows=[]


def inspect(root,record,scope):
    vertices=[];faces=[]
    bpy.context.view_layer.update()
    matrix=root.matrix_world.inverted()
    envelopes=[o for o in root.children_recursive if o.type=='MESH' and o.get('preserveEnvelope')]
    for ob in envelopes:
        offset=len(vertices);transform=matrix@ob.matrix_world
        vertices.extend(transform@v.co for v in ob.data.vertices)
        faces.extend(tuple(offset+i for i in p.vertices) for p in ob.data.polygons)
    tree=BVHTree.FromPolygons(vertices,faces) if faces else None
    failures=[];checks=0
    for kind,probes in record['probes'].items():
        for first,last in probes:
            checks+=1;start=Vector(first);end=Vector(last);delta=end-start;length=delta.length
            near=tree.ray_cast(start,delta.normalized(),length)[0] if tree else None
            far=tree.ray_cast(end,-delta.normalized(),length)[0] if tree else None
            thickness=(near-far).length if near is not None and far is not None else 0
            passed=near is None if kind=='door' else thickness>=(.28 if kind=='wall' else .020)
            if not passed:failures.append({'kind':kind,'point':first,'thickness':thickness,'hit':list(near) if near is not None else None})
    if record['placeId']=='dicuiting' and envelopes:failures.append({'reason':'Open pavilion was enclosed'})
    if checks and not envelopes:failures.append({'reason':'All room envelopes are absent'})
    rows.append({'scope':scope,'placeId':record['placeId'],'checks':checks,'envelopeMeshes':len(envelopes),'passed':not failures,'failures':failures})


bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
for record in spec['places']:inspect(bpy.data.objects[record['placeId']],record,'native')
for variant in ['places','places-low']:
    for record in spec['places']:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(ROOT/f'public/models/{variant}/{record["placeId"]}.glb'))
        root=next(o for o in bpy.data.objects if o.get('entityType')=='place' and o.get('placeId')==record['placeId'])
        inspect(root,record,variant)
for variant in ['overview','overview-low']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/f'public/models/{variant}.glb'))
    for record in spec['places']:
        root=next(o for o in bpy.data.objects if o.get('entityType')=='place' and o.get('placeId')==record['placeId'])
        inspect(root,record,variant)
report={'revision':layout['assetRevision'],'checks':sum(r['checks'] for r in rows),'passed':all(r['passed'] for r in rows),
        'method':'Bidirectional rays against actual envelope triangles in the saved master and every high/mobile/overview GLB. Solid wall thickness >=28cm and paper backing >=2cm after quantization; doorway center rays must remain unobstructed.','rows':rows}
(ROOT/f'reports/acceptance/{revision}-enclosure-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('ENCLOSURE CHECK',report['checks'],'passed',report['passed'],flush=True)
if not report['passed']:raise RuntimeError('A delivered room lost its wall, backing or door opening')

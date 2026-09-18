"""Ray-check delivered solid wall thickness, window backing and real door voids."""
import bpy,json,sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parents[1]
layout=json.loads((ROOT/'config/garden.layout.json').read_text(encoding='utf-8'))
revision=layout['assetRevision'].rsplit('-',1)[-1]
probe_revision=json.loads((ROOT/'config/qing.palette.json').read_text())['revision']
spec=json.loads((ROOT/f'reports/acceptance/{probe_revision}-enclosure-generation.json').read_text(encoding='utf-8'))
rows=[]


def inspect(root,record,scope):
    vertices=[];faces=[]
    bpy.context.view_layer.update()
    matrix=root.matrix_world.inverted()
    open_water=record['placeId']=='ouxiangxie' and (ROOT/'config/sunwen.architecture.json').exists()
    peers=[o for o in bpy.data.objects if o.get('entityType')=='place' and o.get('placeId')==record['placeId']]
    envelopes=[o for peer in peers for o in peer.children_recursive if o.type=='MESH' and not o.get('sunwenRetired') and (open_water or o.get('preserveEnvelope'))]
    for ob in envelopes:
        offset=len(vertices);transform=matrix@ob.matrix_world
        vertices.extend(transform@v.co for v in ob.data.vertices)
        faces.extend(tuple(offset+i for i in p.vertices) for p in ob.data.polygons)
    tree=BVHTree.FromPolygons(vertices,faces) if faces else None
    failures=[];checks=0
    probes_by_kind=record['probes']
    if open_water:
        # r18 intentionally opens the waterside pavilion. Verify real view
        # apertures against every visible mesh, not the retired solid envelope.
        probes_by_kind={'view':[[[x,sign*4.9,2.78],[x,sign*3.1,2.78]] for sign in [-1,1] for x in [-5.82,-.77,4.19]]}
        probes_by_kind['view'] += [[[sign*8.3,.73,2.78],[sign*6.6,.73,2.78]] for sign in [-1,1]]
    for kind,probes in probes_by_kind.items():
        for first,last in probes:
            checks+=1;start=Vector(first);end=Vector(last);delta=end-start;length=delta.length
            near=tree.ray_cast(start,delta.normalized(),length)[0] if tree else None
            far=tree.ray_cast(end,-delta.normalized(),length)[0] if tree else None
            thickness=(near-far).length if near is not None and far is not None else 0
            passed=near is None if kind in ['door','view'] else thickness>=(.28 if kind=='wall' else .020)
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
        details=ROOT/('public/models/sunwen-architecture-low.glb' if variant.endswith('-low') else 'public/models/sunwen-architecture.glb')
        if details.exists():bpy.ops.import_scene.gltf(filepath=str(details))
        root=next(o for o in bpy.data.objects if o.get('entityType')=='place' and o.get('placeId')==record['placeId'])
        inspect(root,record,variant)
for variant in ['overview','overview-low']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/f'public/models/{variant}.glb'))
    details=ROOT/('public/models/sunwen-architecture-low.glb' if variant.endswith('-low') else 'public/models/sunwen-architecture.glb')
    if details.exists():bpy.ops.import_scene.gltf(filepath=str(details))
    for record in spec['places']:
        root=next(o for o in bpy.data.objects if o.get('entityType')=='place' and o.get('placeId')==record['placeId'])
        inspect(root,record,variant)
report={'revision':layout['assetRevision'],'checks':sum(r['checks'] for r in rows),'passed':all(r['passed'] for r in rows),
        'method':'Bidirectional rays against delivered room envelopes: walls >=28cm, paper >=2cm, doorway voids. The r18 open Ouxiang water pavilion instead requires eight clear eye-level view rays against all active meshes on all four sides. Retired generated walls are excluded.','rows':rows}
(ROOT/f'reports/acceptance/{revision}-enclosure-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('ENCLOSURE CHECK',report['checks'],'passed',report['passed'],flush=True)
if not report['passed']:raise RuntimeError('A delivered room lost its wall, backing or door opening')

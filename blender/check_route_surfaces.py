"""Ray-test real paving on reviewed roads and bridges in both exported LODs.

The terrain clearance test cannot detect a missing deck. These rays require
an upward-facing paving surface near its authored height, across its width.
"""
import bpy, json, math, sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

R = Path(__file__).resolve().parents[1]
layout = json.loads((R / 'config/garden.layout.json').read_text(encoding='utf-8'))
nodes = {n['id']: Vector(n['position']) for n in layout['pathNodes']}
samples = []
for edge in layout['pathEdges']:
    kind = edge['kind']
    if kind not in ['path', 'bridge']:
        continue
    a, c = nodes[edge['from']], nodes[edge['to']]
    cross = Vector((-(c-a).y, (c-a).x, 0)).normalized()
    width = (6.5 if edge['from'] == 'qinfang-0' else 2.8) if kind == 'bridge' else (3.2 if edge['from'].startswith('arrival') else 2.5)
    rise = (1.7 if edge['from'] == 'qinfang-0' else .8) if kind == 'bridge' else 0
    count = max(2, math.ceil((c-a).length / 1.1))
    for i in range(count):
        t = (i+.5)/count
        for offset in [-.32, 0, .32]:
            p = a.lerp(c, t) + cross * width * offset
            p.z += math.sin(t*math.pi)*rise
            samples.append((edge['from']+' -> '+edge['to'], kind, p))

def paving_tree():
    vertices, faces = [], []
    bpy.context.view_layer.update()
    for ob in bpy.data.objects:
        if ob.type != 'MESH' or not ob.data.materials or not all(m.get('sunwenRole',m.name) == 'paving' for m in ob.data.materials):
            continue
        offset = len(vertices)
        vertices.extend(ob.matrix_world @ v.co for v in ob.data.vertices)
        faces.extend(tuple(offset+i for i in p.vertices) for p in ob.data.polygons)
    return BVHTree.FromPolygons(vertices, faces) if faces else None

rows = []
for scope in ['master', 'overview', 'overview-low']:
    if scope == 'master':
        bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'), load_ui=False, use_scripts=False)
    else:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(R/'public/models'/f'{scope}.glb'))
    tree = paving_tree()
    missing, inverted = [], []
    for edge, kind, p in samples:
        hit, normal, _, _ = tree.ray_cast(p+Vector((0,0,.15)), Vector((0,0,-1)), .30) if tree else (None, None, None, None)
        if hit is None:
            missing.append({'edge':edge, 'kind':kind, 'sample':list(p)})
        elif normal.z < .70:
            inverted.append({'edge':edge, 'sample':list(p), 'normalZ':normal.z})
    row = {'scope':scope, 'checks':len(samples), 'missing':len(missing), 'inverted':len(inverted), 'examples':(missing+inverted)[:12]}
    rows.append(row)
    print('ROUTE SURFACES', scope, row['checks'], 'missing', row['missing'], 'inverted', row['inverted'], flush=True)

report = {'method':'Downward rays at the authored road/arched bridge height, centre and ±32% width, at most 1.1m apart. Requires actual paving and upward normals; no terrain or bounding-box substitute.', 'heightToleranceM':.15, 'rows':rows, 'passed':all(r['missing']==0 and r['inverted']==0 for r in rows)}
suffix = '-before' if '--before' in sys.argv else ''
revision = layout['assetRevision'].rsplit('-',1)[-1]
(R/'reports/acceptance'/f'{revision}-route-surfaces{suffix}.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
if not report['passed']:
    raise RuntimeError('Missing or inverted walking surfaces; see the route surface report')

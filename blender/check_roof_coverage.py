"""Compare the published overview roof cover with the editable master.

Interior samples, away from eave edges, must still have a roof above them after
LOD. This detects lost cover surfaces, not just preserved bounding boxes.
"""
import bpy,json,math,sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1]
layout=json.loads((R/'config/garden.layout.json').read_text(encoding='utf-8'))
floors='--floors' in sys.argv
paving='--paving' in sys.argv
label='paving' if paving else 'floor' if floors else 'roof'
roles=['courtbase'] if paving else ['floorwood'] if floors else ['roof','tile','tilelight','tiledark']
spacing=1 if floors or paving else 2
margin=.025 if floors or paving else .28
tolerance=.05 if floors or paving else .75
def roof_tree(objects):
 vertices=[];faces=[];bpy.context.view_layer.update()
 for ob in objects:
  if ob.type!='MESH':continue
  if not ((not floors and not paving and ob.get('roof')) or (ob.data.materials and all(m.get('sunwenRole',m.name) in roles for m in ob.data.materials))):continue
  offset=len(vertices);vertices.extend(ob.matrix_world@v.co for v in ob.data.vertices)
  faces.extend(tuple(offset+i for i in face.vertices) for face in ob.data.polygons)
 return BVHTree.FromPolygons(vertices,faces) if faces else None
def hit(tree,x,y):
 return tree.ray_cast(Vector((x,y,100)),Vector((0,0,-1)),200)[0] if tree else None
bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
samples={}
for p in layout['places']:
 objects=list(bpy.data.objects[p['id']].children_recursive);tree=roof_tree(objects)
 if not tree:continue
 corners=[ob.matrix_world@Vector(v) for ob in objects if ob.type=='MESH' for v in ob.bound_box]
 x0,x1=min(v.x for v in corners),max(v.x for v in corners);y0,y1=min(v.y for v in corners),max(v.y for v in corners)
 own=[]
 for i in range(math.floor(x0),math.ceil(x1),spacing):
  for j in range(math.floor(y0),math.ceil(y1),spacing):
   x,y=i+.417,j+.631;point=hit(tree,x,y)
   if point is None:continue
   adjacent=[hit(tree,x+dx,y+dy) for dx,dy in [(-margin,0),(margin,0),(0,-margin),(0,margin)]]
   if any(v is None or abs(v.z-point.z)>1.1 for v in adjacent):continue
   own.append((x,y,point.z))
 samples[p['id']]=own
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(R/'public/models/overview-low.glb'))
# The browser composes the base overview and the architectural detail layer.
# Check the same delivered assembly, including the new entrance roofs.
details=R/'public/models/sunwen-architecture-low.glb'
if details.exists():bpy.ops.import_scene.gltf(filepath=str(details))
rows=[]
for pid,points in samples.items():
 roots=[o for o in bpy.data.objects if o.get('entityType')=='place' and o.get('placeId')==pid]
 tree=roof_tree([o for root in roots for o in root.children_recursive])
 missing=[]
 for x,y,z in points:
  point=hit(tree,x,y)
  if point is None or point.z<z-tolerance:missing.append({'point':[x,y,z],'overviewSurfaceZ':point.z if point else None})
 rows.append({'place':pid,'samples':len(points),'missingCover':len(missing),'examples':missing[:6]})
report={'scope':'Published overview '+label+' surfaces versus editable master','spacingM':spacing,'interiorEdgeMarginM':margin,'heightToleranceM':tolerance,'checks':sum(r['samples'] for r in rows),'missingCover':sum(r['missingCover'] for r in rows),'places':rows}
report['passed']=report['missingCover']==0
suffix='-before' if '--before' in sys.argv else ''
(R/'reports/acceptance'/(layout['assetRevision'].rsplit('-',1)[-1]+'-'+label+'-coverage'+suffix+'.json')).write_text(json.dumps(report,indent=2),encoding='utf-8')
print(label.upper()+' COVERAGE',report['checks'],'missing',report['missingCover'],flush=True)
if not report['passed']:raise RuntimeError('The overview loses structural surfaces; see the revision coverage report')

"""Check native lake coverage/holes against the reviewed plan, by actual rays."""
import bpy,json,sys,math,datetime
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
from spatial_world import in_water
layout=json.loads((R/'config/garden.layout.json').read_text(encoding='utf-8'))
bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
ob=bpy.data.objects.get('Reviewed_Lake_Surface');assert ob is not None,'Editable water surface missing'
bpy.context.view_layer.update();ev=ob.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh()
vertices=[ob.matrix_world@v.co for v in mesh.vertices];faces=[tuple(p.vertices) for p in mesh.polygons];tree=BVHTree.FromPolygons(vertices,faces)
rings=[layout['terrain']['lake']['outline']]+layout['terrain']['lake']['holes'];segments=[(a,b) for ring in rings for a,b in zip(ring,ring[1:]+ring[:1])]
def distance(x,y,a,b):
 dx,dy=b[0]-a[0],b[1]-a[1];t=max(0,min(1,((x-a[0])*dx+(y-a[1])*dy)/max(.001,dx*dx+dy*dy)))
 return math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)
count=wet=0;failures=[]
for y in range(-150,151,3):
 for x in range(-150,151,3):
  if min(distance(x,y,a,b) for a,b in segments)<.05:continue
  expected=in_water(layout,x,y);hit,_,_,_=tree.ray_cast(Vector((x,y,2)),Vector((0,0,-1)),4);actual=hit is not None;count+=1;wet+=int(expected)
  if actual!=expected or (hit is not None and abs(hit.z+.12)>.001):failures.append({'point':[x,y],'expectedWater':expected,'hit':list(hit) if hit else None})
ev.to_mesh_clear()
report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'revision':layout['assetRevision'],'checks':count,'wetSamples':wet,'failed':len(failures),'failures':failures[:25],'passed':not failures,'method':'3m grid vertical rays into evaluated native water mesh; expected inside/outside from reviewed rings; omit points within5cm of boundary; native water level must remain -0.12m.'}
revision=layout['assetRevision'].rsplit('-',1)[-1];(R/f'reports/acceptance/{revision}-native-water-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('NATIVE WATER COVERAGE',count,'failed',len(failures),flush=True)
assert not failures,'Native water coverage differs from reviewed lake/holes'

"""Verify the built land surface does not cover the reviewed walkable routes."""
import bpy, json, math, os, sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1]
mobile='--mobile' in sys.argv
if mobile:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath=str(R/'public/models/overview-low.glb'))
else:bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
layout=json.loads((R/'config/garden.layout.json').read_text(encoding='utf8'))
obs=[o for o in bpy.data.objects if o.type=='MESH' and (o.name.startswith('Mobile_landscape_earth') if mobile else o.name.startswith('landscape_earth') and any(c.name=='Garden_Landscape' for c in o.users_collection))]
assert obs,'Expected ground meshes are missing'
verts=[];faces=[];bpy.context.view_layer.update()
for ob in obs:
 ev=ob.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh();offset=len(verts)
 verts.extend(ob.matrix_world@v.co for v in mesh.vertices);faces.extend(tuple(i+offset for i in p.vertices) for p in mesh.polygons);ev.to_mesh_clear()
tree=BVHTree.FromPolygons(verts,faces)
nodes={n['id']:Vector(n['position']) for n in layout['pathNodes']};failures=[];overlaps=[];checks=0
for edge in layout['pathEdges']:
 if edge['kind'] not in ['path','stairs']:continue
 a,c=nodes[edge['from']],nodes[edge['to']];count=max(2,math.ceil((c-a).length/.8))
 for i in range(count+1):
  p=a.lerp(c,i/count);point,_,_,_=tree.ray_cast(Vector((p.x,p.y,250)),Vector((0,0,-1)),500)
  checks+=1
  if point is not None and point.z>p.z+.22:failures.append({'edge':edge['from']+' -> '+edge['to'],'position':list(p),'groundZ':point.z,'pathZ':p.z})
  if point is not None:
   lower,_,_,_=tree.ray_cast(point-Vector((0,0,.003)),Vector((0,0,-1)),500)
   if lower is not None:overlaps.append({'position':list(p),'top':point.z,'secondSurface':lower.z})
report={'scope':'published mobile overview' if mobile else 'editable Blender master','checks':checks,'passed':not failures and not overlaps,'sampleSpacingMaxM':.8,'groundClearanceToleranceM':.22,'failures':failures,'duplicateGroundSurfaceFailures':overlaps}
target=R/'reports/acceptance'/('terrain-paths-mobile.json' if mobile else 'terrain-paths.json');temp=target.with_suffix('.json.next');temp.write_text(json.dumps(report,indent=2),encoding='utf8');os.replace(temp,target)
print('BUILT TERRAIN PATH CHECK',checks,'height failures',len(failures),'duplicate ground surfaces',len(overlaps),failures[:3],overlaps[:3],flush=True)
assert not failures,'Terrain covers a walkable path; see terrain-paths.json'
assert not overlaps,'Overlapping ground layers can cause depth interference; see terrain-paths.json'

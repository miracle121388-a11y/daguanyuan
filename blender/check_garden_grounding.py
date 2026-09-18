"""Inspect saved root seating, visible planting geometry and protected scene data."""
import json,hashlib,sys,math
from pathlib import Path
import bpy
from mathutils import Matrix,Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];sys.path[:0]=[str(R/'blender'),str(R/'scripts')]
from sunwen_architecture import geometry_hash,ground_tree
from spatial_world import in_water
read=lambda p:json.loads((R/p).read_text())
layout=read('config/garden.layout.json');plan=read('assets/processed/grounding-r21/plan.json')
source=read('assets/processed/grounding-r21/baseline.json');report=read('reports/acceptance/r21-grounding.json')
design=read('config/garden.grounding.json');checks=[]
def check(ok,message):
    if not ok:raise AssertionError(message)
    checks.append(message)
bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
for name,expected in source['protected'].items():
    ob=bpy.data.objects[name]
    if name in source['plannedMoves']:
        original=ob.matrix_world.copy();ob.matrix_world=Matrix(source['plannedMoves'][name]['originalMatrix'])
    check(geometry_hash(ob)==expected,'Protected geometry: '+name)
    if name in source['plannedMoves']:ob.matrix_world=original
terrain=ground_tree();root_errors=[]
for root in plan['roots']:
    ob=bpy.data.objects[root['name']];x,y,z=ob.location
    check((ob.location-Vector(root['position'])).length<.001,'Native root: '+root['name'])
    hit=terrain.ray_cast(Vector((x,y,90)),Vector((0,0,-1)),180)[0]
    check(hit is not None and abs(z-hit.z)<.13,'Root terrain contact: '+root['name'])
    check(not in_water(layout,x,y),'Root on dry garden land: '+root['name'])
    root_errors.append(abs(z-hit.z))
surface=next(o for o in bpy.data.collections['Sunwen_Root_Gardens'].objects if o.get('groundingSurface'))
check(len(surface.data.polygons)>0,'Only required raised paving insets are retained')
check(surface.data.color_attributes.get('RootPigment') is not None,'Native ground has authored pigment variation')
for poly in surface.data.polygons:
    c=surface.matrix_world@poly.center
    check(not in_water(layout,c.x,c.y),'Surface stays on dry bank: '+str(poly.index))
check(all(r['companions']>0 for r in report['roots']),'Every crown has persistent low companions')
for r in report['focalRoots']:
    check(r['sourceObject'] in bpy.data.objects and r['companions']>0,'Built-in flowering tree has an integrated base: '+r['name'])
check(len(report['clumps'])<=design['underplantingLimit'],'Underplanting delivery budget')
check(not any(s.name.startswith('Temporary_Garden_LOD') for s in bpy.data.scenes),'No export scene remains in the saved master')
meta=read('public/textures/ground/garden-ground.webp.json')
check(meta['metrics']['rootsOnSoftGround']==len(plan['roots']),'Atlas covers all native roots')
check(meta['metrics']['builtInCourtRootsOnSoftGround']==len(plan['focalRoots']),'Atlas covers original courtyard flowering trees')
check(meta['rootPlanSha256']==hashlib.sha256((R/'assets/processed/grounding-r21/plan.json').read_bytes()).hexdigest(),'Atlas and native root-plan provenance agree')
lo,hi=design['softLandFraction']
check(lo<meta['metrics']['dryLandSoftFraction']<hi,'Balanced soft land and circulation, excluding lake')
result={'passed':len(checks),'protectedMeshes':len(source['protected']),'roots':len(plan['roots']),
        'maximumRootTerrainError':max(root_errors),'surfaceTriangles':len(surface.data.polygons),
        'underplantingClumps':len(report['clumps']),'builtInCourtRoots':len(plan['focalRoots']),'metrics':meta['metrics'],
        'masterSha256':hashlib.sha256((R/'blender/daguanyuan_master.blend').read_bytes()).hexdigest()}
(R/'reports/acceptance/r21-grounding-check.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('PASS GARDEN GROUNDING',json.dumps(result),flush=True)

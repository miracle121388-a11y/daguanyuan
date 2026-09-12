"""Apply the review's botanical/ground fixes without rebuilding approved architecture."""
import bpy,sys,json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
import build_modules as core
import refined_modules as arch
import spatial_world as world
from export_scene import export_selected
from baked_exports import export_baked
from publish_manifest import publish
layout=json.loads((R/'config/garden.layout.json').read_text(encoding='utf8'))
master=R/'blender/daguanyuan_master.blend';before=hashlib.sha256(master.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(master),load_ui=False,use_scripts=False)
protected=set(bpy.data.collections['Manual_Adjustments'].all_objects)
def identity(ob):
 return (tuple(v for row in ob.matrix_world for v in row),ob.data.as_pointer() if ob.data else None,tuple(c.name for c in ob.users_collection))
retained={o.name:identity(o) for o in bpy.data.objects}
transforms={o.name:tuple(v for row in o.matrix_world for v in row) for o in bpy.data.collections['Reference_Living_Trees'].objects}
import reference_craft,r5_craft,r6_architecture,r7_architecture,r8_architecture,r8_materials,r12_architecture
for module in [reference_craft,r5_craft,r6_architecture,r7_architecture,r8_architecture,r8_materials,r12_architecture]:module.install()
import focal_botany,court_planting,r12_botany
focal_botany.material_setup();core.M={m.name:m for m in bpy.data.materials}
accepted={'leaf','lightleaf','leafdark','bamboo','bark','flower','creamflower','canopy','canopy_light','canopy_shadow','canopy_gold','moss'}
def botanical(mat):return mat in accepted or mat.startswith('botanical_')
class FocalBatch(core.Batch):
 def mesh(self,mat,verts,faces,uvs=None):
  if botanical(mat) or mat=='litter':super().mesh(mat,verts,faces,uvs)
 # Skip expensive source stones/architecture while collecting only plant parts.
arch.perforated_rock=lambda *args,**kwargs:None
r12_botany.herb_patch=lambda *args,**kwargs:None
changed=[]
for p in layout['places']:
 if p['id'] not in ['xiaoxiangguan','yihongyuan','hengwuyuan','qiushuangzhai']:continue
 root=bpy.data.objects[p['id']];col=bpy.data.collections['Place_'+p['id']]
 removed=[]
 for ob in list(root.children):
  if ob.type=='MESH' and ob not in protected and (ob.get('focalReviewPatch') or (ob.data.materials and all(botanical(m.name) for m in ob.data.materials))):removed.append(ob.name);retained.pop(ob.name);bpy.data.objects.remove(ob,do_unlink=True)
 b=FocalBatch(p['id']+'_focal',col,root);world.courtyard(b,p['style']);new=b.finish()
 for ob in new:
  ob['focalReviewPatch']=True
  for f in ob.data.polygons:f.use_smooth=True
 changed.append({'place':p['id'],'removed':removed,'newMeshes':[o.name for o in new]})
root=bpy.data.objects['daguanlou'];col=bpy.data.collections['Place_daguanlou']
for ob in list(root.children):
 if ob.get('focalReviewPatch') and ob not in protected:retained.pop(ob.name);bpy.data.objects.remove(ob,do_unlink=True)
b=FocalBatch('daguanlou_ground',col,root);court_planting.add_court(b,'daguanlou')
for ob in b.finish():ob['focalReviewPatch']=True
col=bpy.data.collections['Garden_Landscape']
for ob in list(col.objects):
 if ob.get('focalReviewPatch') and ob not in protected:retained.pop(ob.name);bpy.data.objects.remove(ob,do_unlink=True)
b=FocalBatch('shore_ground',col);court_planting.add_shore(b,layout)
for ob in b.finish():ob['focalReviewPatch']=True
bpy.context.view_layer.update()
assert all(tuple(v for row in bpy.data.objects[name].matrix_world for v in row)==matrix for name,matrix in transforms.items())
assert all(name in bpy.data.objects and identity(bpy.data.objects[name])==value for name,value in retained.items()),'An unrelated object, data link, transform or collection changed'
objects=list({o for c in bpy.data.collections if c.name.startswith('Place_') or c.name in ['Garden_Landscape','Manual_Adjustments'] for o in c.all_objects})
bpy.ops.wm.save_as_mainfile(filepath=str(master))
for p in layout['places']:
 root=bpy.data.objects[p['id']];position=root.location.copy();root.location=(0,0,0);bpy.context.view_layer.update();export_selected(R/'public/models/places'/f'{p["id"]}.glb',[root]+list(root.children_recursive));root.location=position
if '--botanical-only' in sys.argv:
 from export_botanical_patch import export_patch
 export_patch(objects,layout)
else:export_baked(objects,layout)
publish(layout)
short='r'+layout['assetRevision'].split('-r')[-1]
(R/f'reports/acceptance/{short}-focal-rebuild.json').write_text(json.dumps({'beforeMaster':before,'afterMaster':hashlib.sha256(master.read_bytes()).hexdigest(),'preservedExistingPlantTransforms':len(transforms),'retainedObjectIdentities':len(retained),'protectedManualObjects':len(protected),'changed':changed,'scope':'Botanical meshes and connected planted beds only; existing architecture, anchor IDs, water and road coordinates preserved.'},indent=2),encoding='utf8')
print('FOCAL LANDSCAPE FIX EXPORTED',flush=True)

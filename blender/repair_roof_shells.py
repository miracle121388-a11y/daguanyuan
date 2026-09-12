"""Preserve generated roof cover without touching manual objects or placement."""
import bpy,bmesh,sys,json
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
from export_scene import export_selected
from baked_exports import export_baked
from publish_manifest import publish
bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
layout=json.loads((R/'config/garden.layout.json').read_text(encoding='utf-8'))
objects=list({o for c in bpy.data.collections if c.name.startswith('Place_') or c.name in ['Garden_Landscape','Manual_Adjustments'] for o in c.all_objects})
records=[]
for ob in objects:
 if ob.type!='MESH' or any(c.name=='Manual_Adjustments' for c in ob.users_collection):continue
 if not ob.data.materials or not all(m.name=='roof' for m in ob.data.materials):continue
 before=len(ob.data.vertices);bm=bmesh.new();bm.from_mesh(ob.data)
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001);bm.to_mesh(ob.data);bm.free();ob.data.update();ob['roofShell']=True
 records.append({'mesh':ob.name,'verticesBefore':before,'verticesAfter':len(ob.data.vertices)})
for p in layout['places']:
 root=bpy.data.objects[p['id']];position=root.location.copy();root.location=(0,0,0);bpy.context.view_layer.update()
 export_selected(R/'public/models/places'/f'{p["id"]}.glb',[root]+list(root.children_recursive))
 root.location=position
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'))
export_baked(objects,layout);publish(layout)
(R/'reports/acceptance/r8-roof-shell-repair.json').write_text(json.dumps({'method':'Weld coincident generated roof-shell vertices; exclude structural shell from both mobile and overview decimation; keep independent roof flags and source PBR. Place/route/water positions and Manual_Adjustments unchanged.','meshes':records},indent=2),encoding='utf-8')
print('ROOF SHELLS PRESERVED',len(records),flush=True)

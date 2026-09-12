"""Resume from the saved editable geometry using the current baked swatch pixels."""
import bpy,sys,json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
from export_scene import export_selected
from baked_exports import export_baked
from publish_manifest import publish
config=json.loads((R/'config/craft.materials.json').read_text(encoding='utf-8'));revision=config['revision']
layout=json.loads((R/'config/garden.layout.json').read_text(encoding='utf-8'))
bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
records=[]
for role in config['materials']:
 material=bpy.data.materials.get(role)
 if not material or not material.use_nodes:continue
 for node in material.node_tree.nodes:
  if node.type!='TEX_IMAGE' or not node.image:continue
  channel=next((c for c in ['diff','nor_gl','rough'] if Path(bpy.path.abspath(node.image.filepath)).name==f'{role}_{c}.png'),None)
  if channel is None:continue
  path=R/f'assets/processed/materials-{revision}'/f'{role}_{channel}.png'
  image=bpy.data.images.load(str(path),check_existing=False);image.colorspace_settings.name='sRGB' if channel=='diff' else 'Non-Color';image.name=f'{revision}_{role}_{channel}';image.pack();node.image=image
  records.append({'role':role,'channel':channel,'file':path.relative_to(R).as_posix(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
 material['craftSurface']=revision
objects=list({o for c in bpy.data.collections if c.name.startswith('Place_') or c.name in ['Garden_Landscape','Manual_Adjustments'] for o in c.all_objects})
for p in layout['places']:
 root=bpy.data.objects[p['id']];position=root.location.copy();root.location=(0,0,0);bpy.context.view_layer.update()
 export_selected(R/'public/models/places'/f'{p["id"]}.glb',[root]+list(root.children_recursive));root.location=position
bpy.context.view_layer.update();bpy.ops.wm.save_as_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'))
export_baked(objects,layout);publish(layout)
(R/'reports/acceptance'/f'{revision}-refreshed-surfaces.json').write_text(json.dumps({'method':'Fresh image datablocks loaded from the current swatch files, packed into the saved master and used for both detailed and baked exports. Geometry and Manual_Adjustments preserved.','files':records},indent=2),encoding='utf-8')
print('CURRENT CRAFT PIXELS EXPORTED',len(records),flush=True)

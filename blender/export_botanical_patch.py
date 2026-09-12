"""Export planting while reusing the existing baked architecture mesh arrays."""
import bpy,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from mobile_export import build_mobile
from export_scene import export_selected
R=Path(__file__).resolve().parents[1]

def export_patch(objects,layout):
 accepted=('leaf','lightleaf','canopy','bark','bamboo','flower','creamflower','moss','botanical_')
 plants=[o for o in objects if o.type=='MESH' and o.data.materials and all(m.name.startswith(accepted) for m in o.data.materials)]
 col=bpy.data.collections.new('Temporary_Botanical_Export');bpy.context.scene.collection.children.link(col)
 low=build_mobile(plants,col,ratio=.24,split_roof=True,defer_bake=True)
 short='r'+layout['assetRevision'].split('-r')[-1]
 root=R/f'assets/processed/botanical-patch-{short}';root.mkdir(parents=True,exist_ok=True)
 roots=[o for o in objects if o.type=='EMPTY' and o.get('entityType')=='place']
 for p in layout['places']:
  place=next(o for o in roots if o.get('placeId')==p['id']);position=place.location.copy();place.location=(0,0,0);bpy.context.view_layer.update()
  export_selected(root/(p['id']+'.glb'),[place]+[o for o in low if o.parent==place]);place.location=position
 for ob in low:
  if len(ob.data.polygons)>500:
   md=ob.modifiers.new('BotanicalOverview','DECIMATE');md.ratio=.001 if ob.name.endswith('_botanical_stem') else .010 if ob.get('focalBotany') else .10
 # Fine stems are subpixel in the whole-garden camera. Keep every stem in
 # the just-exported near partitions, with leaf mass in the far representation.
 far=[o for o in low if not all(m.name=='botanical_stem' for m in o.data.materials)]
 bpy.context.view_layer.update();export_selected(root/'overview.glb',far+roots)
 for ob in low:bpy.data.objects.remove(ob,do_unlink=True)
 bpy.data.collections.remove(col)
 print('BOTANICAL PATCHES EXPORTED',len(plants),flush=True)

if __name__=='__main__':
 import json
 bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
 layout=json.loads((R/'config/garden.layout.json').read_text(encoding='utf8'))
 objects=list({o for c in bpy.data.collections if c.name.startswith('Place_') or c.name in ['Garden_Landscape','Manual_Adjustments'] for o in c.all_objects})
 export_patch(objects,layout)

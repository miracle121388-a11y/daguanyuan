"""Reproducible low detail partitions and a shared baked whole-garden overview."""
import bpy,shutil,os
from pathlib import Path
from mobile_export import build_mobile
from bake_material_atlas import bake_group
from export_scene import export_selected
R=Path(__file__).resolve().parents[1]
def export_baked(objects,layout):
 lowcol=bpy.data.collections.new('Temporary_Low_Export');bpy.context.scene.collection.children.link(lowcol)
 low=build_mobile(objects,lowcol,ratio=.24,split_roof=True,defer_bake=True)
 bake_group(low)
 for p in layout['places']:
  root=next(o for o in objects if o.type=='EMPTY' and o.get('placeId')==p['id'] and o.get('entityType')=='place')
  own=[o for o in low if o.parent==root];anchors=[o for o in objects if o.type=='EMPTY' and o.parent==root]
  position=root.location.copy();root.location=(0,0,0);bpy.context.view_layer.update()
  export_selected(R/'public/models/places-low'/f'{p["id"]}.glb',[root]+anchors+own)
  root.location=position
 for ob in low:
  if ob.type=='MESH' and len(ob.data.polygons)>500 and not ob.get('roofShell') and not ob.get('floorSurface') and not ob.get('pavingSurface'):
   md=ob.modifiers.new('BakedOverviewLOD','DECIMATE')
   md.ratio=.66 if ob.get('gardenStone') else (.10 if ob.name.endswith('_plants') else .55 if ob.name.endswith('_earth') else .64 if ob.name.endswith('_limestone') else 1 if ob.name.endswith('_bankstone') else .30) if ob.name.startswith('Mobile_landscape') else .06 if ob.get('roof') else .10
   if ob.get('focalBotany'):md.ratio=.001 if ob.name.endswith('_botanical_stem') else .010
 bpy.context.view_layer.update()
 far=[o for o in low if not (o.type=='MESH' and o.data.materials and all(m.name=='botanical_stem' for m in o.data.materials))]
 export_selected(R/'public/models/overview-low.glb',far+[o for o in objects if o.type=='EMPTY'])
 shutil.copyfile(R/'public/models/overview-low.glb',R/'public/models/overview.next.glb');os.replace(R/'public/models/overview.next.glb',R/'public/models/overview.glb')
 for ob in low:bpy.data.objects.remove(ob,do_unlink=True)
 bpy.data.collections.remove(lowcol)

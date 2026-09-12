"""Bake local ambient occlusion into detailed mesh color attributes.

Source UVs/PBR remain intact. Contact color travels with each editable mesh and
costs no extra texture download. Only selected inspection rooms use this pass.
"""
import bpy
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
RECORDS=[]
def bake_contact(objects,place_id):
 if place_id not in ['xiaoxiangguan','daguanlou','daguanyuan_gate']:return
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16
 scene.render.threads_mode='FIXED';scene.render.threads=8
 visible=set(objects);old={ob:ob.hide_render for ob in scene.objects}
 try:
  for ob in scene.objects:
   if ob.type=='MESH':ob.hide_render=ob not in visible
  for ob in objects:
   if ob.type!='MESH' or not ob.data.materials:continue
   mat=ob.data.materials[0]
   if mat.name not in ['wood','darkwood','latticewood','floorwood','furniture','plaster','cutstone','paper','bookcover','bookcloth','ceramic']:continue
   # Bake to the actual final surface; applying this generated bevel is safe.
   bpy.ops.object.select_all(action='DESELECT');ob.hide_set(False);ob.select_set(True);bpy.context.view_layer.objects.active=ob
   for mod in list(ob.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
   attr=ob.data.color_attributes.new(name='ContactAO',type='BYTE_COLOR',domain='CORNER');ob.data.color_attributes.active_color=attr
   bpy.ops.object.bake(type='AO',target='VERTEX_COLORS')
   # Retain contact in vertex color; directional light and its shadows remain live.
   lowest=1.0
   for item in attr.data:
    occlusion=max(0,min(1,item.color[0]));value=.32+.68*occlusion;lowest=min(lowest,value);item.color=(value,value,value,1)
   ob['bakedContactAO']=True
   RECORDS.append({'place':place_id,'mesh':ob.name,'corners':len(attr.data),'minimum':lowest,'samples':16})
   print('DETAIL CONTACT',place_id,mat.name,len(attr.data),round(lowest,3),flush=True)
 finally:
  for ob,hidden in old.items():ob.hide_render=hidden
 (R/'reports/acceptance/r10-detail-contact.json').write_text(json.dumps(RECORDS,indent=2),encoding='utf-8')

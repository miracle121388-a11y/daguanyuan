"""Rebuild the editable master and semantic GLBs from the unified reference layout."""
import bpy,sys,json,math
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
import build_modules as core
import refined_modules as arch
import spatial_world as world
from export_scene import export_selected,manifest
layout=json.loads((R/'config/garden.layout.json').read_text(encoding='utf8'))
manual=bpy.data.collections.get('Manual_Adjustments');protected_collections=set();protected_objects=set()
def preserve_collection(col):
 protected_collections.add(col);protected_objects.update(col.objects)
 for child in col.children:preserve_collection(child)
if manual:preserve_collection(manual)
for c in list(bpy.data.collections):
 if c in protected_collections:continue
 for o in list(c.objects):
  if o not in protected_objects:bpy.data.objects.remove(o,do_unlink=True)
 bpy.data.collections.remove(c)
if 'Manual_Adjustments' not in bpy.data.collections:bpy.context.scene.collection.children.link(bpy.data.collections.new('Manual_Adjustments'))
from reference_vegetation import populate_master
from source_crowns import build_all
prototype=build_all()
import reference_craft
reference_craft.install()
import r5_craft
r5_craft.install()
import r6_architecture
r6_architecture.install()
import r7_architecture
r7_architecture.install()
import r8_architecture
r8_architecture.install()
import r8_materials
r8_materials.install()
from r9_landscape import install_edges
install_edges()
import r9_understory
r9_understory.build_all()
import r12_landscape
r12_landscape.install()
import r12_architecture
r12_architecture.install()
for mat in list(bpy.data.materials):
 if mat.name in core.PALETTE and mat.use_nodes:
  bs=mat.node_tree.nodes.get('Principled BSDF')
  for node in list(mat.node_tree.nodes):
   if node.type=='TEX_IMAGE':mat.node_tree.nodes.remove(node)
core.M=None
def collection(name):
 c=bpy.data.collections.new(name);c['generated']=True;bpy.context.scene.collection.children.link(c);return c
objects=[]
for p in layout['places']:
 c=collection('Place_'+p['id']);root=bpy.data.objects.new(p['id'],None);c.objects.link(root);root['placeId']=p['id'];root['entityType']='place';root['spatialInterpretation']='interpretive';root['referenceWorld']='20260910'
 b=core.Batch(p['id'],c,root);style=p['style']
 if style in ['bamboo','flower','herb','study']:world.courtyard(b,style)
 elif style=='tower':world.tower(b)
 elif style=='temple':world.temple(b)
 elif style=='painting':world.painting(b)
 elif style=='gate':
  arch.hall(b,0,0,23,7,5.3,openhall=True,bays=5)
  for x in [-13,13]:b.box('stone',(x,-5,.55),(1.8,1.8,1.1));core.rock(b,x,-5,.7,11)
 elif style=='rockery':
  arch.perforated_rock(b,2,3,2.2,33);world.pine(b,8,5,1.2,33)
 elif style=='farm':arch.farm(b)
 elif style=='waterside':world.waterhall(b)
 elif style=='reeds':arch.reeds_house(b)
 elif style in ['hill','moon']:
  arch.hall(b,0,4,19 if style=='hill' else 17,9,4.7 if style=='hill' else 3.3,openhall=True,rolled=style=='moon')
  world.pine(b,-12,8,1.1,39);world.tree(b,12,5,1.1,seed=37)
  for x in [-11,11]:world.rail(b,(x,-6,.3),(x,9,.3),stone=True)
 elif style=='pavilion':
  b.rod('stone',(0,0,-.7),(0,0,.6),5,8)
  for i in range(8):
   a=i*math.tau/8;x=4.0*math.cos(a);y=4.0*math.sin(a);b.rod('wood',(x,y,.6),(x,y,4.8),.16,8);world.lantern(b,x,y,4.15,.55)
  arch.roof(b,0,0,4.9,8.5,8.5,2.6);world.tree(b,-6,4,.9,seed=5)
 if style not in ['waterside','rockery','pavilion']:world.garden_path(b,tuple(p['entrance']),(0,-13 if style in ['bamboo','flower','herb','study','temple'] else 2 if style=='moon' else -4,.21),2.8)
 parts=b.finish()
 for ob in parts:
  if ob.type=='MESH' and any(m.name.startswith(('canopy','leaf','flower','creamflower','bark')) for m in ob.data.materials):
   for face in ob.data.polygons:face.use_smooth=True
 for h in p['hotspots']:
  ob=bpy.data.objects.new(h['id'],None);c.objects.link(ob);ob.parent=root;ob.location=h['position'];ob['hotspotId']=h['id'];ob['placeId']=p['id'];parts.append(ob)
 from bake_detail_contact import bake_contact
 bake_contact(parts,p['id'])
 export_selected(R/'public/models/places'/f'{p["id"]}.glb',[root]+parts)
 root.location=p['position'];objects.extend([root]+parts)
 print('REFERENCE PLACE',p['id'],flush=True)
c=collection('Garden_Landscape');b=core.Batch('landscape',c);world.terrain(b,layout);environment=b.finish()
for ob in environment:
 if any(m.name.startswith(('canopy','leaf','flower','creamflower','earth','bark')) for m in ob.data.materials):
  for face in ob.data.polygons:face.use_smooth=True
objects+=environment+list(bpy.data.collections['Manual_Adjustments'].all_objects)
vegetation=populate_master(prototype,world.TREE_POINTS,layout)
from r7_ground_cover import populate as populate_ground_cover
populate_ground_cover(world.GROUND_COVER)
r9_understory.populate(layout)
from native_water import build as build_native_water
build_native_water(layout)
for mat in bpy.data.materials:
 if not mat.use_nodes:continue
 bs=mat.node_tree.nodes.get('Principled BSDF')
 if bs and mat.name!='Native_Pond_Water':
  bs.inputs['Roughness'].default_value=.76 if mat.name in ['wood','darkwood'] else .28 if mat.name in ['ceramic','glass'] else .86
  if mat.name=='gold':bs.inputs['Metallic'].default_value=.55
bpy.ops.wm.save_as_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'))
from baked_exports import export_baked
export_baked(objects,layout)

from publish_manifest import publish
publish(layout)
print('REFERENCE WORLD COMPLETE',len(objects),flush=True)

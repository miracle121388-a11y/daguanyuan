"""Publish the manifest from the editable master's actual planting transforms."""
import bpy,json,os
from mathutils import Vector
from pathlib import Path
from export_scene import manifest
R=Path(__file__).resolve().parents[1]
def publish(layout):
 vegetation=[]
 # 0.1mm placement precision retains more than the delivered GLB quantization.
 # Avoid sending long binary-float tails for thousands of repeated plants.
 precise=lambda values:[round(float(v),4) for v in values]
 source_ids=['island_tree_01','island_tree_02','pine_sapling_small']
 for tree in sorted(bpy.data.collections['Reference_Living_Trees'].objects,key=lambda o:o.name):
  if tree.get('urbanRetired'):continue
  x,y,z=tree.location;sx,sy,sz=tree.scale
  vegetation.append({'position':precise([x,z,-y]),'scale':precise([sx,sz,sy]),'rotation':round(tree.rotation_euler.z,5),'species':int(tree['sunwenSpecies']) if 'sunwenSpecies' in tree else 3 if tree.get('plantingLayer')=='understorey' else source_ids.index(tree['sourceAsset'])})
 m=manifest(layout);m.update(version=3,assetRevision=layout['assetRevision'],overviewCamera=layout['overviewCamera'],referenceImages='art/manifest.json',referenceWorld='20260910',vegetation=vegetation,spatialBasis=layout['spatialBasis'],boundary=layout['terrain']['boundary'])
 m['groundCover']=[{'position':precise([ob.location.x,ob.location.z,-ob.location.y]),'scale':round(ob.scale.x,4),'rotation':round(ob.rotation_euler.z,5)} for ob in sorted(bpy.data.collections['Reference_Ground_Cover'].objects,key=lambda o:o.name)]
 m['understory']=[{'position':precise([ob.location.x,ob.location.z,-ob.location.y]),'scale':round(ob.scale.x,4),'rotation':round(ob.rotation_euler.z,5),'species':ob['species'],'placeId':ob.get('placeId','')} for ob in sorted(bpy.data.collections['Reference_Understory'].objects,key=lambda o:o.name)]
 if 'Reference_Sunwen_Planting' in bpy.data.collections:
  m['sunwenPlanting']=[{'position':precise([o.location.x,o.location.z,-o.location.y]),'scale':round(o.scale.x,4),'rotation':round(o.rotation_euler.z,5),'kind':o['kind'],'placeId':o.get('placeId','')} for o in sorted(bpy.data.collections['Reference_Sunwen_Planting'].objects,key=lambda o:o.name)]
  m['visualReference']={'artist':'孙温','work':'红楼梦绘本','repository':'https://github.com/changren-wcr/sunwen','commit':'9e9352d51a5f4a7006f77946ee8ace29d427a937','interpretation':'绘本色彩与园林疏密的三维转译；不作为原著空间实测证据。'}
 m['plantingPrecisionMetres']=.0001
 if (R/'public/architecture-scenes.json').exists():
  architecture=json.loads((R/'public/architecture-scenes.json').read_text())
  m['architecturalScenes']=architecture['scenes']
  m['architecturalCharacters']={row['placeId']:{'profile':row['profile'],'motif':row['motif'],'features':row['features']} for row in architecture['records']}
 # Focus cameras use the actual editable assembly, including its entrance,
 # rear court and roof height, rather than a guessed symmetric footprint.
 bpy.context.view_layer.update()
 for p in m['places']:
  root=bpy.data.objects[p['id']]
  corners=[ob.matrix_world@Vector(v) for ob in root.children_recursive if ob.type=='MESH' for v in ob.bound_box]
  if not corners:raise ValueError('Missing place geometry: '+p['id'])
  web=[(v.x,v.z,-v.y) for v in corners]
  p['boundingBox']={'min':[min(v[i] for v in web) for i in range(3)],'max':[max(v[i] for v in web) for i in range(3)]}
 temp=R/'public/scene-manifest.next';temp.write_text(json.dumps(m,ensure_ascii=False,separators=(',',':')),encoding='utf8');os.replace(temp,R/'public/scene-manifest.json')
 print('MANIFEST PUBLISHED',layout['assetRevision'],len(vegetation),'actual master tree transforms',flush=True)

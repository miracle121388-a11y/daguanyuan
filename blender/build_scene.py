import bpy,sys,json,random,math
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
from build_modules import Batch,courtyard,hall,roof,tree,bamboo,rock,wall,fence,path
from refined_modules import courtyard,hall,roof,tree,bamboo,farm,reeds_house
from export_scene import export_selected,manifest
from import_assets import import_rock
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
sample='--sample' in args
layout=json.loads((R/'config/garden.layout.json').read_text(encoding='utf-8'))
if sample:layout['places']=[p for p in layout['places'] if p['id']=='xiaoxiangguan'];layout['places'][0]['position']=[0,0,0]
# Preserve only explicit artist edit collections on rebuild. Never execute embedded scripts.
for c in list(bpy.data.collections):
 if c.name!='Manual_Adjustments':
  for o in list(c.objects):bpy.data.objects.remove(o,do_unlink=True)
  bpy.data.collections.remove(c)
if 'Manual_Adjustments' not in bpy.data.collections:bpy.context.scene.collection.children.link(bpy.data.collections.new('Manual_Adjustments'))
def col(name):
 c=bpy.data.collections.new(name);c['generated']=True;bpy.context.scene.collection.children.link(c);return c
assetcol=col('Source_Assets');source_rock=import_rock(assetcol)
roots=[];all_objects=[]
for p in layout['places']:
 c=col('Place_'+p['id']);root=bpy.data.objects.new(p['id'],None);c.objects.link(root);root['placeId']=p['id'];root['entityType']='place';root['spatialInterpretation']='interpretive'
 b=Batch(p['id'],c,root);style=p['style']
 if p['featured']:courtyard(b,style)
 elif style=='gate':
  hall(b,0,0,22,7,h=5,openhall=True,bays=5);wall(b,(-22,0),(-12,0),3);wall(b,(12,0),(22,0),3)
  for x in [-13,13]:b.box('stone',(x,-6,.7),(2,2,1.3));rock(b,x,-6,.6,42)
 elif style=='rockery':
  for i in range(10):rock(b,math.sin(i*1.8)*8,math.cos(i*1.8)*5,1.2+(i%3)*.35,i)
  for a,cc in zip([(-3,-16,.3),(2,-9,.3),(-2,-4,.3),(3,2,.3)],[(2,-9,.3),(-2,-4,.3),(3,2,.3),(0,9,.3)]):path(b,a,cc)
  tree(b,-9,4,1.4,seed=3)
 elif style=='farm':
  farm(b)
 elif style in ['waterside','moon']:
  b.box('stone',(0,1,.2),(22,16,.5));hall(b,0,4,17,7,h=3.5,openhall=True)
  for a,cc in [((-11,-7),(-3,-7)),((3,-7),(11,-7))]:fence(b,a,cc)
  if style=='waterside':roof(b,-10,-1,3.3,3,10,1.5);roof(b,10,-1,3.3,3,10,1.5)
 elif style=='pavilion':
  b.rod('stone',(0,0,-.3),(0,0,.7),6,8)
  for i in range(8):
   a=i*math.tau/8;x=4.5*math.cos(a);y=4.5*math.sin(a);b.rod('wood',(x,y,.6),(x,y,5),.2)
  for j in range(2):
   z=5+j*1.9;r=6-j*1.9;verts=[(0,0,z+2.5)]+[(math.cos(i*math.tau/8)*r,math.sin(i*math.tau/8)*r,z+.25) for i in range(8)]
   b.mesh('roof',verts,[(0,i+1,(i+1)%8+1) for i in range(8)])
   for i in range(8):b.rod('tile',verts[0],verts[i+1],.1)
 elif style=='reeds':
  reeds_house(b)
 elif style=='hill':
  hall(b,0,4,18,8,h=4.4,openhall=True)
  for i in range(5):b.box('stone',(0,-10-i*1.2,-i*.7),(5,1.3,.7))
  tree(b,-13,4,1.4,seed=6);tree(b,11,7,1.2,seed=7)
 path(b,(0,-16,.25),(0,-13 if p['featured'] else -3,.25),2.8,style in ['pavilion','waterside'])
 objs=b.finish()
 for h in p['hotspots']:
  ob=bpy.data.objects.new(h['id'],None);c.objects.link(ob);ob.parent=root;ob.location=h['position'];ob['hotspotId']=h['id'];ob['placeId']=p['id'];objs.append(ob)
 if source_rock and style in ['herb','rockery','bamboo']:
  ob=source_rock.copy();ob.data=source_rock.data.copy();c.objects.link(ob);ob.parent=root;ob.hide_render=False;ob.hide_set(False);ob.location=(-6,-1,.1)
  maxdim=max(ob.dimensions);ob.scale=tuple(s*4/maxdim for s in ob.scale);ob.data.materials.clear();ob.data.materials.append(bpy.data.materials['stone']);objs.append(ob)
 # Partition root transforms are identity; placement happens exactly once in browser.
 export_selected(R/'public/models/places'/f"{p['id']}.glb",[root]+objs)
 # Mobile partitions retain the same semantic roots and origins with a smaller mesh budget.
 mobilemods=[]
 for ob in objs:
  if ob.type=='MESH' and len(ob.data.polygons)>300:
   modifier=ob.modifiers.new('Mobile_Detail','DECIMATE');modifier.ratio=.32;mobilemods.append((ob,modifier))
 bpy.context.view_layer.update()
 export_selected(R/'public/models/places-low'/f"{p['id']}.glb",[root]+objs)
 for ob,modifier in mobilemods:ob.modifiers.remove(modifier)
 root.location=p['position'];roots.append(root);all_objects.extend([root]+objs)
 print('BUILT PLACE',p['id'],flush=True)
if not sample:
 c=col('Garden_Landscape');b=Batch('landscape',c)
 # A continuous oval terrain mesh with a real hole for the lake.
 n=112;vs=[]
 for r in [0,1]:
  for i in range(n):
   a=i*math.tau/n
   vs.append((34*math.cos(a),14+53*math.sin(a),-.12) if r==0 else (135*math.cos(a),122*math.sin(a),-.14))
 b.mesh('earth',vs,[(i+n,(i+1)%n+n,(i+1)%n,i) for i in range(n)])
 # Earth cut edge of the garden model.
 for i in range(n):
  a=i*math.tau/n;c2=(i+1)*math.tau/n;b.mesh('stone',[(135*math.cos(a),122*math.sin(a),-.14),(135*math.cos(c2),122*math.sin(c2),-.14),(135*math.cos(c2),122*math.sin(c2),-2.8),(135*math.cos(a),122*math.sin(a),-2.8)],[(0,1,2,3)])
 for i in range(n):
  a=i*math.tau/n;rock(b,34.8*math.cos(a),14+53.8*math.sin(a),.35+(i%4)*.035,i)
 nd={n['id']:n['position'] for n in layout['pathNodes']}
 for e in layout['pathEdges']:path(b,nd[e['from']],nd[e['to']],3,e['kind']=='bridge')
 rng=random.Random(layout['seed'])
 # Dense grove pockets, excluding structures, paths and water.
 for i in range(440):
  x=rng.uniform(-119,119);y=rng.uniform(-104,104)
  if (x/119)**2+(y/104)**2>1 or (x/40)**2+((y-14)/59)**2<1:continue
  if any(abs(x-p['position'][0])<21 and -20<y-p['position'][1]<24 for p in layout['places']):continue
  if any(p['featured'] and -20<x-p['position'][0]<38 and -45<y-p['position'][1]<-17 for p in layout['places']):continue
  def distseg(a,c):
   dx,dy=c[0]-a[0],c[1]-a[1];t=max(0,min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));return math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)
  if any(distseg(nd[e['from']],nd[e['to']])<3.8 for e in layout['pathEdges']):continue
  tree(b,x,y,rng.uniform(.7,1.3),i%13==0,i,willow=i%7==0)
 # Low hills wrap the north-east pavilion while keeping access stair clear.
 for x,y,s in [(82,74,9),(91,70,7),(76,79,8)]:b.ellipsoid('earth',(x,y,0),(s,s,5),int(x),rings=5,n=12)
 all_objects+=b.finish()
else:
 c=col('Sample_Ground');b=Batch('sample_ground',c);b.box('earth',(0,0,-.3),(48,44,.4));all_objects+=b.finish()
# Master remains detailed; lightweight overview decimation is applied temporarily per mesh.
all_objects+=list(bpy.data.collections['Manual_Adjustments'].all_objects)
bpy.context.scene.world.color=(.7,.75,.68)
bpy.ops.wm.save_as_mainfile(filepath=str(R/'blender'/('xiaoxiangguan_sample.blend' if sample else 'daguanyuan_master.blend')))
mods=[]
for o in all_objects:
 if o.type=='MESH' and len(o.data.polygons)>800:
  mod=o.modifiers.new('Overview_LOD','DECIMATE');mod.ratio=.48;mods.append((o,mod))
export_selected(R/'public/models'/('sample.glb' if sample else 'overview.glb'),all_objects)
for o,m in mods:o.modifiers.remove(m)
if not sample:
 # Low quality consolidates world-space geometry by material while retaining
 # semantic roots and hotspots. Dedicated browser proxies preserve picking.
 from mobile_export import build_mobile
 lowcol=col('Temporary_Low_Export');lowobjects=build_mobile(all_objects,lowcol)
 emptyobjects=[o for o in all_objects if o.type=='EMPTY']
 export_selected(R/'public/models/overview-low.glb',lowobjects+emptyobjects)
 for o in lowobjects:bpy.data.objects.remove(o,do_unlink=True)
 bpy.data.collections.remove(lowcol)
if sample:
 m=manifest(layout);m['overview']='models/sample.glb';m['overviewCamera']={'position':[38,32,43],'target':[0,1,0]};m['pathNodes']=[];m['pathEdges']=[]
 (R/'public/scene-manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf-8')
else:(R/'public/scene-manifest.json').write_text(json.dumps(manifest(layout),ensure_ascii=False,indent=2),encoding='utf-8')
print('SCENE COMPLETE',len(all_objects),flush=True)

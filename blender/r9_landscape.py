"""Source-shaped stones and restrained small leaves; locations stay interpretive."""
import bpy,math
from pathlib import Path
from mathutils import Vector
import build_modules as core
R=Path(__file__).resolve().parents[1]

def install_rocks():
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(R/'assets/source/rock_moss_set_01/rock_moss_set_01.gltf'))
 imported=[o for o in bpy.data.objects if o not in before]
 choices=sorted([o for o in imported if o.type=='MESH'],key=lambda o:o.name)
 templates=[]
 for ob in choices:
  bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
  mod=ob.modifiers.new('Rock silhouette LOD','DECIMATE');mod.ratio=min(1,900/max(1,len(ob.data.polygons)));bpy.ops.object.modifier_apply(modifier=mod.name)
  pts=[v.co.copy() for v in ob.data.vertices];lo=Vector(tuple(min(v[i] for v in pts) for i in range(3)));hi=Vector(tuple(max(v[i] for v in pts) for i in range(3)))
  factor=2.5/max((hi-lo).x,(hi-lo).y);center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
  templates.append(([tuple((v-center)*factor) for v in pts],[tuple(p.vertices) for p in ob.data.polygons],[[tuple(ob.data.uv_layers.active.data[i].uv) for i in p.loop_indices] for p in ob.data.polygons]))
 for ob in imported:bpy.data.objects.remove(ob,do_unlink=True)
 def stone(b,x,y,s=1,seed=1):
  vs,fs,uv=templates[int(seed)%len(templates)];angle=seed*2.399;co,si=math.cos(angle),math.sin(angle)
  b.mesh('limestone',[(x+(xx*co-yy*si)*s,y+(xx*si+yy*co)*s,zz*s) for xx,yy,zz in vs],fs,uvs=uv)
 core.rock=stone
 print('SOURCE ROCK VARIANTS',len(templates),'uniform aspect-preserving scale',flush=True)

def install_edges():
 core.PALETTE['litter']='635c42'
 original=core.Batch.box
 def box(b,mat,c,size):
  if mat not in ['cutstone','stone','furniture'] or min(size)<.035:return original(b,mat,c,size)
  x,y,z=c;a,d,h=[v/2 for v in size];bevel=min(.013 if mat!='furniture' else .0035,min(size)*.10)
  ring=[(-a+bevel,-d),(a-bevel,-d),(a,-d+bevel),(a,d-bevel),(a-bevel,d),(-a+bevel,d),(-a,d-bevel),(-a,-d+bevel)]
  verts=[]
  for zz,inset in [(-h,bevel),(-h+bevel,0),(h-bevel,0),(h,bevel)]:
   for xx,yy in ring:verts.append((x+xx-math.copysign(inset,xx),y+yy-math.copysign(inset,yy),z+zz))
  faces=[tuple(range(7,-1,-1)),tuple(range(24,32))]
  faces += [(r*8+i,r*8+(i+1)%8,(r+1)*8+(i+1)%8,(r+1)*8+i) for r in range(3) for i in range(8)]
  b.mesh(mat,verts,faces)
 core.Batch.box=box

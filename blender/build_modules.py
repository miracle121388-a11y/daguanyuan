"""Deterministic reusable Chinese garden components. All dimensions in metres.
Mesh batches keep web draw calls bounded while the master retains named assemblies.
"""
import bpy, math, random
from mathutils import Vector
from collections import defaultdict
from pathlib import Path
R=Path(__file__).resolve().parents[1]
PALETTE={'plaster':'e9e4d5','stone':'a39f87','roof':'414d45','tile':'617366','wood':'795844','darkwood':'493e30','leaf':'52715b','lightleaf':'81946a','bamboo':'657a46','flower':'cd8d8b','creamflower':'dfcbb0','earth':'a7b49a','water':'789e92','paper':'b5ba93','gold':'ac9060'}
def materials():
 out={}
 for key,h in PALETTE.items():
  m=bpy.data.materials.get(key) or bpy.data.materials.new(key);m.use_nodes=True
  srgb=tuple(int(h[i:i+2],16)/255 for i in (0,2,4));rgb=tuple(((v+.055)/1.055)**2.4 if v>.04045 else v/12.92 for v in srgb);m.diffuse_color=(*rgb,1)
  bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb,1);bs.inputs['Roughness'].default_value=.85
  texname={'stone':'stone_wall_02','wood':'wood_cabinet_worn_long','darkwood':'wood_cabinet_worn_long','floorwood':'wood_cabinet_worn_long','latticewood':'wood_cabinet_worn_long','bankstone':'mossy_rock','paving':'mossy_cobblestone','plaster':'worn_mossy_plasterwall'}.get(key)
  if key=='earth':
   tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(R/'assets/processed/ground-r7/turf.png'),check_existing=True);tex.image.pack();m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
  if texname and (R/'assets/source'/f'{texname}.jpg').exists():
   tex=m.node_tree.nodes.new('ShaderNodeTexImage');texture_path=R/('assets/processed' if key=='stone' else 'assets/source')/f'{texname}.jpg';tex.image=bpy.data.images.load(str(texture_path),check_existing=True)
   tex.image.pack()
   m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
   normal_path=R/'assets/source'/f'{texname}_nor_gl.jpg'
   if key in ['wood','darkwood','floorwood','bankstone'] and normal_path.exists():
    tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(normal_path),check_existing=True);tex.image.colorspace_settings.name='Non-Color';tex.image.pack()
    normal=m.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.20 if key!='bankstone' else .70;m.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);m.node_tree.links.new(normal.outputs['Normal'],bs.inputs['Normal'])
  if key=='limestone':
   for suffix,socket in [('diff','Base Color'),('nor_gl','Normal')]:
    tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(R/'assets/source/rock_moss_set_01/textures'/f'rock_moss_set_01_{suffix}_1k.jpg'),check_existing=True);tex.image.pack()
    if suffix=='nor_gl':
     tex.image.colorspace_settings.name='Non-Color';normal=m.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.65;m.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);m.node_tree.links.new(normal.outputs['Normal'],bs.inputs[socket])
    else:m.node_tree.links.new(tex.outputs['Color'],bs.inputs[socket])
  if key in ['leaf','lightleaf']:m.surface_render_method='DITHERED';m.use_backface_culling=False
  out[key]=m
 return out
M=None
class Batch:
 def __init__(self,name,collection,parent=None):self.name=name;self.collection=collection;self.parent=parent;self.data=defaultdict(lambda:[[],[]]);self.source_uv={}
 def mesh(self,mat,verts,faces,uvs=None):
  v,f=self.data[mat];n=len(v);start=len(f);v.extend(verts);f.extend([tuple(n+i for i in face) for face in faces])
  if uvs is not None:
   for i,coords in enumerate(uvs):self.source_uv[(mat,start+i)]=coords
 def box(self,mat,c,s):
  x,y,z=c;a,b,h=[i/2 for i in s];v=[(x+i*a,y+j*b,z+k*h) for i,j,k in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
  self.mesh(mat,v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
 def rod(self,mat,a,b,r=.12,n=7,r2=None):
  a,b=Vector(a),Vector(b);d=(b-a).normalized();u=d.cross(Vector((0,0,1)))
  if u.length<.1:u=d.cross(Vector((0,1,0)))
  u.normalize();v=d.cross(u);r2=r if r2 is None else r2
  vs=[tuple(p+(u*math.cos(i*math.tau/n)+v*math.sin(i*math.tau/n))*radius) for p,radius in [(a,r),(b,r2)] for i in range(n)]
  fs=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
  self.mesh(mat,vs,fs)
 def ellipsoid(self,mat,c,s,seed=0,rings=5,n=9):
  rng=random.Random(seed);vs=[]
  for j in range(rings+1):
   phi=math.pi*j/rings
   for i in range(n):
    a=i*math.tau/n;f=1+rng.uniform(-.13,.13);vs.append((c[0]+s[0]*math.sin(phi)*math.cos(a)*f,c[1]+s[1]*math.sin(phi)*math.sin(a)*f,c[2]+s[2]*math.cos(phi)*f))
  self.mesh(mat,vs,[(j*n+i,(j+1)*n+i,(j+1)*n+(i+1)%n,j*n+(i+1)%n) for j in range(rings) for i in range(n)])
 def finish(self):
  global M
  if M is None:M=materials()
  obs=[]
  for mat,(vs,fs) in self.data.items():
   if not vs:continue
   mesh=bpy.data.meshes.new(self.name+'_'+mat);mesh.from_pydata(vs,[],fs);mesh.update()
   if mat in ['leaf','lightleaf','flower']:
    for poly in mesh.polygons:poly.use_smooth=True
   # Deterministic box-projection UVs, in local metres, for source materials.
   uv=mesh.uv_layers.new(name='UVMap')
   for poly in mesh.polygons:
    axis=max(range(3),key=lambda i:abs(poly.normal[i]));axes=[i for i in range(3) if i!=axis]
    for li in poly.loop_indices:
     scale={'wood':1.5,'darkwood':1.5,'floorwood':1.5,'stone':2.4,'bankstone':2.5,'plaster':3.2,'earth':2.8,'paving':2.8}.get(mat,4)
     co=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=(co[axes[0]]/scale,co[axes[1]]/scale)
    source=self.source_uv.get((mat,poly.index))
    if source:
     for li,coords in zip(poly.loop_indices,source):uv.data[li].uv=coords
   ob=bpy.data.objects.new(mesh.name,mesh);self.collection.objects.link(ob);ob.data.materials.append(M[mat]);ob.parent=self.parent;obs.append(ob)
  return obs
def roof(b,x,y,z,w,d,h=3,mat='roof',detail=True):
 # Curved hip roof: narrow ridge, concave lower slope and rising corner tips.
 ridge=max(.4,w/2-d*.32);steps=8
 for side in [-1,1]:
  vs=[]
  for j in range(steps+1):
   t=j/steps;half=ridge+(w/2+1-ridge)*t;zz=z+h*(1-t)**1.7+.34*t**8
   vs += [(x-half,y+side*t*(d/2+1),zz+.25*t**5),(x+half,y+side*t*(d/2+1),zz+.25*t**5)]
  b.mesh(mat,vs,[(j*2,j*2+1,j*2+3,j*2+2) if side==1 else (j*2+2,j*2+3,j*2+1,j*2) for j in range(steps)])
 for side in [-1,1]:
  b.mesh(mat,[(x+side*ridge,y,z+h),(x+side*(w/2+1),y-d/2-1,z+.59),(x+side*(w/2+1),y+d/2+1,z+.59)],[(0,1,2) if side==1 else (2,1,0)])
 b.rod('tile',(x-ridge-.4,y,z+h+.12),(x+ridge+.4,y,z+h+.12),.17)
 for sx in [-1,1]:
  for sy in [-1,1]:
   pts=[]
   for j in range(steps+1):
    t=j/steps;pts.append((x+sx*(ridge+(w/2+1-ridge)*t),y+sy*t*(d/2+1),z+h*(1-t)**1.7+.59*t**6+.1))
   for a,c in zip(pts,pts[1:]):b.rod('tile',a,c,.11,5)
   b.rod('tile',pts[-1],(pts[-1][0]+sx*.48,pts[-1][1]+sy*.4,pts[-1][2]+.38),.1,5,r2=.05)
 for sy in [-1,1]:
  b.rod('tile',(x-w/2-1,y+sy*(d/2+1),z+.48),(x+w/2+1,y+sy*(d/2+1),z+.48),.14)
  if detail:
   for xx in range(int(-w/2/.48),int(w/2/.48)+1):
    xx*=.48
    pts=[(x+xx/(w/2)*(ridge+(w/2+1-ridge)*j/steps),y+sy*j/steps*(d/2+1),z+h*(1-j/steps)**1.7+.34*(j/steps)**8+.08) for j in range(steps+1)]
    for a,c in zip(pts,pts[1:]):b.rod('tile',a,c,.055,4)
def window(b,x,y,z,w=1.8,h=2.5):
 b.box('darkwood',(x,y,z),(w+.18,.17,h+.18));b.box('paper',(x,y-.11,z),(w,.05,h))
 for dx in [-w/2,0,w/2]:b.box('wood',(x+dx,y-.17,z),(.065,.08,h))
 for j in range(6):b.box('wood',(x,y-.17,z-h/2+j*h/5),(w,.08,.06))
def hall(b,x=0,y=6,w=18,d=8,h=4.6,openhall=False,detail=True):
 b.box('stone',(x,y,.35),(w+2,d+2,.7));b.box('wood',(x,y,.78),(w+.5,d+.5,.17))
 for i in range(3):b.box('stone',(x,y-d/2-1.4-i*.4,.27-i*.06),(w*.45,.8,.32))
 if not openhall:
  b.box('plaster',(x,y+.5,h/2+.7),(w,d-1,h))
  for dx in [-w*.38,-w*.19,w*.19,w*.38]:window(b,x+dx,y-d/2-.04,2.75,w*.14,2.7)
  b.box('darkwood',(x,y-d/2-.13,2.2),(2.5,.12,3.1))
  for dx in [-.65,.65]:b.box('wood',(x+dx,y-d/2-.23,2.2),(1.2,.12,3))
 for dx in [-w/2,-w/4,0,w/4,w/2]:
  for sy in [-1,1]:
   b.rod('wood',(x+dx,y+sy*d/2,.8),(x+dx,y+sy*d/2,h+.8),.18,8)
   b.box('gold',(x+dx,y+sy*d/2,h+.6),(.5,.45,.3))
   b.box('wood',(x+dx,y+sy*d/2,h+.95),(.8,.52,.16))
 b.box('wood',(x,y-d/2,h+.65),(w+.8,.3,.3))
 roof(b,x,y,h+.9,w+1,d+1,detail=detail)
 # Sign board, lanterns, readable architectural rhythm.
 b.box('darkwood',(x,y-d/2-.34,h-.05),(3,.22,.8))
 for dx in [-w*.32,w*.32]:
  b.rod('darkwood',(x+dx,y-d/2-.6,h+.6),(x+dx,y-d/2-.6,h-.45),.04)
  b.ellipsoid('creamflower',(x+dx,y-d/2-.6,h-.7),(.27,.27,.42),n=8)
def wall(b,a,c,h=2.6):
 x,y=a;xx,yy=c;length=math.dist(a,c)
 if abs(y-yy)<.01:
  b.box('plaster',((x+xx)/2,y,h/2+.15),(length,.48,h));b.box('roof',((x+xx)/2,y,h+.2),(length+.2,.72,.23));b.box('stone',((x+xx)/2,y,.3),(length,.56,.55))
 else:
  b.box('plaster',(x,(y+yy)/2,h/2+.15),(.48,length,h));b.box('roof',(x,(y+yy)/2,h+.2),(.72,length+.2,.23));b.box('stone',(x,(y+yy)/2,.3),(.56,length,.55))
def moon_gate(b,y=-13):
 # Actual circular void; no opaque plane across the opening.
 r=1.7;cz=1.75
 for i in range(24):
  t=i*math.tau/24;t2=(i+1)*math.tau/24
  for depth in [-.28,.28]:
   inner=[(r*math.cos(t),y+depth,cz+r*math.sin(t)),(r*math.cos(t2),y+depth,cz+r*math.sin(t2))]
   outer=[((r+.28)*math.cos(t),y+depth,cz+(r+.28)*math.sin(t)),((r+.28)*math.cos(t2),y+depth,cz+(r+.28)*math.sin(t2))]
   b.mesh('stone',inner+outer,[(0,1,3,2)])
  b.mesh('stone',[(r*math.cos(q),y+d,cz+r*math.sin(q)) for d in [-.28,.28] for q in [t,t2]],[(0,1,3,2)])
 wall(b,(-16,y),(-2,y));wall(b,(2,y),(16,y))
def tree(b,x,y,size=1,flower=False,seed=1):
 rng=random.Random(seed);h=5*size;b.rod('wood',(x,y,0),(x+.35*size,y,h),.26*size,7,r2=.1*size)
 for i in range(9):
  a=i*2.4;spread=(1.15+(i%3)*.5)*size;xx=x+math.cos(a)*spread;yy=y+math.sin(a)*spread;zz=h+(i%3)*.6*size
  b.rod('wood',(x,y,h*.65),(xx,yy,zz),.11*size,6,r2=.04*size)
  b.ellipsoid('flower' if flower else ['leaf','lightleaf'][i%2],(xx,yy,zz),(1.6*size,1.3*size,.8*size),seed+i,n=10,rings=6)
def bamboo(b,x,y,seed=0):
 rng=random.Random(seed)
 for i in range(4):
  xx=x+rng.uniform(-.8,.8);yy=y+rng.uniform(-.8,.8);h=rng.uniform(4.5,7)
  b.rod('bamboo',(xx,yy,0),(xx+.25,yy,h),.07,5)
  for j in range(2,8):
   z=j*h/8;b.rod('lightleaf',(xx-.07,yy,z),(xx+.1,yy,z),.10,5)
   a=rng.random()*math.tau;end=(xx+math.cos(a)*1.25,yy+math.sin(a)*1.25,z+.4)
   b.rod('bamboo',(xx,yy,z),end,.035,4)
   for k in range(3):
    t=(k+1)/4;cx=xx+(end[0]-xx)*t;cy=yy+(end[1]-yy)*t
    b.mesh('leaf',[(cx,cy,z+.4*t),(cx+.8*math.cos(a+.6),cy+.8*math.sin(a+.6),z+.1),(cx+.6*math.cos(a),cy+.6*math.sin(a),z+.45)],[(0,1,2)])
def rock(b,x,y,s=1,seed=1):
 for i,(dx,dy,dz,sx,sy,sz) in enumerate([(-.55,0,.8,.55,.7,1.2),(.65,.12,1,.5,.65,1.5),(.1,0,1.7,.85,.7,.65)]):b.ellipsoid('stone',(x+dx*s,y+dy*s,dz*s),(sx*s,sy*s,sz*s),seed+i,n=9,rings=5)
def fence(b,a,c):
 length=math.dist(a,c);count=max(2,int(length/1.2))
 for i in range(count+1):
  t=i/count;x=a[0]+(c[0]-a[0])*t;y=a[1]+(c[1]-a[1])*t;b.rod('wood',(x,y,.2),(x,y,1.45),.07,5)
 for z in [.65,1.25]:b.rod('wood',(*a,z),(*c,z),.075,5)
def path(b,a,c,width=2.6,bridge=False):
 a,c=Vector(a),Vector(c);d=c-a;side=Vector((-d.y,d.x,0)).normalized()*width/2
 b.mesh('wood' if bridge else 'stone',[tuple(a-side),tuple(a+side),tuple(c+side),tuple(c-side)],[(3,2,1,0)])
 if not bridge:
  for sign in [-1,1]:
   aa=a+side*sign;cc=c+side*sign;b.mesh('stone',[tuple(aa),tuple(cc),(cc.x,cc.y,-.14),(aa.x,aa.y,-.14)],[(0,1,2,3) if sign<0 else (3,2,1,0)])
 if bridge:
  for sign in [-1,1]:
   aa=a+side*sign;cc=c+side*sign
   b.rod('wood',aa+Vector((0,0,1)),cc+Vector((0,0,1)),.08)
   for i in range(int(d.length/2)+1):
    p=aa+(cc-aa)*i/max(1,int(d.length/2));b.rod('wood',p,p+Vector((0,0,1.2)),.085)
def courtyard(b,style,detail=True):
 b.box('earth',(0,0,-.05),(33,29,.25));b.box('stone',(0,-1,.06),(23,23,.12))
 wall(b,(-16,-13),(-16,14));wall(b,(16,-13),(16,14));wall(b,(-16,14),(16,14));moon_gate(b)
 if style=='study':
  hall(b,0,6,23,9,openhall=True,detail=detail)
  b.box('wood',(0,6,1.5),(9,2.4,.22))
  for x in [-3,0,3]:b.box('paper',(x,6,1.63),(1.3,.85,.04));b.box('darkwood',(x,6.1,1.72),(.35,.3,.16))
  for x in [-6,6]:tree(b,x,-5,1.05,seed=int(x+7))
  b.box('paper',(0,9.8,3.6),(8,.1,3.5))
  for x in [-10,10]:b.box('wood',(x,8,2.5),(2,1,3.5))
 elif style=='flower':
  hall(b,0,7,18,7,detail=detail);hall(b,-11,-1,4,13,h=3.6,detail=detail);hall(b,11,-1,4,13,h=3.6,detail=detail)
  tree(b,-5,-5,.95,True,5);tree(b,7,-6,.8,True,9)
  for x in [7,9]:
   b.rod('bamboo',(x,1,0),(x,1,3.6),.15)
   for i in range(6):
    a=i*1.05;b.ellipsoid('leaf',(x+math.cos(a),1+math.sin(a),3.4),(1.3,.32,.35),i,rings=3,n=5)
 elif style=='herb':
  hall(b,0,7,18,8,detail=detail)
  for x,y,s in [(-8,-5,2.1),(-11,-2,1.1),(8,-4,1.5),(11,2,1)]:rock(b,x,y,s,int(x*x))
  for i in range(25):
   x=math.sin(i*4)*11;y=-9+(i%7)*1.8;b.ellipsoid('lightleaf',(x,y,.35),(.8,.65,.45),i,rings=3,n=6)
 else:
  hall(b,0,7,17,7,detail=detail);hall(b,11,-.5,4,11,h=3.2,detail=detail)
  for i in range(15):bamboo(b,-12+(i%3)*1.6,-9+(i//3)*4,22+i)
  for i in range(6):b.box('stone',(math.sin(i)*1.4,-11+i*2.4,.18),(1.4,1.7,.22))
  rock(b,-6,4,.8,8);b.box('wood',(0,4,1.6),(3,1,.18));b.box('paper',(0,4,1.72),(1.1,.6,.05))
 for x,y in [(-4,0),(4,-8)]:
  b.rod('stone',(x,y,.1),(x,y,.8),.42,10);b.rod('stone',(x,y,.8),(x,y,.92),.65,10)

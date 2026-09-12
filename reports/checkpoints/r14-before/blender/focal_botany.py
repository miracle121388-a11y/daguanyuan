"""Focal leaf surfaces and unequal branching, shared by native and web meshes."""
import math,random
from pathlib import Path
import bpy
from mathutils import Vector
import build_modules as core
import refined_modules as arch

def material_setup():
 root=Path(__file__).resolve().parents[1]/'assets/processed/focal-r12-fix2'
 for role,source in [('botanical_banana','banana'),('botanical_bamboo','bamboo'),('botanical_stem','stem'),('botanical_petal','petal'),('botanical_litter','litter')]:
  m=bpy.data.materials.get(role) or bpy.data.materials.new(role);m.use_nodes=True;m.node_tree.nodes.clear();nodes=m.node_tree.nodes;links=m.node_tree.links
  bs=nodes.new('ShaderNodeBsdfPrincipled');output=nodes.new('ShaderNodeOutputMaterial');links.new(bs.outputs[0],output.inputs['Surface'])
  tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(root/f'{source}.png'),check_existing=False);tex.image.pack();links.new(tex.outputs['Color'],bs.inputs['Base Color']);bs.inputs['Roughness'].default_value=.78 if source=='banana' else .88
  if source in ['banana','bamboo']:
   bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.14;bump.inputs['Distance'].default_value=.025;links.new(tex.outputs['Color'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])
  m.use_backface_culling=False;m['focalBotany']=True;m.diffuse_color=(.10,.15,.04,1)

def blade(b,root,d,length,width,material='botanical_bamboo',droop=.22,twist=0):
 root=Vector(root);d=Vector(d).normalized();cross=d.cross(Vector((0,0,1)))
 if cross.length<.1:cross=Vector((1,0,0))
 cross.normalize();vs=[];uv=[]
 for j in range(5):
  t=j/4;p=root+d*(length*t)+Vector((0,0,-droop*length*t*t));w=max(.002,math.sin(t*math.pi)**.8)*width
  for k in range(3):
   u=k-1;vs.append(tuple(p+cross*(u*w)+Vector((0,0,-abs(u)*width*.3+u*twist*t))));uv.append((k/2,t))
 fs=[(j*3+k,j*3+k+1,(j+1)*3+k+1,(j+1)*3+k) for j in range(4) for k in range(2)]
 b.mesh(material,vs,fs,[[uv[i] for i in f] for f in fs])

def bamboo(b,x,y,seed=0):
 rng=random.Random(seed+81217)
 for stem in range(rng.choice([2,3,3,4])):
  h=rng.uniform(3.6,6.9);root=Vector((x+rng.uniform(-.55,.55),y+rng.uniform(-.55,.55),.03));lean=Vector((rng.uniform(-.85,.85),rng.uniform(-.75,.75),h));last=root
  count=round(h/.43)
  for j in range(1,count+1):
   t=j/count;p=root+lean*t+Vector((math.sin(t*2.8)*.12,math.sin(t*2.1)*.1,0));b.rod('botanical_stem',last,p,.044*(1-t*.60),7,r2=.041*(1-t*.60));last=p
   if j<count*.46 or j%2==stem%2:continue
   angle=rng.uniform(-math.pi,math.pi);reach=rng.uniform(.68,1.6)*(1-.26*t);bend=p+Vector((math.cos(angle)*reach*.55,math.sin(angle)*reach*.55,.26));tip=p+Vector((math.cos(angle)*reach,math.sin(angle)*reach,-rng.uniform(.15,.5)))
   b.rod('botanical_stem',p,bend,.01,5,r2=.006);b.rod('botanical_stem',bend,tip,.006,4,r2=.002)
   for k in range(6):
    q=bend.lerp(tip,k/6)
    for side in [-1,1]:
     a=angle+side*rng.uniform(.45,.95);length=rng.uniform(.35,.74)*(1-k*.045)
     blade(b,q,(math.cos(a),math.sin(a),rng.uniform(-.05,.25)),length,rng.uniform(.035,.072),droop=rng.uniform(.2,.52),twist=rng.uniform(-.025,.025))

def banana(b,x,y,size=1):
 rng=random.Random(round(x*119+y*311)+902)
 b.rod('botanical_stem',(x,y,0),(x+.12*size,y-.08*size,2.95*size),.18*size,12,r2=.075*size)
 for i in range(8):
  angle=i*2.399+rng.uniform(-.42,.42);length=rng.uniform(1.70,2.55)*size;start=Vector((x+.1*size,y-.06*size,(2.0+i*.105+rng.uniform(-.16,.16))*size));d=Vector((math.cos(angle),math.sin(angle),0));cross=Vector((-d.y,d.x,0));age=(7-i)/7
  rows=34;cols=8;vs=[];uv=[];centres=[];tears={rng.randrange(12,20),rng.randrange(22,31)} if age>.35 else {25}
  for j in range(rows+1):
   t=j/rows;p=start+d*(length*t)+Vector((0,0,(.65*math.sin(t*math.pi)-(age*.88+.28)*t*t)*size));centres.append(p);width=max(.004,math.sin(t*math.pi)**.72)*rng.uniform(.36,.39)*size
   for k in range(cols+1):
    u=2*k/cols-1;twist=(.17*math.sin(i*1.7)+.16*age)*u*t
    drop=-abs(u)**1.35*(.23+.18*age)*math.sin(t*math.pi)+.028*math.sin(j*1.8+i)*abs(u)
    v=p+cross*(u*width*(1+.13*math.sin(i+u)))+Vector((0,0,(drop+twist)*size));vs.append(tuple(v));uv.append((k/cols,t))
  fs=[]
  for j in range(rows):
   for k in range(cols):
    if j in tears and (k<3 if (j+i)%2 else k>4):continue
    fs.append((j*(cols+1)+k,j*(cols+1)+k+1,(j+1)*(cols+1)+k+1,(j+1)*(cols+1)+k))
  b.mesh('botanical_banana',vs,fs,[[uv[i] for i in f] for f in fs])
  for j in range(rows):b.rod('botanical_stem',centres[j],centres[j+1],.016*size*(1-j/rows*.85),5)
 # A young unfurled spear gives the plant a different centre silhouette.
 blade(b,(x+.1,y-.06,2.4*size),(.1,.13,1),1.4*size,.07*size,'botanical_banana',droop=.05,twist=.16)

def flowering_tree(b,x,y,size,seed):
 rng=random.Random(seed+19212);leader=[Vector((x+dx*size,y+dy*size,z*size)) for dx,dy,z in [(0,0,0),(.18,-.06,1.8),(-.28,.12,3.55),(.04,.3,5.2),(-.66,.32,6.15)]]
 for j in range(4):b.rod('bark',leader[j],leader[j+1],[.31,.25,.16,.075][j]*size,10-j,r2=[.25,.16,.075,.019][j]*size)
 for branch in range(7):
  origin=leader[1+branch%3].lerp(leader[2+branch%3],rng.uniform(.1,.65));angle=branch*2.18+rng.uniform(-.55,.55);reach=rng.uniform(1.5,3.8)*size;tip=origin+Vector((math.cos(angle)*reach,math.sin(angle)*reach,rng.uniform(.6,1.75)*size));bend=origin.lerp(tip,.55)+Vector((0,0,.28*size))
  radius=(.115 if branch%3==0 else .083)*size;b.rod('bark',origin,bend,radius,8,r2=.04*size);b.rod('bark',bend,tip,.04*size,6,r2=.009*size)
  for twig in range(12):
   t=rng.uniform(.25,1);base=bend.lerp(tip,t);a=angle+rng.uniform(-1.3,1.3);end=base+Vector((math.cos(a)*rng.uniform(.35,1.15)*size,math.sin(a)*rng.uniform(.35,1.15)*size,rng.uniform(-.2,.58)*size));b.rod('bark',base,end,.011*size,5,r2=.002*size)
   for cluster in range(12):
    t=rng.uniform(.2,1);p=base.lerp(end,t)+Vector((rng.uniform(-.19,.19)*size,rng.uniform(-.19,.19)*size,rng.uniform(-.12,.17)*size));normal=Vector((rng.uniform(-1,1),rng.uniform(-1,1),rng.uniform(.2,1))).normalized();u=normal.cross(Vector((0,0,1))).normalized();v=normal.cross(u);radius=rng.uniform(.06,.12)*size
    vs=[tuple(p)];uv=[(.5,.5)]
    for k in range(10):
     a=k*math.tau/10;rr=radius*(1 if k%2==0 else .61);vs.append(tuple(p+(u*math.cos(a)+v*math.sin(a))*rr+normal*.026*size));uv.append((.5+math.cos(a)*.48,.5+math.sin(a)*.48))
    fs=[(0,k+1,(k+1)%10+1) for k in range(10)];b.mesh('botanical_petal',vs,fs,[[uv[i] for i in f] for f in fs])
   for j in range(3):blade(b,base.lerp(end,(j+1)/4),(math.cos(a+.5*j),math.sin(a+.5*j),.2),.27*size,.055*size,droop=.24)

def install():
 import r8_courtyard,r12_botany
 core.PALETTE.update({'botanical_banana':'415324','botanical_bamboo':'3b4d25','botanical_stem':'4d552c','botanical_petal':'ca9b94','botanical_litter':'57472b'})
 original=core.materials
 def materials():
  out=original();material_setup()
  for role in ['botanical_banana','botanical_bamboo','botanical_stem','botanical_petal','botanical_litter']:out[role]=bpy.data.materials[role]
  return out
 core.materials=materials
 r8_courtyard.bamboo=bamboo;arch.bamboo=bamboo;arch.banana=banana;r12_botany.flowering_tree=flowering_tree

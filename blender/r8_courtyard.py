"""The same three-bay Xiaoxiang study, rebuilt at the scale of a visitor.

The room split, narrow channel and approaches retain the reviewed layout.
Furnishings, plant placement and construction details are interpretation.
"""
import math,random
from mathutils import Vector
import build_modules as core
import refined_modules as arch
from reference_world import transform,lantern
import reference_world as previous
import interior_craft as craft

def bamboo(b,x,y,seed=0):
 rng=random.Random(seed+812)
 for stem in range(5):
  h=rng.uniform(4.2,6.5);root=Vector((x+rng.uniform(-.52,.52),y+rng.uniform(-.52,.52),.03))
  lean=Vector((rng.uniform(-.6,.6),rng.uniform(-.45,.45),h))
  b.rod('bamboo',root,root+lean,.044,8,r2=.019)
  count=round(h/.39)
  for j in range(1,count):
   p=root+lean*j/count;b.rod('lightleaf',p-Vector((0,0,.013)),p+Vector((0,0,.013)),.047*(1-j/count*.45),8)
   if j<count*.30 or rng.random()<.12:continue
   angle=seed*.39+j*2.399+stem
   direction=Vector((math.cos(angle),math.sin(angle),rng.uniform(.18,.40)))
   tip=p+direction*rng.uniform(.85,1.65);b.rod('bamboo',p,tip,.010,5,r2=.003)
   for k in range(2,rng.randrange(7,10)):
    point=p.lerp(tip,k/10)
    for side in [-1,1]:
     axis=(math.cos(angle+side*.66),math.sin(angle+side*.66),rng.uniform(-.5,-.1))
     arch.leaf(b,point,axis,rng.uniform(.30,.46),rng.uniform(.035,.058),['leafdark','leaf','lightleaf'][(j+k)%3])

def fern(b,x,y,size=1,seed=0):
 rng=random.Random(seed)
 for j in range(7):
  angle=j*2.399;root=Vector((x,y,.075));tip=root+Vector((math.cos(angle)*.47*size,math.sin(angle)*.47*size,rng.uniform(.24,.54)*size))
  b.rod('bamboo',root,tip,.006,4,r2=.002)
  for k in range(2,8):
   p=root.lerp(tip,k/8)
   for side in [-1,1]:arch.leaf(b,p,(math.cos(angle+side*.83),math.sin(angle+side*.83),.18),size*.19*(1-k/12),.025*size,'leafdark' if j%3 else 'leaf')

def shelf(b,x,y):
 # Shelves have stiles, stretchers and an open back; books have varied use and spacing.
 for dx in [-.48,.48]:
  for dy in [-.89,.89]:b.box('darkwood',(x+dx,y+dy,1.8),(.07,.065,2.52))
 for level in range(4):
  z=.83+level*.61;b.box('furniture',(x,y,z),(1.06,1.86,.06))
  b.box('wood',(x+.48,y,z-.08),(.045,1.78,.12))
  for j in range(2+(level%2)):
   yy=y-.6+j*.57;count=1+(j*3+level)%4
   for layer in range(count):
    transform(b,lambda:craft.bound_book(b,0,0,z+.035+layer*.059,.46,.31,.050,level*11+j+layer),(x+(j%2)*.075,yy,0),(.018*layer-.04*j))
 # A cloth-wrapped volume bundle occupies one quiet bay.
 b.box('bookcloth',(x,y+.43,2.10),(.47,.33,.13))
 for side in [-1,1]:b.box('ivory',(x+side*.14,y+.43,2.17),(.008,.33,.006))

def courtyard(b,style):
 if style!='bamboo':return previous.courtyard(b,style)
 for a,c in [((-16,-13),(-16,19)),((16,-13),(16,19)),((-16,19),(16,19))]:arch.gardenwall(b,a,c)
 core.moon_gate(b)
 arch.hall(b,0,7,13.2,6.4,3.6,bays=3,style='bamboo')
 for x in [-2.2,2.2]:
  b.box('plaster',(x,7,2.1),(.12,6,3.1))
  b.box('darkwood',(x,7,.88),(.14,6,.63))
  for y in [4,7,10]:b.box('wood',(x,y,2.1),(.145,.10,3.1))
  for z in [1.20,3.62]:b.box('wood',(x,7,z),(.15,6,.065))
 arch.corridor(b,[(-12,-10),(-12,2),(-7,2)],1.8,2.8)
 arch.hall(b,7.5,16,8,3.2,2.55,bays=2,style='bamboo')
 arch.tree(b,-7,15,.8,True,3);arch.banana(b,12.5,14,.85)
 rng=random.Random(8122026)
 # An uneven bamboo edge leaves the reviewed central walk and water channel clear.
 for i in range(43):
  side=-1 if i%3 else 1;x=side*rng.uniform(6.8,10.8);y=rng.uniform(-10,2.0)
  bamboo(b,x,y,812+i)
 for i in range(12):bamboo(b,(-14 if i%2 else 15)+rng.uniform(-.25,.25),-8+(i//2)*4.2,940+i)
 # Bamboo ground colour is derived from these actual stems on the continuous earth.
 # Stepping stones on a gravel bed replace the uniform dotted paving motif.
 b.box('paving',(0,-5,.10),(1.85,15,.05))
 for i in range(12):
  y=-11.65+i*1.19;angle=.10*math.sin(i*2.1)
  transform(b,lambda: b.box('cutstone',(0,0,.18),(1.28+rng.random()*.15,.99,.15)),(.18*math.sin(i*1.8),y,0),angle)
 for i in range(90):
  x=rng.uniform(-11,11);y=rng.uniform(-11,2.7)
  if abs(x)<1.55:continue
  if i%4==0:fern(b,x,y,rng.uniform(.7,1.2),i)
  else:
   angle=rng.random()*math.tau;arch.leaf(b,(x,y,.08),(math.cos(angle),math.sin(angle),-.04),.12,.016,'bookcloth')
 # Channel width remains 46 cm, following the prior three connected segments.
 for aa,cc in [((14,18,.14),(14,-8,.14)),((14,-8,.14),(3,-8,.14)),((3,-8,.14),(3,-14,.14))]:
  a,c=Vector(aa),Vector(cc);delta=c-a;side=Vector((-delta.y,delta.x,0)).normalized()*.23
  b.mesh('water',[tuple(a-side),tuple(c-side),tuple(c+side),tuple(a+side)],[(0,1,2,3)])
  for sign in [-1,1]:
   for j in range(max(1,round(delta.length/.7))):
    p=a.lerp(c,(j+.5)/max(1,round(delta.length/.7)))+side*sign
    b.box('bankstone',(p.x,p.y,.10),(.64 if abs(delta.x)>abs(delta.y) else .19,.64 if abs(delta.y)>abs(delta.x) else .19,.22))
 craft.desk(b,-3,7,1.45,3.2)
 shelf(b,-5.8,8)
 # Low couch, woven cushion and a quiet ceramic vessel in the other private bay.
 b.box('furniture',(4,8,.91),(3.1,1.8,.12));b.box('silk',(4,8,1.03),(2.8,1.5,.12))
 for x in [2.6,5.4]:
  for y in [7.3,8.7]:b.box('darkwood',(x,y,.70),(.09,.09,.33))
 arch.vase(b,4.9,6.7,.57,.37,'ceramic')
 transform(b,lambda:craft.ink_scroll(b,0,0,2.55,.72,1.3,31),(-2.28,8,0),-math.pi/2)
 for x in [-5,5]:lantern(b,x,2.3,3.2,.46)

"""Close-range construction and photographic rock silhouettes for the reference world."""
import math,random,bpy
from mathutils import Vector
import build_modules as core
import refined_modules as arch

def install():
 core.PALETTE['limestone']='8b9084'
 from r9_landscape import install_rocks
 install_rocks()
 oldroof=arch.roof
 def roof(b,x,y,z,w,d,h=2.25,detail=True,rolled=False,thatch=False):
  oldroof(b,x,y,z,w,d,h,detail,rolled,thatch)
  if thatch:return
  ridge=max(.4,w/2-d*.32);rows=max(12,int((d/2+1)/.31));cols=max(14,int(w/.28))
  for sy in [-1,1]:
   for j in range(1,rows+1):
    t=j/rows;half=ridge+(w/2+1-ridge)*t;zz=z+h*(1-t)**1.7+.34*t**8+.04
    if rolled:zz=z+h*math.cos(t*math.pi/2)**1.1+.18*t**8+.04
    # Overlapped end lips provide real tile depth at each course, not long ribs.
    for i in range(cols):
     xx=-half+(i+.5)*2*half/cols;corner=.2*t**5*abs(xx/half)**8
     b.rod('tile' if (i+j)%4 else 'tiledark',(x+xx-.10,y+sy*t*(d/2+1),zz+corner),(x+xx+.10,y+sy*t*(d/2+1),zz+corner),.022,4)
   b.box('darkwood',(x,y+sy*(d/2+.65),z-.08),(w+1,.16,.22))
  for sx in [-1,1]:
   for sy in [-1,1]:
    for k in range(3):b.box('wood',(x+sx*(w/2-.6),y+sy*(d/2-.2),z-.25-k*.12),(.85-k*.18,.75-k*.12,.12))
 arch.roof=roof
 oldhall=arch.hall
 def hall(b,x=0,y=6,w=18,d=8,h=4.4,**kw):
  oldhall(b,x,y,w,d,h,**kw)
  if kw.get('thatch'):return
  # Individually laid indoor boards and skirting distinguish interior from garden paving.
  for row in range(max(2,int(d/.34))):b.box('wood' if row%4 else 'darkwood',(x,y-d/2+.2+row*.34,.565),(w-.45,.325,.055))
  b.box('darkwood',(x,y+d/2-.19,.76),(w-.45,.1,.28))
  for sx in [-1,1]:b.box('darkwood',(x+sx*(w/2-.18),y,.76),(.1,d-.45,.28))
  for xx in [-w*.3,w*.3]:
   b.box('wood',(x+xx,y+.5,1.03),(1.2,.65,.1))
   for ax in [-.48,.48]:
    for ay in [-.24,.24]:b.rod('darkwood',(x+xx+ax,y+.5+ay,.6),(x+xx+ax,y+.5+ay,1.04),.045,6)
  from interior_craft import ink_scroll
  ink_scroll(b,x,y+d/2-.2,h*.68,min(1.1,w*.08),h*.58,int(w))
  for xx in [-w*.27,w*.27]:
   b.box('wood',(x+xx,y+d/2-.19,h*.58),(.1,.13,h+.15))
  # Shaped beam ends and paired braces visibly join columns to the main beam.
  bays=kw.get('bays',3)
  for j in range(bays+1):
   xx=x-w/2+j*w/bays
   for sy in [-1,1]:
    yy=y+sy*(d/2+.42)
    for sx in [-1,1]:
     b.rod('wood',(xx,yy,h+.20),(xx+sx*.48,yy,h+.77),.055,7,r2=.035)
    b.box('darkwood',(xx,yy,h+.60),(.66,.56,.1))
 oldbamboo=arch.bamboo
 def bamboo(b,x,y,seed=0):
  oldbamboo(b,x,y,seed);rng=random.Random(seed+271)
  for j in range(30):
   a=j*2.399;p=Vector((x+math.cos(a)*rng.uniform(.3,1.5),y+math.sin(a)*rng.uniform(.3,1.5),rng.uniform(3.7,6.0)))
   for side in [-1,1]:
    for k in range(5):arch.leaf(b,p+Vector((math.cos(a)*k*.12,math.sin(a)*k*.12,0)),(math.cos(a+side*.6),math.sin(a+side*.6),-.35),rng.uniform(.55,.95),.065,'leafdark' if j%3==0 else 'leaf')
 arch.hall=hall;arch.bamboo=bamboo
 from interior_craft import install as install_interior
 install_interior()

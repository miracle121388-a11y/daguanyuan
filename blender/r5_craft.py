"""Human-scale bamboo, joinery and masonry details for the continuous garden."""
import math,random
from mathutils import Vector
import build_modules as core
import refined_modules as arch
from reference_world import transform

def bamboo(b,x,y,seed=0):
 rng=random.Random(seed+1901)
 for stem in range(4):
  h=rng.uniform(4.6,6.5);root=Vector((x+rng.uniform(-.55,.55),y+rng.uniform(-.55,.55),0))
  lean=Vector((rng.uniform(-.45,.45),rng.uniform(-.3,.3),h))
  coretop=root+lean
  b.rod('bamboo',root,coretop,.038,7,r2=.018)
  for j in range(1,17):
   p=root+lean*(j/17);b.rod('lightleaf',p-Vector((0,0,.018)),p+Vector((0,0,.018)),.044,7,r2=.042)
   if j<7:continue
   for side in [-1,1]:
    angle=rng.random()*math.tau;direction=Vector((math.cos(angle),math.sin(angle),.18))
    tip=p+direction*rng.uniform(.45,1.2);b.rod('bamboo',p,tip,.013,5,r2=.004)
    for k in range(3,10):
     start=p.lerp(tip,k/10)
     for turn in [-1,1]:
      axis=Vector((math.cos(angle+turn*.68),math.sin(angle+turn*.68),-.35))
      arch.leaf(b,start,axis,rng.uniform(.16,.29),rng.uniform(.016,.027),['leaf','lightleaf','leafdark'][k%3])

def install():
 core.PALETTE.update({'tile':'4b5651','tilelight':'536058','tiledark':'424d48'})
 arch.bamboo=bamboo
 oldhall=arch.hall
 def hall(b,x=0,y=6,w=18,d=8,h=4.4,**kw):
  oldhall(b,x,y,w,d,h,**kw)
  if kw.get('thatch'):return
  # Brick plinth below limewashed walls; joints are dimensions, not a flat decal.
  for sx in [-1,1]:
   for row in range(3):
    for j in range(max(2,int(d/.55))):
     yy=y-d/2+(j+.5+(row%2)*.5)*.55
     if yy>y+d/2-.15:continue
     b.box('stone' if (j+row)%5 else 'paving',(x+sx*(w/2+.17),yy,.58+row*.13),(.035,.535,.115))
   # Side windows and panel divisions break up the blank gable wall while
   # retaining its weather enclosure; interpreted construction, not a book quote.
   for yy in [-d*.22,d*.22]:
    transform(b,lambda:arch.lattice(b,0,0,2.65,min(1.7,d*.23),2.25,'flower'),(x+sx*(w/2+.19),y+yy,0),sx*math.pi/2)
   for yy in [-d/2,d/2]:
    b.box('wood',(x+sx*(w/2+.19),y+yy,h*.5+.56),(.14,.16,h+.05))
  # A visible beam grid carries the eaves; paired shaped corbels below each beam.
  bays=kw.get('bays',3)
  for j in range(bays+1):
   xx=x-w/2+j*w/bays
   b.box('darkwood',(xx,y,h+.68),(.17,d+.85,.23))
   for sy in [-1,1]:
    yy=y+sy*(d/2+.42)
    for dx in [-1,1]:
     pts=[(xx,yy,h+.1),(xx+dx*.24,yy,h+.24),(xx+dx*.52,yy,h+.60)]
     for a,c in zip(pts,pts[1:]):b.rod('wood',a,c,.055,8,r2=.045)
    b.box('wood',(xx,yy,h+.73),(.82,.55,.11))
  # Small hand-laid eave ends and projecting rafters catch grazing daylight.
  for sy in [-1,1]:
   for j in range(max(2,int(w/.35))):
    xx=x-w/2+(j+.5)*.35
    b.rod('darkwood',(xx,y+sy*(d/2+.23),h+.69),(xx,y+sy*(d/2+.98),h+.80),.043,8)
 arch.hall=hall
 oldfinish=core.Batch.finish
 def finish(batch):
  objects=oldfinish(batch)
  for ob in objects:
   mat=ob.data.materials[0].name
   if mat in ['wood','darkwood','stone','plaster']:
    bevel=ob.modifiers.new('Crafted_Edge','BEVEL');bevel.width=.012 if mat in ['wood','darkwood'] else .018
    bevel.segments=1;bevel.limit_method='ANGLE';bevel.angle_limit=.6
  return objects
 core.Batch.finish=finish

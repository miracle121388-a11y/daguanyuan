"""A coherent roof, masonry and interior craft system on the reviewed footprints.

The construction dimensions are interpretation; no new literary claim is made.
"""
import math
from mathutils import Vector
import build_modules as core
import refined_modules as arch
import spatial_world as world
from reference_world import transform,covered_walk,rail,lantern,pine

_skirt=0

def roof(b,x,y,z,w,d,h=2.25,detail=True,rolled=False,thatch=False):
 if thatch:return original_roof(b,x,y,z,w,d,h,detail,rolled,thatch)
 rise=max(h,d*(.30 if rolled else .40))
 ridge=max(.2,(w-d)*.5);half_width=w*.5+1.05;half_depth=d*.5+1.05
 rows=max(8,math.ceil(half_depth/.32));columns=max(8,math.ceil((w+2.1)/.26))
 start=_skirt
 def point(u,t,side,lift=0):
  span=ridge+(half_width-ridge)*t
  profile=math.cos(t*math.pi/2)**1.35 if rolled else (1-t)**1.45
  corner=.54*t**7*abs(u)**10
  return (x+u*span,y+side*t*half_depth,z+rise*profile+.20*t**9+corner+lift)
 ts=[start+(1-start)*j/rows for j in range(rows+1)]
 for sy in [-1,1]:
  vertices=[point(u,t,sy) for t in ts for u in [-1,1]]
  b.mesh('roof',vertices,[(j*2,j*2+1,j*2+3,j*2+2) if sy==1 else (j*2+2,j*2+3,j*2+1,j*2) for j in range(rows)])
  # Tile seams and curved cover tiles are separate from the structural shell.
  if detail:
   for j in range(rows):
    t,t2=ts[j:j+2];span=ridge+(half_width-ridge)*t2
    n=max(4,int(2*span/.26))
    for i in range(n):
     u=-1+2*i/n;du=2/n
     vs=[point(u,t,sy,.025),point(u+du*.5,t,sy,.09),point(u+du,t,sy,.025),point(u,t2,sy,.025),point(u+du*.5,t2,sy,.09),point(u+du,t2,sy,.025)]
     faces=[(0,1,4,3),(1,2,5,4)]
     b.mesh('tilelight' if (i*13+j*37)%29==0 else 'tile',vs,faces if sy==1 else [tuple(reversed(f)) for f in faces])
   for i in range(columns+1):
    p=Vector(point(-1+2*i/columns,1,sy,.02));b.rod('tiledark',p-Vector((0,sy*.06,0)),p+Vector((0,sy*.16,0)),.082,8)
  for i in range(max(4,int(w/.42))):
   u=-.96+1.92*i/max(1,int(w/.42)-1)
   b.rod('darkwood',point(u,.76,sy,-.14),point(u,1,sy,-.14),.055,8)
 for sx in [-1,1]:
  vertices=[point(sx,t,sy) for t in ts for sy in [-1,1]]
  b.mesh('roof',vertices,[(j*2,j*2+2,j*2+3,j*2+1) if sx==1 else (j*2+1,j*2+3,j*2+2,j*2) for j in range(rows)])
  for sy in [-1,1]:
   points=[point(sx,t,sy,.12) for t in ts]
   for a,c in zip(points,points[1:]):b.rod('tiledark',a,c,.13,8)
   end=Vector(points[-1]);b.rod('tiledark',end,end+Vector((sx*.28,sy*.25,.36)),.105,8,r2=.035)
 if not start and not rolled:
  b.rod('tiledark',(x-ridge-.18,y,z+rise+.16),(x+ridge+.18,y,z+rise+.16),.16,10)
  for sx in [-1,1]:
   base=Vector((x+sx*ridge,y,z+rise+.13));tip=base+Vector((sx*.40,0,.58))
   b.rod('tiledark',base,tip,.12,8,r2=.055)

def tier(b,w,d,h,floor=0,skirt=0,bays=5):
 global _skirt
 _skirt=skirt
 try:transform(b,lambda:arch.hall(b,0,2,w,d,h,openhall=True,bays=bays),(0,0,floor))
 finally:_skirt=0

def tower(b):
 # The principal upper storey actually emerges through an open lower roof ring.
 tier(b,32,16,6.2,skirt=.58)
 tier(b,25.4,10.4,4.65,floor=9.15)
 for sy in [-1,1]:rail(b,(-13.5,2+sy*6.2,9.7),(13.5,2+sy*6.2,9.7),.95)
 for sx in [-1,1]:rail(b,(sx*13.5,-4.2,9.7),(sx*13.5,8.2,9.7),.95)
 for x in [-10.1,-5.1,0,5.1,10.1]:
  arch.lattice(b,x,-3.22,11.8,3.6,3.1,'flower')
  lantern(b,x,-6.0,5.9,.60)
 # Low white stone forecourt, with the central processional approach kept open.
 b.box('stone',(0,-12,.34),(36,9,.68));arch.paving(b,0,-12,34,8)
 for sx in [-1,1]:
  rail(b,(sx*5,-16.5,.68),(sx*17.8,-16.5,.68),.88,stone=True)
  rail(b,(sx*17.8,-16.5,.68),(sx*17.8,-7.5,.68),.88,stone=True)
 for i in range(4):b.box('stone',(0,-17-i*.42,.56-i*.13),(9,1,.22))
 arch.paving(b,0,-24,14,11)
 for x in [-11,-5,5,11]:
  b.box('stone',(x,-31,3.7),(.58,.8,7.4));b.box('stone',(x,-31,.35),(1.7,1.8,.7))
 for a,c,z in [(-11,11,5.4),(-5,5,7.6)]:
  b.box('stone',((a+c)/2,-31,z),(c-a+.8,.8,.62));roof(b,(a+c)/2,-31,z+.5,c-a+1.2,1.3,.8)
 for side in [-1,1]:
  def side_tower():
   tier(b,14,9,3.8,skirt=.58,bays=3);tier(b,10.4,5.6,3.1,floor=5.9,bays=3)
  transform(b,side_tower,(side*29,2,0))
  covered_walk(b,(side*14,3),(side*22,3),h=3.7)
 arch.paving(b,0,22,25,15)
 transform(b,lambda:arch.hall(b,0,0,28,14,6.1,openhall=True,bays=5),(0,36,.6))
 for i in range(5):b.box('stone',(0,27-i*.48,.65-i*.12),(10,1.1,.22))
 arch.desk(b,0,37,1.5,4.5,2.1)
 for x in [-6,6]:arch.vase(b,x,38,.8,.8,'ceramic')
 arch.hall(b,0,68,21,9,4.5,bays=5)
 for side in [-1,1]:
  covered_walk(b,(side*30,12),(side*30,65),h=3.4);covered_walk(b,(side*30,65),(side*12,65),h=3.4)
  for y in [18,48]:pine(b,side*21,y,.85,seed=y+side)
  for ya,yb in ([(-26,25),(37,46),(62,68)] if side==-1 else [(-26,46),(62,68)]):arch.gardenwall(b,(side*37,ya),(side*37,yb),2.55)
 for a,c in [((-37,-26),(-14,-26)),((14,-26),(37,-26)),((-37,76),(37,76))]:arch.gardenwall(b,a,c,2.55)

def install():
 global original_roof
 original_roof=arch.roof;arch.roof=roof;world.tower=tower
 core.PALETTE.update({'roof':'353e40','tile':'465052','tilelight':'525b5b','tiledark':'2e393a','plaster':'e4dfd1','paving':'a1a18e'})

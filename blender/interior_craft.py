"""Authored joinery and scholar's objects; not claims of surviving original furnishings."""
import math, random
from mathutils import Vector
import build_modules as core
import refined_modules as arch

core.PALETTE.update({'bookcover':'374b58','bookcloth':'786956','ink':'383a32','ivory':'d4c39e'})

def bound_book(b,x,y,z,w=.48,d=.34,h=.055,seed=0):
 w=min(w,.52)*(1-(seed%3)*.045);d=min(d,.34)
 cover='bookcover' if seed%3 else 'bookcloth'
 b.box('paper',(x,y,z+h/2),(w-.022,d-.015,h-.012))
 for zz in [z,z+h]:b.box(cover,(x,y,zz),(w,d,.008))
 # Exposed page edges and four stitches on the folded spine.
 for j in range(1,3):b.rod('ivory',(x-w/2+.012,y-d/2-.001,z+h*j/3),(x+w/2-.01,y-d/2-.001,z+h*j/3),.0007,3)
 for yy in [-.33,-.12,.12,.33]:
  b.rod('ivory',(x-w/2+.018,y+yy*d,z+.002),(x-w/2+.018,y+yy*d,z+h+.004),.0035,4)
 b.box('paper',(x+w*.26,y,z+h+.006),(w*.17,d*.55,.003))
 for j in range(4):b.box('ink',(x+w*.26,y+d*(.17-j*.11),z+h+.008),(.016,.02,.001))

def ink_scroll(b,x,y,z,w=.9,h=1.9,seed=0):
 # Silk borders and paper carry a locally authored bamboo ink study in geometry.
 b.box('bookcloth',(x,y,z),(w,.025,h))
 b.box('paper',(x,y-.018,z),(w*.83,.009,h*.8))
 for zz in [-h/2,h/2]:b.rod('darkwood',(x-w*.6,y,z+zz),(x+w*.6,y,z+zz),.032,8)
 rng=random.Random(seed)
 for k in range(3):
  root=Vector((x+(k-1)*w*.19,y-.026,z-h*.33));tip=root+Vector((w*.1,0,h*(.5+k*.05)))
  b.rod('ink',root,tip,.008+k*.002,4,r2=.003)
  for j in range(2,7):
   p=root.lerp(tip,j/7)
   for side in [-1,1]:
    v=p+Vector((side*w*rng.uniform(.10,.23),0,h*.06))
    b.rod('ink',p,v,.003,3)
    for q in range(3):
     mid=p.lerp(v,.45+q*.22);end=mid+Vector((side*w*.12,0,-h*.055))
     b.mesh('ink',[tuple(mid),tuple(mid.lerp(end,.55)+Vector((.015,0,.009))),tuple(end)],[(0,1,2)])

def desk(b,x,y,z=1.5,w=4,d=1.3,marble=False):
 b.box('furniture',(x,y,z),(w,d,.105));b.box('marble' if marble else 'furniture',(x,y,z+.055),(w-.15,d-.15,.012))
 for sy in [-1,1]:b.box('darkwood',(x,y+sy*(d/2-.04),z+.057),(w-.04,.025,.018))
 for dx in [-w/2+.2,w/2-.2]:
  for dy in [-d/2+.15,d/2-.15]:
   b.rod('furniture',(x+dx,y+dy,.58),(x+dx*.96,y+dy*.96,z-.06),.064,10,r2=.085)
   b.rod('furniture',(x+dx,y+dy,z-.29),(x+dx-math.copysign(.22,dx),y+dy,z-.08),.025,6)
  b.rod('darkwood',(x+dx,y-d/2+.15,.86),(x+dx,y+d/2-.15,.86),.035,6)
 for sy in [-1,1]:b.box('furniture',(x,y+sy*(d/2-.11),z-.17),(w-.35,.085,.21))
 for i in range(2):bound_book(b,x-w*.28+i*.035,y+d*.10,z+.066+i*.061,.49,.33,.050,i)
 # A slightly curled sheet and paperweight make an actual writing surface.
 for page in range(2):
  sheet=[]
  for row in range(5):
   for col in range(6):
    u=col/5;v=row/4
    sheet.append((x-.32+u*.61+page*.015,y-.12+v*.43-page*.018,z+.071+page*.006+.022*v**4+.006*math.sin(u*math.pi)*v))
  b.mesh('paper',sheet,[(j*6+i,j*6+i+1,(j+1)*6+i+1,(j+1)*6+i) for j in range(4) for i in range(5)])
 b.rod('ivory',(x+.17,y-.04,z+.083),(x+.17,y+.22,z+.083),.014,8)
 # Rolled scroll, inkstone, water dropper, brush pot and contrasting brush tips.
 b.rod('paper',(x-.30,y-.28,z+.12),(x+.2,y-.28,z+.12),.042,14)
 for xx in [x-.34,x+.24]:b.rod('darkwood',(xx-.045,y-.28,z+.12),(xx+.045,y-.28,z+.12),.024,8)
 b.ellipsoid('ink',(x+w*.15,y-.12,z+.09),(.2,.14,.025),3,rings=4,n=14)
 # The shallow ink pool has a carved rim and an inset reflective surface.
 center=Vector((x+w*.15,y-.12,z+.105));vs=[]
 for radius,zz in [(1,0),(.76,.009),(.67,-.006)]:
  for i in range(24):
   a=i*math.tau/24;vs.append(tuple(center+Vector((math.cos(a)*.19*radius,math.sin(a)*.13*radius,zz))))
 b.mesh('ink',vs,[(r*24+i,r*24+(i+1)%24,(r+1)*24+(i+1)%24,(r+1)*24+i) for r in range(2) for i in range(24)])
 # Slender brush rest and a folded cloth sit beside the writing space.
 for dx in [-.10,.10]:b.rod('ceramic',(x+.68+dx,y+.11,z+.07),(x+.68+dx,y+.11,z+.125),.025,12)
 b.rod('ceramic',(x+.55,y+.11,z+.13),(x+.81,y+.11,z+.13),.026,16)
 b.rod('bamboo',(x+.68,y-.16,z+.148),(x+.68,y+.26,z+.148),.008,8)
 for j in range(4):b.box('bookcloth',(x-w*.34,y-.29+j*.043,z+.082),(.35,.07,.018+j*.004))
 arch.vase(b,x+w*.34,y+d*.12,z+.066,.20,'wood')
 arch.vase(b,x+w*.12,y+d*.22,z+.066,.075,'ceramic')
 for i in range(4):
  a=Vector((x+w*.34,y+d*.12,z+.12));tip=a+Vector((math.sin(i)*.08,math.cos(i)*.06,.40+i*.025))
  b.rod('bamboo',a,tip,.009,6);b.rod('ink',tip,tip+Vector((0,0,.04)),.012,6,r2=.002)
 # Chair with a curved crest rail and structural lower stretchers.
 cx=x;cy=y+d/2+.66
 b.box('furniture',(cx,cy,.99),(.70,.56,.055))
 for dx in [-.29,.29]:
  for dy in [-.22,.22]:b.rod('darkwood',(cx+dx,cy+dy,.55),(cx+dx,cy+dy,1.0),.025,7)
  b.rod('furniture',(cx+dx,cy+.22,.8),(cx+dx,cy+.26,1.73),.028,8)
 for i in range(8):
  a=-.34+i*.085;c=a+.085
  b.rod('furniture',(cx+a,cy+.26,1.72-.17*(a/.34)**2),(cx+c,cy+.26,1.72-.17*(c/.34)**2),.035,8)
 b.box('furniture',(cx,cy+.25,1.34),(.11,.04,.55))

def install():
 arch.desk=desk;arch.bound_book=bound_book

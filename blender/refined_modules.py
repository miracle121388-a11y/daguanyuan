"""Literary architecture pass. Chapter evidence is recorded in config/architecture.json.
Geometry is authored locally. Dimensions and construction details remain interpretive.
"""
import math,random
from mathutils import Vector
import build_modules as core
Batch=core.Batch
core.PALETTE.update({'moss':'687559','paving':'b9b4a1','tile':'5d6b5c','tilelight':'657264','tiledark':'566351','screen':'657b69','silk':'c4a299','thatch':'8b7957','clay':'a28e6c','ceramic':'75918b','marble':'c8c6b6','leafdark':'365541'})

def leaf(b,p,d,length=.48,width=.09,mat='leaf'):
 p=Vector(p);d=Vector(d).normalized();u=d.cross(Vector((0,0,1)))
 if u.length<.1:u=Vector((1,0,0))
 u.normalize();mid=p+d*length*.5;tip=p+d*length+Vector((0,0,-length*.2))
 b.mesh(mat,[tuple(p),tuple(mid-u*width),tuple(mid+Vector((0,0,.045))),tuple(mid+u*width),tuple(tip)],[(0,1,2),(0,2,3),(1,4,2),(2,4,3)])

def tree(b,x,y,size=1,flower=False,seed=1,willow=False):
 rng=random.Random(seed+123);h=4.8*size
 trunk=[(x,y,0),(x+.22*size,y-.1*size,h*.45),(x-.12*size,y+.1*size,h)]
 for i in range(2):b.rod('wood',trunk[i],trunk[i+1],(.25-i*.09)*size,7,r2=(.16-i*.06)*size)
 for j in range(13):
  angle=j*2.399;spread=(1.4+rng.random()*1.6)*size
  end=Vector((x+math.cos(angle)*spread,y+math.sin(angle)*spread,h+(.2+rng.random()*1.1)*size))
  origin=Vector((x,y,h*(.5+j%3*.12)));middle=origin.lerp(end,.65)+Vector((0,0,.45*size))
  b.rod('wood',origin,middle,.095*size,5,r2=.047*size);b.rod('wood',middle,end,.045*size,5,r2=.015*size)
  for k in range(23):
   a=rng.random()*math.tau;r=rng.random()**.5*1.15*size
   p=end+Vector((math.cos(a)*r,math.sin(a)*r,rng.uniform(-.25,.7)*size))
   if willow:
    lower=p-Vector((0,0,(1+rng.random()*1.8)*size));b.rod('bamboo',p,lower,.012*size,3)
    for z in range(6):leaf(b,p.lerp(lower,z/6),(math.cos(a),math.sin(a),-.8),.38*size,.04*size,'lightleaf')
   elif flower and k%2==0:
    for q in range(5):leaf(b,p,(math.cos(q*math.tau/5),math.sin(q*math.tau/5),.25),.20*size,.105*size,'flower' if seed%3 else 'creamflower')
   else:leaf(b,p,(math.cos(a),math.sin(a),rng.uniform(-.2,.8)),.7*size,.23*size,['leaf','lightleaf','leafdark'][k%3])

def bamboo(b,x,y,seed=0):
 rng=random.Random(seed)
 for i in range(3):
  xx=x+rng.uniform(-.5,.5);yy=y+rng.uniform(-.5,.5);h=rng.uniform(4.5,6.5);lean=rng.uniform(-.45,.45)
  b.rod('bamboo',(xx,yy,0),(xx+lean,yy,h),.055,6,r2=.038)
  for j in range(1,10):
   z=j*h/10;b.rod('lightleaf',(xx+lean*j/10,yy,z-.025),(xx+lean*j/10,yy,z+.025),.066,6)
   if j<4:continue
   for side in [-1,1]:
    a=rng.random()*math.tau;start=Vector((xx+lean*j/10,yy,z));end=start+Vector((math.cos(a),math.sin(a),.25))*rng.uniform(.6,1.3)
    b.rod('bamboo',start,end,.024,4,r2=.009)
    for k in range(6):
     p=start.lerp(end,.2+k*.13);d=(math.cos(a+side*.6),math.sin(a+side*.6),-.12-k*.08)
     leaf(b,p,d,.55+rng.random()*.25,.055,'leaf' if k%2 else 'lightleaf')

def banana(b,x,y,size=1):
 b.rod('bamboo',(x,y,0),(x,y,3.1*size),.16*size,8,r2=.10*size)
 for i in range(9):
  a=i*2.399;start=Vector((x,y,(2.2+i%3*.35)*size));d=Vector((math.cos(a),math.sin(a),0))
  v=[]
  for j in range(9):
   t=j/8;p=start+d*(2.1*size*t)+Vector((0,0,(1.1*math.sin(t*math.pi)-.5*t)*size));w=math.sin(t*math.pi)**.7*.38*size
   u=Vector((-d.y,d.x,0));v.extend([tuple(p-u*w),tuple(p+Vector((0,0,.04*size))),tuple(p+u*w)])
  b.mesh('lightleaf' if i%3 else 'leaf',v,[(j*3,j*3+3,j*3+4,j*3+1) for j in range(8)]+[(j*3+1,j*3+4,j*3+5,j*3+2) for j in range(8)])
  for j in range(0,8,2):b.rod('bamboo',v[j*3+1],v[(j+1)*3+1],.026*size,4)

def vase(b,x,y,z,size=1,mat='ceramic',flowers=False):
 profile=[(0,.34),(.08,.45),(.45,.6),(.82,.44),(1.0,.18),(1.18,.23)]
 vs=[(x+r*size*math.cos(i*math.tau/16),y+r*size*math.sin(i*math.tau/16),z+h*size) for h,r in profile for i in range(16)]
 b.mesh(mat,vs,[(j*16+i,j*16+(i+1)%16,(j+1)*16+(i+1)%16,(j+1)*16+i) for j in range(len(profile)-1) for i in range(16)])
 if flowers:
  for i in range(11):
   a=i*2.4;p=(x+math.cos(a)*size*.65,y+math.sin(a)*size*.65,z+(1.7+i%3*.2)*size)
   b.rod('leafdark',(x,y,z+size),p,.018*size,4)
   for j in range(10):leaf(b,p,(math.cos(j*math.tau/10),math.sin(j*math.tau/10),.15),.21*size,.035*size,'creamflower')

def desk(b,x,y,z=1.5,w=4,d=1.3,marble=False):
 b.box('wood',(x,y,z),(w,d,.2));b.box('marble' if marble else 'darkwood',(x,y,z+.11),(w-.16,d-.16,.035))
 for dx in [-w/2+.18,w/2-.18]:
  for dy in [-d/2+.16,d/2-.16]:b.box('wood',(x+dx,y+dy,z/2),(.13,.13,z));b.box('wood',(x+dx,y,z-.25),(.12,d,.24))
 for i in range(3):b.box('paper',(x-w*.25+i*.5,y,z+.17+i*.018),(.85,.62,.04))
 b.box('darkwood',(x+.7,y-.15,z+.18),(.45,.32,.07));vase(b,x+w*.3,y,z+.14,.28,'wood')
 for i in range(7):b.rod('wood',(x+w*.3+.04*math.sin(i),y+.05*math.cos(i),z+.3),(x+w*.3+math.sin(i)*.12,y+math.cos(i)*.12,z+.9+i%3*.08),.016,4)

def lattice(b,x,y,z,w=2,h=2.6,pattern='grid',paper=True):
 b.box('darkwood',(x,y,z),(w+.14,.12,h+.14))
 # Front frame is not filled with an opaque timber block.
 if paper:b.box('silk' if pattern=='bamboo' else 'screen',(x,y-.071,z),(w-.1,.014,h-.1))
 else:b.box('paper',(x,y+.035,z),(w-.1,.014,h-.1))
 for dx in [-w/2,w/2]:b.box('wood',(x+dx,y-.1,z),(.07,.085,h))
 for zz in [-h/2,h/2]:b.box('wood',(x,y-.1,z+zz),(w,.085,.07))
 rows=5;cols=4 if pattern=='flower' else 3
 for i in range(1,cols):b.box('wood',(x-w/2+i*w/cols,y-.1,z),(.042,.075,h))
 for j in range(1,rows):b.box('wood',(x,y-.1,z-h/2+j*h/rows),(w,.075,.042))
 if pattern=='flower':
  for i in range(cols):
   for j in range(rows):
    cx=x-w/2+(i+.5)*w/cols;cz=z-h/2+(j+.5)*h/rows;rx=w/cols*.34;rz=h/rows*.34
    pts=[(cx,y-.15,cz+rz),(cx+rx,y-.15,cz),(cx,y-.15,cz-rz),(cx-rx,y-.15,cz)]
    for a,c in zip(pts,pts[1:]+pts[:1]):b.rod('wood',a,c,.025,4)

def roof(b,x,y,z,w,d,h=2.25,detail=True,rolled=False,thatch=False):
 if thatch:
  ridge=w*.43
  b.mesh('thatch',[(x-w/2-1,y-d/2-1,z),(x+w/2+1,y-d/2-1,z),(x+w/2,y,z+h),(x-w/2,y,z+h),(x-w/2-1,y+d/2+1,z),(x+w/2+1,y+d/2+1,z)],[(0,1,2,3),(3,2,5,4)])
  for sy in [-1,1]:
   for i in range(int(w*6)):
    xx=x-w/2+i/6;b.rod('clay' if i%4 else 'thatch',(xx,y,z+h+.05),(xx+.1*math.sin(i),y+sy*(d/2+1),z-.15),.035,3)
  return
 ridge=max(.4,w/2-d*.32);steps=10;cols=max(8,int(w/.38))
 def point(u,t,sy,lift=0):
  half=ridge+(w/2+1-ridge)*t;zz=z+h*(1-t)**1.7+.34*t**8
  if rolled:zz=z+h*math.cos(t*math.pi/2)**1.1+.18*t**8
  return (x+u*half,y+sy*t*(d/2+1),zz+lift+.2*t**5*abs(u)**8)
 # Both long slopes and hip ends follow the same sampled curve; no flat triangle caps.
 for sy in [-1,1]:
  vs=[point(u,j/steps,sy) for j in range(steps+1) for u in [-1,1]]
  b.mesh('roof',vs,[(j*2,j*2+1,j*2+3,j*2+2) if sy>0 else (j*2+2,j*2+3,j*2+1,j*2) for j in range(steps)])
 for sx in [-1,1]:
  vs=[point(sx,j/steps,sy) for j in range(steps+1) for sy in [-1,1]]
  b.mesh('roof',vs,[(j*2,j*2+2,j*2+3,j*2+1) if sx>0 else (j*2+1,j*2+3,j*2+2,j*2) for j in range(steps)])
  for sy in [-1,1]:
   pts=[point(sx,j/steps,sy,.09) for j in range(steps+1)]
   for a,c in zip(pts,pts[1:]):b.rod('tiledark',a,c,.075,5)
   a=pts[-1];b.rod('tiledark',a,(a[0]+sx*.35,a[1]+sy*.2,a[2]+.2),.07,5,r2=.035)
 if not rolled:b.rod('tiledark',(x-ridge-.25,y,z+h+.11),(x+ridge+.25,y,z+h+.11),.13,8)
 for sy in [-1,1]:
  if detail:
   for i in range(cols):
    u=-1+2*i/cols;du=2/cols*.9
    for j in range(steps):
     t=j/steps;t2=(j+1)/steps
     vs=[point(u,t,sy,.04),point(u+du/2,t,sy,.105),point(u+du,t,sy,.04),point(u,t2,sy,.04),point(u+du/2,t2,sy,.105),point(u+du,t2,sy,.04)]
     faces=[(0,1,4,3),(1,2,5,4)];faces=faces if sy==1 else [tuple(reversed(f)) for f in faces]
     b.mesh(['tile','tilelight','tiledark'][(i+j*3)%3],vs,faces)
   for i in range(cols+1):
    p=point(-1+2*i/cols,1,sy,.04);b.rod('tiledark',(p[0],p[1]-.1*sy,p[2]),(p[0],p[1]+.15*sy,p[2]),.078,7)
  rafter_count=max(6,int(w/.65))
  for i in range(rafter_count):
   u=-.92+1.84*i/(rafter_count-1)
   b.rod('wood',point(u,.57,sy,-.13),point(u,1,sy,-.12),.055,5)
 b.box('darkwood',(x,y-d/2-.35,z-.16),(w+1,.16,.18))

def hall(b,x=0,y=6,w=18,d=8,h=4.4,openhall=False,detail=True,bays=3,style='plain',rolled=False,thatch=False):
 b.box('stone',(x,y,.24),(w+1.6,d+1.8,.48));b.box('paving',(x,y,.5),(w+.6,d+.6,.06))
 for i in range(3):b.box('stone',(x,y-d/2-.75-i*.33,.37-i*.11),(w*.38,.7,.22))
 wallmat='clay' if thatch else 'plaster';front=y-d/2
 b.box(wallmat,(x,y+d/2,h/2+.55),(w,.32,h))
 for sx in [-1,1]:b.box(wallmat,(x+sx*w/2,y,h/2+.55),(.32,d,h))
 spacing=w/bays
 if not openhall:
  for i in range(bays):
   cx=x-w/2+(i+.5)*spacing
   if i==bays//2:
    for dx in [-spacing*.32,spacing*.32]:
     lattice(b,cx+dx,front+.1,2.65,spacing*.32,3.65,style)
    b.box('wood',(cx,front,.62),(spacing*.9,.3,.15))
   else:
    b.box(wallmat,(cx,front,1.05),(spacing,.32,1))
    lattice(b,cx,front-.08,3.02,spacing*.8,2.7,style)
 else:
  for i in range(bays+1):
   cx=x-w/2+i*spacing
   b.box('wood',(cx,front,3.9),(.1,.4,.8))
 for i in range(bays+1):
  cx=x-w/2+i*spacing
  for sy in [-1,1]:
   cy=y+sy*(d/2+.42);b.rod('stone',(cx,cy,.42),(cx,cy,.68),.29,10,r2=.23);b.rod('wood',(cx,cy,.64),(cx,cy,h+.8),.145,10,r2=.12)
   for k in range(3):b.box('wood',(cx,cy,h+.4+k*.16),(.32+k*.18,.38+k*.08,.12))
 for sy in [-1,1]:b.box('wood',(x,y+sy*(d/2+.42),h+.8),(w+.5,.22,.28))
 roof(b,x,y,h+.94,w+.3,d+.65,detail=detail,rolled=rolled,thatch=thatch)
 if not thatch:b.box('darkwood',(x,front-.16,h-.04),(min(3,w*.3),.12,.65))

def corridor(b,points,width=2.1,h=2.9):
 for a,c in zip(points,points[1:]):
  ax,ay=a;cx,cy=c;length=math.dist(a,c)
  # The supplied runs are axis-aligned; rotate a temporary local mesh batch for N/S runs.
  start={k:len(v[0]) for k,v in b.data.items()};mx=(ax+cx)/2;my=(ay+cy)/2
  b.box('paving',(0,0,.3),(length+.3,width+.3,.18))
  for i in range(max(1,int(length/3))+1):
   xx=-length/2+length*i/max(1,int(length/3))
   for sy in [-1,1]:b.rod('wood',(xx,sy*width/2,.35),(xx,sy*width/2,h),.10,7)
  roof(b,0,0,h,length+.4,width,.75,detail=True)
  angle=math.atan2(cy-ay,cx-ax)
  for mat,(vs,_) in b.data.items():
   for i in range(start.get(mat,0),len(vs)):
    xx,yy,zz=vs[i];vs[i]=(mx+xx*math.cos(angle)-yy*math.sin(angle),my+xx*math.sin(angle)+yy*math.cos(angle),zz)

def gardenwall(b,a,c,h=2.45):
 core.wall(b,a,c,h)
 # Double coping courses give the long wall a tiled silhouette.
 dx=c[0]-a[0];dy=c[1]-a[1];length=math.hypot(dx,dy);u=Vector((dx/length,dy/length,0));normal=Vector((-u.y,u.x,0))
 for i in range(int(length/.44)+1):
  p=Vector((a[0],a[1],h+.36))+u*i*.44
  b.rod('tile',p-normal*.38,p+normal*.38,.075,5)

def perforated_rock(b,x,y,s=1,seed=0):
 # A composed eroded limestone screen with actual holes through three stone arches.
 rng=random.Random(seed)
 for j in range(3):
  cx=x+(j-1)*s*.76;cz=(1.2+j%2*.65)*s
  vs=[];n=20;k=7
  for i in range(n):
   a=i*math.tau/n;thick=(.3+.08*math.sin(a*5+seed))*s
   for q in range(k):
    t=q*math.tau/k;r=(.7+.11*math.sin(a*3+j))*s
    vs.append((cx+(r+thick*math.cos(t))*math.cos(a),y+thick*math.sin(t)+math.sin(a*2)*s*.12,cz+(r*.9+thick*math.cos(t))*math.sin(a)))
  b.mesh('stone',vs,[(i*k+q,((i+1)%n)*k+q,((i+1)%n)*k+(q+1)%k,i*k+(q+1)%k) for i in range(n) for q in range(k)])
  core.rock(b,cx,y,s*.53,seed+j)
 for i in range(18):
  a=rng.random()*math.tau;p=(x+math.cos(a)*s*1.5,y+.25,1.5*s+rng.uniform(-1,1)*s)
  leaf(b,p,(math.sin(a),0,-1),.5,.18,'moss')

def paving(b,x,y,w,d,pebbles=False):
 rng=random.Random(82)
 if pebbles:
  for i in range(int(d/.48)):
   yy=y-d/2+i*.48;xx=x+math.sin(i*.45)*.65
   for j in range(4):b.ellipsoid('paving' if j%3 else 'stone',(xx+(j-1.5)*.28,yy,.13),(.13,.21,.045),i*7+j,rings=2,n=5)
 else:
  for row in range(max(1,int(d/.9))):
   for col in range(max(1,int(w/1.5))):b.box('paving' if rng.random()>.2 else 'stone',(x-w/2+.76+col*1.5+(row%2)*.13,y-d/2+.46+row*.9,.105),(1.43,.84,.07))

def courtyard(b,style,detail=True):
 b.box('earth',(0,1,-.04),(34,37,.23))
 for a,c in [((-16,-13),(-16,19)),((16,-13),(16,19)),((-16,19),(16,19))]:gardenwall(b,a,c)
 core.moon_gate(b)
 if style=='bamboo':
  hall(b,0,7,13.2,6.4,3.6,bays=3,style='bamboo')
  # One bright central bay, two private side bays; rear retreat and spring channel.
  for x in [-2.2,2.2]:b.box('wood',(x,7,2.1),(.10,6,3.1))
  corridor(b,[(-12,-10),(-12,2),(-7,2)],1.8,2.8)
  hall(b,7.5,16,8,3.2,2.55,bays=2,style='bamboo')
  tree(b,-7,15,.8,True,3);banana(b,12.5,14,.85)
  for i in range(21):
   x=(-8.5 if i%2 else 7)+(i%3-1)*1.4;y=-9+(i//3)*1.45;bamboo(b,x,y,240+i)
  paving(b,0,-5,2,15,True)
  for aa,cc in [((14,18,.14),(14,-8,.14)),((14,-8,.14),(3,-8,.14)),((3,-8,.14),(3,-14,.14))]:
   a,c=Vector(aa),Vector(cc);d=c-a;side=Vector((-d.y,d.x,0)).normalized()*.23
   b.mesh('water',[tuple(a-side),tuple(c-side),tuple(c+side),tuple(a+side)],[(0,1,2,3)])
   for sign in [-1,1]:b.rod('moss',a+side*sign,c+side*sign,.07,5)
  desk(b,-3,7,1.45,3.2);b.box('wood',(4,8,1.0),(3.1,1.8,.25))
  for k in range(4):
   b.box('wood',(-5.8,8,1+k*.65),(1.1,2,.10))
   for j in range(7):b.box('paper',(-5.8,7.2+j*.23,1.18+k*.65),(.8,.13,.28))
 elif style=='flower':
  hall(b,0,9,20,8,4.3,bays=5,style='flower')
  corridor(b,[(-13,-11),(-13,4),(-10,4)],2.1,3.0);corridor(b,[(13,-11),(13,4),(10,4)],2.1,3.0)
  paving(b,0,-3,12,14)
  tree(b,-6,-1,1.1,True,7)
  for x,y in [(6,-1),(8,1),(7,-3)]:banana(b,x,y,.95)
  perforated_rock(b,-7,-7,.7,12);core.rock(b,8,-8,.7,4)
  desk(b,4,8,1.65,3.8);b.box('wood',(-5,9,1.05),(5,2.5,.38));b.box('silk',(-5,9,1.3),(4.7,2.3,.12))
  for x in [-7.2,-2.8]:b.rod('wood',(x,10,1),(x,10,4),.07);b.box('silk',(x,9,3),(.045,2,2.1))
 elif style=='herb':
  hall(b,0,11,23,7.5,4.0,bays=5,rolled=True,style='grid')
  corridor(b,[(-13,-10),(-13,6)],2,2.8);corridor(b,[(13,-10),(13,6)],2,2.8)
  perforated_rock(b,0,-3,2.25,5)
  paving(b,-8,-2,2.5,17);paving(b,8,-2,2.5,17)
  for i in range(75):
   a=i*2.399;r=3+i%5*1.4;p=(math.cos(a)*r,math.sin(a)*r-1,.2)
   for j in range(4):leaf(b,p,(math.cos(a+j),math.sin(a+j),.6),.65,.09,'lightleaf')
  for x in [-11,11]:
   for j in range(16):leaf(b,(x,2+j*.3,1.2+math.sin(j)*.4),(0,1,-.4),.8,.2,'leaf')
  desk(b,0,10,1.5,3);vase(b,1,10,1.67,.36,'clay',True)
  b.box('wood',(-7,11,1),(3.6,2,.3));b.box('screen',(-7,12,2.5),(3.6,.035,2.5))
 elif style=='study':
  hall(b,0,8,23,9,4.8,openhall=True,bays=3)
  paving(b,0,-3,18,15)
  desk(b,0,6,1.8,9.0,2.4,True);vase(b,-8,7,.54,1.3,'ceramic',True)
  for i in range(18):b.box('darkwood',(-3.8+(i%9)*.72,5.25+(i//9)*.42,1.99),(.38,.28,.04))
  for x in [-3.4,-2.5,2.2,3.2]:
   vase(b,x,6.75,1.94,.33,'wood')
   for j in range(12):b.rod('wood',(x,6.75,2.1),(x+math.sin(j)*.14,6.75+math.cos(j)*.14,2.8+j%4*.04),.012,4)
  for x in [-9,9]:
   for y in [-6,-2]:desk(b,x,y,1.3,1.3,.9)
  # West-wall landscape scroll: a three-dimensional interpretive hanging.
  b.box('silk',(-11.28,8,3.05),(.06,5.7,3.8));b.box('paper',(-11.24,8,3.15),(.03,4.4,2.8))
  for j in range(8):b.box('moss',(-11.20,6+j*.5,2.6+j%3*.3),(.02,.4,.6+j%3*.3))
  for yy in [4.8,11.2]:b.box('darkwood',(-11.23,yy,3.15),(.04,.42,3))
  for x in [-11,11]:tree(b,x,-8,.8,seed=int(x+20))
 for x in [-3,3]:
  b.rod('stone',(x,-10,.1),(x,-10,.65),.27,8);b.rod('stone',(x,-10,.65),(x,-10,.78),.45,10)

def farm(b):
 hall(b,0,7,13,6,2.8,bays=3,thatch=True)
 for x in [-10,10]:hall(b,x,10,5.5,4,2.1,bays=1,thatch=True,detail=False)
 for yy in [-8,-5,-2]:
  b.box('clay',(-3,yy,.12),(13,1.8,.18))
  for xx in range(-9,4):
   for j in range(4):leaf(b,(xx,yy,.2),(math.cos(j*1.6),math.sin(j*1.6),1),.6,.16,'lightleaf')
 core.fence(b,(-14,-11),(13,-11));vase(b,10,-5,0,1,'stone')
 b.rod('wood',(9,-5,0),(9,-5,3),.10);b.rod('wood',(9,-5,3),(12,-5,4),.08)
 for i in range(7):tree(b,-13+(i%2)*25,-7+i*3,.65,True,10+i)

def reeds_house(b):
 hall(b,0,5,17,7,2.8,openhall=True,bays=3,thatch=True)
 core.fence(b,(-10,-7),(-2,-7));core.fence(b,(2,-7),(10,-7))
 for i in range(80):
  a=i*2.399;x=math.sin(a)*13;y=math.cos(a)*8;h=1.2+i%5*.2
  b.rod('bamboo',(x,y,0),(x+.2,y,h),.023,4)
  leaf(b,(x,y,h*.5),(math.cos(a),math.sin(a),.6),.65,.04,'lightleaf')
  b.ellipsoid('thatch',(x+.2,y,h),(.10,.10,.34),i,rings=3,n=5)

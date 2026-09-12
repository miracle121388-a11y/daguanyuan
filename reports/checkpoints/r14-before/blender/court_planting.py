"""Low planting follows a single authored bed map in existing courtyard coordinates."""
import json,math,random
from pathlib import Path
from mathutils import Vector
import build_modules as core
from focal_botany import blade
R=Path(__file__).resolve().parents[1]
SPEC=json.loads((R/'config/garden.planting.json').read_text(encoding='utf8'))

def walkable(place,x,y):
 if place=='xiaoxiangguan':return abs(x)<1.65 or (-13.6<x<-10.5 and y<3) or abs(x-14)<.9 or (3<x<15 and abs(y+8)<.9) or (y<-7 and abs(x-3)<.9)
 if place=='yihongyuan':return (abs(x)<6.5 and -10.5<y<4.6) or abs(x)>11.2
 if place=='hengwuyuan':return abs(x)>6.5 or (x/4.1)**2+((y+3)/2.6)**2<1
 if place=='qiushuangzhai':return (abs(x)<9.6 and -11.0<y<4.7) or abs(x)<3.1
 if place=='daguanlou':return abs(x)<15 or abs(x)>28
 return True

def plant(b,x,y,size,seed,z=.085):
 rng=random.Random(seed);root=Vector((x,y,z));spread=size*rng.uniform(.90,1.35)
 for branch in range(rng.randrange(4,7)):
  a=rng.random()*math.tau;tip=root+Vector((math.cos(a)*spread,math.sin(a)*spread,size*rng.uniform(.18,.62)));bend=root.lerp(tip,.45)+Vector((0,0,size*.19));b.rod('botanical_stem',root,bend,.006*size,4,r2=.003*size)
  for j in range(3):
   p=bend.lerp(tip,j/3)
   for side in [-1,1]:
    angle=a+side*rng.uniform(.6,1.05);blade(b,p,(math.cos(angle),math.sin(angle),rng.uniform(-.1,.3)),size*rng.uniform(.30,.55),size*rng.uniform(.055,.12),droop=.30)
 # A low, overlapping leaf skirt connects the plant feet without adding stems.
 for j in range(8):
  a=j*2.399+rng.uniform(-.22,.22)
  blade(b,root+Vector((0,0,.035)),(math.cos(a),math.sin(a),.16),size*rng.uniform(.65,.95),size*rng.uniform(.08,.13),droop=.10)

def add_court(b,place):
 rng=random.Random(121291+sum(map(ord,place)));count=0
 for bed,(cx,cy,rx,ry,angle) in enumerate(SPEC['courts'].get(place,[])):
  for j in range(round(rx*ry*5.0)):
   a=rng.random()*math.tau;radius=math.sqrt(rng.random());xx=math.cos(a)*rx*radius;yy=math.sin(a)*ry*radius;x=cx+xx*math.cos(angle)-yy*math.sin(angle);y=cy+xx*math.sin(angle)+yy*math.cos(angle)
   flow=.78+.22*math.sin(x*1.1+y*.84+bed)
   if radius>flow or any(walkable(place,x+dx,y+dy) for dx,dy in [(0,0),(.40,0),(-.40,0),(0,.40),(0,-.40)]):continue
   size=rng.uniform(.38,.88)*(1-.22*radius);plant(b,x,y,size,bed*1900+j);count+=1
  # Small fallen leaf groups sit in the soil, not equally spaced specimen dots.
  for j in range(round(rx*ry*9)):
   a=rng.random()*math.tau;r=math.sqrt(rng.random());x=cx+math.cos(a)*rx*r;y=cy+math.sin(a)*ry*r
   if walkable(place,x,y):continue
   blade(b,(x,y,.078),(math.cos(a),math.sin(a),.0),rng.uniform(.055,.17),rng.uniform(.01,.035),'botanical_litter',droop=0)
 print('CONNECTED COURT BEDS',place,count,flush=True)

def add_shore(b,layout):
 import spatial_world as world
 nodes={n['id']:n['position'] for n in layout['pathNodes']};edges=[(nodes[e['from']],nodes[e['to']]) for e in layout['pathEdges'] if e['kind']!='connection'];rng=random.Random(120192)
 def distance(x,y,a,c):
  dx,dy=c[0]-a[0],c[1]-a[1];t=max(0,min(1,((x-a[0])*dx+(y-a[1])*dy)/max(.001,dx*dx+dy*dy)));return math.hypot(x-a[0]-dx*t,y-a[1]-dy*t)
 main=next(p for p in layout['places'] if p['id']=='daguanlou');mx,my,_=main['position'];count=0
 for ring in [layout['terrain']['lake']['outline']]+layout['terrain']['lake']['holes']:
  for a,c in zip(ring,ring[1:]+ring[:1]):
   dx,dy=c[0]-a[0],c[1]-a[1];length=math.hypot(dx,dy);nx,ny=-dy/length,dx/length
   for j in range(max(1,round(length*1.3))):
    t=(j+.5)/max(1,round(length*1.3));px=a[0]+dx*t;py=a[1]+dy*t
    if abs(px-mx)>69 or abs(py-(my-18))>58:continue
    if math.sin(px*.37+py*.16)+.4*math.sin(py*.81)<-.7:continue
    for k in range(3):
     offset=rng.uniform(.7,2.4);x=px+nx*offset;y=py+ny*offset
     if world.in_water(layout,x,y):x=px-nx*offset;y=py-ny*offset
     if world.in_water(layout,x,y) or min(distance(x,y,a,c) for a,c in edges)<3.0:continue
     plant(b,x,y,rng.uniform(.32,.74),711000+count,z=.08);count+=1
 print('CONNECTED SHORE UNDERGROWTH',count,flush=True)

def install():
 import spatial_world as world
 old_court=world.courtyard;old_tower=world.tower;old_terrain=world.terrain
 def court(b,style):old_court(b,style);add_court(b,b.parent.get('placeId'))
 def tower(b):old_tower(b);add_court(b,'daguanlou')
 def terrain(b,layout):old_terrain(b,layout);add_shore(b,layout)
 world.courtyard=court;world.tower=tower;world.terrain=terrain

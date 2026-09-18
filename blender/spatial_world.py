"""Connected interpretive landscape from the atlas and chapters 17/18/38/76."""
import bpy, math, random, json, hashlib
from pathlib import Path
from mathutils import Vector
from reference_world import *
import reference_world as previous
GROUND_COVER=[]

def inside(poly,x,y):
 result=False
 for i,a in enumerate(poly):
  c=poly[(i+1)%len(poly)]
  if (a[1]>y)!=(c[1]>y) and x<(c[0]-a[0])*(y-a[1])/(c[1]-a[1])+a[0]:result=not result
 return result

def in_water(layout,x,y,margin=0):
 lake=layout['terrain']['lake']
 return inside(lake['outline'],x,y) and not any(inside(h,x,y) for h in lake['holes'])

def flat_region(b,loops,z=.06):
 """Blender's 2D curve tessellator preserves holes without filling the canal."""
 curve=bpy.data.curves.new('ShoreTessellation','CURVE');curve.dimensions='2D';curve.fill_mode='BOTH';curve.resolution_u=1
 for points in loops:
  spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
  for p,co in zip(spline.points,points):p.co=(co[0],co[1],0,1)
  spline.use_cyclic_u=True
 ob=bpy.data.objects.new('ShoreTessellation',curve);bpy.context.scene.collection.objects.link(ob);bpy.context.view_layer.update()
 ev=ob.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh();b.mesh('earth',[(v.co.x,v.co.y,z) for v in mesh.vertices],[tuple(p.vertices) for p in mesh.polygons]);ev.to_mesh_clear();bpy.data.objects.remove(ob,do_unlink=True);bpy.data.curves.remove(curve)

def hill_height(layout,x,y):
 height=0
 for h in layout['terrain']['hills']:
  cx,cy=h['center'];rx,ry=h['radius'];r=max(abs(x-cx)/rx,abs(y-cy)/ry)
  f=max(0,min(1,(1-r)/.45));height=max(height,h['height']*f*f*(3-2*f))
 return height

def tower(b):
 """牌坊—大观楼—顾恩思义殿—后殿; east and west pavilions linked by galleries."""
 # Gate is an actual opening, with white-stone columns and lintels.
 for x in [-11,-5,5,11]:
  b.box('stone',(x,-31,3.7),(.58,.8,7.4));b.box('stone',(x,-31,.35),(1.7,1.8,.7))
 for a,c,z in [(-11,11,5.4),(-5,5,7.6)]:
  b.box('stone',((a+c)/2,-31,z),(c-a+.8,.8,.62));arch.roof(b,(a+c)/2,-31,z+.5,c-a+1.2,1.3,.8)
 arch.paving(b,0,-17,23,18)
 # Two storeys give the central楼 a measured hierarchy; no fantasy tower stack.
 for z,w,d,h in [(0,32,16,6.2),(8.3,28,13,5.1)]:
  transform(b,lambda w=w,d=d,h=h:arch.hall(b,0,2,w,d,h,openhall=True,bays=5),(0,0,z))
  if z:
   for sy in [-1,1]:rail(b,(-12,2+sy*6.8,z+.55),(12,2+sy*6.8,z+.55),1)
 for side in [-1,1]:
  for z,w,d,h in [(0,14,10,4.2),(6.2,12,8,3.5)]:
   transform(b,lambda w=w,d=d,h=h:arch.hall(b,0,0,w,d,h,openhall=True,bays=3),(side*29,4,z))
  covered_walk(b,(side*14,3),(side*22,3),h=3.7)
 # Formal courtyard and main hall behind the楼. Side galleries avoid the stairs.
 arch.paving(b,0,22,25,15)
 transform(b,lambda:arch.hall(b,0,0,28,14,6.1,openhall=True,bays=5),(0,36,.6))
 for i in range(5):b.box('stone',(0,27-i*.48,.65-i*.12),(10,1.1,.22))
 arch.desk(b,0,37,1.5,4.5,2.1)
 for x in [-6,6]:arch.vase(b,x,38,.8,.8,'ceramic')
 arch.hall(b,0,68,21,9,4.5,bays=5)
 for side in [-1,1]:
  covered_walk(b,(side*30,12),(side*30,65),h=3.4)
  covered_walk(b,(side*30,65),(side*12,65),h=3.4)
  pine(b,side*20,19,1.05,seed=91+side);pine(b,side*20,49,1.05,seed=94+side)
  for ya,yb in ([(-26,25),(37,46),(62,68)] if side==-1 else [(-26,46),(62,68)]):arch.gardenwall(b,(side*37,ya),(side*37,yb),2.55)
 for a,c in [((-37,-26),(-14,-26)),((14,-26),(37,-26)),((-37,76),(37,76))]:arch.gardenwall(b,a,c,2.55)

def waterhall(b):
 # Four openable-looking window walls, a raised timber floor and real piers.
 b.box('wood',(0,0,1),(16,9,.25))
 for x in [-7.5,-2.5,2.5,7.5]:
  for y in [-4,4]:
   b.rod('stone',(x,y,-1),(x,y,.9),.28,8);b.rod('wood',(x,y,1),(x,y,5.1),.13,8)
 for sy in [-1,1]:
  for x in [-5,0,5]:
   if not(sy==1 and x==0):arch.lattice(b,x,sy*4,3.2,3.3,2.6,'grid')
  b.box('wood',(0,sy*4,5.0),(16,.22,.3))
 for sx in [-1,1]:
  for yy in [-2.5,2.5]:transform(b,lambda:arch.lattice(b,0,0,3.2,2.4,2.6,'grid'),(sx*7.5,yy,0),math.pi/2)
 arch.roof(b,0,0,5.2,17,10,2.5);arch.desk(b,0,0,1.65,5,1.8)

def qinfang(b,a,c):
 arched_bridge(b,a,c,6.5,1.7)
 for t in [1/3,2/3]:
  p=Vector(a).lerp(Vector(c),t);b.box('stone',(p.x,p.y,-.1),(7.1,1.35,3.6))
 center=Vector(a).lerp(Vector(c),.5);z=center.z+1.7
 for x in [-2.8,2.8]:
  for y in [-2.3,2.3]:b.rod('wood',(center.x+x,center.y+y,z),(center.x+x,center.y+y,z+4.3),.17,9)
 arch.roof(b,center.x,center.y,z+4.4,7.2,6.3,2)

def stair_path(b,a,c,width=2.8):
 a,c=Vector(a),Vector(c);length=(c-a).length;steps=max(1,math.ceil(abs(c.z-a.z)/.19))
 if abs(c.z-a.z)<.25:garden_path(b,a,c,width);return
 normal=Vector((-(c-a).y,(c-a).x,0)).normalized()*width/2
 for i in range(steps):
  p=a.lerp(c,i/steps);q=a.lerp(c,(i+1)/steps);q.z=p.z
  top=[p-normal,p+normal,q+normal,q-normal];bottom=[Vector((v.x,v.y,.03)) for v in top]
  b.mesh('stone',[tuple(v) for v in top+bottom],[(0,1,2,3),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)])

def terrain(b,layout):
 lake=layout['terrain']['lake']
 fill=json.loads((Path(__file__).resolve().parents[1]/'config/shore-fill.json').read_text(encoding='utf-8'))
 assert fill['lakeSha256']==hashlib.sha256(json.dumps(lake,sort_keys=True).encode()).hexdigest(),'Stale shoreline geometry'
 b.mesh('earth',fill['vertices'],fill['faces'])
 nodes={n['id']:Vector(n['position']) for n in layout['pathNodes']}
 def distance(x,y,a,c):
  dx,dy=c.x-a.x,c.y-a.y;t=max(0,min(1,((x-a.x)*dx+(y-a.y)*dy)/max(.00001,dx*dx+dy*dy)));return math.hypot(x-a.x-dx*t,y-a.y-dy*t)
 def road_clear(x,y,margin=3):return all(distance(x,y,nodes[e['from']],nodes[e['to']])>margin for e in layout['pathEdges'] if e['kind']!='connection')
 def built(x,y,p):
  px,py,_=p['position']
  if p['id']=='daguanlou':return abs(x-px)<40 and -38<y-py<80
  if p['style']=='rockery':return abs(x-px)<14 and abs(y-py)<13
  return abs(x-px)<(21 if p['featured'] else 16) and -20<y-py<24
 segments=[(Vector((*a,0)),Vector((*ring[(i+1)%len(ring)],0))) for ring in [lake['outline']]+lake['holes'] for i,a in enumerate(ring)]
 def relief_height(x,y):
  # Ground stays exactly level at every reviewed path and building platform.
  base=hill_height(layout,x,y)
  if in_water(layout,x,y):return 0
  outside=max(abs(x)-148,y-149,-y-140,0)
  if outside>0:return 0
  road_edges=[e for e in layout['pathEdges'] if e['kind'] in ['path','stairs']]
  nearest=min(road_edges,key=lambda e:distance(x,y,nodes[e['from']],nodes[e['to']]))
  a,c=nodes[nearest['from']],nodes[nearest['to']];clearance=distance(x,y,a,c)
  if clearance<6:
   levels=[]
   for edge in road_edges:
    aa,cc=nodes[edge['from']],nodes[edge['to']]
    if distance(x,y,aa,cc)>=6:continue
    dx,dy=cc.x-aa.x,cc.y-aa.y;t=max(0,min(1,((x-aa.x)*dx+(y-aa.y)*dy)/max(.00001,dx*dx+dy*dy)))
    levels.append(aa.z+(cc.z-aa.z)*t-.17)
   return min(base,max(0,min(levels)))
  if any(built(x,y,p) for p in layout['places']):return base
  shore=min(distance(x,y,a,c) for a,c in segments)
  fade=max(0,min(1,(clearance-6)/7))*max(0,min(1,(shore-3)/6))
  land=.45+1.75*(.5+.5*math.sin(x*.038+y*.019))*(.5+.5*math.sin(y*.047-x*.011))
  land+=.20*math.sin(x*.31+y*.17)*math.sin(y*.26-x*.21)
  return max(base,land*fade)
 # A continuous sampled terrain replaces the flat display base. Cells near the
 # exact shoreline stay on the tessellated base so the water boundary is intact.
 step=4;xs=list(range(-360,361,step));ys=list(range(-308,373,step));vs=[];dry=[]
 for y in ys:
  for x in xs:
   h=relief_height(x,y);vs.append((x,y,h+.075));dry.append(not in_water(layout,x,y))
 faces=[];stride=len(xs)
 for j in range(len(ys)-1):
  for i in range(stride-1):
   ids=(j*stride+i,j*stride+i+1,(j+1)*stride+i+1,(j+1)*stride+i)
   if all(dry[k] for k in ids) and not in_water(layout,xs[i]+step/2,ys[j]+step/2):faces.append(ids)
 b.mesh('earth',vs,faces)
 # Continuous eroded bank faces follow the reviewed ring; rock groups gather
 # around coves and bends instead of repeating once per fixed planting interval.
 rng=random.Random(82026)
 for ring in [lake['outline']]+lake['holes']:
  for i,p in enumerate(ring):
   q=ring[(i+1)%len(ring)];dx,dy=q[0]-p[0],q[1]-p[1];length=math.hypot(dx,dy);nx,ny=-dy/length,dx/length
   if in_water(layout,p[0]+nx,p[1]+ny):nx,ny=-nx,-ny
   tx,ty=dx/length,dy/length;intervals=max(1,math.ceil(length/2.0))
   for j in range(intervals):
    t=(j+.5)/intervals;x=p[0]+dx*t;y=p[1]+dy*t
    if not road_clear(x,y,4.4):continue
    step=length/intervals*.53;a=(x-tx*step,y-ty*step);c=(x+tx*step,y+ty*step)
    vs=[]
    for layer in range(4):
     for xx,yy in [a,c]:
      wave=math.sin(xx*.47+yy*.31)*.5+math.sin(yy*.24-xx*.16)*.5
      off,z=[(-.22,-1.0),(.08,-.17),(.80+wave*.35,.22+wave*.10),(2.35+wave*.83,.105)][layer]
      vs.append((xx+nx*off,yy+ny*off,z))
    b.mesh('bankstone',vs,[(0,1,3,2),(2,3,5,4),(4,5,7,6)])
    cluster=math.sin(x*.23+y*.17)+math.sin(y*.11-x*.27)
    if cluster>.52:
     for k in range(2 if cluster<1.3 else 4):
      along=rng.uniform(-1.6,1.6);depth=rng.uniform(-.15,2.3);size=rng.uniform(.40,1.25)*(1.15 if k==0 else .8)
      rx=x+tx*along+nx*depth;ry=y+ty*along+ny*depth
      if road_clear(rx,ry,4.4):transform(b,lambda:core.rock(b,0,0,size,i*51+j*7+k),(rx,ry,-.55 if depth<.6 else -.12))
    if cluster>.85 and j%2==0:
     for k in range(2):
      depth=rng.uniform(2.3,4.2);along=rng.uniform(-1.7,1.7)
      transform(b,lambda:shrub(b,0,0,rng.uniform(.65,1.5),i*29+j+k),(x+nx*depth+tx*along,y+ny*depth+ty*along,.09))
    for k in range(5 if cluster>.2 else 1):
     along=rng.uniform(-1.6,1.6);depth=rng.uniform(1.25,5.0);gx=x+nx*depth+tx*along;gy=y+ny*depth+ty*along
     if not in_water(layout,gx,gy) and road_clear(gx,gy,3.0) and not any(built(gx,gy,p) for p in layout['places']):
      GROUND_COVER.append({'x':gx,'y':gy,'z':relief_height(gx,gy)+.08,'scale':rng.uniform(1.3,3.1),'rotation':rng.random()*math.tau})
    if cluster>1.35 and (i*7+j)%11==0 and road_clear(x+nx*4,y+ny*4,5):
     tree(b,x+nx*4,y+ny*4,rng.uniform(.9,1.45),seed=i*7+j,willow=True)
 # Interior canopy is planted in irregular compartments, with authored clear
 # approaches and occasional mature trees. No solitary tree grid is used.
 centers=[(-122,-102,17),(-75,-113,18),(-37,-112,12),(40,-103,13),(-61,-75,13),(36,-65,10),(-73,-56,15),(-103,-31,12),(-81,5,13),(-90,80,17),(-42,93,14),(-12,105,13),(11,91,10),(117,-86,12),(79,-86,14),(97,-13,14),(116,28,14),(119,88,13),(58,137,14),(-136,121,15)]
 count=0
 for i in range(22000):
  cx,cy,r=centers[i%len(centers)];x=rng.gauss(cx,r*.64);y=rng.gauss(cy,r*.64)
  if not(-143<x<143 and -134<y<145):continue
  if in_water(layout,x,y) or not road_clear(x,y,3.7) or any(built(x,y,p) for p in layout['places']):continue
  z=relief_height(x,y);size=rng.uniform(1.10,2.2)
  if i%53==0:transform(b,lambda:tree(b,0,0,1.35,flower=True,seed=i),(x,y,z))
  else:tree(b,x,y,size,seed=i);TREE_POINTS[-1]['z']=z
  if i%3==0:transform(b,lambda:shrub(b,0,0,1.6,i),(x+.8,y,z))
  if i%2==0:
   for k in range(2):GROUND_COVER.append({'x':x+math.cos(i+k)*1.3,'y':y+math.sin(i+k)*1.3,'z':z+.08,'scale':rng.uniform(1.7,2.8),'rotation':rng.random()*math.tau})
  count+=1
  if count>=960:break
 # Dense connected background copses replace the previous sparse grass park.
 for group in range(23):
  angle=-.14+group*math.pi/22;radius=185+17*math.sin(group*1.9)
  cx,cy=math.cos(angle)*radius,math.sin(angle)*radius+14
  for j in range(34):
   x,y=rng.gauss(cx,15),rng.gauss(cy,14)
   if abs(x)<150 and -140<y<150:continue
   tree(b,x,y,rng.uniform(1.35,2.35),seed=5000+group*34+j);TREE_POINTS[-1]['z']=relief_height(x,y)
 for cx,cy in [(-170,-166),(-89,-173),(108,-175),(190,-171)]:
  for j in range(24):
   x,y=rng.gauss(cx,14),rng.gauss(cy,13)
   tree(b,x,y,rng.uniform(1.25,2.15),seed=8000+j+int(cx));TREE_POINTS[-1]['z']=relief_height(x,y)
 # Original front wall and two closed side boundaries enclose the entire garden.
 for a,c in [((-147,-137),(-12,-137)),((12,-137),(147,-137)),((-147,-137),(-147,147)),((147,-137),(147,147)),((-147,147),(147,147))]:arch.gardenwall(b,a,c,2.9)
 for e in layout['pathEdges']:
  a,c=nodes[e['from']],nodes[e['to']];kind=e['kind']
  if kind=='connection':continue
  if kind=='bridge':
   if e['from']=='qinfang-0':qinfang(b,a,c)
   else:arched_bridge(b,a,c,2.8,.8)
  elif kind=='gallery':covered_walk(b,(a.x,a.y),(c.x,c.y),width=2.15,h=2.9,z=1)
  elif kind=='bamboo_bridge':
   stair_path(b,a,c,1.5)
   for side in [-1,1]:rail(b,a+Vector((side*.75,0,0)),c+Vector((side*.75,0,0)),.8)
  elif kind=='stairs':stair_path(b,a,c)
  else:garden_path(b,a,c,3.2 if e['from'].startswith('arrival') else 2.5)
 for i,n in enumerate(layout['pathNodes']):
  if i%5 or n['id'].startswith(('ou','moonsteps')):continue
  x,y,z=n['position'];b.rod('wood',(x+2,y,z),(x+2,y,z+2.6),.065,6);lantern(b,x+2,y,z+2.4,.52)
 # The principal screen stands directly behind the gate and masks the inner view.
 for i in range(11):
  x=-13+i*2.6;y=-110+math.sin(i*1.8)*2;core.rock(b,x,y,2.1+(i%3)*.5,80+i)
 # A sequence of small lotus beds leaves the navigation channel open.
 for i in range(135):
  x=68+rng.uniform(-7,28);y=46+rng.uniform(-10,47)
  if not in_water(layout,x,y) or not road_clear(x,y,5):continue
  r=.28+rng.random()*.4;vs=[(x,y,-.045)]+[(x+r*math.cos(k*math.tau/10),y+r*math.sin(k*math.tau/10),-.035) for k in range(10)];b.mesh('lightleaf',vs,[(0,k+1,k+2) for k in range(9)])

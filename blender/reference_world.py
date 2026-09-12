"""Unified garden modeled from the approved image set; editable mesh assemblies."""
import math,random
from mathutils import Vector
import build_modules as core
import refined_modules as arch
TREE_POINTS=[]
core.PALETTE.update({'plaster':'ded7c4','roof':'303b3c','tile':'465051','tilelight':'505958','tiledark':'353f40','wood':'806047','darkwood':'493b2b','earth':'617044','moss':'54653f','paving':'b7b29e','leaf':'466539','lightleaf':'70814a','leafdark':'304d32','flower':'d8a5aa','creamflower':'eee0c9','canopy':'476439','canopy_light':'627946','canopy_shadow':'354f32','canopy_gold':'849050','bark':'605342','reed':'968a60','paper':'d4c4a2','screen':'788c71','gold':'b49565','silk':'c1a496','lantern':'efd3a0','glass':'c6d7cb'})

def transform(b,fn,offset=(0,0,0),angle=0):
 starts={k:len(v[0]) for k,v in b.data.items()};fn();co,si=math.cos(angle),math.sin(angle)
 for mat,(vs,_) in b.data.items():
  for i in range(starts.get(mat,0),len(vs)):
   x,y,z=vs[i];vs[i]=(x*co-y*si+offset[0],x*si+y*co+offset[1],z+offset[2])

def tree(b,x,y,size=1,flower=False,seed=1,willow=False):
 if flower:
  from r12_botany import flowering_tree
  return flowering_tree(b,x,y,size,seed)
 if not flower and not willow:
  TREE_POINTS.append({'x':x,'y':y,'size':size,'seed':seed,'placeId':b.parent.get('placeId') if b.parent else None});return
 rng=random.Random(seed+812);h=6.6*size
 root=Vector((x,y,0));trunk=Vector((x+.28*size,y-.14*size,h*.7))
 b.rod('bark',root,trunk,.34*size,9,r2=.13*size)
 for i in range(9):
  a=i*2.399+rng.uniform(-.2,.2);reach=(1.7+rng.random()*1.8)*size
  end=Vector((x+math.cos(a)*reach,y+math.sin(a)*reach,h+size*rng.uniform(-1.1,1.2)))
  bend=trunk.lerp(end,.5)+Vector((0,0,.4*size));b.rod('bark',trunk,bend,.13*size,6,r2=.065*size);b.rod('bark',bend,end,.07*size,5,r2=.016*size)
  if willow:
   for j in range(40):
    theta=j*2.399;arch.leaf(b,end+Vector((math.cos(theta)*size,math.sin(theta)*size,0)),(math.cos(theta),math.sin(theta),-.5),.75*size,.12*size,'leaf')
   for j in range(20):
    t=a+j*.55;top=end+Vector((math.cos(t)*size,math.sin(t)*size,.2*size));length=rng.uniform(1.7,3.8)*size
    last=top
    for k in range(5):
     p=top+Vector((math.cos(t)*.15*k*size,math.sin(t)*.15*k*size,-length*(k+1)/5));b.rod('bamboo',last,p,.016*size,3)
     for side in [-1,1]:arch.leaf(b,p,(side*.5,math.cos(t),-.8),.7*size,.065*size,'canopy_light')
     last=p
  else:
   mat=('flower' if seed%3 else 'creamflower') if flower else ['canopy','canopy_light','canopy_shadow','canopy_gold'][i%4]
   for j in range(72):
    a2=rng.random()*math.tau;r=rng.random()**.45*1.6*size;p=end+Vector((math.cos(a2)*r,math.sin(a2)*r,rng.uniform(-.7,1.1)*size))
    # Small cupped blossoms replace the conspicuous triangular petal cards.
    radius=.105*size;petals=[tuple(p)]+[tuple(p+Vector((math.cos(k*math.tau/7)*radius,math.sin(k*math.tau/7)*radius,.035*size))) for k in range(7)]
    b.mesh(mat,petals,[(0,k+1,(k+1)%7+1) for k in range(7)])

arch.tree=tree

def pine(b,x,y,size=1,seed=1):
 rng=random.Random(seed);h=8.3*size;b.rod('bark',(x,y,0),(x+.35*size,y,h),.32*size,8,r2=.04*size)
 for i in range(10):
  a=i*2.399;z=h*(.38+i*.058);r=(3.4-i*.19)*size;end=(x+math.cos(a)*r,y+math.sin(a)*r,z+.3*size)
  b.rod('bark',(x,y,z),end,.10*size,5,r2=.025*size)
  for j in range(150):
   theta=rng.random()*math.tau;r=rng.random()**.5*1.9*size;p=(end[0]+math.cos(theta)*r,end[1]+math.sin(theta)*r,end[2]+rng.uniform(-.35,.4)*size)
   arch.leaf(b,p,(math.cos(theta),math.sin(theta),.2),.42*size,.05*size,['canopy_shadow','canopy','canopy_light'][j%3])

def shrub(b,x,y,size=1,seed=0,flower=False):
 rng=random.Random(seed)
 for branch in range(10):
  angle=branch*2.399+rng.uniform(-.2,.2);reach=rng.uniform(.45,.95)*size
  root=Vector((x,y,.035));end=root+Vector((math.cos(angle)*reach,math.sin(angle)*reach,rng.uniform(.40,.90)*size))
  bend=root.lerp(end,.55)+Vector((0,0,.18*size));b.rod('bark',root,bend,.015*size,4,r2=.007*size);b.rod('bark',bend,end,.007*size,4,r2=.002*size)
  for j in range(2,8):
   point=bend.lerp(end,(j-2)/6)
   for side in [-1,1]:
    a=angle+side*.75
    arch.leaf(b,point,(math.cos(a),math.sin(a),rng.uniform(-.25,.45)),size*rng.uniform(.18,.29),size*.048,'flower' if flower and j==7 else ['leafdark','leaf','moss'][(j+branch)%3])


def lantern(b,x,y,z,size=.55):
 b.rod('darkwood',(x,y,z+.5*size),(x,y,z+1.1*size),.026*size,4)
 b.ellipsoid('lantern',(x,y,z),(.32*size,.32*size,.5*size),2,rings=5,n=8)
 for dz in [-.5,.5]:b.box('darkwood',(x,y,z+dz*size),(.58*size,.58*size,.065*size))
 for i in range(8):
  a=i*math.tau/8;b.rod('gold',(x+math.cos(a)*.3*size,y+math.sin(a)*.3*size,z-.42*size),(x+math.cos(a)*.3*size,y+math.sin(a)*.3*size,z+.42*size),.018*size,4)

def rail(b,a,c,h=1.05,stone=False):
 a,c=Vector(a),Vector(c);length=(c-a).length;count=max(2,int(length/.95));mat='stone' if stone else 'wood'
 for k in range(count+1):
  p=a.lerp(c,k/count);b.rod(mat,p,p+Vector((0,0,h)),.075 if stone else .05,6)
  if stone:b.ellipsoid('paving',p+Vector((0,0,h+.04)),(.12,.12,.12),k,rings=3,n=6)
 for z in [.23,h]:b.rod(mat,a+Vector((0,0,z)),c+Vector((0,0,z)),.055,6)

def arched_bridge(b,a,c,width=3.4,rise=2.8):
 a,c=Vector(a),Vector(c);d=c-a;length=d.length;u=Vector((-d.y,d.x,0)).normalized();steps=max(12,int(length*1.4))
 for j in range(steps):
  t=j/steps;t2=(j+1)/steps;p=a.lerp(c,t);q=a.lerp(c,t2);p.z+=math.sin(t*math.pi)*rise;q.z+=math.sin(t2*math.pi)*rise
  for sy in [-1,1]:
   aa=p+u*sy*width/2;cc=q+u*sy*width/2;rail(b,aa,cc,1,True)
  vv=[tuple(p-u*width/2),tuple(p+u*width/2),tuple(q+u*width/2),tuple(q-u*width/2)]
  b.mesh('paving',vv,[(3,2,1,0)])
  for sy in [-1,1]:
   aa=p+u*sy*width/2;cc=q+u*sy*width/2;b.mesh('stone',[tuple(aa),tuple(cc),tuple(cc-Vector((0,0,.58))),tuple(aa-Vector((0,0,.58)))],[(0,1,2,3)])
 for p in [a,c]:b.box('stone',p-Vector((0,0,.4)),(width+1,3,1.2))

def garden_path(b,a,c,width=2.8):
 a,c=Vector(a),Vector(c);d=c-a;u=Vector((-d.y,d.x,0)).normalized();length=d.length;n=max(1,int(length/1.4))
 for i in range(n):
  p=a.lerp(c,i/n);q=a.lerp(c,(i+1)/n);b.mesh('paving',[tuple(p-u*width/2),tuple(p+u*width/2),tuple(q+u*width/2),tuple(q-u*width/2)],[(3,2,1,0)])
  b.rod('stone',p-u*width/2,p+u*width/2,.018,3)
 for sy in [-1,1]:b.rod('stone',a+u*sy*width/2,c+u*sy*width/2,.06,5)

def covered_walk(b,a,c,width=2.4,h=3.2,z=.3):
 length=math.dist(a,c);angle=math.atan2(c[1]-a[1],c[0]-a[0])
 def build():
  b.box('wood',(0,0,z),(length,width,.18))
  for i in range(max(2,int(length/3))+1):
   x=-length/2+length*i/max(2,int(length/3))
   for side in [-1,1]:
    b.rod('stone',(x,side*(width/2-.15),-1),(x,side*(width/2-.15),z),.22,7)
    b.rod('wood',(x,side*(width/2-.15),z),(x,side*(width/2-.15),z+h),.11,7)
    lantern(b,x,side*width/2,z+h-.8,.42)
  for side in [-1,1]:rail(b,(-length/2,side*width/2,z),(length/2,side*width/2,z),.8)
  arch.roof(b,0,0,z+h,length+.4,width,.82)
 transform(b,build,((a[0]+c[0])/2,(a[1]+c[1])/2,0),angle)

def waterhall(b):
 b.box('wood',(0,0,1),(16,9,.28))
 for x in [-7.5,-2.5,2.5,7.5]:
  for y in [-4,4]:
   b.rod('stone',(x,y,-1),(x,y,.88),.33,8);b.rod('wood',(x,y,1),(x,y,5.1),.14,9)
   if abs(x)>7:rail(b,(x,-4,1),(x,4,1),.8)
 for side in [-1,1]:
  b.box('wood',(0,side*4,4.9),(16,.18,.3))
  for x in [-5,0,5]:
   b.box('silk',(x,side*4,4.12),(4,.06,.6));lantern(b,x,side*4,4.0,.52)
 arch.roof(b,0,0,5.15,17,10,2.8);arch.desk(b,0,0,2,6,1.8)
 covered_walk(b,(8,0),(19,0),z=.96);covered_walk(b,(-8,0),(-18,-9),z=.96)
 # Rear light bamboo bridge with distinct construction and actual supports.
 for j in range(12):b.rod('bamboo',(-1,4+j*.6,.94),(1,4+j*.6,.94),.055,6)
 for side in [-1,1]:rail(b,(side,4,.96),(side,10.7,.96),.8)
 b.box('stone',(0,11,.1),(3,3,.5))

def tower(b):
 b.box('stone',(0,4,.65),(34,25,1.3));b.box('paving',(0,4,1.34),(33.5,24.5,.12))
 for i in range(8):b.box('stone',(0,-9-i*.65,1.25-i*.15),(12,1.2,.27))
 for x in [-16,16]:rail(b,(x,-8,1.45),(x,16,1.45),1.3,True)
 for x1,x2 in [(-16,-6),(6,16)]:rail(b,(x1,-8,1.45),(x2,-8,1.45),1.3,True)
 for level,(w,d,h,z) in enumerate([(25,15,6,1.45),(21,12,5,8.8),(16,10,4.6,15.3)]):
  def story():
   arch.hall(b,0,4,w,d,h,openhall=level==0,bays=5 if level<2 else 3)
   for sy in [-1,1]:
    if level:rail(b,(-w/2,4+sy*(d/2+.7),.6),(w/2,4+sy*(d/2+.7),.6),.9)
    for x in range(-int(w/2)+2,int(w/2),4):lantern(b,x,4+sy*d/2,h-.1,.85)
  transform(b,story,(0,0,z))
 for side in [-1,1]:
  arch.hall(b,side*30,8,16,8,4.2,openhall=True,bays=3);covered_walk(b,(side*13,4),(side*23,4),h=3.7)
  pine(b,side*24,16,1.45,seed=23+side)

def temple(b):
 arch.hall(b,0,8,18,8,4.5,bays=3)
 for a,c in [((-16,-13),(-16,20)),((16,-13),(16,20)),((-16,20),(16,20))]:arch.gardenwall(b,a,c)
 core.moon_gate(b);arch.corridor(b,[(-13,-11),(-13,3)],2)
 transform(b,lambda:arch.hall(b,0,0,10,5,3.4,openhall=True),offset=(11,0,0),angle=math.pi/2)
 arch.desk(b,10,-1,1.5,3,1.3);arch.vase(b,10,0,1.65,.35,'ceramic');arch.paving(b,0,-3,9,15)
 for x,y,s in [(-8,-4,1),(7,-7,.9),(-10,15,1.1)]:tree(b,x,y,s,True,7)
 pine(b,-15,13,1.35,4)

def painting(b):
 arch.hall(b,0,7,17,8,4.1,bays=3,openhall=True);arch.corridor(b,[(-12,-12),(-12,5),(-9,5)],2.3)
 arch.desk(b,1,5,1.65,5,2);b.box('paper',(1,4.8,1.79),(4,1.3,.035))
 for x in [-1.1,3.1]:b.rod('wood',(x,4.2,1.87),(x,5.4,1.87),.09,10)
 b.box('silk',(-1,2.75,3.8),(6,.06,1));b.box('wood',(5,9,1.0),(4,2.6,.3));b.box('silk',(5,9,1.2),(3.8,2.4,.18))
 arch.lattice(b,3,7,2.5,1.4,3.8,'flower');arch.vase(b,-5,7,.55,.7,'ceramic')
 for x,y in [(-8,-5),(8,-8)]:tree(b,x,y,.9,True,3)
 arch.paving(b,0,-5,9,12)

def courtyard(b,style):
 arch.courtyard(b,style)
 # Fine plinth joints, additional ceiling rhythm and garden undergrowth.
 for x in [-15,15]:
  for y in [-9,-3,3,9,15]:shrub(b,x,y,.7,seed=int(y+15))
 for x in [-5,5]:lantern(b,x,2.3,3.2,.62)
 if style=='flower':
  for x in [-8,-5,-2,1,4,7]:b.box('wood',(x,9,4.15),(.09,8,.13))
  for x in [-8,-5,0,5,8]:arch.lattice(b,x,11.8,2.9,2.2,3.8,'flower')
 elif style=='study':
  for x in [-7,-3,3,7]:b.box('wood',(x,8,4.5),(.16,9,.2))
 elif style=='bamboo':
  for i in range(24):
   x=(-12.2 if i%2 else 12.3)+math.sin(i*2.4)*1.4;y=-9+(i//2)*2.3;arch.bamboo(b,x,y,int(x*x+y*y))
  for i in range(65):
   x=math.sin(i*2.399)*12;y=-10+(i%11)*2.5
   if abs(x)>3 and y<3:shrub(b,x,y,.6+(i%4)*.2,i)
  for i in range(19):
   y=-10+i*1.45;core.rock(b,13.6+math.sin(i*.6)*.6,y,.22+(i%3)*.08,i)
 for i in range(28):
  a=i*2.399;x=math.cos(a)*12.3;y=math.sin(a)*11.5+1
  if abs(x)>4 or y>2:shrub(b,x,y,.55+(i%4)*.2,i)

def lake_point(layout,a,margin=0):
 lake=layout['terrain']['lake'];rx,ry=lake['radius'];cx,cy=lake['center'];f=1+.17*math.sin(3*a+.4)+.085*math.sin(5*a-1.1)
 for direction,amount,width in [(-1.12,.72,.29),(-2.57,.70,.25),(.12,.30,.32)]:
  delta=math.atan2(math.sin(a-direction),math.cos(a-direction));f+=amount*math.exp(-(delta/width)**2)
 return ((rx*f+margin)*math.cos(a)+cx,(ry*f+margin)*math.sin(a)+cy)

def in_water(layout,x,y,margin=0):
 lake=layout['terrain']['lake'];cx,cy=lake['center'];rx,ry=lake['radius'];a=math.atan2((y-cy)/ry,(x-cx)/rx);p=lake_point(layout,a,margin)
 return math.hypot(x-cx,y-cy)<math.hypot(p[0]-cx,p[1]-cy)

def terrain(b,layout):
 n=192;rings=36;vs=[]
 for j in range(rings+1):
  t=(j/rings)**1.4
  for i in range(n):
   a=i*math.tau/n;x0,y0=lake_point(layout,a);x=x0*(1-t)+math.cos(a)*340*t;y=y0*(1-t)+math.sin(a)*320*t
   z=-.13 if j==0 else .01
   if t>.5:z+=(t-.5)**2*(75+32*math.sin(a*7))+math.sin(x*.044)*math.sin(y*.038)*(t-.5)*8
   vs.append((x,y,z))
 b.mesh('earth',vs,[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(rings) for i in range(n)])
 for island in layout['terrain']['lake']['islands']:
  x,y=island['center'];rx,ry=island['radius'];b.ellipsoid('earth',(x,y,-.7),(rx,ry,1),33,rings=5,n=26)
  for i in range(20):
   a=i*math.tau/20;core.rock(b,x+rx*math.cos(a),y+ry*math.sin(a),.38+i%3*.13,i)
  for i in range(9):
   a=i*2.399;tree(b,x+math.cos(a)*rx*.55,y+math.sin(a)*ry*.55,.75+i%3*.2,seed=i+711)
 # Irregular limestone edge and layered aquatic planting.
 for i in range(240):
  a=i*math.tau/240;x,y=lake_point(layout,a,.3);core.rock(b,x,y,.42+(i%7)*.11,i)
  if i%4==0:shrub(b,x*1.02,y*1.02,.75,i)
  if i%11==0:
   x,y=lake_point(layout,a,3.5);tree(b,x,y,.95,False,i,willow=True)
 for i in range(140):
  a=i*2.399;x,y=lake_point(layout,a,-3-(i%5)*.6)
  if any(abs(x-p['position'][0])<13 and abs(y-p['position'][1])<13 for p in layout['places']):continue
  radius=.45+i%4*.13;vs=[(x,y,.015)]+[(x+radius*math.cos(j*math.tau/12),y+radius*math.sin(j*math.tau/12),.035+.1*math.sin(j*.6)) for j in range(12)]
  b.mesh('lightleaf',vs,[(0,j+1,(j+1)%12+1) for j in range(11)])
  if i%6==0:
   for j in range(7):arch.leaf(b,(x,y,.1),(math.cos(j*math.tau/7),math.sin(j*math.tau/7),1),.65,.2,'flower')
 # Surrounding trees make a complete landscape beyond the enclosure.
 rng=random.Random(2086);nodes={n['id']:Vector(n['position']) for n in layout['pathNodes']}
 def distseg(x,y,a,c):
  d=c-a;t=max(0,min(1,((Vector((x,y,0))-a).dot(d))/max(.01,d.length_squared)));return (Vector((x,y,0))-a-d*t).length
 count=0
 for i in range(6000):
  x=rng.uniform(-169,169);y=rng.uniform(-142,151)
  if (x/178)**2+(y/161)**2>.96 or in_water(layout,x,y,7):continue
  if any(abs(x-p['position'][0])<(21 if p['featured'] else 15) and abs(y-p['position'][1]-2)<21 for p in layout['places']):continue
  if any(distseg(x,y,nodes[e['from']],nodes[e['to']])<3.2 for e in layout['pathEdges']):continue
  if -23<x<23 and -133<y<-95:continue
  s=rng.uniform(1.05,2.0)
  tree(b,x,y,s,flower=i%23==0,seed=i)
  if i%2==0:shrub(b,x+2,y+2,1.2,i)
  count+=1
  if count>=660:break
 # A dense, rising woodland backdrop encloses the garden beyond its walls.
 for i in range(420):
  a=rng.uniform(0,math.pi);r=rng.uniform(162,305);x=math.cos(a)*r;y=math.sin(a)*r+18
  angle=math.atan2(y,x);inner=math.hypot(*lake_point(layout,angle));outer=math.hypot(340*math.cos(angle),320*math.sin(angle));t=max(0,min(1,(math.hypot(x,y)-inner)/(outer-inner)))
  height=(t-.5)**2*(75+32*math.sin(angle*7))+math.sin(x*.044)*math.sin(y*.038)*(t-.5)*8 if t>.5 else 0
  tree(b,x,y,rng.uniform(1.3,2.3),seed=i+5000);TREE_POINTS[-1]['z']=max(0,height)
 # Connected perimeter walls, with an entrance gap that meets the gate.
 for a,c in [((-143,-100),(-12,-100)),((12,-100),(143,-100)),((-143,-100),(-143,138)),((143,-100),(143,138)),((-143,138),(143,138))]:arch.gardenwall(b,a,c,2.8)
 # Hills are planted masses, never a model display plinth.
 for x,y,s in [(-124,116,12),(-136,108,9),(-115,119,8),(108,83,10),(117,84,7)]:
  b.ellipsoid('earth',(x,y,1),(s,s,5.5),int(x),rings=6,n=16)
  for j in range(5):core.rock(b,x+math.sin(j*2.4)*s*.6,y+math.cos(j*2.4)*s*.6,2+j*.6,j)
  transform(b,lambda:pine(b,0,0,1.3,int(x)),(x,y,5))
 for e in layout['pathEdges']:
  a,c=nodes[e['from']],nodes[e['to']]
  if e['kind']=='bridge' or in_water(layout,(a.x+c.x)/2,(a.y+c.y)/2,-1):arched_bridge(b,a,c,3.0,2.1 if (c-a).length>15 else .4)
  else:garden_path(b,a,c)
 # Covered gallery grows out of the north-bank circulation.
 covered_walk(b,(-29,89),(-54,83),h=3.3);covered_walk(b,(22,89),(45,87),h=3.3)
 covered_walk(b,(-4,-8),(24,13),h=3.0,z=.65)
 arched_bridge(b,Vector((22,25,.25)),Vector((38,31,.25)),3.0,1.6)
 for i in range(0,len(layout['pathNodes']),2):
  p=layout['pathNodes'][i]['position'];b.rod('wood',(p[0]+2,p[1],p[2]),(p[0]+2,p[1],p[2]+2.9),.07,6);lantern(b,p[0]+2,p[1],p[2]+2.7,.7)

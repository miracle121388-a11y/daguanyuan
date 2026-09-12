"""Rebuild planted margins on the existing literary interpretation's coordinates.

Shoreline, routes, architectural origins and entrance coordinates remain fixed.
Planting clusters are landscape design, not botanical claims about the novel.
"""
import math,random
import build_modules as core
import refined_modules as arch
import spatial_world as world
import r8_architecture as architecture
from reference_world import transform


def source_shrub(b,x,y,s=1,seed=1):
    # The shared leaf-island crown replaces the old faceted shrub ornaments.
    for j in range(4):
        a=j*2.399+seed;r=.38*math.sqrt(j)
        world.TREE_POINTS.append({'x':x+math.cos(a)*r,'y':y+math.sin(a)*r,
            'size':s*(.24+(j%3)*.035),'seed':seed*7+j,'layer':'understorey',
            'placeId':b.parent.get('placeId') if b.parent else None})


def install():
    world.shrub=source_shrub;architecture.shrub=source_shrub
    original=world.terrain
    def terrain(b,layout):
        original(b,layout)
        rng=random.Random(110912)
        nodes={n['id']:n['position'] for n in layout['pathNodes']}
        edges=[(nodes[e['from']],nodes[e['to']]) for e in layout['pathEdges'] if e['kind']!='connection']
        def distance(x,y,a,c):
            dx,dy=c[0]-a[0],c[1]-a[1]
            t=max(0,min(1,((x-a[0])*dx+(y-a[1])*dy)/max(.001,dx*dx+dy*dy)))
            return math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)
        def clear(x,y,margin=3):
            if world.in_water(layout,x,y) or min(distance(x,y,a,c) for a,c in edges)<margin:return False
            for p in layout['places']:
                px,py,_=p['position']
                if p['id']=='daguanlou':
                    if abs(x-px)<40 and -38<y-py<80:return False
                elif abs(x-px)<(21 if p['featured'] else 16) and -20<y-py<24:return False
            return True
        count=0
        def low(x,y,size):
            nonlocal count
            if not clear(x,y):return
            world.TREE_POINTS.append({'x':x,'y':y,'size':size,'seed':11000+count,'layer':'understorey'})
            count+=1
        # Unequal elongated patches with open intervals; no repeated grid centres.
        for group in range(88):
            cx=rng.uniform(-140,145);cy=rng.uniform(-128,143)
            if not clear(cx,cy,4):continue
            rx=rng.uniform(2.0,7.5);ry=rng.uniform(1.1,3.7);angle=rng.random()*math.tau
            for j in range(rng.randrange(11,29)):
                a=rng.random()*math.tau;r=math.sqrt(rng.random())
                x=math.cos(a)*rx*r;y=math.sin(a)*ry*r
                low(cx+x*math.cos(angle)-y*math.sin(angle),cy+x*math.sin(angle)+y*math.cos(angle),rng.uniform(.20,.48))
        # The distant borrowed landscape uses the same rooted source canopies.
        for i in range(3400):
            x=rng.uniform(-340,340);y=rng.uniform(-205,330)
            if -159<x<159 and -155<y<161:continue
            if y<0 and abs(x)<165:continue
            if math.sin(x*.031+y*.057)+math.sin(y*.034-x*.067)<-.75:continue
            world.TREE_POINTS.append({'x':x,'y':y,'size':rng.uniform(1.25,2.15),'seed':20000+i,'layer':'canopy'})
        for ring in [layout['terrain']['lake']['outline']]+layout['terrain']['lake']['holes']:
            for a,c in zip(ring,ring[1:]+ring[:1]):
                dx,dy=c[0]-a[0],c[1]-a[1];length=math.hypot(dx,dy);nx,ny=-dy/length,dx/length
                if world.in_water(layout,a[0]+nx,a[1]+ny):nx,ny=-nx,-ny
                n=max(1,int(length/1.8))
                for j in range(n):
                    t=(j+rng.uniform(.15,.85))/n;x=a[0]+dx*t;y=a[1]+dy*t
                    if math.sin(x*.13+y*.23)+math.cos(x*.31-y*.17)<-.20:continue
                    for k in range(rng.randrange(2,6)):
                        offset=rng.uniform(1.45,4.2);along=rng.uniform(-1.0,1.0)
                        low(x+nx*offset+dx/length*along,y+ny*offset+dy/length*along,rng.uniform(.18,.38))
        print('R11 irregular planted margins',count,'low woody plants',flush=True)
    world.terrain=terrain

    original_tower=world.tower
    def tower(b):
        original_tower(b)
        # Asymmetric low planting beside the processional axis and rear courts.
        for side in [-1,1]:
            for cx,cy,rx,ry in [(side*25,-17,4,6),(side*23,24,3,5),(side*22,51,3,7)]:
                rng=random.Random(int(cy*21+cx))
                for j in range(24):
                    a=rng.random()*math.tau;r=math.sqrt(rng.random())
                    world.TREE_POINTS.append({'x':cx+math.cos(a)*rx*r,'y':cy+math.sin(a)*ry*r,
                        'size':rng.uniform(.24,.43),'seed':11100+j+int(cy),'placeId':b.parent.get('placeId'),'layer':'understorey'})
                for j in range(3):
                    angle=j*2.399
                    transform(b,lambda j=j:core.rock(b,0,0,.23+j*.08,j+9),(cx+math.cos(angle)*rx*.7,cy+math.sin(angle)*ry*.65,-.025))
    world.tower=tower

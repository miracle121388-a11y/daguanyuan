"""Layered planted margins, using the same editable source crowns and water graph.

The planting is an artistic interpretation. No coordinates of literary places,
walks or water polygons are changed, and no new historical botanical claim is made.
"""
import math,random
from mathutils import Vector
import build_modules as core
import refined_modules as arch
import spatial_world as world
from reference_world import transform

def install():
    old_terrain=world.terrain
    def terrain(b,layout):
        old_terrain(b,layout)
        rng=random.Random(101026);nodes={n['id']:n['position'] for n in layout['pathNodes']}
        edges=[(nodes[e['from']],nodes[e['to']]) for e in layout['pathEdges'] if e['kind']!='connection']
        def distance(x,y,a,c):
            dx,dy=c[0]-a[0],c[1]-a[1];t=max(0,min(1,((x-a[0])*dx+(y-a[1])*dy)/max(.001,dx*dx+dy*dy)))
            return math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)
        def clear(x,y,margin=3.4):
            if world.in_water(layout,x,y) or min(distance(x,y,a,c) for a,c in edges)<margin:return False
            for p in layout['places']:
                px,py,_=p['position']
                if p['id']=='daguanlou':
                    if abs(x-px)<40 and -38<y-py<80:return False
                elif abs(x-px)<(21 if p['featured'] else 16) and -20<y-py<24:return False
            return True
        def plant(x,y,size,seed,low=False):
            world.TREE_POINTS.append({'x':x,'y':y,'size':size,'seed':seed,'layer':'understorey' if low else 'canopy'})
        added=0
        # Low woody masses connect the existing canopy groups, with irregular
        # pockets and openings instead of another lawn or a clipped hedge line.
        for y in range(-130,148,9):
            for x in range(-140,146,9):
                density=math.sin(x*.071+y*.025)+math.sin(y*.081-x*.016)
                if density<-.05 or not clear(x,y,4):continue
                for k in range(8+rng.randrange(5)):
                    px=x+rng.gauss(0,2.0);py=y+rng.gauss(0,2.0)
                    if clear(px,py):plant(px,py,rng.uniform(.46,.78),10100+added,True);added+=1
        # A wooded distant ridge gives the garden a continuous borrowed view.
        for i in range(3400):
            x=rng.uniform(-340,340);y=rng.uniform(-205,330)
            if -159<x<159 and -155<y<161:continue
            if y<0 and abs(x)<165:continue
            density=math.sin(x*.031+y*.057)+math.sin(y*.034-x*.067)
            if density<-.75:continue
            plant(x,y,rng.uniform(1.25,2.15),20000+i)
        # Overlapping low source crowns and grasses follow the same shore ring.
        for ring in [layout['terrain']['lake']['outline']]+layout['terrain']['lake']['holes']:
            for i,(a,c) in enumerate(zip(ring,ring[1:]+ring[:1])):
                dx,dy=c[0]-a[0],c[1]-a[1];length=math.hypot(dx,dy);nx,ny=-dy/length,dx/length
                if world.in_water(layout,a[0]+nx,a[1]+ny):nx,ny=-nx,-ny
                for j in range(max(1,int(length/2.6))):
                    t=(j+.5)/max(1,int(length/2.6));x=a[0]+dx*t;y=a[1]+dy*t
                    if math.sin(x*.18+y*.29)<-.35:continue
                    for k in range(3):
                        offset=1.6+k*1.1+rng.uniform(-.4,.6);px=x+nx*offset;py=y+ny*offset
                        if clear(px,py,3.0):plant(px,py,rng.uniform(.34,.56),30000+added,True);added+=1
        print('R10 layered source crown groups',added,'low woody plants; shared crown geometry and atlas',flush=True)
    world.terrain=terrain

    old_tower=world.tower
    def tower(b):
        old_tower(b)
        # Small cultivated groups occupy the same central court's planting bays.
        for side in [-1,1]:
            for cx,cy,rx,ry in [(side*25,-17,5,7),(side*23,24,3,7),(side*22,51,4,9)]:
                rng=random.Random(int(cy*20+cx))
                for j in range(19):
                    a=j*2.399;radius=math.sqrt(rng.random());x=cx+math.cos(a)*rx*radius;y=cy+math.sin(a)*ry*radius
                    world.TREE_POINTS.append({'x':x,'y':y,'size':rng.uniform(.45,.72),'seed':100+j+int(cy),'placeId':b.parent.get('placeId'),'layer':'understorey'})
                for j in range(7):
                    angle=j*2.399;x=cx+math.cos(angle)*rx*.7;y=cy+math.sin(angle)*ry*.65
                    transform(b,lambda j=j:core.rock(b,0,0,.25+j*.035,j+9),(x,y,-.025))
    world.tower=tower

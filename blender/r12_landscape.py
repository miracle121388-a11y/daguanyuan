"""A continuous planted shore, on the reviewed water and route coordinates.

Plant composition is art direction. It makes no botanical or measured-plan
claim about the novel. Every plant remains an editable rooted master instance.
"""
import math
import random
import build_modules as core
import refined_modules as arch
import spatial_world as world
import r8_architecture as architecture
from reference_world import transform
from r11_landscape import source_shrub


def install():
    world.shrub=source_shrub
    architecture.shrub=source_shrub
    original=world.terrain

    def terrain(b,layout):
        original(b,layout)
        rng=random.Random(120912)
        nodes={n['id']:n['position'] for n in layout['pathNodes']}
        edges=[(nodes[e['from']],nodes[e['to']],e['kind']) for e in layout['pathEdges'] if e['kind']!='connection']

        def distance(x,y,a,c):
            dx,dy=c[0]-a[0],c[1]-a[1]
            t=max(0,min(1,((x-a[0])*dx+(y-a[1])*dy)/max(.001,dx*dx+dy*dy)))
            return math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)

        def clear(x,y,margin=2.7):
            if world.in_water(layout,x,y) or min(distance(x,y,a,c) for a,c,_ in edges)<margin:return False
            for p in layout['places']:
                px,py,_=p['position']
                if p['id']=='daguanlou':
                    if abs(x-px)<39 and -38<y-py<80:return False
                elif abs(x-px)<(20.5 if p['featured'] else 16) and -19<y-py<24:return False
            return True

        count=0
        def plant(x,y,size,low=True):
            nonlocal count
            if not clear(x,y,2.7 if low else 4.0):return
            world.TREE_POINTS.append({'x':x,'y':y,'size':size,'seed':12000+count,'layer':'understorey' if low else 'canopy'})
            count+=1

        # Connected, lobed drifts cover the former isolated lawn compartments.
        # Long axes follow each slope; deliberate gaps keep route approaches open.
        for group in range(165):
            cx=rng.uniform(-140,142);cy=rng.uniform(-128,144)
            if not clear(cx,cy,4):continue
            rx=rng.uniform(4.2,11.5);ry=rng.uniform(2.1,6.5);angle=rng.random()*math.tau
            for j in range(rng.randrange(20,48)):
                a=rng.random()*math.tau;r=math.sqrt(rng.random())
                lobes=1+.20*math.sin(3*a+group)
                x=math.cos(a)*rx*r*lobes;y=math.sin(a)*ry*r
                xx=cx+x*math.cos(angle)-y*math.sin(angle);yy=cy+x*math.sin(angle)+y*math.cos(angle)
                plant(xx,yy,rng.uniform(.43,.82))
                if j%12==0:plant(xx+1.5,yy+.7,rng.uniform(.8,1.45),False)

        # A broader stone-to-root transition follows exactly the same wet edge.
        for ring in [layout['terrain']['lake']['outline']]+layout['terrain']['lake']['holes']:
            for a,c in zip(ring,ring[1:]+ring[:1]):
                dx,dy=c[0]-a[0],c[1]-a[1];length=math.hypot(dx,dy);tx,ty=dx/length,dy/length;nx,ny=-ty,tx
                if world.in_water(layout,a[0]+nx,a[1]+ny):nx,ny=-nx,-ny
                n=max(1,math.ceil(length/1.5))
                for j in range(n):
                    t=(j+.5)/n;x=a[0]+dx*t;y=a[1]+dy*t
                    flow=math.sin(x*.12+y*.17)+.55*math.sin(y*.31-x*.15)
                    if flow<-.9:continue
                    for k in range(3 if flow<.3 else 6):
                        depth=rng.uniform(1.05,5.8);along=rng.uniform(-1.6,1.6)
                        plant(x+nx*depth+tx*along,y+ny*depth+ty*along,rng.uniform(.33,.71))
                    # Partly submerged and exposed companions, never a bead chain.
                    if flow>.22 and (j%3==0):
                        for k in range(2):
                            depth=rng.uniform(.2,2.0);along=rng.uniform(-1,1)
                            xx=x+nx*depth+tx*along;yy=y+ny*depth+ty*along
                            if not clear(xx,yy,3.0):continue
                            s=rng.uniform(.38,.82)
                            transform(b,lambda s=s,k=k:core.rock(b,0,0,s,group+j+k),(xx,yy,-.22))
                    if flow>.75 and j%4==0:plant(x+nx*5,y+ny*5,rng.uniform(.9,1.55),False)

        # Pathside growth terminates short of the sampled walkable surface.
        for a,c,kind in edges:
            if kind not in ['path','stairs']:continue
            dx,dy=c[0]-a[0],c[1]-a[1];length=math.hypot(dx,dy)
            if length<.1:continue
            nx,ny=-dy/length,dx/length
            for j in range(max(1,int(length/2.0))):
                t=(j+.5)/max(1,int(length/2.0));x=a[0]+dx*t;y=a[1]+dy*t
                for side in [-1,1]:
                    if math.sin(x*.22+y*.19+side)<-.25:continue
                    offset=rng.uniform(3.0,4.7)
                    plant(x+nx*side*offset,y+ny*side*offset,rng.uniform(.28,.52))

        # A continuous wooded ridge; height and density change by topographic band.
        for i in range(4200):
            x=rng.uniform(-350,350);y=rng.uniform(-210,365)
            if -156<x<156 and -149<y<158:continue
            if y<0 and abs(x)<161:continue
            density=math.sin(x*.019+y*.027)+.6*math.sin(y*.059-x*.041)
            if density<-.85:continue
            world.TREE_POINTS.append({'x':x,'y':y,'size':rng.uniform(1.2,2.55),'seed':30000+i,'layer':'canopy'})
        print('R12 connected planted margins',count,'additional rooted plants',flush=True)
    world.terrain=terrain

    original_tower=world.tower
    def tower(b):
        original_tower(b)
        rng=random.Random(1212)
        # Mixed heights soften the plinth and flank the formal entrance axis.
        for side in [-1,1]:
            for cx,cy,rx,ry in [(side*24,-19,7,5),(side*24,24,5,7),(side*22,53,5,9)]:
                for j in range(65):
                    a=rng.random()*math.tau;r=math.sqrt(rng.random())
                    x=cx+math.cos(a)*rx*r;y=cy+math.sin(a)*ry*r
                    world.TREE_POINTS.append({'x':x,'y':y,'size':rng.uniform(.38,.77),'seed':40000+j+int(cy*50),'placeId':b.parent.get('placeId'),'layer':'understorey'})
                for j in range(4):
                    a=j*2.399;xx=cx+math.cos(a)*rx*.62;yy=cy+math.sin(a)*ry*.60
                    transform(b,lambda j=j:core.rock(b,0,0,.38+j*.13,j+52),(xx,yy,-.04))
                world.TREE_POINTS.append({'x':cx+side*2.0,'y':cy+1.5,'size':1.05 if cy<0 else 1.35,'seed':41000+int(cy)+side,'placeId':b.parent.get('placeId'),'layer':'canopy'})
    world.tower=tower

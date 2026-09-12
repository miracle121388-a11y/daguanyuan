"""Rebuilt joinery on the reviewed garden footprints.

Column, bracket and screen dimensions are design interpretation. The precedent
is structural construction, not a claim to a surviving Daguanyuan building.
"""
import math, random
from mathutils import Vector
import build_modules as core
import refined_modules as arch
import r6_architecture as previous
from reference_world import transform, lantern, rail, covered_walk, pine, shrub
import spatial_world as world


def shaped_arm(b,x,y,z,length=.9,depth=.13,height=.18,angle=0):
    # A real extruded, curved-underface arm, rather than stacked cube corbels.
    profile=[(-.5,.48),(.5,.48),(.5,.13),(.36,-.04),(.19,-.12),(.11,-.48),(-.11,-.48),(-.19,-.12),(-.36,-.04),(-.5,.13)]
    def build():
        vs=[(u*length,side*depth/2,v*height) for side in [-1,1] for u,v in profile]
        n=len(profile);faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
        faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
        b.mesh('wood',vs,faces)
    transform(b,build,(x,y,z),angle)


def bracket(b,x,y,z,side=1,size=1):
    b.box('darkwood',(x,y,z),(.36*size,.34*size,.12*size))
    for level in range(3):
        zz=z+(.13+level*.17)*size;reach=(.63+level*.25)*size
        shaped_arm(b,x,y+side*level*.16*size,zz,reach,.15*size,.22*size)
        shaped_arm(b,x,y+side*(.13+level*.16)*size,zz+.085*size,reach*.85,.14*size,.20*size,math.pi/2)
        for sx in [-1,1]:b.box('wood',(x+sx*reach*.34,y+side*level*.16*size,zz+.10*size),(.18*size,.20*size,.12*size))
    # Outward angled member meets the purlin above; both ends stay connected.
    b.rod('darkwood',(x,y-side*.28*size,z+.14*size),(x,y+side*.83*size,z+.61*size),.055*size,8)


def lattice(b,x,y,z,w=2,h=2.6,pattern='grid',paper=True):
    stile=.065 if w<2 else .085
    for dx in [-w/2,w/2]:b.box('wood',(x+dx,y,z),(stile,.15,h+.1))
    for dz in [-h/2,h/2]:b.box('wood',(x,y,z+dz),(w,.15,.075))
    # False is genuinely open. The r6 helper still placed an opaque sheet here.
    if paper:b.box('screen',(x,y+.036,z),(w-.10,.012,h-.10))
    rows=max(3,round(h/.42));cols=max(2,round(w/.40))
    for i in range(1,cols):b.box('latticewood',(x-w/2+i*w/cols,y-.065,z),(.027,.045,h-.06))
    for j in range(1,rows):b.box('latticewood',(x,y-.065,z-h/2+j*h/rows),(w-.06,.045,.027))
    if pattern=='flower':
        for i in range(cols):
            for j in range(rows):
                if j not in [1,rows-2] or i%2:continue
                cx=x-w/2+(i+.5)*w/cols;cz=z-h/2+(j+.5)*h/rows
                rx=w/cols*.30;rz=h/rows*.30
                pts=[(cx,y-.092,cz+rz),(cx+rx,y-.092,cz),(cx,y-.092,cz-rz),(cx-rx,y-.092,cz)]
                for a,c in zip(pts,pts[1:]+pts[:1]):b.rod('latticewood',a,c,.014,4)


def floorboards(b,x,y,w,d,z=.57):
    # Joined 22 cm boards with millimetre gaps and staggered end joints.
    b.box('darkwood',(x,y,z-.036),(w,d,.035))
    rows=max(1,math.ceil(w/.23));width=w/rows
    for row in range(rows):
        yy=y-d/2;offset=(row%3)*.73
        while yy<y+d/2-.015:
            length=min(2.6-offset if yy==y-d/2 else 2.6,y+d/2-yy);offset=0
            b.box('floorwood',(x-w/2+(row+.5)*width,yy+length/2,z),(width-.004,length-.004,.035))
            yy+=length


def closed_wall(b,x,y,w,h,style):
    # Window opening has no plaster behind it; sill and head sit in the wall.
    sill=1.30;top=min(h-.05,3.55);opening=min(w*.64,2.7)
    b.box('plaster',(x,y,(sill+.57)/2),(w,.24,sill-.57))
    b.box('plaster',(x,y,(top+h+.40)/2),(w,.24,h+.40-top))
    side=(w-opening)/2
    for sx in [-1,1]:b.box('plaster',(x+sx*(opening/2+side/2),y,(sill+top)/2),(side,.24,top-sill))
    b.box('cutstone',(x,y-.045,sill-.05),(opening+.20,.36,.10))
    lattice(b,x,y-.09,(sill+top)/2,opening,top-sill,style,paper=False)


def hall(b,x=0,y=6,w=18,d=8,h=4.4,openhall=False,detail=True,bays=3,style='plain',rolled=False,thatch=False):
    if thatch:return old_hall(b,x,y,w,d,h,openhall=openhall,detail=detail,bays=bays,style=style,rolled=rolled,thatch=True)
    # The foundation has a wet lower course, dressed stone cap and thin joints.
    b.box('stone',(x,y,.18),(w+1.8,d+1.8,.36))
    b.box('cutstone',(x,y,.43),(w+2.0,d+2.0,.14))
    for sy in [-1,1]:
        for j in range(max(1,round(w/1.1))):
            xx=x-w/2+j*1.1;b.box('cutstone',(xx,y+sy*(d/2+.91),.24),(1.075,.055,.21))
    for i in range(3):b.box('cutstone',(x,y-d/2-1.10-i*.35,.39-i*.12),(min(w*.36,8),.70,.18))
    floorboards(b,x,y,w+.6,d+.6)
    spacing=w/bays;coltop=h+.10
    for i in range(bays+1):
        cx=x-w/2+i*spacing
        for sy in [-1,1]:
            cy=y+sy*(d/2+.36)
            b.rod('cutstone',(cx,cy,.50),(cx,cy,.69),.27,16,r2=.23)
            b.rod('darkwood',(cx,cy,.69),(cx,cy,coltop),.16 if w>20 else .12,16,r2=.14 if w>20 else .10)
            bracket(b,cx,cy,coltop+.10,sy,.94 if w>20 else .70)
            for sx in [-1,1]:
                shaped_arm(b,cx+sx*.42,cy,coltop-.14,.85,.12,.24)
        b.box('wood',(cx,y,coltop-.03),(.22,d+.72,.26))
    for sy in [-1,1]:
        b.box('wood',(x,y+sy*(d/2+.36),coltop-.07),(w+.35,.22,.30))
        b.rod('wood',(x-w/2-.75,y+sy*(d/2+.95),h+.82),(x+w/2+.75,y+sy*(d/2+.95),h+.82),.10,12)
    if openhall:
        # Recessed screen chamber leaves an open, usable perimeter gallery.
        inner=d/2-1.25;screen_h=max(1.8,h-1.05);bottom=1.02
        for sy in [-1,1]:
            for i in range(bays):
                cx=x-w/2+(i+.5)*spacing
                if i==bays//2:
                    for sx in [-1,1]:
                        transform(b,lambda:lattice(b,0,0,bottom+screen_h/2,spacing*.22,screen_h,'flower',False),(cx+sx*spacing*.37,y+sy*inner,0),sx*.52)
                else:
                    b.box('wood',(cx,y+sy*inner,.79),(spacing-.24,.14,.40))
                    lattice(b,cx,y+sy*inner,bottom+screen_h/2,spacing-.30,screen_h,'flower',paper=i%2==0)
        for sx in [-1,1]:
            transform(b,lambda:lattice(b,0,0,bottom+screen_h/2,inner*2-.2,screen_h,'grid',False),(x+sx*(w/2-.5),y,0),math.pi/2)
        for xx in [-w*.27,w*.27]:
            b.box('wood',(x+xx,y,1.0),(1.1,.42,.075))
            for dx in [-.43,.43]:b.box('darkwood',(x+xx+dx,y,.78),(.07,.33,.44))
    else:
        for i in range(bays):
            cx=x-w/2+(i+.5)*spacing
            closed_wall(b,cx,y+d/2,spacing,h,style)
            if i==bays//2:
                door_h=min(3.35,h-.20)
                for sx in [-1,1]:
                    transform(b,lambda:lattice(b,0,0,.605+door_h/2,spacing*.28,door_h,style,False),(cx+sx*spacing*.34,y-d/2,0),sx*.62)
                b.box('wood',(cx,y-d/2,.64),(spacing,.25,.14))
                b.box('plaster',(cx,y-d/2,h+.1),(spacing,.24,.6))
            else:closed_wall(b,cx,y-d/2,spacing,h,style)
        for sx in [-1,1]:transform(b,lambda:closed_wall(b,0,0,d,h,style),(x+sx*w/2,y,0),math.pi/2)
        for sx in [-1,1]:b.box('darkwood',(x+sx*(w/2-.15),y,.78),(.08,d,.40))
        b.box('darkwood',(x,y+d/2-.15,.78),(w,.08,.40))
    arch.roof(b,x,y,h+.94,w+.3,d+.65,detail=detail,rolled=rolled)
    # Name board remains intentionally blank: generated pseudo-calligraphy is absent.
    if not openhall:b.box('darkwood',(x,y-d/2-.2,h-.04),(min(2.6,w*.22),.10,.48))


def roof(b,x,y,z,w,d,h=2.25,detail=True,rolled=False,thatch=False):
    previous.roof(b,x,y,z,w,d,h,detail,rolled,thatch)
    if thatch:return
    rise=max(h,d*(.30 if rolled else .40));ridge=max(.2,(w-d)*.5)
    hw=w/2+1.05;hd=d/2+1.05;start=previous._skirt
    # Four real fascia edges and tiled hip ends share the original curved shell.
    for sy in [-1,1]:b.box('wood',(x,y+sy*(hd-.08),z+.08),(w+1.8,.11,.16))
    for sx in [-1,1]:
        b.box('wood',(x+sx*(hw-.08),y,z+.08),(.11,d+1.8,.16))
        if not detail:continue
        rows=max(8,round((hw-ridge)/.30))
        def p(t,u,lift):
            profile=math.cos(t*math.pi/2)**1.35 if rolled else (1-t)**1.45
            return (x+sx*(ridge+(hw-ridge)*t),y+u*t*hd,z+rise*profile+.2*t**9+.54*t**7*abs(u)**10+lift)
        for j in range(rows):
            t=start+(1-start)*j/rows;t2=start+(1-start)*(j+1)/rows;n=max(3,round(2*hd*t2/.27))
            for k in range(n):
                u=-1+2*k/n;du=2/n
                b.mesh('tilelight' if (j*17+k)%41==0 else 'tile',[p(t,u,.022),p(t,u+du/2,.075),p(t,u+du,.022),p(t2,u,.022),p(t2,u+du/2,.075),p(t2,u+du,.022)],[(0,3,4,1),(1,4,5,2)] if sx==1 else [(1,4,3,0),(2,5,4,1)])


def tower(b):
    previous.tier(b,32,16,6.2,skirt=.58)
    previous.tier(b,25.4,10.4,4.65,floor=9.15)
    for sy in [-1,1]:rail(b,(-13.5,2+sy*6.2,9.7),(13.5,2+sy*6.2,9.7),.95)
    for sx in [-1,1]:rail(b,(sx*13.5,-4.2,9.7),(sx*13.5,8.2,9.7),.95)
    for x in [-10.1,-5.1,0,5.1,10.1]:
        lantern(b,x,-6.0,5.9,.60);lantern(b,x,-3.9,13.1,.42)
    b.box('stone',(0,-12,.27),(36,9,.54))
    # The paving actually sits above the terrace, not beneath its solid slab.
    for row in range(10):
        for col in range(32):b.box('cutstone',(col*1.1-17.05,-16.0+row*.85,.565),(1.08,.83,.085))
    for sx in [-1,1]:
        rail(b,(sx*5,-16.5,.62),(sx*17.8,-16.5,.62),.88,stone=True)
        rail(b,(sx*17.8,-16.5,.62),(sx*17.8,-7.5,.62),.88,stone=True)
    for i in range(4):b.box('cutstone',(0,-17-i*.42,.51-i*.12),(9,1,.20))
    arch.paving(b,0,-24,14,11)
    for x in [-11,-5,5,11]:
        b.box('cutstone',(x,-31,3.7),(.58,.8,7.4));b.box('cutstone',(x,-31,.35),(1.7,1.8,.7))
    for a,c,z in [(-11,11,5.4),(-5,5,7.6)]:
        b.box('cutstone',((a+c)/2,-31,z),(c-a+.8,.8,.62));roof(b,(a+c)/2,-31,z+.5,c-a+1.2,1.3,.8)
    for side in [-1,1]:
        def side_tower():
            previous.tier(b,14,9,3.8,skirt=.58,bays=3);previous.tier(b,10.4,5.6,3.1,floor=5.9,bays=3)
        transform(b,side_tower,(side*29,2,0))
        covered_walk(b,(side*14,3),(side*22,3),h=3.7)
        for y in [-22,-19,-16,-13]:shrub(b,side*(25+math.sin(y)*1.3),y,1.4,int(y+90))
    arch.paving(b,0,22,25,15)
    transform(b,lambda:hall(b,0,0,28,14,6.1,openhall=True,bays=5),(0,36,.6))
    for i in range(5):b.box('cutstone',(0,27-i*.48,.65-i*.12),(10,1.1,.22))
    arch.desk(b,0,37,1.5,4.5,2.1)
    for x in [-6,6]:arch.vase(b,x,38,.8,.8,'ceramic')
    hall(b,0,68,21,9,4.5,bays=5)
    for side in [-1,1]:
        covered_walk(b,(side*30,12),(side*30,65),h=3.4);covered_walk(b,(side*30,65),(side*12,65),h=3.4)
        for y in [18,48]:pine(b,side*21,y,.85,seed=y+side)
        for ya,yb in ([(-26,25),(37,46),(62,68)] if side==-1 else [(-26,46),(62,68)]):arch.gardenwall(b,(side*37,ya),(side*37,yb),2.55)
    for a,c in [((-37,-26),(-14,-26)),((14,-26),(37,-26)),((-37,76),(37,76))]:arch.gardenwall(b,a,c,2.55)


def install():
    global old_hall
    old_hall=arch.hall
    arch.hall=hall;arch.lattice=lattice;arch.roof=roof
    world.tower=tower
    core.PALETTE.update({'latticewood':'956d44','cutstone':'c4c4b3','bankstone':'83917b','wood':'956d44','darkwood':'604632','floorwood':'8b6947','screen':'b9bca0','plaster':'e8e5d8','roof':'394448','tile':'495256','tilelight':'586166','tiledark':'303b3e'})

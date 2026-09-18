"""Small shared meshes for a varied, editable Qing capital backdrop."""
import math
import random
import build_modules as core
from urban_layout import BUILDINGS


def roof(b,z,w,d,rise=1.5,form='hip',pigment='roof',x=0,y=0):
    ridge=w/2+.55 if form=='gable' else max(.5,w/2-d*.32)
    ex=w/2+.55;ey=d/2+.65
    for sy in [-1,1]:
        vs=[]
        for j in range(6):
            t=j/5;xx=ridge+(ex-ridge)*t;zz=z+rise*(1-t)**1.65+.13*t**5
            vs.extend([(x-xx,y+sy*ey*t,zz),(x+xx,y+sy*ey*t,zz)])
        b.mesh(pigment,vs,[(j*2,j*2+1,j*2+3,j*2+2) if sy==1 else (j*2+2,j*2+3,j*2+1,j*2) for j in range(5)])
    for sx in [-1,1]:
        if form=='gable':
            # Hard gables distinguish compact Beijing dwellings from formal halls.
            vs=[(x+sx*w/2,y,z+rise-.04)]
            vs += [(x+sx*w/2,y+sy*ey*j/5,z+rise*(1-j/5)**1.65+.13*(j/5)**5-.04) for sy in [-1,1] for j in range(1,6)]
            order=[0,1,2,3,4,5,10,9,8,7,6]
            b.mesh('brick',vs,[tuple(order if sx==1 else reversed(order))])
        else:
            vs=[(x+sx*ridge,y,z+rise)]
            for j in range(1,6):
                t=j/5;xx=ridge+(ex-ridge)*t;zz=z+rise*(1-t)**1.65+.13*t**5
                vs.extend([(x+sx*xx,y-ey*t,zz),(x+sx*xx,y+ey*t,zz)])
            fs=[(0,1,2)]+[(1+j*2,3+j*2,4+j*2,2+j*2) for j in range(4)]
            b.mesh(pigment,vs,fs if sx==1 else [tuple(reversed(f)) for f in fs])
    b.box('tile',(x,y,z+rise+.1),(ridge*2+.3,.24,.2))
    for sy in [-1,1]:b.box('tile',(x,y+sy*ey,z+.06),(w+1.2,.14,.18))
    # Flat tile divisions have the same silhouette with one quarter of the
    # former cylindrical seam geometry, important across thousands of roofs.
    for xx in range(-int(w/2),int(w/2)+1,2):
        if abs(xx)>ridge:continue
        for sy in [-1,1]:
            pts=[(x+xx,y+sy*ey*t,z+rise*(1-t)**1.65+.13*t**5+.025) for t in [0,.3,.65,1]]
            for a,c in zip(pts,pts[1:]):
                b.mesh('tile',[(a[0]-.018,a[1],a[2]),(a[0]+.018,a[1],a[2]),(c[0]+.018,c[1],c[2]),(c[0]-.018,c[1],c[2])],[(0,1,2,3) if sy>0 else (3,2,1,0)])


def hall(b,kind,params):
    w,d,h,form,pigment,timber=params
    openhall=kind in ['gallery','gate'];shop=kind.startswith('shop')
    b.box('stone',(0,0,.2),(w+.7,d+.7,.4))
    if not openhall:
        b.box('plaster' if kind not in ['warehouse','annex'] else 'brick',(0,.18,h/2+.35),(w,d-.35,h))
        levels=[] if kind=='temple' else ([(h*.48+.4,h*.66)] if kind!='shop-upper' else [(2.1,2.7),(5.45,2.1)])
        bays=max(2,round(w/(3 if shop else 4.5)))
        for z,wh in levels:
            for i in range(bays):
                x=-w/2+w*(i+.5)/bays
                for sy in [-1,1]:
                    bw=w/bays*.72
                    b.box(timber,(x,sy*d/2,z),(bw,.12,wh))
                    b.box('paper',(x,sy*(d/2+.08),z+wh*.12),(bw*.8,.07,wh*.54))
                    b.box(timber,(x,sy*(d/2+.13),z+wh*.12),(.07,.07,wh*.55))
                    b.box(timber,(x,sy*(d/2+.13),z+wh*.12),(bw*.8,.07,.07))
    for x in [-w/2,0,w/2]:
        for sy in [-1,1]:b.box(timber,(x,sy*d/2,h/2+.35),(.24,.24,h))
    for sy in [-1,1]:
        b.box(timber,(0,sy*d/2,h+.3),(w+.35,.24,.28))
        if kind in ['hall','temple','gate']:
            b.box('mineral',(0,sy*(d/2+.14),h+.3),(w-.3,.09,.16))
    roof(b,h+.5,w,d,2.2 if kind=='temple' else (1.5 if w>15 else 1.15),form,pigment)
    if shop:
        # Shop fascia, projecting canopy and vertical hanging trade board.
        z=3.55
        b.box(timber,(0,-d/2-.13,z),(w*.86,.17,.62))
        b.mesh('awning' if kind=='shop' else 'sagecloth',
               [(-w/2,-d/2-.18,z+.35),(w/2,-d/2-.18,z+.35),(w/2,-d/2-1.1,z-.08),(-w/2,-d/2-1.1,z-.08)],[(0,1,2,3)])
        b.box(timber,(w*.40,-d/2-.3,2.35),(.6,.20,1.5))
        for zz in [1.95,2.35,2.75]:b.box('gold',(w*.40,-d/2-.42,zz),(.24,.025,.2))
    if kind=='shop-upper':
        b.box(timber,(0,-d/2-.23,4.02),(w+.2,.5,.18))
        b.box('tile',(0,-d/2-.5,4.2),(w+1.0,1.0,.18))
    if kind=='temple':
        for x in [-w*.3,0,w*.3]:
            b.box('redwood',(x,-d/2-.09,2.6),(w*.18,.16,4.4))
            for dx in [-.4,.4]:b.box('gold',(x+dx,-d/2-.19,2.35),(.10,.08,.12))
        for x in [-w*.45,-w*.15,w*.15,w*.45]:
            b.rod('redwood',(x,-d/2-.4,.4),(x,-d/2-.4,h+.3),.21,8)
            b.box('mineral',(x,-d/2-.4,h+.1),(1.0,.7,.28))
            b.box('gold',(x,-d/2-.41,h-.2),(.62,.44,.16))
        for i in range(3):b.box('stone',(0,-d/2-1.1-i*.35,.3-i*.07),(w*.40,.8,.15))
        for sy in [-1,1]:
            b.box('redwood',(0,sy*(d/2+.12),h-.6),(4.8,.2,1.0))
            b.box('gold',(0,sy*(d/2+.23),h-.6),(4.2,.025,.08))


def ring(b,role,radius,z,height,thickness,n=12):
    vs=[(r*math.cos(i*math.tau/n),r*math.sin(i*math.tau/n),zz) for zz in [z,z+height] for r in [radius-thickness,radius] for i in range(n)]
    fs=[]
    for i in range(n):
        j=(i+1)%n
        fs.extend([(i,j,j+n,i+n),(i+n,j+n,j+3*n,i+3*n),(i+2*n,i+3*n,j+3*n,j+2*n),(i,i+2*n,j+2*n,j)])
    b.mesh(role,vs,fs)


def facilities(b,kind):
    if kind in ['paifang','lane-gate']:
        width=18 if kind=='paifang' else 8
        posts=[-width/2,-4,4,width/2] if kind=='paifang' else [-width/2,width/2]
        for x in posts:
            b.box('stone',(x,0,.4),(1.0,1.3,.8));b.box('redwood',(x,0,3.8),(.5,.5,7))
            b.box('stone',(x,0,1.1),(.7,.8,1.8))
        b.box('redwood',(0,0,5.9),(width+1,.6,1.0));b.box('mineral',(0,-.32,5.9),(width,.06,.52))
        roof(b,6.6,9 if kind=='paifang' else width+1,2.5,1.45)
        if kind=='paifang':
            for side in [-1,1]:
                roof(b,5.6,5,2.1,1.05,x=side*6.6)
                b.box('gold',(side*6.6,-.32,5.1),(3.8,.06,.12))
        b.box('redwood',(0,-.35,6.0),(3.5,.14,.8));b.box('gold',(0,-.44,6.0),(3.0,.04,.12))
    elif kind=='bell-pavilion':
        b.box('stone',(0,0,.5),(8,8,1))
        b.box('brick',(0,0,2.15),(6.5,6.5,2.4))
        roof(b,3.4,7.8,7.8,1.45)
        for x in [-2.6,2.6]:
            for y in [-2.6,2.6]:b.box('redwood',(x,y,5.7),(.28,.28,4.7))
        for y in [-2.6,2.6]:b.box('mineral',(0,y,7.85),(6,.25,.3))
        roof(b,8.1,6.5,6.5,1.7)
        b.rod('wood',(0,0,7.6),(0,0,6.8),.12,6)
        b.rod('bronze',(0,0,5.2),(0,0,6.7),.95,12,r2=.5)
        ring(b,'bronze',1.0,5.05,.22,.14)
    elif kind=='well':
        b.box('stone',(0,0,.12),(4.6,4.6,.24));ring(b,'stone',1.05,.24,1.0,.23)
        b.rod('water',(0,0,.20),(0,0,.25),.8,12)
        for x in [-1.6,1.6]:b.box('wood',(x,0,1.9),(.18,.18,3.8))
        b.rod('wood',(-1.7,0,2.0),(1.7,0,2.0),.1,8)
        b.rod('wood',(0,0,2.0),(0,0,.8),.035,5)
        roof(b,3.7,4.2,3.8,1.0)
    elif kind=='screen':
        b.box('stone',(0,0,.25),(9,1.3,.5));b.box('plaster',(0,0,1.9),(8.5,.6,3.3))
        b.box('brick',(0,-.33,2),(6.8,.12,2.1));b.box('plaster',(0,-.4,2),(6.4,.08,1.8))
        roof(b,3.65,8.5,1.1,.55,form='gable')
    elif kind=='stall':
        b.box('wood',(0,0,1.0),(3.4,1.4,.3))
        for x in [-1.5,1.5]:
            for y in [-.5,.5]:b.box('wood',(x,y,1.35),(.09,.09,2.7))
        b.mesh('awning',[(-1.9,-1.1,2.45),(1.9,-1.1,2.45),(1.9,0,2.95),(-1.9,0,2.95),(-1.9,1.1,2.45),(1.9,1.1,2.45)],[(0,1,2,3),(3,2,5,4),(3,2,1,0),(4,5,2,3)])
        for x in [-1,0,1]:
            b.box('wood',(x,0,1.35),(.65,.75,.4))
            b.ellipsoid('gold',(x,0,1.6),(.34,.3,.22),n=6,rings=3)
    elif kind=='cart':
        b.box('wood',(0,0,1.0),(2.4,3.8,.25))
        for x in [-1.1,1.1]:
            b.box('wood',(x,0,1.5),(.12,3.7,.9));b.box('wood',(x,3,.85),(.1,3,.1))
            b.rod('wood',(x-.15,0,.7),(x+.15,0,.7),.78,12)
            b.rod('stone',(x-.18,0,.7),(x+.18,0,.7),.16,8)
        for y in [-1.7,1.7]:b.box('wood',(0,y,1.5),(2.2,.12,.9))
        for x in [-.5,.5]:b.box('awning',(x,0,1.5),(.7,1.8,.75))
    elif kind=='hitching':
        for x in [-2,2]:b.box('stone',(x,0,.9),(.35,.4,1.8))
        b.box('wood',(0,0,1.2),(4.3,.14,.15))
    elif kind=='drain':
        for x in [-.6,.6]:b.box('stone',(x,0,-.02),(.25,1,.28))
        b.box('water',(0,0,-.10),(1.0,1,.02))
    elif kind=='slab-bridge':
        b.box('stone',(0,0,.16),(2.3,2.3,.22))
        for y in [-1.0,1.0]:b.box('stone',(0,y,.32),(2.2,.18,.18))


def create_prototypes(collection):
    models={}
    for name,params in BUILDINGS.items():
        batch=core.Batch('Urban_'+name,collection);hall(batch,name,params);models[name]=batch.finish()
    for name in ['paifang','bell-pavilion','well','screen','stall','cart','hitching','lane-gate','drain','slab-bridge']:
        batch=core.Batch('Urban_'+name,collection);facilities(batch,name);models[name]=batch.finish()
    batch=core.Batch('Urban_wall',collection)
    batch.box('plaster',(0,0,.5),(1,.9,1));batch.box('stone',(0,0,.055),(1,1,.11));batch.box('roof',(0,0,1.025),(1,1.1,.06));models['wall']=batch.finish()
    for name,role in [('paving','paving'),('court-paving','courtstone')]:
        batch=core.Batch('Urban_'+name,collection);batch.box(role,(0,0,-.1),(1,1,.12));models[name]=batch.finish()
    batch=core.Batch('Urban_tree',collection);batch.rod('wood',(0,0,0),(.3,0,4.8),.22,5,r2=.07)
    for i in range(7):
        a=i*2.4;x=math.cos(a)*1.4;y=math.sin(a)*1.4;z=4.3+i%3*.7
        batch.rod('wood',(.2,0,3),(x,y,z),.09,4,r2=.03)
        batch.ellipsoid('leaf' if i%2 else 'lightleaf',(x,y,z),(1.8,1.55,.85),seed=i+719,n=7,rings=4)
    models['tree']=batch.finish()
    # Low, irregular planting under the full Sun Wen crowns. Ground colour is
    # inherited from r21; these are real leaves and stones, not opaque discs.
    batch=core.Batch('Urban_screen-bed',collection);rng=random.Random(220918)
    for i in range(34):
        a=rng.random()*math.tau;r=math.sqrt(rng.random())*2.8
        x,y=math.cos(a)*r,math.sin(a)*r*.8
        for j in range(4):
            aa=a+j*1.7;reach=rng.uniform(.25,.53);z=rng.uniform(.14,.42)
            batch.mesh('lightleaf' if i%3 else 'leaf',[(x,y,.01),(x+math.cos(aa-.55)*reach*.5,y+math.sin(aa-.55)*reach*.5,z),(x+math.cos(aa)*reach,y+math.sin(aa)*reach,z*.8),(x+math.cos(aa+.55)*reach*.5,y+math.sin(aa+.55)*reach*.5,z)],[(0,1,2,3)])
    for x,y in [(-2,.4),(1.6,-1.1),(.6,1.7)]:batch.ellipsoid('mossstone',(x,y,.14),(.48,.34,.24),seed=int(x*100),rings=3,n=7)
    models['screen-bed']=batch.finish()
    batch=core.Batch('Urban_estate-bed',collection)
    # An irregular, shallow planted island within a private courtyard. Fine
    # foliage obscures its edge, instead of a tree rising through bare paving.
    vs=[(0,0,.045)]+[(math.cos(i*math.tau/24)*(2.75+.22*math.sin(i*2.3)),math.sin(i*math.tau/24)*(2.25+.18*math.cos(i*1.9)),.012) for i in range(24)]
    batch.mesh('moss',vs,[(0,i+1,(i+1)%24+1) for i in range(24)])
    models['estate-bed']=batch.finish()
    batch=core.Batch('Urban_screen-rock',collection)
    for i,(x,y,z,s) in enumerate([(-1.7,0,.65,1.15),(-.7,.1,1.25,1.3),(.3,.3,1.9,1.05),(1.35,.2,.85,1.1),(.1,-.65,.4,.75)]):
        batch.ellipsoid('mossstone',(x,y,z),(s*.73,s*.63,s),seed=i+992,rings=4,n=7)
        batch.ellipsoid('moss',(x-.12,y-.2,z+s*.48),(s*.65,s*.53,.17),seed=i+88,rings=3,n=7)
    models['screen-rock']=batch.finish()
    batch=core.Batch('Urban_bamboo-screen',collection)
    for i in range(18):
        a=i*2.399;r=.3+(i%5)*.27;x,y=math.cos(a)*r,math.sin(a)*r;h=3.4+(i%7)*.32
        batch.rod('bamboo',(x,y,0),(x+.2*math.cos(a),y+.2*math.sin(a),h),.038,5,r2=.018)
        for j in range(4):
            z=h*(.52+j*.13);aa=a+j*1.8;reach=.65
            ex,ey=x+math.cos(aa)*reach,y+math.sin(aa)*reach
            batch.rod('bamboo',(x,y,z),(ex,ey,z+.12),.015,4,r2=.005)
            for k in range(5):
                t=(k+1)/6;px=x+(ex-x)*t;py=y+(ey-y)*t;az=aa+(-.7 if k%2 else .7)
                lx,ly=math.cos(az)*.48,math.sin(az)*.48
                batch.mesh('leaf' if k%2 else 'lightleaf',[(px,py,z+.12*t),(px+lx*.4-ly*.10,py+ly*.4+lx*.10,z+.17),(px+lx,py+ly,z-.12),(px+lx*.4+ly*.10,py+ly*.4-lx*.10,z+.17)],[(0,1,2,3)])
    models['bamboo-screen']=batch.finish()
    return models

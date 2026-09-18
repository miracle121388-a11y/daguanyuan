"""Editable architectural identities, retaining original footprints and topology.

Sun Wen paintings guide proportions, pigment and ornament. The three additional
scenes are spatial interpretations, separate from the reviewed canon/route graph.
Retired generated walls remain editable; Manual_Adjustments is never replaced.
"""
import hashlib,json,math,sys
from array import array
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
import build_modules as core
import refined_modules as arch
import r8_architecture
import spatial_world as world
from reference_world import transform
from export_scene import export_selected
from sunwen_botany import linear
SPEC=json.loads((R/'config/sunwen.architecture.json').read_text())
PALETTE=json.loads((R/'config/garden.sunwen.json').read_text())
LAYOUT=json.loads((R/'config/garden.layout.json').read_text())
ROLES={'wood':'wood','dark':'darkwood','jade':'qing_jade','blue':'qing_azurite','gold':'gold','pink':'silk','paper':'screen','wall':'plaster','stone':'cutstone','roof':'roof','tile':'tile','ridge':'tiledark'}


def geometry_hash(ob):
    result=hashlib.sha256()
    for sequence,prop,count,kind in [(ob.data.vertices,'co',3,'f'),(ob.data.loops,'vertex_index',1,'i')]:
        values=array(kind,[0])*(len(sequence)*count);sequence.foreach_get(prop,values);result.update(values.tobytes())
    result.update(str(tuple(v for row in ob.matrix_world for v in row)).encode())
    return result.hexdigest()


def materials(pid):
    profile=SPEC['places'][pid]['profile'];palette={**PALETTE['defaults'],**PALETTE['profiles'][profile]['colors']};result={}
    for key,role in ROLES.items():
        name='Sunwen18_'+profile+'_'+key;m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True
        bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=linear(palette[role])
        bs.inputs['Roughness'].default_value=.83 if key in ['wall','stone','paper'] else .60
        bs.inputs['Metallic'].default_value=.14 if key=='gold' else 0;m.diffuse_color=linear(palette[role])
        m['architecturalRole']=key;m['architecturalProfile']=profile;m['architectureRevision']='r18';result[key]=m
        if key in ['roof','tile','ridge']:
            source=R/f'assets/processed/sunwen-r17/{profile}-{role}.png'
            tex=m.node_tree.nodes.get('Sunwen18_Pigment') or m.node_tree.nodes.new('ShaderNodeTexImage');tex.name='Sunwen18_Pigment'
            tex.image=bpy.data.images.load(str(source),check_existing=True);tex.image.pack();m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
            bs.inputs['Base Color'].default_value=(1,1,1,1)
            m['sunwenSurface']={'file':source.relative_to(R).as_posix(),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'role':role,'profile':profile}
    return result


class DetailBatch(core.Batch):
    def finish(self):
        old=core.M;core.M=materials(self.parent.get('architecturalId',self.parent.get('placeId')))
        try:objects=super().finish()
        finally:core.M=old
        for ob in objects:
            ob['sunwenOrnament']=True;ob['architectureRevision']='r18';ob['architecturalId']=self.parent.get('architecturalId',self.parent.get('placeId'))
            ob['roof']=ob.data.materials[0].get('architecturalRole') in ['roof','tile','ridge'];ob['roofShell']=ob['roof']
        return objects


def line(b,role,points,radius=.023,sides=5):
    for a,c in zip(points,points[1:]):
        if math.dist(a,c)>.0001:b.rod(role,a,c,radius,sides)


def loop(b,role,x,y,z,rx,rz,motif='circle',thickness=.024):
    # Continuous raised fretwork, not hundreds of disconnected capped tubes.
    # Shared planar faces also preserve the motif much better in the low LOD.
    n=32 if motif in ['begonia','lotus','brocade'] else 8 if motif=='octagon' else 24;vertices=[]
    for depth,inset in [(0,0),(0,thickness),(.018,0),(.018,thickness)]:
        for i in range(n):
            a=math.tau*i/n;k=1+(.16*math.cos(4*a) if motif=='begonia' else .09*math.cos(8*a) if motif=='brocade' else 0)
            vertices.append((x+(rx*k-inset)*math.cos(a),y+depth,z+(rz*k-inset)*math.sin(a)))
    faces=[]
    for j in range(n):
        k=(j+1)%n
        faces.extend([(j,k,k+n,j+n),(j+2*n,j+3*n,k+3*n,k+2*n),(j,j+2*n,k+2*n,k),(j+n,k+n,k+3*n,j+3*n)])
    b.mesh(role,vertices,faces)


def frame(b,x,y,z,w,h,motif,paper=True):
    if paper:b.box('paper',(x,y+.025,z),(w,.035,h))
    for xx in [-w/2,w/2]:b.box('wood',(x+xx,y-.02,z),(.085,.11,h+.10))
    for zz in [-h/2,h/2]:b.box('wood',(x,y-.02,z+zz),(w+.09,.11,.085))
    yy=y-.084
    if motif in ['begonia','brocade']:
        for dx in [-.32,.32]:b.box('jade',(x+dx*w,yy,z),(.032,.04,h-.10))
        for dz in [-.30,.30]:b.box('jade',(x,yy,z+dz*h),(w-.10,.04,.032))
        loop(b,'gold' if motif=='begonia' else 'jade',x,yy-.02,z,w*.29,h*.27,motif,.024)
        for sx in [-1,1]:
            for sz in [-1,1]:loop(b,'jade',x+sx*w*.35,yy,z+sz*h*.36,w*.095,h*.065,'circle',.017)
    elif motif=='bamboo':
        for i in [-1,0,1]:
            xx=x+i*w*.27;line(b,'jade',[(xx-w*.04,yy,z-h*.46),(xx+w*.04,yy,z+h*.46)],.022)
            for j in [-1,0,1]:
                zz=z+j*h*.28;b.box('wood',(xx,yy-.018,zz),(.15,.035,.035));line(b,'jade',[(xx,yy,zz),(xx+w*.18,yy,zz+h*.10)],.013)
    elif motif in ['octagon','moon','rounded']:
        loop(b,'wood',x,yy,z,w*.39,h*.39,'octagon' if motif=='octagon' else 'circle',.037)
        if motif=='moon':
            for sx in [-.22,0,.22]:b.box('jade',(x+sx*w,yy,z),(.022,.035,h*.58))
        else:
            for dz in [-.22,0,.22]:b.box('jade',(x,yy,z+dz*h),(w*.63,.035,.025))
            b.box('jade',(x,yy,z),(.028,.04,h*.72))
    elif motif in ['diamond','cloud']:
        for i in range(-2,3):
            cx=x+i*w*.18;line(b,'jade',[(cx-w*.15,yy,z),(cx,yy,z+h*.31),(cx+w*.15,yy,z),(cx,yy,z-h*.31),(cx-w*.15,yy,z)],.021)
        for dz in [-.41,.41]:b.box('wood',(x,yy,z+dz*h),(w-.10,.04,.035))
    elif motif=='woven':
        for i in range(1,7):b.box('wood',(x-w/2+i*w/7,yy,z),(.021,.035,h-.09))
        for i in range(1,9):b.box('jade',(x,yy-.015,z-h/2+i*h/9),(w-.09,.024,.019))
    else:
        for sx in [-.30,0,.30]:b.box('wood',(x+sx*w,yy,z),(.037,.045,h-.1))
        for sz in [-.34,.34]:b.box('wood',(x,yy,z+sz*h),(w-.1,.045,.037))
        if motif=='cross':b.box('jade',(x,yy-.02,z),(w*.65,.03,.025))


def frieze(b,x,y,width,z,motif,richness):
    h=.18+richness*.22;b.box('jade' if richness<.55 else 'blue',(x,y,z),(width,.13,h));edge='wood' if richness<.20 else 'gold'
    for dz in [-h/2,h/2]:b.box(edge,(x,y-.077,z+dz),(width,.022,.028))
    count=max(3,round(width/(1.1 if richness>.6 else 2.8)))
    if richness>=.20:
        for i in range(count):
            xx=x-width/2+(i+.5)*width/count
            if motif in ['begonia','brocade','lotus','cloud']:loop(b,'pink' if motif=='begonia' else edge,xx,y-.092,z,.115,h*.29,motif,.012)
            else:line(b,edge,[(xx-.21,y-.092,z),(xx,y-.092,z+.045),(xx+.21,y-.092,z),(xx,y-.092,z-.045),(xx-.21,y-.092,z)],.010)
    if richness>.65:
        b.box('paper',(x,y,z+h/2+.15),(width,.10,.16))
        for i in range(max(4,round(width/.38))):
            xx=x-width/2+(i+.5)*.38;line(b,'pink',[(xx-.04,y-.065,z+h/2+.085),(xx+.04,y-.065,z+h/2+.21)],.018,4)


def roof(b,x,y,z,w,d,rise=1.1,rolled=False,skirt=0,corner=.25):
    """Continuous curved shell and regular ribs, stable in both delivery tiers."""
    hw=w/2+.55;hd=d/2+.55;ridge=max(.15,(w-d)*.42)
    def point(u,t,side,hip=False,lift=0):
        zz=z+rise*(math.cos(t*math.pi/2)**1.30 if rolled else (1-t)**1.45)+.12*t**8+corner*t**8*abs(u)**8+lift
        return (x+side*(ridge+(hw-ridge)*t),y+u*hd*t,zz) if hip else (x+u*(ridge+(hw-ridge)*t),y+side*hd*t,zz)
    for hip in [False,True]:
        for side in [-1,1]:
            for j in range(8):
                vs=[point(u,skirt+(1-skirt)*t,side,hip) for t in [j/8,(j+1)/8] for u in [-1,1]]
                b.mesh('roof',vs,[(2,3,1,0) if ((side>0) if hip else (side<0)) else (0,1,3,2)])
            count=max(3,round((d if hip else w)/.43))
            for i in range(1,count):line(b,'tile',[point(-1+2*i/count,skirt+(1-skirt)*j/8,side,hip,.03) for j in range(9)],.031,4)
            for j in range(1,8):
                t=skirt+(1-skirt)*j/8
                line(b,'tile',[point(-1+i/6,t,side,hip,.014) for i in range(13)],.012,3)
    for sx in [-1,1]:
        for sy in [-1,1]:line(b,'ridge',[point(sx,skirt+(1-skirt)*j/10,sy,False,.09) for j in range(11)],.07,6)
    if not rolled and not skirt:line(b,'ridge',[(x-ridge-.14,y,z+rise+.10),(x+ridge+.14,y,z+rise+.10)],.08,7)
    for sy in [-1,1]:b.box('wood',(x,y+sy*hd,z-.055),(w+1.1,.16,.13))


def balustrade(b,a,c,height=.86,motif='cross',base=0):
    length=math.dist(a,c);angle=math.atan2(c[1]-a[1],c[0]-a[0])
    def build():
        for z in [.10,height]:b.box('wood',(0,0,base+z),(length,.12,.09))
        count=max(1,round(length/1.3))
        for i in range(count+1):b.box('wood',(-length/2+i*length/count,0,base+height/2),(.105,.115,height+.10))
        for i in range(count):
            x=-length/2+(i+.5)*length/count;w=length/count-.19
            if motif in ['lotus','moon','brocade']:loop(b,'jade',x,-.025,base+height*.51,w*.34,height*.27,'begonia' if motif=='lotus' else motif,.023)
            else:
                line(b,'jade',[(x-w/2,-.025,base+.20),(x+w/2,-.025,base+height-.10)],.027)
                line(b,'jade',[(x-w/2,-.025,base+height-.10),(x+w/2,-.025,base+.20)],.027)
    transform(b,build,((a[0]+c[0])/2,(a[1]+c[1])/2,0),angle)


def lantern(b,x,y,z,scale=.40):
    b.rod('dark',(x,y,z+.7*scale),(x,y,z+1.2*scale),.026,5)
    b.ellipsoid('pink',(x,y,z),(.43*scale,.43*scale,.63*scale),rings=4,n=8)
    for sign in [-1,1]:b.box('gold',(x,y,z+sign*.59*scale),(.62*scale,.62*scale,.075))
    line(b,'gold',[(x,y,z-.7*scale),(x,y,z-1.0*scale)],.017,4)


class PlanBatch(core.Batch):
    def __init__(self):super().__init__('Plan',None);self.halls=[]
    def mesh(self,mat,verts,faces,uvs=None):
        if mat.startswith('anchor_'):super().mesh(mat,verts,faces,uvs)


def hall_plan(place):
    b=PlanBatch()
    def capture(batch,x=0,y=6,w=18,d=8,h=4.4,openhall=False,detail=True,bays=3,style='plain',rolled=False,thatch=False):
        index=len(batch.halls);batch.halls.append(dict(w=w,d=d,h=h,openhall=openhall,bays=bays,thatch=thatch,rolled=rolled))
        batch.mesh('anchor_'+str(index),[(x,y,0),(x+1,y,0)],[])
    old,oldtower=arch.hall,r8_architecture.hall;arch.hall=r8_architecture.hall=capture
    try:
        style=place['style']
        if style in ['bamboo','flower','herb','study']:world.courtyard(b,style)
        elif style=='tower':world.tower(b)
        elif style=='temple':world.temple(b)
        elif style=='painting':world.painting(b)
        elif style=='gate':capture(b,0,0,23,7,5.3,openhall=True,bays=5)
        elif style=='farm':arch.farm(b)
        elif style=='reeds':arch.reeds_house(b)
        elif style in ['hill','moon']:capture(b,0,4,19 if style=='hill' else 17,9,4.7 if style=='hill' else 3.3,openhall=True,rolled=style=='moon')
    finally:arch.hall,r8_architecture.hall=old,oldtower
    for i,hall in enumerate(b.halls):
        origin,along=b.data['anchor_'+str(i)][0];hall.update(origin=origin,angle=math.atan2(along[1]-origin[1],along[0]-origin[0]))
    return b.halls


def dress_hall(b,hall,identity):
    w,d,h,bays=[hall[k] for k in ['w','d','h','bays']];motif=identity['motif'];rich=identity['richness']
    for sign in [-1,1]:transform(b,lambda:frieze(b,0,0,w+.6,h+.27,motif,rich),(0,sign*(d/2+.80),0),0 if sign==-1 else math.pi)
    width=w-1 if hall['openhall'] else w;depth=d-2.5 if hall['openhall'] else d
    top=h+.82;head=min(3.55,top-.42);sill=min(1.30,.57+(top-.57)*.30);opening=min(width/bays*.59,2.65)
    for sign in [-1,1]:
        for i in range(bays):
            if i==bays//2 and (sign==-1 or b.parent.get('placeId')=='daguanyuan_gate'):continue
            x=-width/2+(i+.5)*width/bays
            transform(b,lambda:frame(b,0,0,(sill+head)/2,opening+.04,head-sill+.02,motif),(x,sign*(depth/2+.32),0),0 if sign==-1 else math.pi)
    if rich>.65:
        for i in range(bays+1):
            x=-w/2+i*w/bays
            for sign in [-1,1]:line(b,'gold',[(x,-d/2-.4,h-.08),(x+sign*.28,-d/2-.4,h-.38),(x+sign*.62,-d/2-.4,h-.20)],.027)
        for x in [-w*.33,w*.33]:lantern(b,x,-d/2-.9,h-.35,.43)


def gate(b,pid,kind):
    if kind=='none':return
    w={'hanging-lotus':4.8,'slender':3.6,'plain':4.0,'wide':6.0,'arbor':4.0,'quiet':3.8,'soft':4.4}[kind]
    y=-13.45 if pid not in ['daoxiangcun','nuanxiangwu'] else -11.5
    if kind=='wide':y=-12.6
    h=3.5 if kind=='hanging-lotus' else 3.2
    for sx in [-1,1]:
        b.box('stone',(sx*w/2,y,.35),(.44,.46,.66));b.rod('wood',(sx*w/2,y,.67),(sx*w/2,y,h),.10 if kind=='slender' else .14,10)
    frieze(b,0,y-.08,w+.25,h-.04,SPEC['places'][pid]['motif'],SPEC['places'][pid]['richness'])
    if kind=='arbor':
        for i in range(7):b.box('wood',(-w/2+i*w/6,y,h+.18),(.075,1.8,.09))
        for sign in [-1,1]:b.box('dark',(0,y+sign*.62,h+.08),(w+.7,.09,.13))
    else:roof(b,0,y,h+.35,w+.5,1.25,.98 if kind=='hanging-lotus' else .70,kind in ['plain','soft'])
    if kind=='hanging-lotus':
        for sx in [-1,1]:
            x=sx*(w/2-.38);b.rod('gold',(x,y,h-.12),(x,y,h-.77),.044,6)
            b.ellipsoid('pink',(x,y,h-.82),(.13,.13,.18),rings=3,n=6);lantern(b,sx*w*.32,y-.17,h-.65,.34)


def water_screen(b):
    """Four open sides: folded leaves at posts replace solid enclosing walls."""
    def side(w):
        for i in range(3):
            cx=-w/2+(i+.5)*w/3
            for sx in [-1,1]:transform(b,lambda:frame(b,0,0,3.05,.58,2.4,'lotus',False),(cx+sx*(w/6-.44),0,0),sx*.48)
        frieze(b,0,-.13,w+.25,4.91,'lotus',.52)
    for sign in [-1,1]:
        transform(b,lambda:side(15),(0,sign*4.14,0),0 if sign==-1 else math.pi)
        for a,c in [((-7.5,sign*4.65),(-2.0,sign*4.65)),((2.0,sign*4.65),(7.5,sign*4.65))]:
            balustrade(b,a,c,.76,'lotus',1.12);b.box('wood',((a[0]+c[0])/2,a[1]-.22*sign,1.52),(math.dist(a,c),.50,.095))
        transform(b,lambda:frame(b,0,0,3.0,.65,2.35,'lotus',False),(sign*7.6,2.9,0),math.pi/2)
    for x in [-5,5]:lantern(b,x,-4.25,4.17,.38)


def roofed_hall(b,w,d,h=3.5,openhall=True,level=0,upper=False):
    identity=SPEC['places'][b.parent['architecturalId']];motif=identity['motif']
    b.box('wood' if upper else 'stone',(0,0,level+.25),(w+1.3,d+1.3,.30))
    for i in range(4):
        x=-w/2+i*w/3
        for sy in [-1,1]:
            b.rod('wood',(x,sy*d/2,level+.42),(x,sy*d/2,level+h),.105 if upper else .14,10)
            b.box('stone',(x,sy*d/2,level+.45),(.34,.34,.28))
    for sy in [-1,1]:frieze(b,0,sy*d/2,w+.15,level+h-.15,motif,identity['richness'])
    if not openhall:
        for sy in [-1,1]:
            for i in [-1,1]:
                x=i*w/3;b.box('wall',(x,sy*(d/2-.25),level+1.45),(w/3-.18,.20,2.0))
                transform(b,lambda:frame(b,0,0,level+1.95,w/3-.65,1.65,motif),(x,sy*(d/2+.10),0),0 if sy==-1 else math.pi)
        for sx in [-1,1]:
            b.box('wall',(sx*(w/2-.14),0,level+1.6),(.20,d,2.3))
            transform(b,lambda:frame(b,0,0,level+1.95,2.15,1.65,motif),(sx*(w/2+.06),0,0),-sx*math.pi/2)
    skirt=.60 if b.parent['architecturalId']=='zhuijinlou' and not upper else 0
    roof(b,0,0,level+h+.13,w+.55,d+.65,1.35 if upper else 1.55,skirt=skirt)


def additional(b,setting):
    pid=setting['id'];w,d=setting['size']
    if pid=='zhuijinlou':
        roofed_hall(b,w,d,3.7,False)
        transform(b,lambda:roofed_hall(b,9.7,5.5,3.05,False,upper=True),(0,.35,4.75))
        for sy in [-1,1]:balustrade(b,(-5.9,sy*3.9),(5.9,sy*3.9),.80,'brocade',5.15)
        for sx in [-1,1]:balustrade(b,(sx*5.9,-3.9),(sx*5.9,3.9),.80,'brocade',5.15);lantern(b,sx*4.7,-4.1,3.1,.45)
        for i in range(3):b.box('stone',(0,-d/2-1.1-i*.32,.32-i*.10),(3.0,.70,.16))
    elif pid=='jiayintang':
        roofed_hall(b,w,d,3.9,True)
        for sx in [-1,1]:
            transform(b,lambda:frame(b,0,0,2.0,2.15,2.4,'cross',False),(sx*w/2,0,0),math.pi/2)
            balustrade(b,(sx*w/2,-d/2-3.8),(sx*w/2,d/2),.85,'cross',.35)
        b.box('stone',(0,-d/2-2.1,.13),(w+1.5,3.6,.22));b.box('wood',(0,1.25,1.25),(7.5,1.40,.15))
        for x in [-3.1,3.1]:
            for y in [.80,1.75]:b.box('dark',(x,y,.79),(.14,.14,.88))
        for x in [-3,-1,1,3]:
            b.box('wood',(x,-.60,.87),(1.1,.48,.12))
            for dx in [-.4,.4]:b.box('dark',(x+dx,-.60,.59),(.08,.38,.5))
    else:
        b.box('stone',(0,0,.25),(w+4,d+4,.35));roofed_hall(b,w,d,3.1,True)
        for a,c in [((-w/2-1,-d/2-1),(-1.7,-d/2-1)),((1.7,-d/2-1),(w/2+1,-d/2-1)),((-w/2-1,-d/2-1),(-w/2-1,d/2+1)),((w/2+1,-d/2-1),(w/2+1,d/2+1))]:balustrade(b,a,c,.80,'diamond',.43)
        for sx in [-1,1]:b.box('wood',(sx*(w/2-.6),0,.85),(.5,d-.7,.11))


def gallery_covers(collection):
    root=bpy.data.objects.new('Sunwen18_Gallery_Roof',None);collection.objects.link(root);root['architecturalId']='ouxiangxie';root['sunwenOrnament']=True
    b=DetailBatch('Sunwen18_Gallery',collection,root);nodes={n['id']:n['position'] for n in LAYOUT['pathNodes']}
    for edge in LAYOUT['pathEdges']:
        if edge['kind']!='gallery':continue
        a,c=nodes[edge['from']],nodes[edge['to']];length=math.dist(a[:2],c[:2]);angle=math.atan2(c[1]-a[1],c[0]-a[0])
        # A continuous shell covers fragile far-LOD corridor tiles.
        transform(b,lambda:roof(b,0,0,4.16,length+1.4,3.25,.98,corner=.62),((a[0]+c[0])/2,(a[1]+c[1])/2,0),angle)
    return [root]+b.finish()


def approach(b,pid,tree,origin):
    paths={'zilingzhou':[(80,-30),(86,-17),(100,-13),(116,-8)],'zhuijinlou':[(87,-1),(96,-8),(100,-13)],'jiayintang':[(-72,42),(-70,37),(-69,31)]}
    ox,oy,oz=origin
    for a,c in zip(paths[pid],paths[pid][1:]):
        length=math.dist(a,c);count=max(1,math.ceil(length/.85));angle=math.atan2(c[1]-a[1],c[0]-a[0])
        for i in range(count):
            t=(i+.5)/count;x=a[0]+(c[0]-a[0])*t;y=a[1]+(c[1]-a[1])*t
            point=tree.ray_cast(Vector((x,y,100)),Vector((0,0,-1)),200)[0]
            if point is None:raise ValueError('Scenery approach crosses water: '+pid)
            transform(b,lambda:b.box('stone',(0,0,0),(.80,1.65,.095)),(x-ox,y-oy,point.z+.052-oz),angle)


def ground_tree():
    vertices=[];faces=[]
    for ob in bpy.data.collections['Garden_Landscape'].objects:
        if ob.type!='MESH' or not any(m.name=='earth' for m in ob.data.materials):continue
        offset=len(vertices);vertices.extend(ob.matrix_world@v.co for v in ob.data.vertices)
        faces.extend(tuple(offset+i for i in p.vertices) for p in ob.data.polygons)
    return BVHTree.FromPolygons(vertices,faces)


def update_pigments(manual):
    surfaces=json.loads((R/'assets/processed/sunwen-r17/manifest.json').read_text());lookup={(r['profile'],r['role']):r for r in surfaces['files']};cache={}
    for ob in list(bpy.data.objects):
        if ob.type!='MESH' or ob in manual or ob.get('sunwenOrnament'):continue
        root=ob
        while root.parent:root=root.parent
        pid=root.get('placeId')
        if pid not in SPEC['places']:continue
        profile=SPEC['places'][pid]['profile']
        for index,source in enumerate(ob.data.materials):
            if not source:continue
            role=source.get('sunwenRole',source.name)
            if role not in PALETTE['defaults']:continue
            selected='vermillion-wall' if role=='plaster' and not ob.get('roof') and (pid=='daguanyuan_gate' or (pid=='daguanlou' and not ob.get('preserveEnvelope'))) else profile
            key=(selected,role)
            if key not in lookup:continue
            row=lookup[key]
            if key not in cache:
                m=source.copy();m.name='Sunwen_r18_'+selected+'_'+role;m.use_nodes=True
                bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');tex=m.node_tree.nodes.new('ShaderNodeTexImage')
                tex.image=bpy.data.images.load(str(R/row['file']),check_existing=False);tex.image.pack();m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
                for link in list(bs.inputs['Roughness'].links):m.node_tree.links.remove(link)
                bs.inputs['Roughness'].default_value=row['roughness'];bs.inputs['Metallic'].default_value=row['metallic'];m.diffuse_color=linear(row['pigment'])
                m['sunwenRole']=role;m['sunwenProfile']=selected;m['sunwenSurface']={'file':row['file'],'sha256':row['sha256'],'role':role,'profile':selected};cache[key]=m
            ob.data.materials[index]=cache[key]
    return len(cache)


def export_mobile(objects,roots):
    # Fine raised tile courses are subpixel at mobile overview distances.
    # Keep the entire textured roof shell and ridges; omit only that relief.
    mobile=[o for o in objects if o.data.materials[0].get('architecturalRole')!='tile']
    for ob in mobile:
        role=ob.data.materials[0].get('architecturalRole')
        ratio={'gold':.05,'pink':.07,'jade':.07,'wood':.32,'dark':.32,'ridge':.20}.get(role)
        if ratio is not None and len(ob.data.polygons)>350:
            modifier=ob.modifiers.new('Sunwen18_Mobile_Relief','DECIMATE');modifier.ratio=ratio
    export_selected(R/'public/models/sunwen-architecture-low.glb',mobile+roots)
    for ob in mobile:ob.modifiers.clear()


def main():
    bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
    manual=set(bpy.data.collections['Manual_Adjustments'].all_objects) if 'Manual_Adjustments' in bpy.data.collections else set();bpy.context.view_layer.update()
    protected={ob.name:geometry_hash(ob) for col in bpy.data.collections if col.name.startswith('Place_') or col.name in ['Garden_Landscape','Manual_Adjustments'] for ob in col.all_objects if ob.type=='MESH' and not ob.get('sunwenOrnament')}
    col=bpy.data.collections.get('Sunwen_Architectural_Details')
    if col:bpy.data.batch_remove(ids=[o for o in col.objects if o not in manual])
    else:col=bpy.data.collections.new('Sunwen_Architectural_Details');bpy.context.scene.collection.children.link(col)
    col['generated']=True;col['architectureRevision']='r18';retired=[]
    for ob in list(bpy.data.objects):
        if ob.type!='MESH' or ob in manual:continue
        parent=ob
        while parent.parent:parent=parent.parent
        pid=parent.get('placeId')
        if not pid:continue
        roles={m.get('sunwenRole',m.name) for m in ob.data.materials}
        obsolete_beam=ob.get('enclosureRevision') and roles.intersection({'gold','qing_azurite','qing_jade'})
        heavy_water_wall=pid=='ouxiangxie' and ((ob.get('enclosureRevision') and not ob.name.endswith('_ceiling')) or roles=={'screen'})
        if obsolete_beam or heavy_water_wall:ob.hide_render=True;ob.hide_set(True);ob['sunwenRetired']='r18 architectural character';retired.append(ob.name)
    pigment_count=update_pigments(manual)
    import reference_craft,r5_craft,r6_architecture,r7_architecture
    for module in [reference_craft,r5_craft,r6_architecture,r7_architecture,r8_architecture]:module.install()
    objects=[];roots=[];records=[]
    for p in LAYOUT['places']:
        pid=p['id'];root=bpy.data.objects[pid];identity=SPEC['places'][pid];b=DetailBatch('Sunwen18_'+pid,col,root);halls=hall_plan(p)
        for hall in halls:transform(b,lambda hall=hall:dress_hall(b,hall,identity),hall['origin'],hall['angle'])
        gate(b,pid,identity['gate'])
        if pid=='ouxiangxie':water_screen(b)
        if pid in ['tubishanzhuang','aojingxiguan']:
            w=19 if pid=='tubishanzhuang' else 17
            for sx in [-1,1]:balustrade(b,(sx*(w/2+.25),-2.3),(sx*(w/2+.25),7.8),.82,identity['motif'],.60)
        if pid=='dicuiting':
            for sx in [-1,1]:balustrade(b,(sx*3.1,-2.6),(sx*3.1,2.6),.73,'lotus',.5)
        added=b.finish();objects.extend(added)
        if added:roots.append(root)
        records.append({'placeId':pid,'profile':identity['profile'],'motif':identity['motif'],'richness':identity['richness'],'features':identity['features'],'halls':len(halls),'meshes':len(added),'faces':sum(len(o.data.polygons) for o in added)})
    tree=ground_tree();supplement=[]
    for p in SPEC['additionalScenes']:
        root=bpy.data.objects.new('Sunwen18_'+p['id'],None);col.objects.link(root);x,y,_=p['position'];w,d=p['size']
        heights=[tree.ray_cast(Vector((x+dx,y+dy,100)),Vector((0,0,-1)),200)[0] for dx in [-w/2,0,w/2] for dy in [-d/2,0,d/2]]
        z=max(point.z for point in heights if point is not None);root.location=(x,y,z);root['architecturalId']=p['id'];root['sunwenOrnament']=True;root['interpretation']=p['interpretation']
        b=DetailBatch('Sunwen18_'+p['id'],col,root);additional(b,p)
        approach(b,p['id'],tree,(x,y,z))
        low=min(point.z for point in heights if point is not None)-z;b.box('stone',(0,0,(low+.10)/2),(w+1.2,d+1.2,.10-low))
        added=b.finish();objects.extend(added);roots.append(root)
        camera=[x-16,z+15,-y+26] if p['id']=='jiayintang' else [x+20,z+18,-y+30]
        supplement.append({**p,'position':[x,round(z,4),-y],'character':SPEC['places'][p['id']]['character'],'cameraTarget':[x,z+2,-y],'cameraPosition':camera})
        records.append({'placeId':p['id'],'profile':SPEC['places'][p['id']]['profile'],'motif':SPEC['places'][p['id']]['motif'],'features':SPEC['places'][p['id']]['features'],'meshes':len(added),'faces':sum(len(o.data.polygons) for o in added),'additionalScene':True})
    extras=gallery_covers(col);objects.extend(o for o in extras if o.type=='MESH');roots.extend(o for o in extras if o.type!='MESH');bpy.context.view_layer.update()
    for name,digest in protected.items():
        if geometry_hash(bpy.data.objects[name])!=digest:raise RuntimeError('Original geometry changed: '+name)
    (R/'public/architecture-scenes.json').write_text(json.dumps({'revision':'r18','scenes':supplement,'records':records,'evidenceBoundary':SPEC['evidenceBoundary']},ensure_ascii=False,indent=2)+'\n')
    export_selected(R/'public/models/sunwen-architecture.glb',objects+roots)
    export_mobile(objects,roots)
    for p in LAYOUT['places']:
        root=bpy.data.objects[p['id']];position=root.location.copy();root.location=(0,0,0);bpy.context.view_layer.update()
        export_selected(R/'public/models/places'/f'{p["id"]}.glb',[root]+[o for o in root.children_recursive if not o.get('sunwenOrnament') and not o.get('sunwenRetired')]);root.location=position
    bpy.context.view_layer.update()
    from publish_manifest import publish
    publish(LAYOUT)
    for ob in bpy.data.objects:
        if ob.get('sunwenRetired'):ob.hide_render=True;ob.hide_set(True)
    bpy.ops.wm.save_as_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'))
    report={'revision':'r18','method':__doc__,'records':records,'retiredGeneratedMeshes':retired,'retainedOriginalMeshes':len(protected),'originalGeometryUnchanged':True,'manualObjects':len(manual),'pigmentMaterials':pigment_count,'sourcePlates':SPEC['referencePlates'],'masterSha256':hashlib.sha256((R/'blender/daguanyuan_master.blend').read_bytes()).hexdigest()}
    (R/'reports/acceptance/r18-architecture.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print('SUNWEN ARCHITECTURE',len(records),'identities',len(objects),'meshes; original topology preserved',flush=True)


if __name__=='__main__':
    if '--lod-only' in sys.argv:
        bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
        objects=[o for o in bpy.data.collections['Sunwen_Architectural_Details'].objects if o.type=='MESH']
        export_mobile(objects,list({o.parent for o in objects if o.parent}))
    else:main()

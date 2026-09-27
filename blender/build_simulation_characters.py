"""Detailed, articulated garden cast. Run through npm run models:characters.

Y-up geometry retains the existing web rig. Only this character scene is built;
the garden mother scene and its Manual_Adjustments collection are untouched.
"""
import bpy, math, json, hashlib, os, sys, random
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'blender'))
from character_anatomy import Anatomy, PROVENANCE
DESIGN = json.loads((ROOT/'config/simulation.characters.json').read_text())
PREVIEW = os.environ.get('GARDEN_CHARACTER_PREVIEW')
OUT = ROOT/'public/models/characters'
PORTRAITS = ROOT/'public/textures/characters'
EVIDENCE = ROOT/'reports/characters/20260926'
for folder in [OUT, PORTRAITS, EVIDENCE]: folder.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = True
scene.view_settings.view_transform = 'AgX'
scene.world = bpy.data.worlds.new('Character studio')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.48,.56,.57,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .35

def linear(c): return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
def color(hex): return tuple(linear(int(hex[i:i+2],16)/255) for i in (1,3,5))+(1,)
def mix(a,b,t): return tuple(a[i]*(1-t)+b[i]*t for i in range(4))
def clamp(x): return max(0,min(1,x))
def smooth(x): x=clamp(x);return x*x*(3-2*x)

def micro_normal(name, silk=False):
    image=bpy.data.images.new(name,width=128,height=128,alpha=False)
    image.colorspace_settings.name='Non-Color'
    pixels=[]
    rng=random.Random(328 if silk else 712)
    for y in range(128):
        for x in range(128):
            if silk:
                dx=.18*math.sin(x*math.pi*.5)+.05*math.sin(y*math.pi*.25)
                dy=.13*math.sin(y*math.pi*.5)
            else:
                dx=rng.uniform(-.12,.12);dy=rng.uniform(-.12,.12)
            n=Vector((dx,dy,1)).normalized();pixels.extend(((n.x+1)/2,(n.y+1)/2,(n.z+1)/2,1))
    image.pixels.foreach_set(pixels);image.pack()
    return image
SKIN_NORMAL=micro_normal('Authored skin microstructure')
SILK_NORMAL=micro_normal('Authored woven silk',True)

def material(name,roughness=.6,metallic=0,normal=None):
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    n=mat.node_tree.nodes;bsdf=n.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value=roughness
    bsdf.inputs['Metallic'].default_value=metallic
    vc=n.new('ShaderNodeVertexColor');vc.layer_name='Color'
    mat.node_tree.links.new(vc.outputs['Color'],bsdf.inputs['Base Color'])
    if normal:
        tex=n.new('ShaderNodeTexImage');tex.image=normal
        mapping=n.new('ShaderNodeMapping');mapping.inputs['Scale'].default_value=(24,24,24) if normal==SKIN_NORMAL else (3,3,3)
        uv=n.new('ShaderNodeTexCoord');mat.node_tree.links.new(uv.outputs['UV'],mapping.inputs['Vector']);mat.node_tree.links.new(mapping.outputs['Vector'],tex.inputs['Vector'])
        bump=n.new('ShaderNodeNormalMap');bump.inputs['Strength'].default_value=.17 if normal==SKIN_NORMAL else .20
        mat.node_tree.links.new(tex.outputs['Color'],bump.inputs['Color']);mat.node_tree.links.new(bump.outputs['Normal'],bsdf.inputs['Normal'])
    return mat
MATS={'skin':material('Warm skin',.54,normal=SKIN_NORMAL),'silk':material('Woven silk',.60,normal=SILK_NORMAL),'hair':material('Combed dark hair',.56),'gold':material('Brushed gold thread',.37,.68),'jade':material('Polished jade and enamel',.25,.08),'eye':material('Wet eyes',.27),'ink':material('Ink and lashes',.82)}
# The only photographic detail is the reviewed, bundled CC0 iris map.
eye_map=bpy.data.images.load(str(ROOT/'assets/characters/makehuman/brown_eye.png'));eye_map.scale(256,256)
eye_pixels=list(eye_map.pixels)
for i in range(0,len(eye_pixels),4):
    if eye_pixels[i]>eye_pixels[i+1]*1.25 and eye_pixels[i]>eye_pixels[i+2]*1.25:
        eye_pixels[i]*=.64;eye_pixels[i+1]*=.76;eye_pixels[i+2]*=.84
eye_map.pixels.foreach_set(eye_pixels);eye_map.pack()
eye_nodes=MATS['eye'].node_tree.nodes;eye_tex=eye_nodes.new('ShaderNodeTexImage');eye_tex.image=eye_map
MATS['eye'].node_tree.links.new(eye_tex.outputs['Color'],eye_nodes['Principled BSDF'].inputs['Base Color'])

def empty(name,parent=None,position=(0,0,0)):
    obj=bpy.data.objects.new(name,None);scene.collection.objects.link(obj);obj.parent=parent;obj.location=position;return obj

def finish(obj,parent,shade,name,kind='silk'):
    obj.name=name;obj.parent=parent;obj.data.materials.clear();obj.data.materials.append(MATS[kind])
    attr=obj.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER');rgba=color(shade)
    for loop in obj.data.loops:
        p=obj.data.vertices[loop.vertex_index].co
        factor=1+.024*math.sin(p.y*41+p.x*22)*math.sin(p.z*35) if kind=='silk' else 1
        attr.data[loop.index].color=tuple(min(1,v*factor) for v in rgba[:3])+(1,)
    for face in obj.data.polygons:face.use_smooth=True
    return obj

def mesh(name,verts,faces,parent,shade,kind='silk',uvs=None):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj)
    if uvs:
        uv=data.uv_layers.new(name='UVMap')
        for loop in data.loops:uv.data[loop.index].uv=uvs[loop.vertex_index]
    return finish(obj,parent,shade,name,kind)

def ellipsoid(parent,pos,scale,shade,name='detail',segments=20,rings=12,kind='silk'):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings)
    obj=bpy.context.object;obj.location=pos;obj.scale=scale
    return finish(obj,parent,shade,name,kind)

def loft(parent,levels,shade,name,folds=0,center=(0,0,0),segments=48):
    verts=[];uv=[]
    for j,(y,rx,rz) in enumerate(levels):
        for i in range(segments):
            a=i*math.tau/segments
            ripple=1+folds*(.7*math.cos(14*a+.3*y)+.3*math.sin(23*a-.4*y))
            verts.append((center[0]+math.cos(a)*rx*ripple,center[1]+y,center[2]+math.sin(a)*rz*ripple));uv.append((i/segments,y*1.6))
    faces=[(j*segments+i,j*segments+(i+1)%segments,(j+1)*segments+(i+1)%segments,(j+1)*segments+i) for j in range(len(levels)-1) for i in range(segments)]
    faces += [tuple(reversed(range(segments))),tuple((len(levels)-1)*segments+i for i in range(segments))]
    return mesh(name,verts,[tuple(reversed(face)) for face in faces],parent,shade,uvs=uv)

def stroke(parent,points,shade,radius=.0015,name='thread',kind='silk',sides=5):
    points=[Vector(p) for p in points];verts=[];uv=[]
    for j,p in enumerate(points):
        tangent=(points[min(j+1,len(points)-1)]-points[max(0,j-1)]).normalized()
        u=tangent.cross(Vector((0,0,1)))
        if u.length<.01:u=tangent.cross(Vector((1,0,0)))
        u.normalize();v=tangent.cross(u).normalized()
        taper=.7+.3*math.sin(math.pi*j/max(1,len(points)-1))
        for i in range(sides):
            a=math.tau*i/sides;verts.append(p+(u*math.cos(a)+v*math.sin(a))*radius*taper);uv.append((i/sides,j/len(points)))
    faces=[(j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i) for j in range(len(points)-1) for i in range(sides)]
    return mesh(name,verts,faces,parent,shade,kind,uv)

def box(parent,pos,scale,shade,name='prop',kind='silk'):
    bpy.ops.mesh.primitive_cube_add(size=1);obj=bpy.context.object;obj.location=pos;obj.scale=scale
    bevel=obj.modifiers.new('Finished edges','BEVEL');bevel.width=.08;bevel.segments=2
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=bevel.name)
    return finish(obj,parent,shade,name,kind)

def flower(parent,x,y,z,shade,size=.013,high=True):
    for i in range(5):
        a=math.tau*i/5
        leaf=ellipsoid(parent,(x+math.sin(a)*size,y+math.cos(a)*size,z),(size*.48,size*.75,.0015),shade,'silk petal',12 if high else 8,6 if high else 4)
        leaf.rotation_euler.z=-a
    ellipsoid(parent,(x,y,z+.002),(.003,.003,.002),'#C1A36C','flower heart',10,6,'gold')

def head_hair(head,c,high,face):
    bvh=BVHTree.FromPolygons([v.co for v in face.data.vertices],[list(f.vertices) for f in face.data.polygons])
    origin=Vector((0,.035,.012))
    def cap(theta,phi,offset=0):
        direction=Vector((math.sin(theta)*math.cos(phi),math.cos(theta),math.sin(theta)*math.sin(phi)))
        hit=bvh.ray_cast(origin,direction,.4)
        return hit[0]+hit[1]*(.0018+offset) if hit[0] is not None else origin+direction*.10
    def limit(phi):
        front=smooth((math.sin(phi)+.15)/1.15)
        back=smooth((-math.sin(phi)-.05)/.95)
        return 1.47+.75*back-.44*front
    segments=64 if high else 40;rings=18 if high else 12;verts=[]
    for j in range(rings+1):
        for i in range(segments):
            phi=math.tau*i/segments;verts.append(cap(.025+(limit(phi)-.025)*j/rings,phi))
    faces=[(j*segments+i,j*segments+(i+1)%segments,(j+1)*segments+(i+1)%segments,(j+1)*segments+i) for j in range(rings) for i in range(segments)]
    mesh('fitted scalp',verts,faces,head,c['hair'],'hair')
    count=60 if high else 24
    for i in range(count):
        phi=math.tau*i/count
        pts=[cap(.15+(limit(phi)-.15)*j/17,phi+.026*math.sin(j/17*math.pi),.0011) for j in range(18)]
        stroke(head,pts,['#242125','#302827','#25252A'][i%3],.00023 if high else .00032,'combed hair strands','hair',4)
    if c['name']=='贾宝玉':
        ellipsoid(head,(0,.167,-.018),(.042,.037,.037),c['hair'],'bound topknot',24,16,'hair')
        loft(head,[(.169,.034,.032),(.197,.029,.03),(.206,.022,.025)],c['trim'],'gold crown',center=(0,0,-.011),segments=24)
        for side in [-1,1]:stroke(head,[(side*.032,.195,-.005),(side*.035,.125,-.052),(side*.043,.032,-.086),(side*.036,-.044,-.087)],c['robe'],.006,'crown ribbon')
        ellipsoid(head,(0,.192,.021),(.009,.012,.004),'#B5C9AF','crown jade',12,8,'jade')
    else:
        bun_y=.139 if c['name']!='王熙凤' else .17
        ellipsoid(head,(0,bun_y,-.071),(.054,.035,.038),c['hair'],'coiled chignon',32 if high else 20,18 if high else 12,'hair')
        for i in range(16 if high else 7):
            a=math.tau*i/(16 if high else 7)
            pts=[(.053*math.sin(t)*math.cos(a),bun_y+.034*math.cos(t),-.071+.037*math.sin(t)*math.sin(a)) for t in [math.pi*j/14 for j in range(1,14)]]
            stroke(head,pts,'#393130',.0009,'chignon combing','hair',4)
        pin_y=bun_y+.015
        stroke(head,[(-.122,pin_y,-.058),(.12,pin_y+.018,-.054)],c['trim'],.0027,'gold hairpin','gold',8)
        flower(head,-.09,pin_y+.005,-.015,c['lining'],.012,high)
        for side in [-1,1]:
            # Pearl or jade drops are separated from the anatomical ear lobes.
            stroke(head,[(side*.084,-.011,.018),(side*.086,-.032,.020)],c['trim'],.0011,'earring chain','gold')
            ellipsoid(head,(side*.086,-.039,.020),(.0038,.007,.0038),'#E4D9B9' if c['name']!='王熙凤' else '#B85754','earring drop',14,8,'jade')
        if c['name']=='王熙凤':
            for i in range(5):
                x=(i-2)*.018
                stroke(head,[(x,.163,-.028),(x*1.45,.226-abs(x)*.6,-.03)],c['trim'],.0018,'phoenix comb','gold')
                ellipsoid(head,(x*1.45,.227-abs(x)*.6,-.029),(.004,.006,.003),c['lining'],'inlaid comb',12,8,'jade')
            for i in range(3):stroke(head,[(.094+i*.008,.178,-.018),(.097+i*.008,.123-i*.009,-.014)],c['trim'],.001,'trembling gold chain','gold',5)


def embroidery(body,c,high):
    count=7 if high else 4
    for side in [-1,1]:
        for k in range(count):
            y=.79+k*.073;x=side*(.11+.025*math.sin(k*1.7));z=.162 if y<1 else .145
            pts=[(x+.008*math.sin(t*math.pi),y+t*.063,z+.0015) for t in [i/7 for i in range(8)]]
            stroke(body,pts,c['trim'],.0012,'gold vine','gold',4)
            flower(body,x+.017*side,y+.026,z+.003,c['lining'],.0065,high)
            stroke(body,[(x,y+.01,z),(x-.019*side,y+.025,z+.002),(x-.013*side,y+.035,z)],c['trim'],.0011,'embroidered leaf','gold',4)
    # Continuous small stitches along the lower jacket, not oversized decals.
    for i in range(28 if high else 14):
        a=math.pi*(i+.5)/(28 if high else 14)
        x=.242*math.cos(a);z=.16*math.sin(a)
        stroke(body,[(x,.71,z),(x*.97,.733,z*.97)],c['lining'],.0016,'hem stitch',sides=4)


def build(cid,c,high):
    root=empty(cid);root['agentId']=cid;root['artisticInterpretation']=c['motif'];root['detailLevel']='high' if high else 'low'
    body=empty(cid+'_body',root);skirt=empty(cid+'_skirt',body)
    segments=64 if high else 40
    loft(skirt,[(.07,.235,.157),(.13,.254,.171),(.26,.246,.164),(.45,.224,.15),(.64,.203,.142),(.81,.18,.125),(.99,.155,.108)],c['skirt'],'hanging pleats',.052,segments=segments)
    loft(skirt,[(.10,.250,.169),(.124,.255,.173),(.142,.254,.171)],c['trim'],'woven skirt hem',.047,segments=segments)
    loft(body,[(.68,.242,.151),(.74,.234,.145),(.84,.213,.134),(.99,.163,.114),(1.10,.168,.119),(1.23,.18,.124),(1.34,.203,.112),(1.40,.174,.098),(1.46,.075,.070)],c['robe'],'tailored silk jacket',.012,segments=segments)
    loft(body,[(.68,.245,.155),(.705,.244,.157)],c['trim'],'jacket border',segments=segments)
    loft(body,[(1.435,.067,.060),(1.493,.059,.055)],c['lining'],'standing collar',segments=32)
    stroke(body,[(-.06,1.477,.056),(-.035,1.40,.112),(.062,1.315,.13),(.125,1.19,.115),(.129,.74,.147)],c['trim'],.0044,'lapel piping','gold',8)
    stroke(body,[(-.044,1.453,.061),(-.017,1.38,.123),(.065,1.305,.136),(.119,1.19,.125)],c['lining'],.006,'inner lapel',sides=8)
    for y in [1.28,1.17,1.06]:
        stroke(body,[(.092,y,.138),(.105,y+.004,.139),(.116,y,.14)],c['trim'],.0027,'knotted fastener','gold',6)
        ellipsoid(body,(.115,y,.141),(.0035,.0035,.003),c['trim'],'fastener bead',12,6,'gold')
    loft(body,[(.975,.172,.121),(1.009,.173,.121)],c['trim'],'woven waist sash',segments=segments)
    for side in [-1,1]:
        x=side*.027
        stroke(body,[(x,.97,.126),(x*1.8,.78,.154),(x*2,.53,.169)],c['lining'],.009,'silk ribbon',sides=8)
        for i in range(5 if high else 3):stroke(body,[(x*2+(i-2)*.0028,.54,.17),(x*2+(i-2)*.003,.50,.172)],c['trim'],.0008,'sash tassel','gold',4)
    embroidery(body,c,high)
    anatomy=Anatomy(cid,c)
    for side,label in [(-1,'left'),(1,'right')]:
        leg=empty(cid+'_'+label+'Leg',root,(side*.088,.64,0))
        loft(leg,[(-.52,.053,.056),(-.29,.06,.057),(-.05,.066,.060)],c['skirt'],'trouser',segments=24)
        ellipsoid(leg,(0,-.596,.045),(.067,.036,.128),'#363039','embroidered shoe',24 if high else 16,12 if high else 8)
        stroke(leg,[(-.043,-.566,.08),(0,-.558,.135),(.043,-.566,.08)],c['trim'],.002,'shoe welt','gold')
        arm=empty(cid+'_'+label+'Arm',body,(side*.208,1.34,0))
        shoulder=loft(arm,[(-.285,.085,.086),(-.19,.09,.094),(-.085,.092,.096),(.005,.091,.091),(.044,.076,.074),(.070,.043,.041),(.079,.006,.006)],c['robe'],'soft shoulder sleeve',.019,segments=40 if high else 24)
        for vertex in shoulder.data.vertices:
            if vertex.co.y>0:vertex.co.x-=side*vertex.co.y*.65
        fore=empty(cid+'_'+label+'Forearm',arm,(0,-.265,0))
        loft(fore,[(-.266,.111,.095),(-.215,.115,.101),(-.115,.102,.098),(.018,.086,.087)],c['robe'],'draped lower sleeve',.025,segments=40 if high else 24)
        loft(fore,[(-.269,.114,.098),(-.235,.116,.103)],c['trim'],'embroidered cuff',segments=32 if high else 24)
        loft(fore,[(-.285,.046,.039),(-.262,.062,.058)],c['lining'],'linen inner cuff',segments=24)
        anatomy.hand(fore,side,MATS['skin'],color(c['skin']),high)
        arm.rotation_euler.z=side*.11
        for k in range(6 if high else 3):
            a=math.pi*(k+.5)/(6 if high else 3)
            stroke(fore,[(.116*math.cos(a),-.258,.103*math.sin(a)),(.117*math.cos(a),-.242,.104*math.sin(a))],c['lining'],.0014,'cuff stitch',sides=4)
    head=empty(cid+'_head',body,(0,1.635,0));eyes=empty(cid+'_eyes',head)
    skin=color(c['skin']);lip=color(c['face']['lip']);rouge=color('#C47872')
    def skin_color(p):
        front=smooth((p.z-.056)/.025)
        cheeks=math.exp(-((abs(p.x)-.045)/.023)**2-((p.y+.002)/.022)**2)*front*.19
        base=mix(skin,rouge,cheeks)
        lip_mask=math.exp(-((p.y+.034)/.0115)**4-(abs(p.x)/.022)**6)*front*.72
        base=mix(base,lip,lip_mask)
        return base
    face=anatomy.head(head,MATS['skin'],skin_color,high);anatomy.eyes(eyes,MATS['eye']);head_hair(head,c,high,face)
    # Brows follow the anatomical surface rather than floating over the face.
    brow_bvh=BVHTree.FromPolygons([v.co for v in face.data.vertices],[list(f.vertices) for f in face.data.polygons])
    def brow_point(x,y):
        hit=brow_bvh.ray_cast(Vector((x,y,.25)),Vector((0,0,-1)),.4)
        return hit[0]+hit[1]*.00065 if hit[0] is not None else Vector((x,y,.088))
    for side in [-1,1]:
        pts=[]
        for i in range(24):
            t=i/23;x=side*(.017+.042*t);y=.055+.007*math.sin(t*math.pi)-.006*t
            if cid=='wangxifeng':y+=.004*t
            if cid=='daiyu':y-=.002*t
            pts.append(brow_point(x,y))
        stroke(head,pts,c['face']['brow'],.0010,'tapered eyebrow','hair',5)
        if high:
            for i in range(20):
                p=pts[i+1];q=brow_point(p.x+side*.0014,p.y+.0015*(1-i/20))
                stroke(head,[p,q],c['hair'],.00035,'individual brow hair','hair',4)
    if cid=='baoyu':
        stroke(body,[(-.039,1.46,.066),(0,1.24,.154),(.039,1.46,.066)],'#66564B',.0018,'pendant cord')
        ellipsoid(body,(0,1.222,.157),(.017,.025,.006),'#A2BBA0','carved jade',20,12,'jade')
        for x in [-.006,.006]:stroke(body,[(x,1.199,.158),(x,1.11,.168)],c['robe'],.002,'jade tassel')
    elif cid=='baochai':
        stroke(body,[(-.061,1.451,.062),(-.049,1.31,.132),(0,1.255,.149),(.049,1.31,.132),(.061,1.451,.062)],c['trim'],.002,'gold chain','gold',6)
        box(body,(0,1.251,.153),(.044,.023,.011),c['trim'],'engraved gold lock','gold')
        stroke(body,[(-.014,1.25,.161),(0,1.261,.161),(.014,1.25,.161)],c['lining'],.0009,'lock filigree','gold',4)
    elif cid=='daiyu':
        for side in [-1,1]:
            verts=[];uv=[]
            for i in range(25):
                t=i/24;x=side*(.1+.18*math.sin(t*math.pi*.76));y=1.44-.9*t;z=-.054+.037*math.sin(t*math.tau)
                for off in [-1,1]:verts.append((x+off*.026,y,z+off*.006*math.sin(t*math.pi)));uv.append(((off+1)/2,t))
            mesh('folded gauze shoulder ribbon',verts,[(2*i,2*i+1,2*i+3,2*i+2) for i in range(24)],body,c['lining'],uvs=uv)
    book=empty(cid+'_book',body,(0,1.035,.35))
    box(book,(0,0,0),(.28,.025,.205),'#DBCFB7','stitched paper block')
    for x in [-.072,.072]:
        box(book,(x,.016,0),(.135,.006,.2),'#EDE1C8','open paper')
        for i in range(5):stroke(book,[(x-.048,.020,-.065+i*.031),(x+.048,.020,-.065+i*.031)],'#948778',.001,'ink columns','ink',4)
    box(book,(0,-.017,0),(.295,.006,.22),c['lining'],'book cover')
    brush=empty(cid+'_brush',body,(.19,1.065,.39));stroke(brush,[(0,0,0),(.025,.135,-.028)],'#735E45',.0032,'bamboo brush handle',sides=8);ellipsoid(brush,(0,-.011,.002),(.003,.015,.003),'#353335','brush tip',10,6)
    root.scale=(c['scale'],)*3
    # Join static surfaces by moving part and material; preserve morph meshes.
    for parent in [o for o in [root,*root.children_recursive] if o.type=='EMPTY']:
        for mat in MATS.values():
            same=[o for o in parent.children if o.type=='MESH' and not o.data.shape_keys and o.data.materials[0]==mat]
            if not same:continue
            bpy.ops.object.select_all(action='DESELECT')
            for piece in same:piece.select_set(True)
            bpy.context.view_layer.objects.active=same[0]
            bpy.ops.object.join();bpy.context.object.name=parent.name+'_'+mat.name.replace(' ','_')
    return root


def aim(obj,target):
    forward=(Vector(target)-obj.location).normalized();right=forward.cross(Vector((0,1,0))).normalized();up=right.cross(forward).normalized();obj.rotation_euler=Matrix((right,up,-forward)).transposed().to_quaternion().to_euler()
camera_data=bpy.data.cameras.new('Portrait camera');camera=bpy.data.objects.new('Portrait camera',camera_data);scene.collection.objects.link(camera);camera_data.type='ORTHO';scene.camera=camera
for name,pos,energy,size in [('Large softbox',(-3,4,5),230,4),('Soft reflected fill',(3,2,2),100,3),('Hair edge',(1,3,-3),160,2)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=pos;aim(obj,(0,1.2,0))

roots=[];files=[];stats=[]
for cid,c in DESIGN['characters'].items():
    if PREVIEW and PREVIEW!=cid:continue
    for high in ([True] if PREVIEW else [True,False]):
        for r in roots:
            for o in [r,*r.children_recursive]:o.hide_render=True
        if not high:
            previous=roots[-1]
            for obj in [previous,*previous.children_recursive]:obj.name+='__high'
        root=build(cid,c,high);roots.append(root)
        # A temporary export avoids changing the production cast during fitting.
        file=(EVIDENCE/f'{cid}-preview.glb') if PREVIEW else OUT/(cid+('' if high else '-low')+'.glb')
        bpy.ops.object.select_all(action='DESELECT')
        for obj in [root,*root.children_recursive]:obj.select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_yup=False,export_animations=False,export_extras=True,export_materials='EXPORT',export_all_vertex_colors=True,export_morph=True,export_morph_normal=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=12,export_draco_texcoord_quantization=12,export_draco_color_quantization=10)
        raw=file.read_bytes();files.append({'agent':cid,'detail':'high' if high else 'low','path':file.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
        triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in root.children_recursive if o.type=='MESH')
        stats.append({'agent':cid,'detail':'high' if high else 'low','triangles':triangles,'meshes':sum(o.type=='MESH' for o in root.children_recursive),'bytes':len(raw)})
        for o in [root,*root.children_recursive]:o.hide_render='_book' in o.name or '_brush' in o.name
        if high:
            for suffix,pos,target,width,res in [('portrait',(.35,1.70,2.5),(0,1.52,0),.77,(384,448)),('face',(.08,1.662,.8),(0,1.655,.015),.35,(780,900)),('full',(.8,1.55,3),(0,.95,0),2.08,(900,1200)),('blink',(.08,1.662,.8),(0,1.655,.015),.35,(520,600))]:
                face_obj=next(o for o in root.children_recursive if o.name==cid+'_face')
                face_obj.data.shape_keys.key_blocks['blink'].value=1 if suffix=='blink' else 0
                camera.location=pos;aim(camera,target);camera_data.ortho_scale=width
                scene.render.resolution_x,scene.render.resolution_y=res
                path=(PORTRAITS/(cid+'.png')) if suffix=='portrait' and not PREVIEW else EVIDENCE/f'{cid}-{suffix}.png'
                scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
                if suffix=='portrait' and not PREVIEW:
                    raw=path.read_bytes();files.append({'agent':cid,'path':path.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
        if high:
            face_obj.data.shape_keys.key_blocks['blink'].value=0
        # Keep object names stable for the next character/L0 export.
        if not high:
            for o in [root,*root.children_recursive]:o.name+='__low'
            for o in [previous,*previous.children_recursive]:o.name=o.name.removesuffix('__high')
    for r in roots:
        if r.name==cid:
            for o in [r,*r.children_recursive]:o.hide_render=True

if not PREVIEW:
    for index,root in enumerate(roots):
        root.location.x=(index//2-1.5)*1.1
        for obj in [root,*root.children_recursive]:obj.hide_render='__low' in root.name or '_book' in obj.name or '_brush' in obj.name
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/simulation_characters.blend'))
    manifest={'revision':DESIGN['revision'],'origin':'Reviewed CC0 anatomy; original garden tailoring, hair, ornaments and materials','basis':DESIGN['basis'],'externalAssets':[{'assetId':PROVENANCE['assetId'],'license':'CC0-1.0','source':PROVENANCE['repository'],'commit':PROVENANCE['commit'],'provenance':'assets/characters/makehuman/provenance.json','sha256':hashlib.sha256((ROOT/'assets/characters/makehuman/provenance.json').read_bytes()).hexdigest()}],'generator':'blender/build_simulation_characters.py','generatorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'generatorDependencies':[{'path':'blender/character_anatomy.py','sha256':hashlib.sha256((ROOT/'blender/character_anatomy.py').read_bytes()).hexdigest()}],'configuration':'config/simulation.characters.json','configurationSha256':hashlib.sha256((ROOT/'config/simulation.characters.json').read_bytes()).hexdigest(),'files':files,'geometry':stats}
    (PORTRAITS/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('CHARACTER_GEOMETRY',json.dumps(stats))

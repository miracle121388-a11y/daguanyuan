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
from style3d_clothing import install as install_ming_clothing, create_cloth_rig
DESIGN = json.loads((ROOT/'config/simulation.characters.json').read_text())
PREVIEW = os.environ.get('GARDEN_CHARACTER_PREVIEW')
OUT = ROOT/'public/models/characters'
PORTRAITS = ROOT/'public/textures/characters'
EVIDENCE = ROOT/'reports/characters/ming-20260927'
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
        bump=n.new('ShaderNodeNormalMap');bump.inputs['Strength'].default_value=.17 if normal==SKIN_NORMAL else .045
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

def skin_material(cid,c,high):
    gender='male' if cid=='baoyu' else 'female'
    folder=ROOT/'assets/characters/mpfb/skins'/('young_asian_'+gender)
    texpath=next(folder.glob('*diffuse*.png'))
    mat=bpy.data.materials.new(cid+' natural skin');mat.use_nodes=True
    nodes=mat.node_tree.nodes;bsdf=nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value=.57
    bsdf.inputs['Specular IOR Level'].default_value=.28
    bsdf.inputs['Subsurface Weight'].default_value=.035
    image=bpy.data.images.load(str(texpath),check_existing=False);image.scale(2048 if high else 1024,2048 if high else 1024)
    cache=ROOT/'.local/characters-ming-20260927';cache.mkdir(parents=True,exist_ok=True)
    image.file_format='JPEG';image.filepath_raw=str(cache/(cid+('-high' if high else '-low')+'-skin.jpg'));image.save()
    image=bpy.data.images.load(image.filepath_raw,check_existing=False);image.pack()
    tex=nodes.new('ShaderNodeTexImage');tex.image=image
    mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
    return mat

def haircard_material(folder,name):
    mat=bpy.data.materials.new(name);mat.use_nodes=True;mat.surface_render_method='DITHERED'
    bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.85
    tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(next(folder.glob('*.png'))),check_existing=True);tex.image.pack()
    mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color']);mat.node_tree.links.new(tex.outputs['Alpha'],bsdf.inputs['Alpha'])
    return mat

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

def cloth_band(parent,points,width,shade,name):
    """Flat sewn fabric band, with width in the garment surface."""
    points=[Vector(p) for p in points];verts=[];uv=[]
    for i,p in enumerate(points):
        tangent=(points[min(i+1,len(points)-1)]-points[max(i-1,0)]).normalized()
        across=Vector((-tangent.y,tangent.x,0)).normalized()*width*.5
        for sign in [-1,1]:verts.append(p+across*sign);uv.append(((sign+1)*.5,i/max(1,len(points)-1)))
    obj=mesh(name,verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(points)-1)],parent,shade,uvs=uv)
    solid=obj.modifiers.new('Folded fabric edge','SOLIDIFY');solid.thickness=.0012
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=solid.name)
    return obj

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
    """Full scalp hair, central parting and distinct Ming-inspired bound styles."""
    bvh=BVHTree.FromPolygons([v.co for v in face.data.vertices],[list(f.vertices) for f in face.data.polygons])
    origin=Vector((0,.030,-.005))
    def limit(phi):
        front=smooth((math.sin(phi)+.08)/1.08);back=smooth((-math.sin(phi)-.05)/.95)
        # Curved hairline and softened temples; no shaved Qing forehead.
        return 1.32+.90*back-.24*front+.065*front*math.cos(4*(phi-math.pi/2))
    def cap(theta,phi,offset=0):
        direction=Vector((math.sin(theta)*math.cos(phi),math.cos(theta),math.sin(theta)*math.sin(phi)))
        hit=bvh.ray_cast(origin,direction,.45)
        return hit[0]+hit[1]*(.0022+offset+.0011*math.sin(phi*18+theta*3)**2) if hit[0] is not None else origin+direction*.105
    segments=80 if high else 48;rings=22 if high else 14
    vertices=[cap(.018+(limit(math.tau*i/segments)-.018)*j/rings,math.tau*i/segments) for j in range(rings+1) for i in range(segments)]
    mesh('parted full scalp',vertices,[(j*segments+i,j*segments+(i+1)%segments,(j+1)*segments+(i+1)%segments,(j+1)*segments+i) for j in range(rings) for i in range(segments)],head,c['hair'],'hair')
    for i in range(140 if high else 60):
        phi=math.tau*i/(140 if high else 60)
        pts=[]
        for j in range(20):
            t=j/19;theta=.10+(limit(phi)-.1)*t
            sweep=.16*math.sin(t*math.pi)*math.cos(phi)
            pts.append(cap(theta,phi+sweep,.0009))
        stroke(head,pts,['#272320','#302A25','#211F1E'][i%3],.00016 if high else .00023,'swept fine hair','hair',4)
    # Fine scalp part, confined to the upper crown rather than a broad painted stripe.
    if c['name']!='贾宝玉':
        stroke(head,[cap(t,math.pi/2,.0004) for t in [.16,.25,.34,.43,.52,.61,.7,.79]],'#655246',.00045,'central part','hair',5)
    def coil(center,radii):
        ellipsoid(head,center,radii,c['hair'],'bound hair coil',32 if high else 20,20 if high else 12,'hair')
        for i in range(24 if high else 10):
            phi=math.tau*i/(24 if high else 10)
            pts=[]
            for j in range(22):
                t=math.pi*(j+1)/23
                pts.append((center[0]+radii[0]*math.sin(t)*math.cos(phi),center[1]+radii[1]*math.cos(t),center[2]+radii[2]*math.sin(t)*math.sin(phi)))
            stroke(head,pts,'#332B25',.00032,'coiled hair grain','hair',4)
    style=c['hairStyle']
    if style=='full-hair-topknot':
        coil((0,.155,-.038),(.039,.038,.035))
        loft(head,[(.148,.043,.035),(.169,.041,.035),(.181,.028,.03)],'#423B38','Ming bound-hair guan',center=(0,0,-.035),segments=32)
        stroke(head,[(-.072,.170,-.035),(.075,.170,-.035)],c['trim'],.0023,'guan fastening pin','gold',8)
        for side in [-1,1]:
            stroke(head,[(side*.038,.148,-.059),(side*.033,.078,-.092),(side*.040,-.02,-.086)],'#714048',.004,'silk hair binding',sides=6)
    elif style=='paired-low-buns':
        for side in [-1,1]:
            coil((side*.057,.065,-.088),(.036,.037,.025))
            stroke(head,[(side*.072,.071,-.067),(side*.077,.012,-.09),(side*.083,-.078,-.075)],c['lining'],.0032,'bound silk hair ribbon',sides=5)
        stroke(head,[(-.082,.10,-.072),(.080,.10,-.072)],'#C6B796',.0018,'simple jade hairpin','gold',6)
        flower(head,-.075,.104,-.062,'#E4D6CC',.008,high)
    elif style=='coiled-back-bun':
        coil((0,.085,-.107),(.057,.042,.031))
        stroke(head,[(-.085,.101,-.082),(.087,.101,-.082)],c['trim'],.0022,'quiet gold hairpin','gold',8)
        flower(head,-.071,.112,-.061,'#C0AB6B',.009,high)
    else:
        coil((0,.127,-.088),(.052,.051,.037))
        # A compact decorated di-ji silhouette, not a Qing banner headdress.
        for i in range(7):
            a=math.pi*i/6
            stroke(head,[(.052*math.cos(a),.115,-.072),(.043*math.cos(a),.157+.014*math.sin(a),-.061)],c['trim'],.0014,'di-ji gold filigree','gold',6)
        flower(head,-.049,.148,-.054,c['lining'],.011,high)
        for i in range(3):stroke(head,[(.063+i*.006,.13,-.044),(.062+i*.006,.087-i*.007,-.039)],c['trim'],.0009,'short gold drop','gold',5)
    if c['name']!='贾宝玉':
        for side in [-1,1]:
            stroke(head,[(side*.084,-.024,.006),(side*.084,-.042,.008)],c['trim'],.0009,'small earring link','gold',5)
            ellipsoid(head,(side*.084,-.049,.008),(.0035,.005,.0035),'#C8B68B','small pearl drop',12,8,'jade')


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
    anatomy=Anatomy(cid,c);skinmat=skin_material(cid,c,high)
    height=c['anatomy']['height'];sy=height/1.7
    shoulder_y=anatomy.joints['joint-l-shoulder'].y
    shoulder_x=anatomy.joints['joint-l-shoulder'].x
    neck_y=anatomy.joints['joint-neck'].y-(.028 if cid=='baoyu' else 0)
    waist_y=height*.59;hem_y=height*.045
    male=cid=='baoyu';segments=80 if high else 48
    # The garments fit a measured MPFB torso; 15–25 mm wearing ease.
    chest=shoulder_x*(1.00 if male else 1.05)
    waist=shoulder_x*.82;hip=shoulder_x*1.08
    jacket_hem=waist_y if male else height*.50
    profiles=[(jacket_hem,hip,.112*sy),(waist_y,waist,.092*sy),(height*.68,chest*.95,.11*sy),(shoulder_y-.035,chest,.096*sy),(shoulder_y+.025,chest*.84,.081*sy),(neck_y-.012,.061*sy,.055*sy)]
    if male:profiles=profiles[1:];profiles[0]=(waist_y,waist,.10*sy)
    robe_surface=loft(body,profiles,c['robe'],'Ming fitted cross-collar upper robe',.009,segments=segments)
    robe_bvh=BVHTree.FromPolygons([v.co for v in robe_surface.data.vertices],[list(p.vertices) for p in robe_surface.data.polygons])
    def garment_band(points,width,shade,name):
        dense=[]
        for p,q in zip(points,points[1:]):
            for k in range(16):
                v=Vector(p).lerp(Vector(q),k/16)
                hit=robe_bvh.ray_cast(Vector((v.x,v.y,1)),Vector((0,0,-1)),2)
                if hit[0] is not None:v.z=hit[0].z+.005
                dense.append(v)
        v=Vector(points[-1])
        hit=robe_bvh.ray_cast(Vector((v.x,v.y,1)),Vector((0,0,-1)),2)
        if hit[0] is not None:v.z=hit[0].z+.005
        dense.append(v);return cloth_band(body,dense,width,shade,name)
    # The under-collar disappears under the left front panel. The visible
    # overlap continues to the wearer's right side, never two dangling bands.
    crossing=(0,shoulder_y-.035,.10*sy)
    garment_band([(-.044*sy,neck_y-.010,.05*sy),(-.051*sy,neck_y-.052,.069*sy),crossing],.018*sy,c['lining'],'underlapping collar')
    garment_band([(.044*sy,neck_y-.010,.05*sy),(.051*sy,neck_y-.052,.069*sy),crossing,(-chest*.85,shoulder_y-.18,.08*sy)],.020*sy,c['lining'],'right fastening collar')
    if male:
        loft(skirt,[(hem_y,.225,.140),(hem_y+.025,.226,.140),(.17*height,.216,.137),(.27*height,.205,.133),(.38*height,.191,.126),(.48*height,.178,.116),(waist_y,waist,.10)],c['robe'],'Ming daopao long skirt and side pleats',.065,segments=segments)
        if male:
            for row in range(6):
                y=waist_y+.055+row*.055
                for col in range(-2,3):
                    x=col*.046+(row%2)*.012
                    points=[]
                    for k in range(25):
                        a=k*math.tau/24;r=.013*(.80+.20*math.cos(4*a));px=x+r*math.cos(a);py=y+r*math.sin(a)
                        hit=robe_bvh.ray_cast(Vector((px,py,1)),Vector((0,0,-1)),2)
                        if hit[0] is not None:points.append((px,py,hit[0].z+.0018))
                    if len(points)>2:stroke(body,points,'#B46460',.00065,'subtle woven quatrefoil',sides=4)
        for side in [-1,1]:stroke(skirt,[(side*.09,hem_y+.005,.126),(side*.08,.55,.135),(side*.062,waist_y,.102)],c['lining'],.0016,'long robe pleat edge',sides=4)
    else:
        # Front/back flat skirt panels with lateral pleats: replaced by fitted
        # licensed Style3D cloth when its source archive is available.
        lower=loft(skirt,[(hem_y,.228*sy,.143*sy),(.16*height,.222*sy,.139*sy),(.32*height,.196*sy,.13*sy),(.47*height,hip,.12*sy),(waist_y,waist,.10*sy)],c['skirt'],'Ming mamian skirt',.032,segments=segments)
        for v in lower.data.vertices:
            if abs(v.co.x)<.095*sy:v.co.z=math.copysign(abs(v.co.z)+.003,v.co.z)
        for side in [-1,1]:
            stroke(skirt,[(side*.094*sy,hem_y,.149*sy),(side*.090*sy,.35*height,.137*sy),(side*.07*sy,waist_y,.104*sy)],c['trim'],.002,'mamian front panel border','gold',5)
        loft(body,[(jacket_hem,hip+.002,.115*sy),(jacket_hem+.015,hip+.001,.114*sy)],c['lining'],'ao hem binding',segments=segments)
    loft(body,[(waist_y-.012,waist+.006,.105*sy),(waist_y+.012,waist+.006,.105*sy)],c['trim'],'woven sash',segments=48)
    for side,label in [(-1,'left'),(1,'right')]:
        leg=empty(cid+'_'+label+'Leg',body,(side*.080*sy,.66*sy,0))
        ellipsoid(leg,(0,-.625*sy,.06*sy),(.046*sy,.033*sy,.116*sy),'#353230','cloth shoe',24,12)
        stroke(leg,[(-.035*sy,-.603*sy,.073*sy),(0,-.59*sy,.147*sy),(.035*sy,-.603*sy,.073*sy)],c['lining'],.002,'shoe embroidered vamp',sides=5)
        arm=empty(cid+'_'+label+'Arm',body,(side*shoulder_x,shoulder_y,anatomy.joints['joint-l-shoulder'].z))
        upper=(anatomy.joints['joint-l-shoulder']-anatomy.joints['joint-l-elbow']).length
        fore_length=anatomy.fore_length
        sleeve=.060*sy if male else .054*sy
        fore=empty(cid+'_'+label+'Forearm',arm,(0,-upper,0))
        fore['handAnchorY']=-fore_length-.065
        anatomy.hand(fore,side,skinmat,(1,1,1,1),high)
        arm.rotation_euler.z=side*.075
    if male:
        rig=create_cloth_rig(cid,anatomy,body)
        for side,label in [(-1,'left'),(1,'right')]:
            # One connected shoulder-to-wrist surface, with no elbow caps/seam.
            count=48 if high else 28;around=64 if high else 32
            length=upper+fore_length-.016
            levels=[]
            for j in range(count+1):
                t=j/count;distance=-.050+(length+.050)*t
                radius=.063*sy*(.76+.30*math.sin(math.pi*t))
                if t<.08:radius*=.85+.15*t/.08
                levels.append((shoulder_y-distance,radius,radius*1.05))
            obj=loft(body,levels,c['robe'],cid+'_'+label+'_continuousSleeve',.027,
                     center=(side*shoulder_x,0,anatomy.joints['joint-l-shoulder'].z),segments=around)
            body_group=obj.vertex_groups.new(name=cid+'_clothBody')
            arm_group=obj.vertex_groups.new(name=cid+'_cloth_'+label+'Arm')
            fore_group=obj.vertex_groups.new(name=cid+'_cloth_'+label+'Forearm')
            for v in obj.data.vertices:
                distance=shoulder_y-v.co.y
                w=smooth((distance-upper+.085)/.17)
                shoulder_blend=1-smooth((distance+.05)/.12)
                v.co.x-=side*shoulder_blend*.065
                body_group.add([v.index],shoulder_blend,'REPLACE')
                arm_group.add([v.index],(1-w)*(1-shoulder_blend),'REPLACE');fore_group.add([v.index],w*(1-shoulder_blend),'REPLACE')
            # A woven cuff belongs to this same surface and skin, not a second arm segment.
            attr=obj.data.color_attributes['Color']
            for loop in obj.data.loops:
                distance=shoulder_y-obj.data.vertices[loop.vertex_index].co.y
                if distance>length-.026:attr.data[loop.index].color=color(c['lining'])
            mod=obj.modifiers.new('Unbroken sleeve elbow deformation','ARMATURE');mod.object=rig
            obj['continuousSleeve']=True
    if not male:
        for obj in list(root.children_recursive):
            if obj.type=='MESH' and 'Hand' not in obj.name and 'shoe' not in obj.name:
                bpy.data.objects.remove(obj,do_unlink=True)
        for part in ['leftArm','rightArm']:bpy.data.objects[cid+'_'+part].rotation_euler.z=0
        install_ming_clothing(cid,anatomy,body,high)
    head=empty(cid+'_head',body,anatomy.head_position);eyes=empty(cid+'_eyes',head)
    skin=color(c['skin']);lip=color(c['face']['lip']);rouge=color('#C47872')
    def skin_color(p):
        front=smooth((p.z-.056)/.025)
        cheeks=math.exp(-((abs(p.x)-.045)/.023)**2-((p.y+.002)/.022)**2)*front*.19
        base=mix(skin,rouge,cheeks)
        lip_mask=math.exp(-((p.y+.034)/.0115)**4-(abs(p.x)/.022)**6)*front*.72
        base=mix(base,lip,lip_mask)
        return base
    face=anatomy.head(head,skinmat,lambda p:(1,1,1,1),high);anatomy.eyes(eyes,MATS['eye']);head_hair(head,c,high,face)
    for folder,name,blink in [('eyebrows/eyebrow001','brows',False),('eyelashes/eyelashes01','lashes',True)]:
        path=ROOT/'assets/characters/mpfb'/folder
        anatomy.attachment(head,haircard_material(path,cid+' '+name),path,name,blink)
    if cid in ['baoyu','baochai']:
        pendant_y=shoulder_y-.10
        stroke(body,[(-.045*sy,neck_y-.01,.052*sy),(0,pendant_y,.12*sy),(.045*sy,neck_y-.01,.052*sy)],'#8E7654',.0014,'pendant cord',sides=5)
        if cid=='baoyu':ellipsoid(body,(0,pendant_y-.017,.124*sy),(.013,.020,.004),'#A4BA99','personal jade',20,12,'jade')
        else:box(body,(0,pendant_y-.012,.124*sy),(.036,.018,.007),c['trim'],'gold lock','gold')
    book_y=shoulder_y-upper*math.cos(.48)-fore_length*math.cos(1.18)-.025
    book_z=anatomy.joints['joint-l-shoulder'].z+upper*math.sin(.48)+fore_length*math.sin(1.18)+.065
    book=empty(cid+'_book',body,(0,book_y,book_z))
    box(book,(0,0,0),(.28,.025,.205),'#DBCFB7','stitched paper block')
    for x in [-.072,.072]:
        box(book,(x,.016,0),(.135,.006,.2),'#EDE1C8','open paper')
        for i in range(5):stroke(book,[(x-.048,.020,-.065+i*.031),(x+.048,.020,-.065+i*.031)],'#948778',.001,'ink columns','ink',4)
    box(book,(0,-.017,0),(.295,.006,.22),c['lining'],'book cover')
    brush=empty(cid+'_brush',bpy.data.objects[cid+'_rightForearm'],(.01,-fore_length-.09,.028));stroke(brush,[(0,0,0),(.025,.135,-.028)],'#735E45',.0032,'bamboo brush handle',sides=8);ellipsoid(brush,(0,-.011,.002),(.003,.015,.003),'#353335','brush tip',10,6)
    root.scale=(c['scale'],)*3
    # Join static surfaces by moving part and material; preserve morph meshes.
    for parent in [o for o in [root,*root.children_recursive] if o.type=='EMPTY']:
        for mat in MATS.values():
            same=[o for o in parent.children if o.type=='MESH' and not o.data.shape_keys and not any(m.type=='ARMATURE' for m in o.modifiers) and o.data.materials[0]==mat]
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
            height=c['anatomy']['height']
            blink_meshes=[o for o in root.children_recursive if o.type=='MESH' and o.data.shape_keys and 'blink' in o.data.shape_keys.key_blocks]
            for suffix,pos,target,width,res in [('portrait',(.35,height,2.5),(0,height-.18,0),.66,(384,448)),('face',(.08,height-.12,.8),(0,height-.12,.015),.40,(780,900)),('full',(.8,height*.8,3),(0,height*.5,0),height*1.12,(900,1200)),('profile',(2,height-.17,0),(0,height-.20,0),.65,(780,900)),('blink',(.08,height-.12,.8),(0,height-.12,.015),.40,(520,600)),('reading',(.65,height*.8,3),(0,height*.5,0),height*1.12,(900,1200))]:
                for obj in blink_meshes:obj.data.shape_keys.key_blocks['blink'].value=1 if suffix=='blink' else 0
                if suffix=='reading':
                    for part in ['leftArm','rightArm']:bpy.data.objects[cid+'_'+part].rotation_euler.x=-.48
                    for part in ['leftForearm','rightForearm']:bpy.data.objects[cid+'_'+part].rotation_euler.x=-.70
                    for obj in root.children_recursive:
                        if '_book' in obj.name:obj.hide_render=False
                camera.location=pos;aim(camera,target);camera_data.ortho_scale=width
                scene.render.resolution_x,scene.render.resolution_y=res
                path=(PORTRAITS/(cid+'.png')) if suffix=='portrait' and not PREVIEW else EVIDENCE/f'{cid}-{suffix}.png'
                scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
                if suffix=='portrait' and not PREVIEW:
                    raw=path.read_bytes();files.append({'agent':cid,'path':path.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
        if high:
            for obj in blink_meshes:obj.data.shape_keys.key_blocks['blink'].value=0
            for part in ['leftArm','rightArm','leftForearm','rightForearm']:bpy.data.objects[cid+'_'+part].rotation_euler.x=0
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
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/simulation_characters.blend'),compress=True)
    external=[]
    for family in ['makehuman','mpfb','style3d']:
        path=f'assets/characters/{family}/provenance.json';record=json.loads((ROOT/path).read_text())
        external.append({'assetId':record['assetId'],'license':record['license'],'provenance':path,'sha256':hashlib.sha256((ROOT/path).read_bytes()).hexdigest()})
    dependencies=['blender/character_anatomy.py','blender/style3d_clothing.py','blender/prepare_character_bases.py','blender/prepare_style3d_clothing.py']
    manifest={'revision':DESIGN['revision'],'origin':'MPFB/MakeHuman CC0 anatomy; adapted Style3D CC BY Ming womenswear; original male tailoring, hair and ornaments','basis':DESIGN['basis'],'externalAssets':external,'generator':'blender/build_simulation_characters.py','generatorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'generatorDependencies':[{'path':p,'sha256':hashlib.sha256((ROOT/p).read_bytes()).hexdigest()} for p in dependencies],'configuration':'config/simulation.characters.json','configurationSha256':hashlib.sha256((ROOT/'config/simulation.characters.json').read_bytes()).hexdigest(),'files':files,'geometry':stats}
    (PORTRAITS/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('CHARACTER_GEOMETRY',json.dumps(stats))

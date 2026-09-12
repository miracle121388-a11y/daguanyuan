"""Authored rock cavities and plant structure, within the reviewed footprints.

The geometry is an artistic interpretation, not a species identification or a
claim that a particular rock survived from the fictional garden.
"""
import math
import random
import bpy
from mathutils import Vector, noise
import build_modules as core
import refined_modules as arch

ROCKS={}


def eroded_rock(seed):
    if seed in ROCKS:return ROCKS[seed]
    pieces=[]
    lobes=[((-.75,0,.34),(1.10,.67,.44)),((.78,.03,.41),(.91,.59,.51)),
           ((-.25,.02,1.17),(.77,.57,1.04)),((-.99,.02,1.41),(.67,.48,.76)),
           ((.79,.04,1.25),(.64,.52,.84)),((.14,-.02,2.13),(.86,.48,.72)),
           ((-.47,.08,2.34),(.45,.43,.56)),((1.20,.08,.75),(.42,.40,.61))]
    for index,(position,scale) in enumerate(lobes):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=1,location=position)
        ob=bpy.context.object;ob.scale=scale
        for vertex in ob.data.vertices:
            v=vertex.co;v*=1+.13*noise.noise_vector(v*3.6+Vector((seed,index,2))).x
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);pieces.append(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in pieces:ob.select_set(True)
    bpy.context.view_layer.objects.active=pieces[0];bpy.ops.object.join();rock=pieces[0]
    remesh=rock.modifiers.new('Continuous weathered stone','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.055;remesh.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    # Unequal, skewed cavities cross the stone depth; shallow pockets break up
    # the remaining face without producing repeated circular arches.
    cavities=[((-.63,-.08,1.11),(.33,1.10,.43)),((.59,-.03,1.70),(.27,1.05,.49)),
              ((-.10,.03,2.37),(.18,.96,.20)),((.18,-.02,.56),(.23,1.00,.20)),
              ((-1.01,-.52,1.69),(.28,.27,.31)),((.78,-.50,.85),(.35,.29,.28)),
              ((-.18,-.49,1.74),(.18,.23,.30))]
    for index,(position,scale) in enumerate(cavities):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=1,location=position)
        cutter=bpy.context.object;cutter.scale=scale;cutter.rotation_euler=(.06*(index%3),.12*(index-2),.10*math.sin(index))
        for vertex in cutter.data.vertices:vertex.co*=1+.12*noise.noise_vector(vertex.co*4+Vector((seed,index,7))).y
        bpy.context.view_layer.objects.active=rock
        cut=rock.modifiers.new('Irregular through cavity','BOOLEAN');cut.operation='DIFFERENCE';cut.solver='EXACT';cut.object=cutter
        bpy.ops.object.modifier_apply(modifier=cut.name);bpy.data.objects.remove(cutter,do_unlink=True)
    smooth=rock.modifiers.new('Water softened cavity edges','SMOOTH');smooth.factor=.60;smooth.iterations=3;bpy.ops.object.modifier_apply(modifier=smooth.name)
    # Retain thousands of triangles in the source instead of faceting a few rings.
    decimate=rock.modifiers.new('Web stone surface','DECIMATE');decimate.ratio=min(1,3400/max(1,len(rock.data.polygons)));bpy.ops.object.modifier_apply(modifier=decimate.name)
    matrix=rock.matrix_world.copy();verts=[tuple(matrix@v.co) for v in rock.data.vertices];faces=[tuple(p.vertices) for p in rock.data.polygons]
    ROCKS[seed]=(verts,faces);bpy.data.objects.remove(rock,do_unlink=True)
    return ROCKS[seed]


def perforated_rock(b,x,y,s=1,seed=0):
    verts,faces=eroded_rock(seed)
    b.mesh('gardenstone',[(x+u*s,y+v*s,max(-.06,w)*s) for u,v,w in verts],faces)
    # Broken low companions blend the single eroded form into its ground.
    for i,(dx,dy,scale) in enumerate([(-1.15,.30,.34),(.89,.31,.32),(-.25,.46,.24)]):
        core.rock(b,x+dx*s,y+dy*s,scale*s,seed+71+i)


def banana(b,x,y,size=1):
    b.rod('bamboo',(x,y,0),(x+.06*size,y,3.02*size),.16*size,12,r2=.073*size)
    for i in range(9):
        a=i*2.399;start=Vector((x,y,(2.05+i%3*.35)*size));d=Vector((math.cos(a),math.sin(a),0));cross=Vector((-d.y,d.x,0))
        verts=[];centres=[];rows=23;columns=8
        for j in range(rows+1):
            t=j/rows;length=(1.85+(i%3)*.13)*size
            p=start+d*(length*t)+Vector((0,0,(1.0*math.sin(t*math.pi)-.57*t)*size));centres.append(p)
            width=max(.003,math.sin(t*math.pi)**.64)*(.35+i%2*.035)*size
            for k in range(columns+1):
                u=2*k/columns-1
                # Cambered, drooping edges, asymmetry and a few shallow splits.
                split=.66 if j in [10+i%4,16+i%3,20] and abs(u)>.72 else 1
                curl=(-.17*u*u+.021*abs(u)*math.sin(j*1.73+i))*math.sin(t*math.pi)*size
                v=p+cross*(u*width*split)+d*(.042*math.sin(i+j*.44)*abs(u)*size)+Vector((0,0,curl))
                verts.append(tuple(v))
        faces=[(j*(columns+1)+k,j*(columns+1)+k+1,(j+1)*(columns+1)+k+1,(j+1)*(columns+1)+k) for j in range(rows) for k in range(columns)]
        b.mesh('leaf' if i%3 else 'lightleaf',verts,faces)
        for j in range(rows):b.rod('bamboo',centres[j],centres[j+1],.016*size*(1-j/rows*.8),5)
        # Fine secondary veins follow the actual cambered surface.
        for j in range(3,rows-2,3):
            for side in [-1,1]:
                edge=Vector(verts[j*(columns+1)+(0 if side<0 else columns)])
                b.rod('leafdark',centres[max(1,j-1)]+Vector((0,0,.002)),edge+Vector((0,0,.003)),.003*size,3)


def flowering_tree(b,x,y,size,seed):
    rng=random.Random(seed+120912);h=6.6*size
    base=Vector((x,y,0));fork=Vector((x+.28*size,y-.14*size,h*.64))
    mid=base.lerp(fork,.52)+Vector((-.17*size,.07*size,0))
    b.rod('bark',base,mid,.30*size,10,r2=.21*size);b.rod('bark',mid,fork,.21*size,9,r2=.12*size)
    mat='flower' if seed%3 else 'creamflower'
    for branch in range(9):
        angle=branch*2.399;reach=(1.7+rng.random()*1.8)*size
        end=Vector((x+math.cos(angle)*reach,y+math.sin(angle)*reach,h+rng.uniform(-.9,.7)*size))
        bend=fork.lerp(end,.55)+Vector((0,0,.35*size))
        b.rod('bark',fork,bend,.12*size,7,r2=.051*size);b.rod('bark',bend,end,.051*size,6,r2=.015*size)
        for twig in range(9):
            a=twig*2.399+angle;r=rng.uniform(.30,1.25)*size
            tip=end+Vector((math.cos(a)*r,math.sin(a)*r,rng.uniform(-.40,.75)*size));origin=bend.lerp(end,.50+twig%4*.12)
            elbow=origin.lerp(tip,.62)+Vector((0,0,.12*size))
            b.rod('bark',origin,elbow,.014*size,5,r2=.006*size);b.rod('bark',elbow,tip,.006*size,4,r2=.002*size)
            for cluster in range(15):
                theta=rng.random()*math.tau;rad=rng.random()**.5*.28*size
                p=tip+Vector((math.cos(theta)*rad,math.sin(theta)*rad,rng.uniform(-.15,.19)*size))
                normal=Vector((rng.uniform(-1,1),rng.uniform(-1,1),rng.uniform(.25,1))).normalized();u=normal.cross(Vector((0,0,1))).normalized();v=normal.cross(u)
                radius=rng.uniform(.072,.105)*size
                ring=[p+(u*math.cos(k*math.tau/10)+v*math.sin(k*math.tau/10))*radius*(1 if k%2==0 else .56)+normal*.024*size for k in range(10)]
                b.mesh(mat,[tuple(p)]+[tuple(q) for q in ring],[(0,k+1,(k+1)%10+1) for k in range(10)])
            for j in range(4):arch.leaf(b,elbow.lerp(tip,(j+1)/5),(math.cos(a+j*.5),math.sin(a+j*.5),-.2),.26*size,.065*size,'leafdark')


def herb_patch(b,x,y,z,seed):
    rng=random.Random(seed+1212)
    for stem in range(5):
        angle=stem*2.399+seed;root=Vector((x+rng.uniform(-.13,.13),y+rng.uniform(-.13,.13),z-.12));height=rng.uniform(.23,.60)
        tip=root+Vector((math.cos(angle)*.25,math.sin(angle)*.25,height));b.rod('bamboo',root,tip,.008,4,r2=.003)
        for j in range(2,7):
            p=root.lerp(tip,j/7)
            for side in [-1,1]:arch.leaf(b,p,(math.cos(angle+side*.8),math.sin(angle+side*.8),-.10),.20*(1-j/12),.035,['leafdark','leaf','lightleaf'][(j+stem)%3])


def install():
    core.PALETTE.update({'gardenstone':'899080','leaf':'4d6340','lightleaf':'64774b','leafdark':'344b32','bamboo':'626e3d','canopy_light':'64784a'})
    arch.perforated_rock=perforated_rock;arch.banana=banana

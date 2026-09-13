"""Thick room envelopes and modeled polychrome joinery on existing footprints.

The album supplies a color relationship, not surveyed dimensions. Open pavilions
and covered paths remain open; only occupied halls receive room envelopes.
"""
import math
import build_modules as core
from reference_world import transform

ROLES = {
    'enclosure_wall': 'plaster', 'enclosure_lacquer': 'wood',
    'enclosure_jade': 'qing_jade', 'enclosure_blue': 'qing_azurite',
    'enclosure_gold': 'gold', 'enclosure_paper': 'screen',
    'enclosure_clay': 'qing_clay', 'enclosure_ochre': 'rusticwood',
    'enclosure_ceiling': 'plaster',
}


class EnvelopeBatch(core.Batch):
    """Existing builders determine locations; discard their unrelated geometry."""
    def mesh(self, mat, verts, faces, uvs=None):
        if mat in ROLES or mat.startswith('_probe_'):
            super().mesh(mat, verts, faces, uvs)


def probe(b, name, x, y, z):
    b.mesh('_probe_'+name, [(x,y-.75,z),(x,y+.75,z)], [])


def rectangle(b, x, y, width, bottom, top, door=False, rustic=False):
    wall = 'enclosure_clay' if rustic else 'enclosure_wall'
    timber = 'enclosure_ochre' if rustic else 'enclosure_lacquer'
    sill = min(1.30, bottom+(top-bottom)*.30)
    head = min(3.55, top-.42)
    opening = min(width*.59, 2.65)
    if door:
        opening = min(width*.76, 3.3)
        sill = bottom
        head = min(3.45, top-.38)
    jamb = (width-opening)/2
    for sign in [-1,1]:
        xx=x+sign*(opening+jamb)/2
        b.box(wall,(xx,y,(bottom+top)/2),(jamb,.36,top-bottom))
        probe(b,'wall',xx,y,(bottom+head)/2)
    b.box(wall,(x,y,(head+top)/2),(opening,.36,top-head))
    if not door:
        b.box(wall,(x,y,(bottom+sill)/2),(opening,.36,sill-bottom))
        b.box('enclosure_paper',(x,y+.025,(sill+head)/2),(opening,.035,head-sill))
        probe(b,'window',x,y,(sill+head)/2)
        b.box(timber,(x,y-.21,sill),(opening+.15,.12,.12))
        # The opaque window backing stays behind the existing open lattice.
        for i in [-1,0,1]:
            b.box(timber,(x+i*opening/3,y-.205,(sill+head)/2),(.052,.08,head-sill))
        for z in [sill+.12,head-.12]:
            b.box(timber,(x,y-.21,z),(opening,.08,.045))
    else:
        probe(b,'door',x,y,bottom+1.35)
    for sign in [-1,1]:
        b.box(timber,(x+sign*opening/2,y-.20,(sill+head)/2),(.095,.11,head-sill+.1))
    b.box(timber,(x,y-.20,head),(opening+.16,.13,.12))


def painted_beam(b, x, y, width, z, bays, quiet=False):
    base='enclosure_jade' if quiet else 'enclosure_blue'
    b.box(base,(x,y,z),(width,.17,.40))
    for dz in [-.20,.20]:b.box('enclosure_gold',(x,y-.095,z+dz),(width,.025,.035))
    step=width/bays
    for bay in range(bays):
        cx=x-width/2+(bay+.5)*step
        # Gold outlined lozenges and curled petal lobes are actual shallow relief.
        points=[(cx-step*.31,y-.103,z),(cx,y-.103,z+.14),
                (cx+step*.31,y-.103,z),(cx,y-.103,z-.14)]
        for a,c in zip(points,points[1:]+points[:1]):b.rod('enclosure_gold',a,c,.013,5)
        for sign in [-1,1]:
            xx=cx+sign*step*.38
            b.box('enclosure_lacquer',(xx,y-.102,z),(.10,.025,.26))
        for petal in range(4):
            a=petal*math.pi/2
            points=[(cx+math.cos(a)*.075+math.cos(t*math.tau/12)*.072,
                     y-.12,z+math.sin(a)*.065+math.sin(t*math.tau/12)*.057) for t in range(13)]
            for a,c in zip(points,points[1:]):b.rod('enclosure_gold',a,c,.009,4)


def hall(b,x=0,y=6,w=18,d=8,h=4.4,openhall=False,detail=True,bays=3,style='plain',rolled=False,thatch=False):
    pid=b.parent.get('placeId') if b.parent else ''
    rustic=thatch or pid in ['daoxiangcun','luxuean']
    quiet=pid in ['xiaoxiangguan','hengwuyuan','longcuian']
    # Recessing the enclosed room retains an accessible outside column gallery.
    width=w-1 if openhall else w
    depth=d-2.5 if openhall else d
    bottom=.57;top=h+.82
    for sign in [-1,1]:
        for i in range(bays):
            cx=x-width/2+(i+.5)*width/bays
            door=i==bays//2 and (sign==-1 or pid=='daguanyuan_gate')
            transform(b,lambda:rectangle(b,0,0,width/bays,bottom,top,door,rustic),
                      (cx,y+sign*depth/2,0),0 if sign==-1 else math.pi)
    side_bays=max(1,round(depth/3.2))
    for sign in [-1,1]:
        for i in range(side_bays):
            yy=y-depth/2+(i+.5)*depth/side_bays
            transform(b,lambda:rectangle(b,0,0,depth/side_bays,bottom,top,False,rustic),
                      (x+sign*width/2,yy,0),sign*math.pi/2)
    b.box('enclosure_ceiling',(x,y,h+.33),(width,depth,.12))
    if not rustic:
        for sign in [-1,1]:
            transform(b,lambda:painted_beam(b,0,0,w+.32,h-.20,bays,quiet),
                      (x,y+sign*(d/2+.53),0),0 if sign==-1 else math.pi)


def generate(place, root, collection):
    """Call the incumbent builders so nested rotations and floor heights agree."""
    import refined_modules as arch
    import spatial_world as world
    import r8_architecture
    b=EnvelopeBatch('r15_'+place['id'],collection,root)
    previous=arch.hall
    previous_tower_hall=r8_architecture.hall
    arch.hall=hall
    r8_architecture.hall=hall
    try:
        style=place['style']
        if style in ['bamboo','flower','herb','study']:world.courtyard(b,style)
        elif style=='tower':world.tower(b)
        elif style=='temple':world.temple(b)
        elif style=='painting':world.painting(b)
        elif style=='gate':hall(b,0,0,23,7,5.3,openhall=True,bays=5)
        elif style=='farm':arch.farm(b)
        elif style=='reeds':arch.reeds_house(b)
        elif style in ['hill','moon']:
            hall(b,0,4,19 if style=='hill' else 17,9,4.7 if style=='hill' else 3.3,openhall=True,rolled=style=='moon')
        elif style=='waterside':
            # Four-sided water pavilion: sills and glazed-looking paper screens,
            # with the existing north bridge doorway left genuinely open.
            for sign in [-1,1]:
                for i in range(3):
                    transform(b,lambda:rectangle(b,0,0,5,1.12,5.0,sign==1 and i==1),
                              ((i-1)*5,sign*4,0),0 if sign==-1 else math.pi)
                for yy in [-2,2]:
                    transform(b,lambda:rectangle(b,0,0,4,1.12,5),
                              (sign*7.5,yy,0),sign*math.pi/2)
                transform(b,lambda:painted_beam(b,0,0,15,4.9,3),(0,sign*4.2,0),0 if sign==-1 else math.pi)
            b.box('enclosure_ceiling',(0,0,5.02),(15,8,.10))
        # Dicuiting and the bridge pavilions deliberately retain open sides.
    finally:
        arch.hall=previous
        r8_architecture.hall=previous_tower_hall
    probes={key.removeprefix('_probe_'):[coords[i:i+2] for i in range(0,len(coords),2)]
            for key,(coords,_) in b.data.items() if key.startswith('_probe_')}
    for key in list(b.data):
        if key.startswith('_probe_'):del b.data[key]
    old=core.M
    import bpy
    core.M={key:bpy.data.materials[name] for key,name in ROLES.items()}
    try:objects=core.Batch.finish(b)
    finally:core.M=old
    for ob in objects:
        ob['enclosureRevision']='r15';ob['preserveEnvelope']=True
        ob['roof']=ob.name.endswith('enclosure_ceiling')
        ob['roofShell']=ob['roof']
    return objects,probes

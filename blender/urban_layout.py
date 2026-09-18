"""Authored Beijing street quarters, in native XY metres (no Blender dependency).

Broadly orthogonal streets, unequal plots and offset secondary lanes. The plan
is a setting for the garden, not a surveyed map or a set of new canon places.
"""
import math
import random
from collections import Counter

# Width, depth, wall height, roof form, roof pigment, timber pigment.
BUILDINGS = {
    'hall': (28, 9, 4.8, 'hip', 'roof', 'redwood'),
    'house': (18, 6.8, 3.5, 'gable', 'roof', 'wood'),
    'annex': (10, 5.4, 2.9, 'gable', 'warmroof', 'wood'),
    'range': (30, 6.5, 3.3, 'gable', 'slateroof', 'wood'),
    'gallery': (22, 2.7, 3.1, 'hip', 'roof', 'redwood'),
    'gate': (6, 4, 3.8, 'hip', 'roof', 'redwood'),
    'shop': (7, 6.5, 3.7, 'gable', 'warmroof', 'wood'),
    'shop-upper': (9, 8, 6.6, 'gable', 'slateroof', 'wood'),
    'warehouse': (30, 10, 4.1, 'gable', 'slateroof', 'wood'),
    'temple': (30, 14, 6.0, 'hip', 'roof', 'redwood'),
}
FACILITIES = {'paifang', 'bell-pavilion', 'well', 'screen', 'stall',
              'cart', 'hitching', 'lane-gate', 'drain', 'slab-bridge'}
PROTOTYPES = set(BUILDINGS) | FACILITIES | {'wall', 'paving', 'court-paving', 'tree'}


def compose(cfg):
    instances, courts, streets, footprints = [], [], [], []
    active_plot = None

    def add(kind, x, y, z=0, angle=0, scale=(1, 1, 1), district='capital'):
        row = dict(kind=kind, position=[round(x, 3), round(z, 3), round(-y, 3)],
                   rotation=round(angle, 6), scale=[round(scale[0], 3), round(scale[2], 3), round(scale[1], 3)], district=district)
        instances.append(row)
        if kind in BUILDINGS:
            w, d = BUILDINGS[kind][:2]
            # Include the actual eave overhang in the plan's clearance checks.
            w, d = (w+1.5)*scale[0], (d+1.4)*scale[1]
            if abs(math.sin(angle)) > .5: w, d = d, w
            footprints.append(dict(index=len(instances)-1, kind=kind, plot=active_plot,
                                   bounds=[x-w/2, y-d/2, x+w/2, y+d/2]))

    def building(kind, x, y, width=None, depth=None, height=1, angle=0, district='capital'):
        w, d = BUILDINGS[kind][:2]
        add(kind, x, y, angle=angle, scale=((width or w)/w, (depth or d)/d, height), district=district)

    def paving(rect, district):
        x0, y0, x1, y1 = rect
        add('court-paving', (x0+x1)/2, (y0+y1)/2, scale=(x1-x0, y1-y0, 1), district=district)

    def enclosure(rect, district, gate_x=None, height=2.7):
        x0, y0, x1, y1 = rect
        for x in [x0, x1]: add('wall', x, (y0+y1)/2, angle=math.pi/2, scale=(y1-y0, 1, height), district=district)
        add('wall', (x0+x1)/2, y1, scale=(x1-x0, 1, height), district=district)
        for lo, hi in [(x0, gate_x-3), (gate_x+3, x1)] if gate_x is not None else [(x0, x1)]:
            if hi > lo: add('wall', (lo+hi)/2, y0, scale=(hi-lo, 1, height), district=district)

    def court(rect, district, style, seed):
        nonlocal active_plot
        rng = random.Random(seed)
        x0, y0, x1, y1 = rect; w, d = x1-x0, y1-y0; x=(x0+x1)/2
        active_plot = len(courts)
        courts.append(dict(center=[round(x, 2), round((y0+y1)/2, 2)], bounds=list(rect), district=district, type=style))
        paving(rect, district)
        gx=x + (w*.17 if style in ['side-entry', 'service'] else 0)
        enclosure(rect, district, gx, 3.2 if style=='mansion' else 2.6)
        building('gate', gx, y0+2.8, width=5 if style!='mansion' else 7, height=.87 if style!='mansion' else 1.1, district=district)
        if style=='storehouse':
            # Service yards have long parallel storage sheds, not another four-sided court.
            for yy in [y0+17+i*17 for i in range(max(1, int((d-20)/17)))]:
                building('warehouse', x, yy, width=w-7, depth=8.5, height=.92, district=district)
            add('cart', x0+7, y0+7, angle=math.pi/2, district=district)
            add('hitching', x1-6, y0+9, district=district)
            active_plot=None; return
        formal=style in ['mansion', 'scholars', 'inn']
        roof_kind='hall' if formal else ('range' if w>39 else 'house')
        north_depth=9 if formal else 6.8
        north_y=y1-(north_depth+1.4)/2-1.8
        north_width=min(w-7,32 if formal else 25)
        building(roof_kind, x+rng.uniform(-.6,.6), north_y, width=north_width, depth=north_depth,
                 height=rng.choice([.91,1,1.07]), district=district)
        # Flanking ear rooms step down from the principal hall instead of stretching
        # one roof and its window bays into an implausibly long barracks building.
        for lo,hi in [(x0+2,x-north_width/2-2.3),(x+north_width/2+2.3,x1-2)]:
            if hi-lo>6.5:
                building('annex',(lo+hi)/2,north_y+1,width=(hi-lo-1.2)/1.15,depth=5,height=.9,district=district)
        # Long plots are divided into two/three inhabited yards, including service
        # courts. The old empty rectangular strips were particularly conspicuous.
        end=north_y-(north_depth+1.4)/2-3
        cuts=[y0+d*f for f in ([.31,.64] if d>108 else [rng.uniform(.43,.52)] if d>67 else [])]
        intervals=[];lo=y0+12
        for j,middle in enumerate(cuts):
            building('hall' if style=='mansion' and j==0 else 'house', x+(-1 if j%2 else 1), middle,
                     width=min(27,w*.63),depth=6.2,height=.94 if formal else .84,district=district)
            intervals.append((lo,middle-6));lo=middle+6
        intervals.append((lo,end))
        for j,(lo,hi) in enumerate(intervals):
            length=hi-lo
            if length<9: continue
            for side in [-1,1]:
                if side==1 and style in ['side-entry','scholars']:
                    if length>17: building('annex', x1-5, (lo+hi)/2+3, width=min(13,length-4), angle=math.pi/2, district=district)
                    continue
                if side==1 and style=='service':continue
                kind='gallery' if side==1 and style=='mansion' and j==1 else 'house'
                pieces=2 if length>31 else 1
                for k in range(pieces):
                    segment=length/pieces
                    building(kind, x0+5 if side<0 else x1-5,lo+segment*(k+.5),
                             width=segment-3,depth=4.8 if kind!='gallery' else 2.7,
                             angle=math.pi/2,height=(.88 if style!='mansion' else .98)-k*.06,district=district)
        # Unequal street-side rooms and displaced entry break mirrored U patterns.
        for lo,hi in [(x0+2,gx-5),(gx+5,x1-2)]:
            if hi-lo>7:
                building('annex', (lo+hi)/2, y0+4.4, width=(hi-lo-1.4)/1.15, depth=5.3, height=rng.choice([.9,1,1.12]), district=district)
        if d>40 and w>27:
            yy=y0+min(20,d*.29)
            add('tree', x-2 if style=='mansion' else x+3, yy, scale=(.85,.85,rng.uniform(.9,1.22)), district=district)
        if style in ['mansion','scholars']:
            add('screen', gx, y0+9, scale=(.65,.6,.7), district=district)
        if style=='inn':add('well',x+2,y0+d*.7,scale=(.8,.8,.8),district=district)
        active_plot=None

    def estate(rect,district,seed):
        x0,y0,x1,y1=rect;w=x1-x0
        # Adjacent axial compounds of different widths and depths, within one estate.
        widths=[.40,.32,.28] if w>125 else [.59,.41]
        left=x0
        for i,f in enumerate(widths):
            right=x1 if i==len(widths)-1 else left+w*f-2
            court((left,y0+(i%2)*7,right,y1),district,['mansion','scholars','service'][i%3],seed+i*41)
            left=right+3.5

    def market(rect,seed,district='market-street'):
        nonlocal active_plot
        x0,y0,x1,y1=rect;w=x1-x0;d=y1-y0
        active_plot=len(courts);courts.append(dict(center=[(x0+x1)/2,(y0+y1)/2],bounds=list(rect),district=district,type='shop-court'))
        paving((x0,y0,x1,y0+28) if d>75 else rect,district)
        rng=random.Random(seed);x=x0+6;i=0
        while x<x1-6:
            bw=min(rng.choice([6,8,10,12]),x1-x-3)
            if bw<5:break
            upper=i%4==1
            building('shop-upper' if upper else 'shop',x+bw/2,y0+7+(i%3)*.7,width=bw,depth=7 if upper else 6.2,district=district)
            if i%2==0:add('stall',x+bw/2,y0+1,angle=math.pi,scale=(.85,.8,.9),district=district)
            x+=bw+2.8;i+=1
        if d>75:
            # Shops front the street; inhabited service courts occupy the deep
            # rear plots, rather than a few isolated sheds in a huge paved void.
            nx=max(1,round(w/37));ny=max(1,round((d-31)/45))
            for iy in range(ny):
                for ix in range(nx):
                    ax=x0+ix*w/nx+1;bx=x0+(ix+1)*w/nx-2.5
                    ay=y0+30+iy*(d-30)/ny;by=y0+30+(iy+1)*(d-30)/ny-3
                    court((ax,ay,bx,by),district,'inn' if (ix+iy)%3==0 else 'service',seed+iy*17+ix*39)
        else:
            building('range',(x0+x1)/2,y1-6,width=w-8,depth=7,district=district)
        add('well',x1-14,y0+22,district=district)
        add('cart',x0+12,y0+21,angle=.14,district=district)
        add('hitching',x0+5,y0+20,district=district)
        if w>70 and d<=75:add('tree',x1-20,y1-19,scale=(1.3,1.3,1.2),district=district)
        active_plot=None

    def temple(rect):
        nonlocal active_plot
        x0,y0,x1,y1=rect;x=(x0+x1)/2;y=(y0+y1)/2;w=x1-x0;d=y1-y0;district='temple-quarter'
        active_plot=len(courts);courts.append(dict(center=[x,y],bounds=list(rect),district=district,type='temple'))
        paving(rect,district);enclosure(rect,district,x,3.7)
        building('gate',x,y0+4,width=12,depth=5,height=1.1,district=district)
        building('temple',x,y1-15,width=min(43,w-20),district=district)
        building('hall',x,y0+d*.49,width=min(32,w*.55),depth=9,height=1.02,district=district)
        for side in [-1,1]:
            add('bell-pavilion',x+side*w*.31,y0+21,district=district)
            building('gallery',x+side*(w/2-6),y0+d*.67,width=d*.37,angle=math.pi/2,district=district)
            add('tree',x+side*w*.26,y1-19,scale=(1.2,1.2,1.3),district=district)
            building('house',x+side*34,y0+d*.49,width=17,depth=9,height=1.08,district=district)
            building('house',x+side*33,y1-39,width=22,depth=7,height=.95,district=district)
            for yy in [y0+40,y1-53]:add('tree',x+side*42,yy,scale=(1.3,1.3,1.4),district=district)
        add('paifang',x,y0+12,scale=(.72,.8,.83),district=district)
        active_plot=None

    def office(rect):
        nonlocal active_plot
        x0,y0,x1,y1=rect;x=(x0+x1)/2;district='mansion-offices'
        active_plot=len(courts);courts.append(dict(center=[x,(y0+y1)/2],bounds=list(rect),district=district,type='office'))
        paving(rect,district);enclosure(rect,district,x,3.8)
        building('hall',x,y1-11,width=37,depth=12,height=1.13,district=district)
        building('gate',x,y0+4,width=12,depth=5,height=1.2,district=district)
        add('screen',x,y0+16,scale=(1.2,1.2,1.15),district=district)
        for side in [-1,1]:
            building('range',x+side*45,y1-7,width=25,depth=7,district=district)
            building('house',x+side*57,y0+41,width=24,angle=math.pi/2,district=district)
            building('shop-upper',x+side*35,y0+10,width=11,district=district)
            add('tree',x+side*33,y0+38,scale=(1.25,1.25,1.3),district=district)
        add('paifang',x,y0+29,scale=(.8,.85,.95),district=district)
        add('hitching',x-18,y0+16,district=district)
        active_plot=None

    # Deliberate near-field landmarks: the garden sits inside a large mansion fabric.
    for rect,district,seed in [
        ((-298,-146,-158,-63),'rong-mansion',31),((-298,-54,-158,47),'rong-mansion',46),
        ((-298,56,-158,150),'rong-mansion',12),((158,-146,298,-76),'ning-mansion',84),
        ((158,-67,298,48),'ning-mansion',58),
        ((-179,160,-61,298),'rear-mansion',99),((-51,160,58,298),'rear-mansion',14),
        ((68,160,173,298),'rear-mansion',20),((184,160,298,298),'ning-mansion',104),
        ((-180,-298,-59,-156),'rong-mansion',66),((61,-298,169,-156),'ning-mansion',91),
    ]:estate(rect,district,seed)
    office((158,57,298,150))
    temple((-298,160,-190,298))
    market((-298,-298,-190,-159),60,'inn-and-market')
    market((181,-298,298,-158),78)
    # Arrival court: side shops, a ceremonial street arch and a narrow stone drain.
    for side in [-1,1]:
        for i,yy in enumerate([-185,-202,-219,-236,-253,-270,-287]):
            building('shop-upper' if i in [2,5] else 'shop',side*20,yy,width=11 if i%2 else 12,
                     depth=7,angle=-side*math.pi/2,district='mansion-approach')
        for i,(lo,hi) in enumerate([(-298,-253),(-249,-204),(-200,-157)]):
            ax,bx=(-55,-28) if side<0 else (28,56)
            court((ax,lo,bx,hi),'mansion-approach','side-entry' if i%2 else 'enclosed',112+i+int(side)*3)
        add('tree',side*12,-178,scale=(1.15,1.15,1.25),district='mansion-approach')
        add('hitching',side*12,-217,district='mansion-approach')
        add('stall',side*12,-234,angle=-side*math.pi/2,district='mansion-approach')
    add('paifang',0,-206,district='mansion-approach')
    add('well',-10,-263,district='mansion-approach')
    add('cart',-11,-277,angle=-.2,district='mansion-approach')
    streets.append(dict(name='府前街',axis='y',center=[0,-235],width=25,length=128))

    # Far quarters: recursive unequal subdivision makes short, offset hutongs;
    # none of the four sides repeats an equal-sized square-court lattice.
    def subdivide(rect,seed,depth=0):
        x0,y0,x1,y1=rect;w=x1-x0;d=y1-y0;rng=random.Random(seed)
        if (w*d>5600 or max(w,d)>107) and min(w,d)>26:
            axis=0 if w>d*rng.uniform(.85,1.3) else 1
            length=w if axis==0 else d
            if length<63:axis=1-axis;length=d if axis else w
            gap=9 if depth<2 else rng.choice([3.5,4.5,6])
            t=rng.uniform(.39,.61)
            if axis==0:
                cut=x0+w*t
                a=(x0,y0,cut-gap/2,y1);b=(cut+gap/2,y0,x1,y1)
                streets.append(dict(name='胡同',axis='y',center=[round(cut,2),(y0+y1)/2],width=gap,length=d))
            else:
                cut=y0+d*t
                a=(x0,y0,x1,cut-gap/2);b=(x0,cut+gap/2,x1,y1)
                streets.append(dict(name='胡同',axis='x',center=[(x0+x1)/2,round(cut,2)],width=gap,length=w))
            subdivide(a,seed*3+1,depth+1);subdivide(b,seed*3+2,depth+1);return
        if w<23 or d<25:raise ValueError('Uninhabitable generated plot '+str(rect))
        rect=tuple(round(v,2) for v in rect)
        if w>60 and d>47 and seed%7==0:market(rect,seed)
        elif w>68 and d>67:estate(rect,'capital-mansion',seed)
        else:
            style=rng.choices(['enclosed','side-entry','service','scholars','storehouse','inn'],[34,23,17,8,7,11])[0]
            court(rect,'capital-hutongs',style,seed)
    for rect,seed in [((-639,-626,-315,628),817),((315,-626,640,628),349),
                      ((-304,317,304,630),506),((-304,-629,304,-316),221)]:subdivide(rect,seed)

    # Street junctions gain facilities and small public spaces, not scattered monuments.
    for x,y,angle in [(307,-108,math.pi/2),(-307,5,math.pi/2),(6,307,0),(-6,-308,0)]:
        add('lane-gate',x,y,angle=angle,district='hutong-junction')
    for x,y in [(307,122),(-307,-137),(164,307),(-166,-308)]:
        add('well',x,y,scale=(.8,.8,.8),district='hutong-junction')
        add('tree',x+3,y+7,district='hutong-junction')
    # Covered stone runnels belong to the street, not a Jiangnan canal network.
    for lo,hi in [(-620,-319),(-297,-215)]:
        add('drain',10,(lo+hi)/2,scale=(1,hi-lo,1),district='street-drainage')
    for yy in [-350,-440,-535,-246]:add('slab-bridge',10,yy,district='street-drainage')
    for x,y in [(-307,-300),(307,306)]:add('paifang',x,y,scale=(.85,.9,.88),district='market-junction')
    streets.extend([
        dict(name='东西街',axis='x',center=[0,307],width=16,length=1260),
        dict(name='府南街',axis='x',center=[0,-308],width=16,length=1260),
        dict(name='西侧街',axis='y',center=[-307,0],width=16,length=1250),
        dict(name='东侧街',axis='y',center=[307,0],width=16,length=1250),
    ])
    return dict(instances=instances,courts=courts,streets=streets,footprints=footprints,
                composition=dict(plotTypes=dict(Counter(c['type'] for c in courts)),
                                 kinds=dict(Counter(r['kind'] for r in instances))))


def validate_plan(plan, cfg):
    """Clearance and layout diversity, independent of the Blender exporter."""
    bounds=cfg['gardenBounds'];errors=[]
    footprints=plan['footprints']
    for f in footprints:
        a=f['bounds']
        if min(a[2],bounds[2])-max(a[0],bounds[0])>0 and min(a[3],bounds[3])-max(a[1],bounds[1])>0:
            errors.append('Building intrudes into garden: '+str(f))
    for i,f in enumerate(footprints):
        a=f['bounds']
        for g in footprints[i+1:]:
            b=g['bounds']
            if min(a[2],b[2])-max(a[0],b[0])>.15 and min(a[3],b[3])-max(a[1],b[1])>.15:
                errors.append('Roof footprint overlap: '+str((f['index'],g['index'],f['kind'],g['kind'])))
    widths={round(c['bounds'][2]-c['bounds'][0]) for c in plan['courts']}
    depths={round(c['bounds'][3]-c['bounds'][1]) for c in plan['courts']}
    if len(widths)<20 or len(depths)<20:errors.append('Insufficient plot size diversity')
    if len(plan['composition']['plotTypes'])<7:errors.append('Insufficient urban land uses')
    if not FACILITIES <= set(plan['composition']['kinds']):errors.append('Missing street facilities')
    if errors:raise AssertionError('\n'.join(errors[:35])+f'\n{len(errors)} errors')
    return dict(courts=len(plan['courts']),buildings=len(footprints),instances=len(plan['instances']),
                distinctWidths=len(widths),distinctDepths=len(depths),roofOverlaps=0,
                composition=plan['composition'])

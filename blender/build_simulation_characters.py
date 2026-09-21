"""Original articulated garden figures. Y-up authoring matches the web rig.

No garden collection is opened or replaced. All geometry and vertex colors are
authored here; there are no downloaded textures or third-party character assets.
"""
import bpy, math, json, hashlib
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[1]
DESIGN = json.loads((ROOT / 'config/simulation.characters.json').read_text())
OUT = ROOT / 'public/models/characters'
PORTRAITS = ROOT / 'public/textures/characters'
OUT.mkdir(parents=True, exist_ok=True)
PORTRAITS.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 240
scene.render.resolution_y = 280
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = True
scene.view_settings.view_transform = 'Standard'
scene.world = bpy.data.worlds.new('Soft studio')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.7, .78, .8, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .35

def linear(c):
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4

def color(value):
    return tuple(linear(int(value[i:i+2], 16) / 255) for i in (1, 3, 5)) + (1,)

mat = bpy.data.materials.new('Painted silk and porcelain')
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Roughness'].default_value = .8
vc = mat.node_tree.nodes.new('ShaderNodeVertexColor')
vc.layer_name = 'Color'
mat.node_tree.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])

def empty(name, parent=None, position=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    scene.collection.objects.link(obj)
    obj.parent = parent
    obj.location = position
    return obj

def finish(obj, parent, shade, name):
    obj.name = name
    obj.parent = parent
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    attr = obj.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
    rgba = color(shade)
    for item in attr.data:
        item.color = rgba
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj

def mesh(name, verts, faces, parent, shade):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    return finish(obj, parent, shade, name)

def ellipsoid(parent, pos, scale, shade, name='detail', segments=16, rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings)
    obj = bpy.context.object
    obj.location = pos
    obj.scale = scale
    return finish(obj, parent, shade, name)

def loft(parent, levels, shade, name, folds=0, center=(0, 0, 0), segments=32):
    verts = []
    for y, rx, rz in levels:
        for i in range(segments):
            a = i * math.tau / segments
            ripple = 1 + folds * math.cos(12 * a)
            verts.append((center[0] + math.cos(a) * rx * ripple, center[1] + y, center[2] + math.sin(a) * rz * ripple))
    faces = [(j*segments+i, j*segments+(i+1)%segments, (j+1)*segments+(i+1)%segments, (j+1)*segments+i) for j in range(len(levels)-1) for i in range(segments)]
    faces += [tuple(reversed(range(segments))), tuple((len(levels)-1)*segments+i for i in range(segments))]
    return mesh(name, verts, faces, parent, shade)

def stroke(parent, points, shade, radius=.008, name='embroidery'):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 2
    curve.bevel_depth = radius
    curve.bevel_resolution = 1
    spline = curve.splines.new('POLY')
    spline.points.add(len(points)-1)
    for p, xyz in zip(spline.points, points):
        p.co = (*xyz, 1)
    obj = bpy.data.objects.new(name, curve)
    scene.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj.select_set(False)
    return finish(obj, parent, shade, name)

def box(parent, pos, scale, shade, name='prop'):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.location = pos
    obj.scale = scale
    return finish(obj, parent, shade, name)

def blossom(parent, x, y, z, shade, size=.021):
    for i in range(5):
        a = math.tau*i/5
        ellipsoid(parent, (x+math.sin(a)*size, y+math.cos(a)*size, z), (size*.64, size*.83, .004), shade, segments=8, rings=4)
    ellipsoid(parent, (x,y,z+.004), (.009,.009,.005), '#D5AD65', segments=8, rings=4)

roots = []
for cid, c in DESIGN['characters'].items():
    root = empty(cid)
    roots.append(root)
    root['agentId'] = cid
    root['artisticInterpretation'] = c['motif']
    body = empty(cid+'_body', root)
    skirt = empty(cid+'_skirt', body)
    loft(skirt, [(0.1,.29,.19),(.16,.31,.2),(.42,.27,.17),(.76,.195,.13),(1.02,.17,.115)], c['skirt'], 'pleated skirt', .025)
    loft(skirt, [(.12,.297,.196),(.155,.309,.204)], c['trim'], 'woven hem', .022)
    loft(body, [(.67,.255,.16),(.74,.25,.15),(1.0,.18,.125),(1.2,.2,.13),(1.37,.23,.12),(1.43,.13,.105)], c['robe'], 'silk jacket')
    loft(body, [(.675,.26,.166),(.704,.257,.166)], c['trim'], 'jacket hem')
    loft(body, [(1.42,.1,.082),(1.5,.08,.07)], c['lining'], 'standing collar')
    stroke(body, [(-.09,1.43,.086),(-.02,1.34,.139),(.14,1.16,.13),(.14,.72,.143)], c['trim'], .011, 'crossed lapel')
    stroke(body, [(-.075,1.4,.10),(.015,1.3,.148),(.12,1.18,.14)], c['lining'], .012)
    loft(body, [(.97,.187,.134),(1.015,.188,.134)], c['trim'], 'silk sash')
    for x in [-.04,.04]:
        stroke(body, [(x,.97,.143),(x*1.8,.69,.183),(x*1.5,.44,.183)], c['lining'], .02, 'hanging ribbon')
    for i in range(5):
        y=.78+i*.093
        blossom(body, -.09+(i%2)*.065,y,.145 if y>1 else .161,c['lining'],.012)
    for side, label in [(-1,'left'),(1,'right')]:
        leg = empty(cid+'_'+label+'Leg', root, (side*.105,.64,0))
        loft(leg, [(-.51,.063,.063),(-.05,.072,.065)], c['skirt'], 'trouser')
        ellipsoid(leg, (0,-.59,.055), (.087,.045,.153), '#343842', 'slipper')
        stroke(leg, [(-.052,-.56,.095),(0,-.548,.17),(.052,-.56,.095)], c['trim'], .006)
        arm=empty(cid+'_'+label+'Arm', body, (side*.235,1.31,0))
        loft(arm, [(-.29,.105,.105),(-.14,.12,.12),(.035,.105,.105)], c['robe'], 'upper sleeve')
        fore=empty(cid+'_'+label+'Forearm', arm, (0,-.26,0))
        loft(fore, [(-.29,.15,.13),(-.255,.15,.13),(0,.102,.104)], c['robe'], 'wide sleeve')
        loft(fore, [(-.291,.153,.133),(-.265,.151,.131)], c['trim'], 'embroidered cuff')
        loft(fore, [(-.31,.091,.077),(-.288,.091,.077)], c['lining'], 'inner cuff')
        ellipsoid(fore, (0,-.345,.007), (.056,.074,.036), c['skin'], 'hand')
        arm.rotation_euler.z=side*.12
    head=empty(cid+'_head', body, (0,1.63,0))
    face_width={'baoyu':.148,'daiyu':.133,'baochai':.158,'wangxifeng':.14}[cid]
    face_height={'baoyu':.182,'daiyu':.193,'baochai':.184,'wangxifeng':.189}[cid]
    ellipsoid(head,(0,-.04,.015),(face_width,face_height,.139),c['skin'],'face',24,16)
    ellipsoid(head,(0,.025,-.035),(.158,.179,.127),c['hair'],'hair back',24,12)
    loft(head, [(-.205,.062,.062),(-.16,.069,.065)],c['skin'],'neck',segments=16)
    # Scalp above the forehead, with a clean oval face rather than a blank peg.
    verts=[]
    for j in range(9):
        a=(math.pi*.52)*j/8
        for i in range(24):
            t=math.tau*i/24
            verts.append((.155*math.sin(a)*math.cos(t), .025+.185*math.cos(a), -.016+.137*math.sin(a)*math.sin(t)))
    faces=[(j*24+i,j*24+(i+1)%24,(j+1)*24+(i+1)%24,(j+1)*24+i) for j in range(8) for i in range(24)]
    mesh('swept hair',verts,faces,head,c['hair'])
    eyes=empty(cid+'_eyes',head,(0,-.032,.136))
    for side in [-1,1]:
        eye=ellipsoid(eyes,(side*.06,0,0),(.028,.01,.008),'#55403D','eye',12,6)
        if cid=='wangxifeng': eye.rotation_euler.z=side*.16
        ellipsoid(eyes,(side*.059,.001,.007),(.007,.009,.004),'#222B2B','pupil',10,6)
        ellipsoid(eyes,(side*.056,.004,.01),(.0025,.003,.002),'#FFF5DC','eye light',8,4)
        brow_peak=.008 if cid=='wangxifeng' else -.002 if cid=='daiyu' else .001
        stroke(head,[(side*.035,-.007,.131),(side*.065,brow_peak,.129),(side*.093,-.004,.12)],c['hair'],.0035,'brow')
        ellipsoid(head,(side*.139,-.055,.014),(.016,.04,.023),c['skin'],'ear',12,6)
        ellipsoid(head,(side*.09,-.079,.118),(.025,.009,.003),'#D89F99','rouge',12,6)
    ellipsoid(head,(0,-.069,.142),(.015,.028,.015),c['skin'],'nose',12,8)
    stroke(head,[(-.02,-.112,.12),(0,-.115,.133),(.02,-.112,.12)],'#A36067',.004,'lips')
    if cid=='baoyu':
        ellipsoid(head,(0,.225,-.03),(.07,.066,.07),c['trim'],'small crown')
        for x in [-.045,0,.045]:
            stroke(head,[(x,.19,.021),(x*.7,.275,-.025)],'#9E3D35',.008)
        ellipsoid(body,(0,1.2,.16),(.035,.053,.012),'#A4C7B6','jade pendant')
        stroke(body,[(0,1.17,.17),(0,1.04,.18)],c['robe'],.008)
    else:
        ellipsoid(head,(0,.2,-.09),(.12,.095,.09),c['hair'],'coiled bun')
        for side in [-1,1]:
            stroke(head,[(side*.13,.05,.006),(side*.15,-.06,-.03),(side*.12,-.24,-.045)],c['hair'],.026,'temple lock')
            ellipsoid(head,(side*.143,-.11,.021),(.009,.018,.01),c['trim'],'earring',10,6)
        stroke(head,[(-.2,.22,-.04),(.17,.25,-.05)],c['trim'],.009,'hairpin')
        blossom(head,-.12,.24,-.008,c['lining'],.025)
        if cid=='wangxifeng':
            ellipsoid(head,(0,.28,-.065),(.078,.065,.062),c['hair'],'high bun')
            for i in range(5):
                x=(i-2)*.035
                stroke(head,[(x,.21,.015),(x*1.4,.31-abs(x),-.008)],c['trim'],.007,'comb')
                ellipsoid(head,(x*1.4,.31-abs(x),0),(.012,.018,.009),c['lining'],segments=8,rings=4)
        if cid=='daiyu':
            for side in [-1,1]:
                stroke(body,[(side*.12,1.44,-.03),(side*.28,1.26,-.07),(side*.3,.9,-.13),(side*.26,.52,-.07)],c['lining'],.03,'silk shoulder ribbon')
        if cid=='baochai':
            stroke(body,[(-.075,1.44,.09),(-.06,1.25,.158),(0,1.2,.17),(.06,1.25,.158),(.075,1.44,.09)],c['trim'],.008,'necklace')
            box(body,(0,1.19,.17),(.072,.035,.018),c['trim'],'gold lock')
    book=empty(cid+'_book',body,(0,1.035,.39))
    box(book,(0,0,0),(.34,.035,.235),'#EFE2C9','pages')
    for x in [-.09,.09]:
        box(book,(x,.023,0),(.167,.008,.23),'#F2E9D8','open page')
        for j in range(4):
            stroke(book,[(x-.055,.029,-.071+j*.042),(x+.055,.029,-.071+j*.042)],'#B3A58C',.0015,'ink')
    box(book,(0,-.02,0),(.355,.009,.25),c['lining'],'book cover')
    brush=empty(cid+'_brush',body,(.22,1.065,.41))
    stroke(brush,[(0,0,0),(.035,.15,-.03)],'#6F5744',.006,'brush shaft')
    ellipsoid(brush,(0,-.013,.002),(.007,.022,.007),'#303C3F','brush tip',8,6)
    book.hide_render=True
    brush.hide_render=True
    # One vertex-colored mesh per moving part, keeping the runtime draw count low.
    for parent in [o for o in [root,*root.children_recursive] if o.type=='EMPTY']:
        pieces=[o for o in parent.children if o.type=='MESH']
        if not pieces: continue
        bpy.ops.object.select_all(action='DESELECT')
        for piece in pieces: piece.select_set(True)
        bpy.context.view_layer.objects.active=pieces[0]
        bpy.ops.object.join()
        obj=bpy.context.object
        obj.name=parent.name+'_paint'
    root.scale=(c['scale'],)*3

# Web GLBs retain exact Y-up joint axes, rather than applying an implicit root rotation.
files=[]
for root in roots:
    bpy.ops.object.select_all(action='DESELECT')
    for obj in [root,*root.children_recursive]:
        obj.select_set(True)
    file=OUT/(root.name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_yup=False,export_animations=False,export_extras=True,export_materials='EXPORT',export_all_vertex_colors=True)
    data=file.read_bytes()
    files.append({'agent':root.name,'path':file.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})

def aim(obj, target):
    forward=(Vector(target)-obj.location).normalized()
    right=forward.cross(Vector((0,1,0))).normalized()
    up=right.cross(forward).normalized()
    obj.rotation_euler=Matrix((right,up,-forward)).transposed().to_quaternion().to_euler()

camera_data=bpy.data.cameras.new('Portrait camera')
camera=bpy.data.objects.new('Portrait camera',camera_data)
scene.collection.objects.link(camera)
camera.location=(.6,1.68,3.1)
aim(camera,(0,1.43,0))
camera_data.type='ORTHO'
camera_data.ortho_scale=1.12
scene.camera=camera
for name,pos,energy,size in [('Soft key',(-3,4,5),220,4),('Warm fill',(3,2,1),90,3),('Hair rim',(0,3,-3),150,2)]:
    light_data=bpy.data.lights.new(name,'AREA')
    light_data.energy=energy
    light_data.shape='DISK'
    light_data.size=size
    light=bpy.data.objects.new(name,light_data)
    scene.collection.objects.link(light)
    light.location=pos
    aim(light,(0,1.1,0))
for root in roots:
    for r in roots:
        for obj in [r,*r.children_recursive]: obj.hide_render=r!=root or '_book' in obj.name or '_brush' in obj.name
    file=PORTRAITS/(root.name+'.png')
    scene.render.filepath=str(file)
    bpy.ops.render.render(write_still=True)
    data=file.read_bytes()
    files.append({'agent':root.name,'path':file.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
for i,root in enumerate(roots):
    for obj in [root,*root.children_recursive]: obj.hide_render='_book' in obj.name or '_brush' in obj.name
    root.location.x=(i-1.5)*1.25
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/simulation_characters.blend'))
manifest={'revision':DESIGN['revision'],'origin':'Original procedural geometry and vertex colors, authored for this project','basis':DESIGN['basis'],'externalAssets':[],'generator':'blender/build_simulation_characters.py','generatorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'configuration':'config/simulation.characters.json','configurationSha256':hashlib.sha256((ROOT/'config/simulation.characters.json').read_bytes()).hexdigest(),'files':files}
(PORTRAITS/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('EXPORTED',json.dumps([{'agent':f['agent'],'bytes':f['bytes']} for f in files]))

"""Ground-conforming root gardens shared by the editable master and both web LODs."""
import hashlib
import json
import math
import random
import sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

R = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(R/'blender'), str(R/'scripts')]
import build_modules as core
from court_planting import walkable
from focal_botany import blade
from sunwen_botany import linear, blossom
from sunwen_architecture import ground_tree, geometry_hash
from garden_ground_fields import fields, pigments
from export_scene import export_selected
from sunwen_landscape_lod import export_low_beds
from native_ground import attach_tended_garden
from publish_manifest import publish

read = lambda p: json.loads((R/p).read_text())
layout = read('config/garden.layout.json'); landscape = read('config/sunwen.landscape.json')
design = read('config/garden.grounding.json'); style = read('config/garden.sunwen.json')
source = read('assets/processed/grounding-r21/source.json'); plan = read('assets/processed/grounding-r21/plan.json')
bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'), load_ui=False, use_scripts=False)
if '--lod-only' in sys.argv:
    objects=list(bpy.data.collections['Sunwen_Garden_Details'].objects)+list(bpy.data.collections['Sunwen_Root_Gardens'].objects)
    export_low_beds(R/'public/models/sunwen-landscape-low.glb',objects)
    raise SystemExit(0)
col = bpy.data.collections.get('Sunwen_Root_Gardens')
if col: bpy.data.batch_remove(ids=list(col.objects))
else:
    col = bpy.data.collections.new('Sunwen_Root_Gardens'); bpy.context.scene.collection.children.link(col)
col['generated'] = True; col['designBasis'] = design['basis']; col['revision'] = design['revision']
for root in plan['roots']:
    bpy.data.objects[root['name']].location = root['position']
bpy.context.view_layer.update()
terrain = ground_tree()

# Query actual upward paving faces, below roofs, to seat planting over a court
# surface as well as earth. This never uses a blanket flat elevation.
vertices = []; faces = []
for collection in bpy.data.collections:
    if not (collection.name.startswith('Place_') or collection.name == 'Garden_Landscape'): continue
    for ob in collection.objects:
        if ob.type != 'MESH' or ob.hide_render: continue
        slots = {i for i, m in enumerate(ob.data.materials) if m and m.get('sunwenRole', m.name) in ['paving', 'courtbase', 'stone', 'cutstone']}
        if not slots: continue
        offset = len(vertices); matrix = ob.matrix_world
        vertices.extend(matrix@v.co for v in ob.data.vertices)
        for poly in ob.data.polygons:
            if poly.material_index in slots and (matrix.to_3x3()@poly.normal).z > .96:
                faces.append(tuple(offset+i for i in poly.vertices))
paving = BVHTree.FromPolygons(vertices, faces) if faces else None
print('GROUND RECEIVERS', len(faces), flush=True)


def seat(x, y, paving_only=False):
    hit = terrain.ray_cast(Vector((x, y, 90)), Vector((0, 0, -1)), 180)[0]
    if hit is None: raise AssertionError(f'Missing native ground {x,y}')
    z = hit.z; raised = False
    if paving:
        floor = paving.ray_cast(Vector((x, y, z+.68)), Vector((0, 0, -1)), 1.0)[0]
        if floor is not None:
            raised = floor.z > z+.003
            z = max(z, floor.z)
    if paving_only and not raised:return None
    return z+.022


step = design['surfaceGrid']
axis = np.arange(-147, 147.001, step, dtype=np.float32)
yaxis = np.arange(-137, 147.001, step, dtype=np.float32)
x, y = np.meshgrid(axis, yaxis)
f = fields(x, y, layout, landscape, design, plan)
_, soft_color = pigments(x, y, f, landscape, design)
active = (f['support'] > .14) & (f['pebble'] < .01)
# Court circulation and hall edges remain clear, including existing bamboo beds.
for p in layout['places']:
    px, py, _ = p['position']
    if p['id'] not in ['xiaoxiangguan', 'yihongyuan', 'hengwuyuan', 'qiushuangzhai', 'daguanlou']: continue
    for row, column in np.argwhere(active & (abs(x-px) < 16) & (abs(y-py) < 14)):
        rooted=any(math.hypot(float(x[row,column])-r['position'][0],float(y[row,column])-r['position'][1])<1.75 for r in plan.get('focalRoots',[]) if r['placeId']==p['id'])
        if not rooted and walkable(p['id'], float(x[row,column]-px), float(y[row,column]-py)):
            active[row,column] = False

ids = np.full(x.shape, -1, dtype=np.int32); ground_vertices = []; colors = []
for row, column in np.argwhere(active):
    xx, yy = float(x[row,column]), float(y[row,column])
    z = seat(xx, yy, paving_only=True)
    # Earth already receives the exact same world pigment field. Add geometry
    # only where a real court slab would otherwise cover that soft planted soil.
    if z is None:continue
    ids[row,column] = len(ground_vertices); ground_vertices.append((xx, yy, z))
    srgb = soft_color[row,column]/255
    colors.append([float(((v+.055)/1.055)**2.4 if v > .04045 else v/12.92) for v in srgb]+[1])
ground_faces = []
for row in range(len(yaxis)-1):
    for column in range(len(axis)-1):
        a, b, c, d = ids[row,column], ids[row,column+1], ids[row+1,column+1], ids[row+1,column]
        for triangle in [(a,b,c), (a,c,d)]:
            if min(triangle) >= 0:
                # Do not span a raised stone edge with a floating sloped carpet.
                if max(ground_vertices[v][2] for v in triangle)-min(ground_vertices[v][2] for v in triangle) < .34:
                    ground_faces.append(tuple(int(v) for v in triangle))
# Fine, irregular insets under architecture-batched trunks avoid missing a small
# tree opening on the coarser whole-garden grid. Paving remains around each inset.
for root in plan.get('focalRoots',[]):
    xx,yy,_=root['position'];column=round((xx-axis[0])/step);row=round((yy-yaxis[0])/step)
    tight=f['road'][row,column]<design['pathHalfWidth']+1
    radius=.76 if tight else 1.5
    points=[(xx,yy)]+[(xx+math.cos(i*math.tau/16)*radius*(1+.055*math.sin(i*2.1)),yy+math.sin(i*math.tau/16)*radius*.88) for i in range(16)]
    offset=len(ground_vertices)
    coords=np.asarray(points,dtype=np.float32);local_fields=fields(coords[:,0],coords[:,1],layout,landscape,design,plan)
    _,tints=pigments(coords[:,0],coords[:,1],local_fields,landscape,design)
    for (px,py),tint in zip(points,tints):
        ground_vertices.append((px,py,seat(px,py)+.008))
        colors.append([float(((v+.055)/1.055)**2.4 if v>.04045 else v/12.92) for v in tint/255]+[1])
    for i in range(16):ground_faces.append((offset,offset+1+i,offset+1+(i+1)%16))
mesh = bpy.data.meshes.new('Root_Garden_Surfaces'); mesh.from_pydata(ground_vertices, [], ground_faces); mesh.update()
color = mesh.color_attributes.new(name='RootPigment', type='FLOAT_COLOR', domain='POINT')
color.data.foreach_set('color', np.asarray(colors, dtype=np.float32).ravel())
mesh.color_attributes.active_color = color
material = bpy.data.materials.get('Sunwen21_Root_Surface') or bpy.data.materials.new('Sunwen21_Root_Surface')
material.use_nodes = True; nodes = material.node_tree.nodes; bs = nodes.get('Principled BSDF')
attribute = nodes.get('RootPigment') or nodes.new('ShaderNodeVertexColor'); attribute.name = 'RootPigment'; attribute.layer_name = 'RootPigment'
material.node_tree.links.new(attribute.outputs['Color'], bs.inputs['Base Color']); bs.inputs['Roughness'].default_value = 1
ob = bpy.data.objects.new('Root_Garden_Surfaces', mesh); col.objects.link(ob); mesh.materials.append(material)
ob['sunwenLandscape'] = True; ob['groundingLodRatio'] = 1.; ob['groundingSurface'] = True; ob.visible_shadow = False

core.M = {}
for key, value in design['palette'].items():
    name = 'Sunwen21_'+key; m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value = linear(value); bs.inputs['Roughness'].default_value = .9
    m.diffuse_color = linear(value); core.M[key] = m
core.M['sunwen_gold'] = core.M['gold']
batch = core.Batch('Root_Garden_Underplanting', col); rng = random.Random(design['seed'])
clumps = []; roots_report = []


def allowed(xx, yy, radius=.5, foot=False):
    column = round((xx-axis[0])/step); row = round((yy-yaxis[0])/step)
    if not (0 <= row < len(yaxis) and 0 <= column < len(axis)): return False
    if foot:
        if f['water'][row,column] or f['road'][row,column]<.5:return False
    elif not active[row,column] or f['road'][row,column] < design['pathHalfWidth']+radius+.2: return False
    # Check a complete leaf skirt, not just its centre, against the shoreline.
    if f['shoreDistance'][row,column] < radius+.3: return False
    return True


def clump(xx, yy, pid, size, owner='border', foot=False):
    if len(clumps) >= design['underplantingLimit'] or not allowed(xx, yy, size*.7,foot): return False
    z = seat(xx, yy); profile = style['places'][pid]; height = .04 if foot else rng.uniform(.13,.30)
    heading = rng.random()*math.tau
    for j in range(4):
        a = heading+rng.uniform(-1.2,1.2)
        leaf_base = (xx+rng.uniform(-.18,.18), yy+rng.uniform(-.18,.18), z+.018+rng.uniform(0,.035))
        blade(batch, leaf_base, (math.cos(a),math.sin(a),.30), size, size*.26,
              ['leaf','beanLeaf','jadeLeaf'][rng.randrange(3)], droop=.12, segments=2)
    if not foot and rng.random() < .44:
        for j in range(3):
            a = j*2.399+rng.random()
            end = (xx+math.cos(a)*size*.25, yy+math.sin(a)*size*.25, z+height)
            batch.rod('moss',(xx,yy,z),end,.009,4,r2=.003)
            blade(batch, end, (math.cos(a),math.sin(a),.1), size*.52, size*.17, 'beanLeaf', droop=.14, segments=2)
    chance = .30 if profile == 'crimson' else .08 if profile in ['herbal','bamboo','temple'] else .15
    if not foot and rng.random() < chance:
        role = 'pink' if profile in ['crimson','warm','waterside'] else 'white' if profile in ['herbal','bamboo','temple'] else 'gold'
        blossom(batch,(xx,yy,z+height+.12),rng.uniform(.15,.23),role,rng,petals=5)
    clumps.append({'position':[xx,yy,z], 'placeId':pid, 'root':owner, 'size':size})
    return True


# Every actual crown gets unequal, overlapping companions. These stay present
# in the landscape mesh when distant individual perennial instances are culled.
focal_report=[]
for root in plan.get('focalRoots',[]):
    xx,yy,_=root['position'];count=0
    tight=f['road'][round((yy-yaxis[0])/step),round((xx-axis[0])/step)]<design['pathHalfWidth']+1
    for i in range(50):
        a=rng.random()*math.tau;r=rng.uniform(.25,.5) if tight else rng.uniform(.3,1.2)
        size=rng.uniform(.18,.24) if tight else rng.uniform(.4,.64)
        if clump(xx+math.cos(a)*r,yy+math.sin(a)*r,root['placeId'],size,root['name'],foot=tight):count+=1
        if count==8:break
    focal_report.append({'name':root['name'],'sourceObject':root['sourceObject'],'position':root['position'],'companions':count})
for index, root in enumerate(plan['roots']):
    xx, yy, _ = root['position']; count = 0; requested = 2+index%3 if root['species'] == 3 else 5+index%5
    for i in range(56):
        a = rng.random()*math.tau; r = rng.uniform(.35, min(root['radii'])*.7)
        if clump(xx+math.cos(a)*r, yy+math.sin(a)*r, root['placeId'], rng.uniform(.42,.75), root['name']): count += 1
        if count == requested: break
    roots_report.append({'name':root['name'], 'position':root['position'], 'companions':count, 'groundHeight':seat(xx,yy)})
for link in plan['links']:
    a, b = (plan['roots'][link[k]] for k in ['a','b'])
    for t in [.32,.67]:
        if rng.random() < .48: continue
        xx = a['position'][0]*(1-t)+b['position'][0]*t+rng.uniform(-.6,.6)
        yy = a['position'][1]*(1-t)+b['position'][1]*t+rng.uniform(-.6,.6)
        clump(xx,yy,a['placeId'],rng.uniform(.47,.80))
for b in landscape['beds']:
    if b['kind'] != 'court': continue
    for i in range(24):
        a = rng.random()*math.tau; r = rng.uniform(.15,.8)
        xx = b['center'][0]+math.cos(a)*b['radii'][0]*r
        yy = b['center'][1]+math.sin(a)*b['radii'][1]*r
        clump(xx,yy,b['placeId'],rng.uniform(.38,.6),'court-bed')
detail = batch.finish()
for ob in detail: ob['sunwenLandscape'] = True; ob['groundingLodRatio'] = .24
objects = list(bpy.data.collections['Sunwen_Garden_Details'].objects)+list(col.objects)
bpy.context.view_layer.update()

# Compare all protected geometry; only the explicitly misplaced wall tree moves.
for name, expected in source['protected'].items():
    ob = bpy.data.objects[name]
    if name in source['plannedMoves']:
        current = ob.matrix_world.copy()
        ob.matrix_world = Matrix(source['plannedMoves'][name]['originalMatrix'])
    assert geometry_hash(ob) == expected, 'Unexpected change to protected mesh '+name
    if name in source['plannedMoves']: ob.matrix_world = current
assert all(r['companions'] > 0 for r in roots_report), 'Missing root companions: '+str([r['name'] for r in roots_report if not r['companions']])
assert all(r['companions'] > 0 for r in focal_report), 'Missing built-in court root companions: '+str([r['name'] for r in focal_report if not r['companions']])

export_selected(R/'public/models/sunwen-landscape.glb', objects)
export_low_beds(R/'public/models/sunwen-landscape-low.glb', objects)
attach_tended_garden(); publish(layout)
# Keep native and browser vegetation records aligned after the one path correction.
manifest = read('public/scene-manifest.json'); planting = read('config/sunwen.planting.json')
for key in ['vegetation','groundCover','understory']: planting[key] = manifest[key]
planting['revision'] = layout['assetRevision']
(R/'config/sunwen.planting.json').write_text(json.dumps(planting,ensure_ascii=False,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'))
report = {'revision':layout['assetRevision'], 'method':__doc__, 'protectedMeshes':len(source['protected']),
          'protectedGeometryUnchanged':True, 'intentionalTreeMoves':source['plannedMoves'],
          'rootCount':len(roots_report), 'roots':roots_report, 'focalRoots':focal_report, 'clumps':clumps,
          'surfaceVertices':len(ground_vertices), 'surfaceTriangles':len(ground_faces),
          'nativePavingReceiverFaces':len(faces), 'sourcePlanSha256':hashlib.sha256((R/'assets/processed/grounding-r21/plan.json').read_bytes()).hexdigest(),
          'masterSha256':hashlib.sha256((R/'blender/daguanyuan_master.blend').read_bytes()).hexdigest()}
(R/'reports/acceptance/r21-grounding.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('ROOT GARDENS',len(roots_report),'roots',len(clumps),'low clumps',len(ground_faces),'surface triangles',flush=True)

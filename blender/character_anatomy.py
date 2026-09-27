"""Adapt the reviewed CC0 MakeHuman data to the garden's Y-up character rig.

Only the head and hands are copied; covered body geometry is never exported.
No MakeHuman application code is imported. All fitting and materials are local.
"""
import json, math, hashlib
from pathlib import Path
from mathutils import Vector, Matrix
import bpy

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/characters/makehuman'
PROVENANCE = json.loads((SOURCE / 'provenance.json').read_text())
for record in PROVENANCE['files']:
    assert hashlib.sha256((ROOT / record['path']).read_bytes()).hexdigest() == record['sha256'], record['path']

def obj_data(path):
    verts, uv, groups = [], [], {}
    group = 'body'
    for line in path.read_text().splitlines():
        a = line.split()
        if not a: continue
        if a[0] == 'v': verts.append(Vector(map(float, a[1:4])))
        elif a[0] == 'vt': uv.append(tuple(map(float, a[1:3])))
        elif a[0] == 'g': group = a[1]
        elif a[0] == 'f':
            groups.setdefault(group, []).append([(int(v.split('/')[0])-1, int(v.split('/')[1])-1) for v in a[1:]])
    return verts, uv, groups

BASE, UV, GROUPS = obj_data(SOURCE / 'base.obj')
EYE_BASE, EYE_UV, EYE_GROUPS = obj_data(SOURCE / 'high-poly-eyes.obj')
TARGETS = {}
def target(name):
    if name not in TARGETS:
        out = {}
        for line in (SOURCE / (name + '.target')).read_text().splitlines():
            a = line.split()
            if a and a[0].isdigit(): out[int(a[0])] = Vector(map(float, a[1:4]))
        TARGETS[name] = out
    return TARGETS[name]

def average_group(vertices, name):
    ids = set(i for face in GROUPS[name] for i, _ in face)
    return sum((vertices[i] for i in ids), Vector()) / len(ids)

def make_mesh(name, coordinates, faces, uvs, material, parent):
    data = bpy.data.meshes.new(name)
    data.from_pydata(coordinates, [], [[i for i, _ in face] for face in faces])
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    data.materials.append(material)
    layer = data.uv_layers.new(name='UVMap')
    for polygon, face in zip(data.polygons, faces):
        polygon.use_smooth = True
        for li, (_, ui) in zip(polygon.loop_indices, face): layer.data[li].uv = uvs[ui]
    return obj

def subdivide_shape_keys(obj):
    """Evaluate the same subdivision for the basis and every expression."""
    keys = obj.data.shape_keys.key_blocks
    sub = obj.modifiers.new('Near-view surface', 'SUBSURF')
    sub.levels = sub.render_levels = 1
    graph = bpy.context.evaluated_depsgraph_get()
    graph.update()
    evaluated = obj.evaluated_get(graph)
    smooth = bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True, depsgraph=graph)
    result = bpy.data.objects.new(obj.name + '_smooth', smooth)
    bpy.context.scene.collection.objects.link(result)
    result.parent = obj.parent
    result.shape_key_add(name='Basis')
    for key in list(keys)[1:]:
        key.value = 1
        bpy.context.view_layer.update()
        eval_mesh = obj.evaluated_get(graph).to_mesh()
        new_key = result.shape_key_add(name=key.name)
        assert len(eval_mesh.vertices) == len(new_key.data)
        for point, vertex in zip(new_key.data, eval_mesh.vertices): point.co = vertex.co
        obj.evaluated_get(graph).to_mesh_clear()
        key.value = 0
    old_name = obj.name
    bpy.data.objects.remove(obj, do_unlink=True)
    result.name = old_name
    return result

class Anatomy:
    def __init__(self, identity, design):
        self.identity, self.design = identity, design
        self.vertices = [v.copy() for v in BASE]
        male = design['face']['male']
        for name, weight in [('asian-male-young', male), ('asian-female-young', 1-male), *design['face']['morphs'].items()]:
            for index, delta in target(name).items(): self.vertices[index] += delta * weight
        self.anchor = average_group(self.vertices, 'joint-head')
        self.scale = design['face']['scale']
        self.width = design['face']['width']
        self.eye_positions = []

    def local(self, vertex):
        p = (vertex - self.anchor) * self.scale
        p.x *= self.width
        if p.y < -.07:
            t=max(0,min(1,(-p.y-.07)/.055))
            p.x*=1-t*.72
            p.z=p.z*(1-t*.40)
            p.y-=t*.022
        return p

    def delta(self, delta):
        return Vector((delta.x * self.width, delta.y, delta.z)) * self.scale

    def head(self, parent, material, color_fn, high):
        source_faces = [f for f in GROUPS['body'] if all(BASE[i].y > 5.62 for i, _ in f)]
        ids = sorted(set(i for f in source_faces for i, _ in f))
        index = {old: new for new, old in enumerate(ids)}
        coordinates = [self.local(self.vertices[i]) for i in ids]
        faces = [[(index[i], uv) for i, uv in face] for face in source_faces]
        obj = make_mesh(self.identity + '_face', coordinates, faces, UV, material, parent)
        color = obj.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
        for loop in obj.data.loops: color.data[loop.index].color = color_fn(coordinates[loop.vertex_index])
        obj.shape_key_add(name='Basis')
        for name, targets in [('blink', ['eye-left-closure', 'eye-right-closure']), ('speak', ['mouth-open'])]:
            key = obj.shape_key_add(name=name)
            for t in targets:
                for old, delta in target(t).items():
                    if old in index: key.data[index[old]].co += self.delta(delta)
        if high: obj = subdivide_shape_keys(obj)
        obj['anatomySource'] = PROVENANCE['assetId']
        return obj

    def eyes(self, parent, material):
        scales, mapping = {}, []
        for line in (SOURCE / 'high-poly.mhclo').read_text().splitlines():
            a = line.split()
            if not a: continue
            if a[0] in ['x_scale', 'y_scale', 'z_scale']:
                axis = 'xyz'.index(a[0][0])
                scales[axis] = abs(self.vertices[int(a[1])][axis] - self.vertices[int(a[2])][axis]) / float(a[3])
            elif a[0].isdigit() and len(a) == 9: mapping.append(a)
        fitted = []
        assert len(mapping) == len(EYE_BASE)
        for row in mapping:
            p = sum((self.vertices[int(row[i])] * float(row[i+3]) for i in range(3)), Vector())
            p += Vector(float(row[i+6]) * scales[i] for i in range(3))
            point=self.local(p);point.z+=.0025
            fitted.append(point)
        obj = make_mesh(self.identity + '_eyeballs', fitted, [face for face in sum(EYE_GROUPS.values(), []) if not all(EYE_UV[uv][0]>.82 and EYE_UV[uv][1]<.18 for _,uv in face)], [(cx+(u-cx)*1.10,cy+(v-cy)*1.10) for u,v in EYE_UV for cx,cy in [((.28,.29) if u<.5 else (.71,.70))]], material, parent)
        for side in [-1, 1]:
            points = [v for v in fitted if v.x * side > 0]
            self.eye_positions.append(sum(points, Vector()) / len(points))
        return obj

    def hand(self, parent, side, material, rgba, high):
        name = 'l' if side > 0 else 'r'
        wrist = average_group(self.vertices, 'joint-' + name + '-hand')
        tip = average_group(self.vertices, 'joint-' + name + '-finger-3-4')
        index_tip = average_group(self.vertices, 'joint-' + name + '-finger-2-1')
        pinky = average_group(self.vertices, 'joint-' + name + '-finger-5-1')
        length = (tip - wrist).normalized()
        across = index_tip - pinky
        across = (across - length * across.dot(length)).normalized()
        normal = across.cross(length).normalized()
        source = Matrix((across, length, normal)).transposed()
        to_long = Vector((0, -1, .14)).normalized()
        to_across = Vector((-side, 0, 0))
        to_normal = to_across.cross(to_long).normalized()
        rotation = Matrix((to_across, to_long, to_normal)).transposed() @ source.transposed()
        neutral_wrist = average_group(BASE, 'joint-' + name + '-hand')
        neutral_tip = average_group(BASE, 'joint-' + name + '-finger-3-4')
        neutral_axis = (neutral_tip-neutral_wrist).normalized()
        fs = [f for f in GROUPS['body'] if all(BASE[i].x * side > 3.75 and (BASE[i]-neutral_wrist).dot(neutral_axis)>-.20 for i, _ in f)]
        ids = sorted(set(i for f in fs for i, _ in f)); index = {v:i for i,v in enumerate(ids)}
        coords = [rotation @ (self.vertices[i]-wrist) * .096 + Vector((0,-.273,.004)) for i in ids]
        obj = make_mesh(self.identity + ('_leftHand' if side<0 else '_rightHand'), coords, [[(index[i],uv) for i,uv in f] for f in fs], UV, material, parent)
        attr = obj.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
        for item in attr.data: item.color = rgba
        obj.shape_key_add(name='Basis')
        grasp=obj.shape_key_add(name='grasp')
        for point,co in zip(grasp.data,coords):
            weight=max(0,min(1,(-co.y-.318)/.104))
            angle=weight*.95
            dy=co.y+.318
            point.co.y=-.318+dy*math.cos(angle)
            point.co.z=co.z-dy*math.sin(angle)
        # Native hand topology already models every finger and nail bed.
        # Keep it for both LODs; extra tessellation here does not improve silhouette.
        return obj

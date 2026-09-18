"""Authored willow, flowering branches and garden perennials for the sunwen study.

These are editable interpretations of plant habits, not botanical source scans.
All leaf and petal surfaces are real geometry; no painted billboard prototypes.
"""
import math
import random

import bpy
from mathutils import Vector

import build_modules as core
from focal_botany import blade


def linear(color):
    values = [int(color[i:i+2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values) + (1,)


def materials():
    colors = {
        'sunwen_bark': '#a39a7b', 'sunwen_twig': '#929a66',
        'sunwen_leaf': '#64a58c', 'sunwen_leaf_light': '#a8c987', 'sunwen_leaf_dark': '#397f7b',
        'sunwen_pink': '#ce648b', 'sunwen_pink_light': '#f1adc1', 'sunwen_white': '#f7ecd9',
        'sunwen_petal_shadow': '#d5c8a6', 'sunwen_gold': '#d9ba61',
        'sunwen_red': '#b97860', 'sunwen_red_light': '#d9a978', 'sunwen_iris': '#8493bf',
        'sunwen_lotus': '#e187ad', 'sunwen_lotus_leaf': '#5c9c88',
    }
    result = {}
    for name, color in colors.items():
        m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        m.use_nodes = True
        bs = m.node_tree.nodes.get('Principled BSDF')
        bs.inputs['Base Color'].default_value = linear(color)
        bs.inputs['Roughness'].default_value = .83
        m.diffuse_color = linear(color)
        m.use_backface_culling = False
        m['sunwenBotany'] = 'r17'
        result[name] = m
    return result


def branch(b, points, radius, role='sunwen_bark'):
    for i, (a, c) in enumerate(zip(points, points[1:])):
        taper = 1 - i / len(points) * .85
        b.rod(role, a, c, radius * taper, 7, r2=max(.002, radius * (taper - .85 / len(points))))


def blossom(b, point, radius, role, rng, petals=5):
    p = Vector(point)
    normal = Vector((rng.uniform(-.6, .6), rng.uniform(-.6, .6), rng.uniform(.35, 1))).normalized()
    u = normal.cross(Vector((0, 1, 0))).normalized()
    v = normal.cross(u)
    for i in range(petals):
        angle = math.tau * i / petals
        d = u * math.cos(angle) + v * math.sin(angle)
        cross = normal.cross(d)
        mid = p + d * radius * .53 + normal * radius * .18
        verts = [tuple(p), tuple(mid - cross * radius * .33), tuple(p + d * radius + normal * radius * .06), tuple(mid + cross * radius * .33), tuple(mid + normal * radius * .13)]
        b.mesh(role, verts, [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)])
    b.ellipsoid('sunwen_gold', tuple(p + normal * radius * .08), (radius * .12,) * 3, rings=2, n=5)


def willow(b, rng):
    leader = [Vector(p) for p in [(0, 0, 0), (.13, .05, 1.1), (-.13, .1, 2.25), (.06, .02, 3.1), (.1, .12, 4.0)]]
    branch(b, leader, .15)
    for arm in range(13):
        a = arm * 2.399 + rng.uniform(-.18, .18)
        reach = rng.uniform(1.1, 2.05)
        start = leader[2].lerp(leader[3], rng.random())
        tip = Vector((math.cos(a) * reach, math.sin(a) * reach, rng.uniform(3.15, 4.25)))
        middle = start.lerp(tip, .55) + Vector((0, 0, .43))
        branch(b, [start, middle, tip], .045)
        for twig in range(11):
            origin = middle.lerp(tip, rng.uniform(.15, 1))
            heading = a + rng.uniform(-.8, .8)
            length = rng.uniform(1.2, 2.9)
            points = []
            for j in range(8):
                t = j / 7
                points.append(origin + Vector((math.cos(heading) * .37 * math.sin(t * math.pi / 2), math.sin(heading) * .37 * math.sin(t * math.pi / 2), -length * t)))
            branch(b, points, .009, 'sunwen_twig')
            for j in range(18):
                t = (j + .4) / 18
                p = origin + Vector((math.cos(heading) * .37 * math.sin(t * math.pi / 2), math.sin(heading) * .37 * math.sin(t * math.pi / 2), -length * t))
                a2 = heading + (-1 if j % 2 else 1) * rng.uniform(.55, 1.2)
                role = ['sunwen_leaf', 'sunwen_leaf_light', 'sunwen_leaf_dark'][(j + arm) % 3]
                blade(b, p, (math.cos(a2), math.sin(a2), -.5), rng.uniform(.18, .30), .032, role, droop=.32, segments=2)


def flowering(b, rng, white=False, maple=False):
    leader = [Vector(p) for p in [(0, 0, 0), (.18, -.08, 1.3), (-.18, .08, 2.4), (.08, .2, 3.45), (-.2, .25, 4.15)]]
    branch(b, leader, .16)
    for arm in range(12):
        a = arm * 2.399 + rng.uniform(-.3, .3)
        start = leader[1 + arm % 3]
        reach = rng.uniform(1.2, 2.0) * (1 if arm % 3 < 2 else .7)
        tip = start + Vector((math.cos(a) * reach, math.sin(a) * reach, rng.uniform(.45, .95)))
        bend = start.lerp(tip, .55) + Vector((0, 0, .22))
        branch(b, [start, bend, tip], .05)
        for twig in range(10):
            origin = bend.lerp(tip, rng.random())
            a2 = a + rng.uniform(-1.2, 1.2)
            end = origin + Vector((math.cos(a2) * rng.uniform(.25, .65), math.sin(a2) * rng.uniform(.25, .65), rng.uniform(-.15, .55)))
            branch(b, [origin, end], .008)
            for j in range(9 if maple else 7):
                p = origin.lerp(end, rng.uniform(.15, 1)) + Vector((rng.uniform(-.11, .11), rng.uniform(-.11, .11), rng.uniform(-.08, .12)))
                if maple:
                    role = 'sunwen_red' if j % 3 else 'sunwen_red_light'
                    for lobe in range(5):
                        aa = a2 + (lobe - 2) * .52
                        blade(b, p, (math.cos(aa), math.sin(aa), .25), .20 * (1 - abs(lobe - 2) * .13), .046, role, segments=2)
                else:
                    role = ('sunwen_white' if j % 4 else 'sunwen_petal_shadow') if white else ('sunwen_pink' if j % 3 else 'sunwen_pink_light')
                    blossom(b, p, rng.uniform(.13, .19), role, rng)
                    if j % 3 == 0:
                        blade(b, p, (math.cos(a2), math.sin(a2), .2), .2, .065, 'sunwen_leaf', segments=2)


def perennial(b, rng, kind):
    if kind == 'lotus':
        for n in range(5):
            a = n * 2.399
            x, y = math.cos(a) * .55, math.sin(a) * .55
            z = rng.uniform(.06, .18)
            b.rod('sunwen_leaf', (x, y, -.2), (x, y, z), .013, 5)
            vertices = [(x, y, z + .05)]
            radius = rng.uniform(.34, .52)
            for j in range(17):
                aa = j * math.tau / 18 + .12
                vertices.append((x + math.cos(aa) * radius, y + math.sin(aa) * radius, z + .025 * math.sin(aa * 4)))
            b.mesh('sunwen_lotus_leaf', vertices, [(0, j, j + 1) for j in range(1, 17)])
        b.rod('sunwen_leaf', (.16, .06, -.2), (.16, .06, .66), .016, 6)
        for layer in range(3):
            blossom(b, (.16, .06, .64 + layer * .07), .24 - layer * .035, 'sunwen_lotus' if layer < 2 else 'sunwen_pink_light', rng, petals=8)
    else:
        for i in range(18):
            a = i * 2.399
            blade(b, (math.cos(a) * .15, math.sin(a) * .15, 0), (math.cos(a), math.sin(a), 1.8 if kind == 'iris' else .4), rng.uniform(.4, .8), .04 if kind == 'iris' else .12, 'sunwen_leaf' if i % 3 else 'sunwen_leaf_light', droop=.15, segments=3)
        for i in range(4):
            a = i * 2.399
            p = (math.cos(a) * .26, math.sin(a) * .26, rng.uniform(.5, .8))
            b.rod('sunwen_leaf_dark', (p[0], p[1], 0), p, .011, 5)
            role={'iris':'sunwen_iris','orchid':'sunwen_white','chrysanthemum':'sunwen_gold'}.get(kind,'sunwen_pink')
            blossom(b, p, .17 if kind == 'iris' else .24, role, rng, petals=6 if kind in ['iris','orchid'] else 12)
            if kind in ['peony','chrysanthemum']:
                blossom(b, (p[0],p[1],p[2]+.045), .15, 'sunwen_pink_light' if kind=='peony' else 'sunwen_gold', rng, petals=9)


def leafy(b, rng, kind):
    """Open trunks with tiered, individually modeled leaves, rather than spheres."""
    branch(b, [(0,0,0),(.16,-.05,1.3),(-.13,.12,2.5),(.12,.2,3.8)], .15)
    pine = kind == 'chinese-pine'
    for arm in range(11):
        angle = arm * 2.399
        z = 1.65 + (arm % 4) * .51
        reach = rng.uniform(1.05, 1.95) * (1.1 if pine else 1)
        tip = Vector((math.cos(angle)*reach, math.sin(angle)*reach, z+.35))
        start = Vector((.05,.05,z))
        branch(b, [start, start.lerp(tip,.55)+Vector((0,0,.16)), tip], .045)
        for twig in range(8):
            a = angle + rng.uniform(-1.4,1.4)
            p = start.lerp(tip,rng.uniform(.55,1))
            end = p + Vector((math.cos(a)*.58,math.sin(a)*.58,rng.uniform(.08,.35)))
            branch(b,[p,end],.01)
            for leaf in range(15):
                t = rng.random()
                origin = p.lerp(end,t) + Vector((rng.uniform(-.23,.23),rng.uniform(-.23,.23),rng.uniform(-.06,.18)))
                aa = a + leaf * 2.399
                role = ('sunwen_gold' if leaf % 4 else 'sunwen_leaf_light') if kind == 'ginkgo' else ['sunwen_leaf','sunwen_leaf_light','sunwen_leaf_dark'][(leaf+arm)%3]
                if pine:
                    # Radiating flat sprays read as the horizontal pine tiers in SW051/SW052.
                    for n in range(3):
                        aa2=aa+(n-1)*.65
                        blade(b,origin,(math.cos(aa2),math.sin(aa2),.22),.24,.038,'sunwen_leaf_dark' if n==1 else 'sunwen_leaf',segments=2)
                else:
                    blade(b,origin,(math.cos(aa),math.sin(aa),.25),rng.uniform(.36,.52),.20 if kind=='ginkgo' else .16,role,segments=2)


def prototype(name, collection):
    original = core.M
    core.M = materials()
    b = core.Batch('Sunwen_' + name, collection)
    rng = random.Random(170917 + sum(map(ord, name)))
    if name == 'willow': willow(b, rng)
    elif name in ['crabapple', 'white-blossom', 'red-maple']:
        flowering(b, rng, white=name == 'white-blossom', maple=name == 'red-maple')
    elif name in ['scholar-tree','ginkgo','chinese-pine','shrub']: leafy(b,rng,name)
    else: perennial(b, rng, name)
    try: objects = b.finish()
    finally: core.M = original
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects: ob.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    ob = objects[0]
    ob.name = 'Sunwen_' + name
    if name in ['willow', 'crabapple', 'white-blossom', 'red-maple','scholar-tree','ginkgo','chinese-pine','shrub']:
        maximum = max(max(v.co.x for v in ob.data.vertices) - min(v.co.x for v in ob.data.vertices), max(v.co.y for v in ob.data.vertices) - min(v.co.y for v in ob.data.vertices), max(v.co.z for v in ob.data.vertices))
        for v in ob.data.vertices: v.co *= 5.1 / maximum
        if name == 'shrub':
            for v in ob.data.vertices: v.co.z *= .46
    ob['sunwenPrototype'] = name
    ob['sourceAsset'] = 'authored_sunwen_' + name
    return ob

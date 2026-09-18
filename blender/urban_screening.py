"""Managed wall planting, in native XY; no changes to the garden's older plants."""
import math
import random


def screen_plan(cfg):
    rng = random.Random(cfg['screening']['seed'])
    points = []
    # Narrow, staggered drifts follow the enclosure. The centre of the garden
    # stays open; this is not an outer forest or an evenly spaced street row.
    for side in ['west', 'east', 'north', 'south']:
        t = -126.
        while t < 136:
            if side == 'south' and abs(t) < 35:
                t = 36.; continue
            depth = rng.uniform(138.3, 141.5)
            x, y = (-depth, t) if side == 'west' else (depth, t) if side == 'east' else (t, depth) if side == 'north' else (t, -131.2+rng.uniform(-1, 1))
            points.append(dict(x=x, y=y, side=side, species=rng.choices([0, 1, 6], [8, 1, 1])[0],
                               scale=rng.uniform(2.35, 2.92), angle=rng.random()*math.tau))
            t += rng.uniform(7.3, 11.4)
    return points


def add_screening(cfg, layout, models, living, add):
    import bpy
    import numpy as np
    from mathutils import Vector
    from sunwen_architecture import ground_tree
    from pathlib import Path
    import json
    import sys
    root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(root/'scripts'))
    from garden_ground_fields import fields
    design = json.loads((root/'config/garden.grounding.json').read_text())
    landscape = json.loads((root/'config/sunwen.landscape.json').read_text())
    ground = json.loads((root/'assets/processed/grounding-r21/plan.json').read_text())
    for ob in list(living.objects):
        if ob.get('urbanBoundaryPlant'):
            bpy.data.objects.remove(ob, do_unlink=True)
    terrain = ground_tree()
    species = json.loads((root/'config/garden.sunwen.json').read_text())['planting']['species']
    full = {ob['sunwenPrototype']: ob for ob in bpy.data.collections['Sunwen_Prototypes'].objects}
    existing = [ob.location.copy() for ob in living.objects if not ob.hide_render]
    roots = []
    for i, p in enumerate(screen_plan(cfg)):
        x, y = p['x'], p['y']
        f = fields(np.array([x]), np.array([y]), layout, landscape, design, ground)
        # Keep roads, water and existing trunks clear. Never plant through a court.
        if f['water'][0] or f['pebble'][0] > .05 or f['court'][0] > .05:
            continue
        if any(math.hypot(x-v.x, y-v.y) < 4.0 for v in existing):
            continue
        hit = terrain.ray_cast(Vector((x, y, 100)), Vector((0, 0, -1)), 200)[0]
        if hit is None: raise ValueError('Wall planting has no ground')
        kind = p['species']; ob = full[species[kind]].copy(); living.objects.link(ob)
        ob.name = f'LivingTree_Boundary_{i:03}_{species[kind]}'
        ob.hide_render = False; ob.hide_set(False)
        ob.location = (x, y, hit.z+.02)
        ob.scale = (p['scale']*.88, p['scale']*.88, p['scale'])
        ob.rotation_euler.z = p['angle']
        ob['urbanBoundaryPlant'] = True; ob['sunwenSpecies'] = kind
        ob['nativeGeometry'] = 'authored-sunwen-crown'; ob['plantingLayer'] = 'canopy'
        add('screen-bed', x, y, z=hit.z, angle=p['angle'], scale=(1.05, .9, 1), district='garden-screen')
        # Groups of bamboo and rockery interrupt the long straight wall at
        # selected bays, rather than making another continuous hard barrier.
        if i % 3 == 0:
            dx, dy = (-1.8 if x > 130 else 1.8 if x < -130 else 0), (-1.8 if y > 130 else 1.8 if y < -125 else 0)
            add('bamboo-screen', x+dx, y+dy, z=hit.z, angle=p['angle'], scale=(.9, .9, 1+(i%4)*.08), district='garden-screen')
        if i % 6 == 2:
            add('screen-rock', x, y, z=hit.z, angle=p['angle'], scale=(.95, .8, .8+(i%3)*.12), district='garden-screen')
        roots.append(dict(name=ob.name, position=list(ob.location), side=p['side'], species=kind))
        existing.append(ob.location.copy())
    # Short covered wall walks sit behind the planted fringe, clear of the
    # existing named buildings. They are scenery, not new navigation routes.
    galleries = [(-144.4,-66,22,math.pi/2),(-144.4,35,27,math.pi/2),
                 (144.4,-63,25,math.pi/2),(144.4,70,21,math.pi/2),
                 (-62,144.4,29,0),(83,144.4,24,0)]
    for x, y, width, angle in galleries:
        hit = terrain.ray_cast(Vector((x,y,100)), Vector((0,0,-1)), 200)[0]
        if hit is None: raise ValueError('Wall gallery has no ground')
        add('gallery',x,y,z=hit.z,angle=angle,scale=(width/22,.82,.94),district='garden-screen')
    return roots

"""Shared scalar planting fields in native XY; no inferred literary geography."""
import math
import numpy as np


def distance(x, y, a, b):
    dx, dy = b[0]-a[0], b[1]-a[1]
    t = np.clip(((x-a[0])*dx+(y-a[1])*dy)/max(.001, dx*dx+dy*dy), 0, 1)
    return np.hypot(x-a[0]-t*dx, y-a[1]-t*dy)


def polygon(x, y, ring):
    result = np.zeros(x.shape, dtype=bool)
    for a, b in zip(ring, ring[1:]+ring[:1]):
        if abs(a[1]-b[1]) < 1e-8:
            continue
        result ^= ((a[1] > y) != (b[1] > y)) & (x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])
    return result


def root_plan(roots, layout, design):
    """Unequal root lobes and short links join neighbours without a planting grid."""
    result = []
    places = layout['places']
    for i, root in enumerate(roots):
        x, y, z = root['position']
        radius = design['rootRadius']['shrub' if root['species'] == 3 else 'tree']
        radius *= .90+.18*(.5+.5*math.sin(i*2.399))
        nearest = min(places, key=lambda p: math.hypot(x-p['position'][0], y-p['position'][1]))
        result.append({**root, 'radii': [radius, radius*(.76+.17*(.5+.5*math.cos(i*1.73)))],
                       'angle': i*2.399, 'placeId': nearest['id']})
    links = []
    for i, a in enumerate(result):
        nearest = sorted((math.dist(a['position'][:2], b['position'][:2]), j) for j, b in enumerate(result) if j != i)[:3]
        for dist, j in nearest:
            if i < j and dist < design['joinDistance']:
                links.append({'a': i, 'b': j, 'width': design['joinWidth']*(.83+.20*math.sin(i+j)**2)})
    return {'roots': result, 'links': links}


def fields(x, y, layout, landscape, design, plan):
    inside = (abs(x) < 147) & (y > -137) & (y < 147)
    lake = layout['terrain']['lake']
    water = polygon(x, y, lake['outline'])
    for hole in lake['holes']:
        water &= ~polygon(x, y, hole)
    nodes = {p['id']: p['position'] for p in layout['pathNodes']}
    road = np.full(x.shape, 999., dtype=np.float32)
    for e in layout['pathEdges']:
        if e['kind'] in ['path', 'stairs']:
            road = np.minimum(road, distance(x, y, nodes[e['from']], nodes[e['to']]))
    pebble = np.clip((design['pathHalfWidth']+design['pathEdgeBlend']-road)/design['pathEdgeBlend'], 0, 1)*inside
    court = np.zeros(x.shape, dtype=np.float32)
    for p in layout['places']:
        px, py, _ = p['position']
        w, d = (35, 47) if p['id'] == 'daguanlou' else (16.6, 14.6) if p['featured'] else (10.5, 11.5)
        cy = py+19 if p['id'] == 'daguanlou' else py
        edge = np.maximum(abs(x-px)-w, abs(y-cy)-d)
        court = np.maximum(court, np.clip(-edge/.7, 0, 1))
    approach_width = np.where((y > -123) & (y < -99), 16., 10.5)
    court = np.maximum(court, np.clip((approach_width-abs(x))/.6, 0, 1)*((y > -139) & (y < -35)))
    beds = np.zeros_like(court)
    court_beds = np.zeros_like(court)
    for b in landscape['beds']:
        xx, yy = x-b['center'][0], y-b['center'][1]
        a = b['angle']; rx, ry = b['radii']
        u, v = (xx*np.cos(a)+yy*np.sin(a))/rx, (-xx*np.sin(a)+yy*np.cos(a))/ry
        radius = np.maximum(abs(u), abs(v)) if b['kind'] == 'plot' else np.hypot(u, v)
        edge = .96+.045*np.sin(xx*.67+yy*.32)+.035*np.cos(yy*.87-xx*.49)
        f = np.clip((edge-radius)/.19, 0, 1)
        beds = np.maximum(beds, f)
        if b['kind'] == 'court':
            court_beds = np.maximum(court_beds, f)
    root = np.zeros_like(court)
    for r in plan['roots']+plan.get('focalRoots',[]):
        xx, yy = x-r['position'][0], y-r['position'][1]; a = r['angle']; rx, ry = r['radii']
        radius = np.hypot((xx*np.cos(a)+yy*np.sin(a))/rx, (-xx*np.sin(a)+yy*np.cos(a))/ry)
        edge = 1+.09*np.sin(xx*1.2+yy*.6)+.055*np.sin(yy*1.4-xx*.7)
        root = np.maximum(root, np.clip((edge-radius)/.36, 0, 1))
    for link in plan['links']:
        a, b = (plan['roots'][link[k]]['position'] for k in ['a', 'b'])
        d = distance(x, y, a, b)
        root = np.maximum(root, np.clip((link['width']+.8-d)/1.1, 0, 1))
    # Two retained courtyard trunks sit at the edge of a stone walk. A small
    # planted tree opening fits around their existing feet without reaching the
    # route centreline; the architecture-batched trees themselves stay intact.
    for r in plan.get('focalRoots',[]):
        pit=np.clip((.88-np.hypot(x-r['position'][0],y-r['position'][1]))/.22,0,1)
        pebble*=1-pit
    # The wall crowns share a narrow, undulating mixed border instead of tree rings.
    wall = np.minimum(abs(abs(x)-141), abs(y-141))
    ribbon = np.clip((3.7+.65*np.sin((x+y)*.09)-wall)/1.6, 0, 1)
    ribbon *= ((y > -124) & (abs(x) < 145) & (y < 145))
    root = np.maximum(root, ribbon*.85)
    shore_distance = np.full(x.shape, 999., dtype=np.float32)
    for ring in [lake['outline']]+lake['holes']:
        for a, b in zip(ring, ring[1:]+ring[:1]):
            shore_distance = np.minimum(shore_distance, distance(x, y, a, b))
    wet = np.clip((design['shoreWidth']-shore_distance)/design['shoreWidth'], 0, 1)
    planted = np.maximum(beds, root)*(1-pebble)
    hard = court*(1-planted)
    soft = (1-hard)*(1-pebble)*inside
    support = np.maximum(root, court_beds)*(1-pebble)*inside*(~water)
    return dict(inside=inside, water=water, road=road, pebble=pebble, court=hard,
                beds=beds, root=root, soft=soft, support=support, wet=wet, shoreDistance=shore_distance)


def pigments(x, y, f, landscape, design):
    def rgb(key, palette):
        return np.array([int(palette[key][i:i+2], 16) for i in (1, 3, 5)], dtype=np.float32)
    p = design['palette']
    # Unequal, overlapping 2–20 m tones: herb cushions, grey moss, moist leaf edges.
    drift = np.clip(.5+.23*np.sin(x*.083+np.sin(y*.12)*1.8)+.18*np.sin(y*.13-x*.029)+.12*np.sin(x*.36+y*.27), 0, 1)
    fine = .5+.25*np.sin(x*.78+np.sin(y*.93))+.20*np.sin(y*1.07-x*.36)
    color = rgb('lightHerb', p)*(1-drift[..., None])+rgb('greyHerb', p)*drift[..., None]
    moss = np.clip(f['root']*.48+f['beds']*.24+(.55-drift)*.7, 0, .7)
    color = color*(1-moss[..., None])+rgb('moss', p)*moss[..., None]
    leaf = f['root']*.13*np.clip(fine, 0, 1)
    color = color*(1-leaf[..., None])+rgb('dampLeaf', p)*leaf[..., None]
    color *= (.965+fine[..., None]*.07)
    soft_color = color.copy()
    color = color*(1-f['court'][..., None])+rgb('court', landscape['ground'])*f['court'][..., None]
    color = color*(1-f['pebble'][..., None])+rgb('gravel', landscape['ground'])*f['pebble'][..., None]
    shore = f['wet']*.34*(1-f['pebble'])*(1-f['court'])
    color = color*(1-shore[..., None])+rgb('shore', p)*shore[..., None]
    color = np.where(f['inside'][..., None], color, rgb('gravel', landscape['ground']))
    return color, soft_color

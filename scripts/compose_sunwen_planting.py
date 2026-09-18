"""Compose layered, tended garden groves using existing grounded plant positions.

Architecture, reviewed circulation and water stay fixed. New bed outlines are
landscape design interpretations of Sun Wen, not evidence from the novel.
"""
import hashlib
import json
import math
import random
from pathlib import Path

R = Path(__file__).resolve().parents[1]
source_path = R / 'assets/processed/planting-r17/source.json'
source = json.loads(source_path.read_text())
layout = json.loads((R / 'config/garden.layout.json').read_text())
spec = json.loads((R / 'config/garden.sunwen.json').read_text())
cfg = spec['planting']
rng = random.Random(cfg['seed'])
places = {p['id']: p for p in layout['places']}
nodes = {p['id']: p['position'] for p in layout['pathNodes']}
routes = [(nodes[e['from']], nodes[e['to']]) for e in layout['pathEdges'] if e['kind'] != 'connection']
rings = [layout['terrain']['lake']['outline']] + layout['terrain']['lake']['holes']
shores = [(a, b) for ring in rings for a, b in zip(ring, ring[1:] + ring[:1])]


def distance(x, y, a, b):
    dx, dy = b[0]-a[0], b[1]-a[1]
    t = max(0, min(1, ((x-a[0])*dx+(y-a[1])*dy)/max(.001, dx*dx+dy*dy)))
    return math.hypot(x-a[0]-t*dx, y-a[1]-t*dy)


def clear_view(x, y):
    if abs(x) < 21 and -162 < y < 0:
        return False
    for p in layout['places']:
        px, py, _ = p['position']
        if abs(x-px) < 10 and -24 < y-py < -12:
            return False
    return min(distance(x, y, a, b) for a, b in routes) > 3.4


def nearest_place(x, y):
    return min(layout['places'], key=lambda p: math.hypot(x-p['position'][0], y-p['position'][1]))


def ellipse(bed, x, y):
    dx, dy = x-bed['center'][0], y-bed['center'][1]
    a = bed['angle']
    return math.hypot((dx*math.cos(a)+dy*math.sin(a))/bed['radii'][0], (-dx*math.sin(a)+dy*math.cos(a))/bed['radii'][1])


# Separate groves with overlapping crowns at different heights.
candidates = [p for p in source['vegetation'] if p['species'] != 3 and abs(p['position'][0]) < 139 and -139 < p['position'][2] < 130 and clear_view(p['position'][0], -p['position'][2])]
rng.shuffle(candidates)
beds = []
for row in candidates:
    x, _, z = row['position']; y = -z
    if any(math.hypot(x-b['center'][0], y-b['center'][1]) < 22 for b in beds):
        continue
    p = nearest_place(x, y)
    style = spec['places'][p['id']]
    beds.append({'id': f'grove-{len(beds):02}', 'placeId': p['id'], 'profile': style, 'kind': 'grove', 'center': [x, y], 'radii': [round(rng.uniform(12, 17), 2), round(rng.uniform(8, 12), 2)], 'angle': round(rng.random()*math.pi, 3)})
    if len(beds) == 64:
        break

trees = []
for bed in beds:
    local = [p for p in candidates if ellipse(bed, p['position'][0], -p['position'][2]) < .87]
    rng.shuffle(local)
    group = []
    for p in local:
        x, h, z = p['position']; y = -z
        if any(math.hypot(x-t['position'][0], z-t['position'][2]) < 4.4 for t in trees):
            continue
        style = bed['profile']
        weights = {'crimson': [16, 3, 3, 0, 6, 52, 17, 3], 'bamboo': [50, 2, 8, 0, 28, 3, 9, 0], 'herbal': [49, 3, 22, 0, 12, 0, 14, 0], 'rustic': [31, 13, 5, 0, 6, 30, 15, 0], 'waterside': [18, 3, 4, 0, 52, 13, 10, 0]}.get(style, [33, 10, 10, 0, 12, 19, 12, 4])
        species = rng.choices(range(8), weights)[0]
        if min(distance(x, y, a, b) for a, b in shores) < 7:
            species = 4
        scale = rng.uniform(1.30, 1.92) * (1 if len(group) < 3 else .78)
        trees.append({'position': [x, h, z], 'scale': [round(scale, 4), round(scale*rng.uniform(.91, 1.08), 4), round(scale, 4)], 'rotation': p['rotation'], 'species': species})
        group.append(p)
        if len(group) >= (5 if style in ['herbal', 'bamboo'] else 7):
            break
    # Broad lower leaves connect tall crowns to planted beds.
    shrubs = 0
    for p in local[:35]:
        x, h, z = p['position']
        if ellipse(bed, x, -z) < .3 or any(math.hypot(x-t['position'][0], z-t['position'][2]) < 2 for t in trees):
            continue
        scale = rng.uniform(.45, .69)
        trees.append({'position': [x, h, z], 'scale': [scale, scale*.84, scale], 'rotation': p['rotation'], 'species': 3})
        shrubs += 1
        if shrubs == 5: break

# Framing at the perimeter, with deliberate gaps.
outer = [p for p in source['vegetation'] if p['species'] != 3 and 148 < abs(p['position'][0]) < 164 and -128 < p['position'][2] < 120]
rng.shuffle(outer)
for p in outer:
    if any(math.hypot(p['position'][0]-t['position'][0], p['position'][2]-t['position'][2]) < 15 for t in trees):
        continue
    scale = rng.uniform(1.35, 1.75)
    trees.append({**p, 'species': rng.choice([0, 2, 6]), 'scale': [scale]*3})
    if sum(abs(t['position'][0]) > 147 for t in trees) >= 22: break

court_spec = json.loads((R/'config/garden.planting.json').read_text())
for pid, regions in court_spec['courts'].items():
    px, py, _ = places[pid]['position']
    for i, (x, y, rx, ry, angle) in enumerate(regions):
        beds.append({'id': f'{pid}-bed-{i}', 'placeId': pid, 'profile': spec['places'][pid], 'kind': 'court', 'center': [px+x, py+y], 'radii': [rx, ry], 'angle': angle})

# Tended farm plots, rather than an expanse of rough field.
for i, (x, y, rx, ry) in enumerate([(-122,-12,3.4,6),(-88,-9,3.6,5),(-120,12,3.5,4.5)]):
    beds.append({'id': f'farm-plot-{i}', 'placeId': 'daoxiangcun', 'profile': 'rustic', 'kind': 'plot', 'center': [x,y], 'radii': [rx,ry], 'angle': 0})


def spread(rows, spacing, limit):
    selected = []
    for row in rows:
        x, _, z = row['position']
        if abs(x)>142 or not -142 < z < 132 or not clear_view(x, -z): continue
        if not any(ellipse(b, x, -z) < 1.0 for b in beds): continue
        if any(math.hypot(x-p['position'][0], z-p['position'][2]) < spacing for p in selected): continue
        selected.append(row)
        if len(selected) == limit: break
    return selected


ground = spread(source['groundCover'], 2.3, cfg['groundCoverLimit'])
under = spread(source['understory'], 1.0, cfg['understoryLimit'])
if (R/'config/garden.urban.json').exists():
    trees = [t for t in trees if abs(t['position'][0])<=147 and -147<=t['position'][2]<=137]
record = {'revision': spec['assetRevision'], 'source': str(source_path.relative_to(R)), 'sourceSha256': hashlib.sha256(source_path.read_bytes()).hexdigest(), 'method': __doc__, 'vegetation': trees, 'groundCover': ground, 'understory': under, 'beforeCounts': {k:len(source[k]) for k in ['vegetation','groundCover','understory']}, 'afterCounts': {'vegetation':len(trees),'groundCover':len(ground),'understory':len(under)}}
(R/'config/sunwen.planting.json').write_text(json.dumps(record, ensure_ascii=False, indent=2)+'\n')
(R/'config/sunwen.landscape.json').write_text(json.dumps({'revision': spec['assetRevision'], 'meaning':'孙温画意及用户指定的贵族园林构图转译；非原著植物考据。', 'beds': beds, 'ground': spec['landscape']['ground']}, ensure_ascii=False, indent=2)+'\n')
print('TENDED GARDEN', record['afterCounts'], 'beds', len(beds))

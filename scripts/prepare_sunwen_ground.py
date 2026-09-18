"""World-registered pigments for soft garden ground, courts, paths and actual roots."""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image
from garden_ground_fields import fields, pigments, root_plan

R = Path(__file__).resolve().parents[1]
read = lambda path: json.loads((R/path).read_text())
sha = lambda path: hashlib.sha256((R/path).read_bytes()).hexdigest()
landscape = read('config/sunwen.landscape.json')
layout = read('config/garden.layout.json')
design = read('config/garden.grounding.json')
source = read('assets/processed/grounding-r21/source.json')
plan = root_plan(source['roots'], layout, design)
plan['focalRoots'] = source.get('focalRoots',[])
plan['revision'] = design['revision']
plan['sourceRootsSha256'] = hashlib.sha256(json.dumps(source['roots'], sort_keys=True).encode()).hexdigest()
plan['designSha256'] = sha('config/garden.grounding.json')
(R/'assets/processed/grounding-r21/plan.json').write_text(json.dumps(plan, ensure_ascii=False, indent=2)+'\n')

n = 2048; span = 768
axis = (np.arange(n, dtype=np.float32)+.5)/n*span-span/2
ix = np.where(abs(axis) < 151)[0]; iy = np.where(abs(-axis) < 151)[0]
patch = (slice(iy[0], iy[-1]+1), slice(ix[0], ix[-1]+1))
x, y = np.meshgrid(axis[ix], -axis[iy])
f = fields(x, y, layout, landscape, design, plan)
color, _ = pigments(x, y, f, landscape, design)
albedo = np.empty((n, n, 3), dtype=np.uint8); albedo[:] = [175, 190, 178]
albedo[patch] = np.clip(color, 0, 255).astype(np.uint8)
zones = np.zeros((n, n, 3), dtype=np.uint8)
zones[patch] = np.clip(np.stack([f['soft'], f['court']*(1-f['pebble']), f['pebble']], axis=-1)*255, 0, 255).astype(np.uint8)
folder = R/'public/textures/ground'; folder.mkdir(exist_ok=True)
files = []
for name, data in [('garden-ground.webp', albedo), ('garden-ground-zones.png', zones)]:
    p = folder/name; im = Image.fromarray(data)
    if p.suffix == '.webp': im.save(p, quality=93, method=6)
    else: im.save(p, optimize=True)
    files.append({'file': str(p.relative_to(R)), 'sha256': sha(p.relative_to(R))})
dry = f['inside'] & ~f['water']
roots = np.array([r['position'][:2] for r in plan['roots']], dtype=np.float32)
root_fields = fields(roots[:, 0], roots[:, 1], layout, landscape, design, plan)
focal = np.array([r['position'][:2] for r in plan['focalRoots']],dtype=np.float32)
focal_soft = fields(focal[:,0],focal[:,1],layout,landscape,design,plan)['soft'] if len(focal) else np.array([])
metrics = {
    'dryLandSoftFraction': float(np.mean(f['soft'][dry] > .5)),
    'dryLandHardFraction': float(np.mean((f['court']+f['pebble'])[dry] > .5)),
    'rootCount': len(roots), 'linkedPairs': len(plan['links']),
    'builtInCourtRoots': len(plan['focalRoots']),
    'builtInCourtRootsOnSoftGround': int(np.count_nonzero(focal_soft>.7)),
    'rootsOnSoftGround': int(np.count_nonzero(root_fields['soft'] > .7)),
    'rootMinimumSoftCoverage': float(np.min(root_fields['soft'])),
    'softGroundPigmentStdDev': [float(v) for v in color[dry & (f['soft'] > .8)].std(axis=0)],
}
meta = {'origin': __doc__, 'revision': layout['assetRevision'], 'source': 'config/sunwen.landscape.json',
        'sourceSha256': sha('config/sunwen.landscape.json'), 'designSha256': plan['designSha256'],
        'rootPlanSha256': sha('assets/processed/grounding-r21/plan.json'), 'resolution': n, 'worldSpan': span,
        'channels': {'R': 'Soft herb/moss ground including connected root beds', 'G': 'Stone courts', 'B': 'Pebble paths'},
        'files': files, 'insidePlantedFraction': float(np.mean(f['soft'][f['inside']] > .5)), 'metrics': metrics}
for row in files:
    p = R/row['file']
    p.with_suffix(p.suffix+'.json').write_text(json.dumps({**meta, 'sha256': row['sha256'], 'prompt': 'Deterministic scalar pigment fields from native roots and authored spatial coordinates; no image generator.'}, ensure_ascii=False, indent=2)+'\n')
print('GARDEN GROUND', json.dumps(metrics), flush=True)

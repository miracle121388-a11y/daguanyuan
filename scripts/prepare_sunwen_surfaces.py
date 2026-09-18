"""Derive restrained pigment surfaces from the reviewed local craft grain.

Paintings remain reference-only. No sunwen image is sampled into a runtime map.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]


def main():
    spec = json.loads((ROOT / 'config/garden.sunwen.json').read_text())
    craft = json.loads((ROOT / 'config/craft.materials.json').read_text())
    out = ROOT / f'assets/processed/sunwen-{spec["revision"]}'
    out.mkdir(parents=True, exist_ok=True)
    records = []
    for profile, settings in spec['profiles'].items():
        colors = {**spec['defaults'], **settings['colors']}
        for role, pigment in colors.items():
            source = ROOT / f'assets/processed/materials-{craft["revision"]}/{role}_diff.png'
            if role.startswith('botanical_'):
                source = ROOT / f'assets/processed/focal-r12-fix2/{role.removeprefix("botanical_")}.png'
            # Grain is a small physical modulation, never the old cyan hue.
            if source.exists():
                gray = Image.open(source).convert('L').resize((256, 256))
                a = np.asarray(gray, dtype=float) / 255
                strength = .18 if 'tile' in role or 'roof' in role else .12
                if role.startswith('botanical_'): strength = .15
                if role in ['plaster', 'qing_clay']: strength = .075
                grain = np.clip((a - a.mean()) / max(.04, a.std()), -2, 2) * strength
                source_record = {'file': source.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()}
            else:
                rng = np.random.default_rng(170917)
                a = rng.normal(128, 28, (256, 256)).clip(0, 255).astype('uint8')
                grain = (np.asarray(Image.fromarray(a).filter(ImageFilter.GaussianBlur(1.2)), dtype=float) / 255 - .5) * .12
                source_record = {'method': 'Authored pigment microvariation, deterministic seed 170917; no external image.'}
            rgb = np.array([int(pigment[i:i+2], 16) for i in [1, 3, 5]])
            pixels = np.clip(rgb[None, None, :] * (1 + grain[:, :, None]), 0, 255).astype('uint8')
            # Identical roles across profiles share pixels and runtime resources.
            path = out / f'{profile}-{role}.png'
            Image.fromarray(pixels).save(path, optimize=True)
            roughness = .84 if role in ['plaster', 'qing_clay', 'paper', 'screen'] else .69 if 'roof' in role or 'tile' in role else .51
            if role in ['cutstone', 'stone', 'paving', 'courtbase']: roughness = .88
            if role == 'gold': roughness = .48
            if role.startswith('botanical_'): roughness = .85
            records.append({'profile': profile, 'role': role, 'pigment': pigment, 'roughness': roughness, 'metallic': .25 if role == 'gold' else 0,
                            'file': path.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'source': source_record})
    (out / 'manifest.json').write_text(json.dumps({'revision': spec['revision'], 'method': __doc__, 'files': records}, ensure_ascii=False, indent=2) + '\n')
    print('ALBUM SURFACES', len(records), flush=True)


if __name__ == '__main__':
    main()

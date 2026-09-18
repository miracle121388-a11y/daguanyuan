"""Patch GLB materials without decoding or re-quantizing a single mesh vertex."""
import copy
import hashlib
import json
import os
import re
import struct
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def sha(data): return hashlib.sha256(data).hexdigest()


def geometry(doc, binary):
    # Material/image tables may change; topology, UVs, transforms and semantic
    # extras must remain exactly equal after resolving each node's mesh.
    nodes = []
    for n in doc['nodes']:
        node = copy.deepcopy(n)
        if 'mesh' in node:
            mesh = copy.deepcopy(doc['meshes'][node.pop('mesh')])
            for primitive in mesh['primitives']: primitive.pop('material', None)
            node['geometry'] = mesh
        nodes.append(node)
    return sha(binary + json.dumps([doc.get('accessors'), doc.get('bufferViews'), nodes], sort_keys=True).encode())


def main():
    spec = json.loads((ROOT / 'config/garden.sunwen.json').read_text())
    sources = json.loads((ROOT / 'assets/processed/sunwen-r17/manifest.json').read_text())
    lookup = {}
    shared = ROOT / 'public/textures/shared'
    for row in sources['files']:
        source = ROOT / row['file']
        if sha(source.read_bytes()) != row['sha256']: raise ValueError('Changed pigment surface ' + str(source))
        from io import BytesIO
        output = BytesIO()
        Image.open(source).save(output, format='JPEG', quality=85, subsampling=0, optimize=True)
        pixels = output.getvalue()
        target = shared / (sha(pixels) + '.jpg')
        target.write_bytes(pixels)
        target.with_suffix('.jpg.json').write_text(json.dumps({'sha256': sha(pixels), 'origin': 'Sunwen r17 authored pigment over reviewed local craft grain; paintings used for study only.', 'prompt': 'Deterministic material processing by scripts/prepare_sunwen_surfaces.py', 'source': row}, indent=2) + '\n')
        lookup[(row['profile'], row['role'])] = {**row, 'runtime': target}
    paths = [ROOT / 'public/models/overview.glb', ROOT / 'public/models/overview-low.glb']
    place_ids=[p['id'] for p in json.loads((ROOT/'config/garden.layout.json').read_text())['places']]
    paths += [ROOT/f'public/models/{variant}/{pid}.glb' for variant in ['places','places-low'] for pid in sorted(place_ids)]
    reports = []
    for path in paths:
        data = path.read_bytes()
        length = struct.unpack_from('<I', data, 12)[0]
        doc = json.loads(data[20:20+length])
        binary_chunks = data[20+length:]
        before = geometry(doc, binary_chunks)
        parents = {child: index for index, node in enumerate(doc['nodes']) for child in node.get('children', [])}
        def owner(index):
            node = doc['nodes'][index]
            return node.get('extras', {}).get('placeId') or (owner(parents[index]) if index in parents else None)
        material_cache, mesh_cache, image_cache = {}, {}, {}
        original_meshes = copy.deepcopy(doc['meshes'])
        for index, node in enumerate(doc['nodes']):
            if 'mesh' not in node: continue
            pid = owner(index)
            profile = spec['places'].get(pid, 'landscape')
            old_mesh = node['mesh']
            key = (old_mesh, profile)
            if key in mesh_cache:
                node['mesh'] = mesh_cache[key]
                continue
            mesh = copy.deepcopy(original_meshes[old_mesh])
            for primitive in mesh['primitives']:
                source_index = primitive.get('material')
                if source_index is None: continue
                source = doc['materials'][source_index]
                role = source.get('extras', {}).get('sunwenRole', source.get('name', ''))
                selected_profile = profile
                extras = node.get('extras', {})
                if role == 'plaster' and not extras.get('roof') and (pid == 'daguanyuan_gate' or (pid == 'daguanlou' and not extras.get('preserveEnvelope'))):
                    selected_profile = 'vermillion-wall'
                row = lookup.get((selected_profile, role))
                if not row: continue
                material = copy.deepcopy(source)
                material['name'] = role
                pbr = material.setdefault('pbrMetallicRoughness', {})
                image_key = str(row['runtime'])
                if image_key not in image_cache:
                    image_index = len(doc.setdefault('images', []))
                    doc['images'].append({'uri': os.path.relpath(row['runtime'], path.parent).replace(os.sep, '/')})
                    texture_index = len(doc.setdefault('textures', []))
                    doc['textures'].append({'source': image_index, 'sampler': 0})
                    image_cache[image_key] = texture_index
                pbr['baseColorTexture'] = {'index': image_cache[image_key]}
                pbr['baseColorFactor'] = [1, 1, 1, 1]
                pbr['roughnessFactor'] = row['roughness']
                pbr['metallicFactor'] = row['metallic']
                pbr.pop('metallicRoughnessTexture', None)
                # Keep base role names used by cutaway and night-window logic.
                material.setdefault('extras', {})['sunwenSurface'] = {'file': row['file'], 'sha256': row['sha256'], 'role': role, 'profile': selected_profile}
                cache_key = json.dumps([source_index, image_key, row['roughness'], row['metallic']])
                if cache_key not in material_cache:
                    material_cache[cache_key] = len(doc['materials'])
                    doc['materials'].append(material)
                primitive['material'] = material_cache[cache_key]
            node['mesh'] = len(doc['meshes'])
            mesh_cache[key] = node['mesh']
            doc['meshes'].append(mesh)
        # Remove unreachable tables so old cyan maps are not loaded or shipped.
        used_meshes = sorted({n['mesh'] for n in doc['nodes'] if 'mesh' in n})
        mesh_map = {old: new for new, old in enumerate(used_meshes)}
        doc['meshes'] = [doc['meshes'][i] for i in used_meshes]
        for n in doc['nodes']:
            if 'mesh' in n: n['mesh'] = mesh_map[n['mesh']]
        used_materials = sorted({p['material'] for m in doc['meshes'] for p in m['primitives'] if 'material' in p})
        material_map = {old: new for new, old in enumerate(used_materials)}
        doc['materials'] = [doc['materials'][i] for i in used_materials]
        for m in doc['meshes']:
            for p in m['primitives']:
                if 'material' in p: p['material'] = material_map[p['material']]
        texture_infos = []
        def find_textures(value):
            if isinstance(value, dict):
                for key, item in value.items():
                    if key.endswith('Texture') and isinstance(item, dict) and 'index' in item: texture_infos.append(item)
                    else: find_textures(item)
            elif isinstance(value, list):
                for item in value: find_textures(item)
        find_textures(doc['materials'])
        used_textures = sorted({v['index'] for v in texture_infos})
        texture_map = {old: new for new, old in enumerate(used_textures)}
        doc['textures'] = [doc['textures'][i] for i in used_textures]
        for info in texture_infos: info['index'] = texture_map[info['index']]
        used_images = sorted({t['source'] for t in doc['textures'] if 'source' in t})
        image_map = {old: new for new, old in enumerate(used_images)}
        doc['images'] = [doc['images'][i] for i in used_images]
        for texture in doc['textures']:
            if 'source' in texture: texture['source'] = image_map[texture['source']]
        after = geometry(doc, binary_chunks)
        if before != after: raise ValueError('Geometry changed ' + str(path))
        encoded = json.dumps(doc, ensure_ascii=False, separators=(',', ':')).encode()
        encoded += b' ' * (-len(encoded) % 4)
        result = struct.pack('<4sII', b'glTF', 2, 20 + len(encoded) + len(binary_chunks)) + struct.pack('<II', len(encoded), 0x4E4F534A) + encoded + binary_chunks
        temporary = path.with_suffix('.sunwen.next')
        temporary.write_bytes(result)
        os.replace(temporary, path)
        reports.append({'file': path.relative_to(ROOT).as_posix(), 'geometryHash': before, 'geometryAndSemanticsUnchanged': True, 'sha256': sha(result), 'materials': len(doc['materials'])})
        print('ALBUM GLB', path.name, len(material_cache), 'material bindings; original geometry bytes retained', flush=True)
    (ROOT / 'reports/acceptance/r17-web-preservation.json').write_text(json.dumps({'method': __doc__, 'files': reports}, indent=2) + '\n')
    optimization_path = ROOT / 'reports/acceptance/model-optimization.json'
    optimization = json.loads(optimization_path.read_text())
    for entry in optimization:
        row = next((r for r in reports if r['file'] == entry['file']), None)
        if row:
            entry.update(sha256=row['sha256'], afterBytes=(ROOT / row['file']).stat().st_size, materials=row['materials'])
            entry['materialPostprocessing'] = {'revision': 'r17', 'geometryHash': row['geometryHash'], 'dracoBinaryUnchanged': True}
    optimization_path.write_text(json.dumps(optimization, indent=2) + '\n')
    used = set()
    for model in (ROOT / 'public/models').rglob('*.glb'):
        data = model.read_bytes()
        model_doc = json.loads(data[20:20+struct.unpack_from('<I', data, 12)[0]])
        for image in model_doc.get('images', []):
            if 'uri' in image: used.add((model.parent / image['uri']).resolve())
    for image in shared.iterdir():
        if re.fullmatch(r'[a-f0-9]{64}\.(jpg|png|webp)', image.name) and image.resolve() not in used:
            image.unlink()
            image.with_suffix(image.suffix + '.json').unlink(missing_ok=True)


if __name__ == '__main__': main()

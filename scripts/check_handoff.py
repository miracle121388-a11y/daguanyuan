"""Check the committed modelling materials without downloading or rebuilding them."""
import argparse
import hashlib
import json
import struct
import subprocess
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
INVENTORY = ROOT / 'config/handoff-assets.json'
ROOTS = ('assets', 'public', 'data', 'references', 'output/imagegen', 'config')
OPTIONAL = 'assets/source/pine_tree_01/pine_tree_01.source.gltf'


def sha256(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def materials():
    paths = set()
    for directory in ROOTS:
        paths.update(p for p in (ROOT / directory).rglob('*') if p.is_file())
    paths.update((ROOT / 'blender').glob('*.blend'))
    return sorted(p for p in paths if p != INVENTORY
                  and '__pycache__' not in p.parts
                  and p.suffix not in {'.tmp', '.part', '.pyc'})


def gltf_document(path):
    if path.suffix == '.gltf':
        return json.loads(path.read_text(encoding='utf-8-sig'))
    with path.open('rb') as stream:
        header = stream.read(20)
        if len(header) != 20 or header[:4] != b'glTF':
            raise ValueError('Not a GLB; run git lfs pull if this is a pointer')
        _, version, total, length, kind = struct.unpack('<4sIIII', header)
        if version != 2 or kind != 0x4E4F534A or total != path.stat().st_size:
            raise ValueError('Invalid GLB header or truncated file')
        return json.loads(stream.read(length))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='Record an intentionally updated material inventory')
    parser.add_argument('--repair-line-endings', action='store_true', help='Restore Git bytes only when an unchanged text material differs by CRLF/LF')
    args = parser.parse_args()
    if args.write:
        tracked = set(subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode('utf-8').split('\0'))
        files = []
        for path in materials():
            name = path.relative_to(ROOT).as_posix()
            if name not in tracked:
                raise SystemExit(f'Stage the material before recording it: git add -- "{name}"')
            with path.open('rb') as stream:
                if stream.read(48).startswith(b'version https://git-lfs.github.com/spec/v1'):
                    raise SystemExit(f'Unmaterialized LFS pointer: {name}; run git lfs pull')
            files.append({'path': name, 'bytes': path.stat().st_size, 'sha256': sha256(path)})
        result = {
            'version': 1,
            'scope': 'Editable Blender scenes, all source/processed materials, website assets, reference artwork, canon and spatial configuration. Development source code is tracked by Git.',
            'optionalAcquisition': {
                'model': OPTIONAL,
                'reason': 'Unselected historical source candidate; the current garden uses pine_sapling_small instead.',
                'command': 'python scripts/fetch_optional_asset.py pine_tree_01',
                'metadata': 'references/upstream-notes/pine_tree_01.json',
            },
            'files': files,
        }
        INVENTORY.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
        print(f'Recorded {len(files)} material files; source bytes were not modified.')
        return

    manifest = json.loads(INVENTORY.read_text(encoding='utf-8'))
    failures = []
    checked = 0
    restored = []
    for entry in manifest['files']:
        path = (ROOT / entry['path']).resolve()
        if (args.repair_line_endings and path.is_relative_to(ROOT) and path.is_file()
                and path.suffix in {'', '.json', '.gltf', '.txt', '.md', '.html', '.csv', '.tsv', '.xml', '.svg', '.mtlx', '.sha256', '.py', '.js', '.mjs', '.css', '.yml', '.yaml'}
                and path.stat().st_size < 8 * 1024 * 1024 and sha256(path) != entry['sha256']):
            result = subprocess.run(['git', 'show', 'HEAD:' + entry['path']], cwd=ROOT, capture_output=True)
            current = path.read_bytes()
            committed = result.stdout
            if (result.returncode == 0 and b'\x00' not in current
                    and hashlib.sha256(committed).hexdigest() == entry['sha256']
                    and current.replace(b'\r\n', b'\n') == committed.replace(b'\r\n', b'\n')):
                path.write_bytes(committed)
                restored.append(entry['path'])
        if not path.is_relative_to(ROOT):
            failures.append({'path': entry['path'], 'error': 'Path leaves repository'})
        elif not path.is_file():
            failures.append({'path': entry['path'], 'error': 'Missing file; run git lfs pull'})
        elif path.stat().st_size != entry['bytes'] or sha256(path) != entry['sha256']:
            failures.append({'path': entry['path'], 'error': 'Content differs from the recorded material; check LFS or intentional edits'})
        else:
            checked += 1

    model_count = 0
    external_count = 0
    optional_missing = []
    optional_metadata = json.loads((ROOT / 'references/upstream-notes/pine_tree_01.json').read_text(encoding='utf-8'))['gltf']['1k']['gltf']
    for path in materials():
        if path.suffix not in {'.gltf', '.glb'}:
            continue
        name = path.relative_to(ROOT).as_posix()
        try:
            doc = gltf_document(path)
            model_count += 1
            for item in doc.get('images', []) + doc.get('buffers', []):
                uri = item.get('uri', '')
                if not uri or uri.startswith('data:'):
                    continue
                external_count += 1
                parsed = urlsplit(uri)
                target = (path.parent / unquote(parsed.path)).resolve()
                if parsed.scheme or parsed.netloc or not target.is_relative_to(ROOT):
                    failures.append({'path': name, 'resource': uri, 'error': 'Resource must be repository-local'})
                elif not target.is_file():
                    if name == OPTIONAL and uri in optional_metadata['include']:
                        optional_missing.append(uri)
                    else:
                        failures.append({'path': name, 'resource': uri, 'error': 'Missing linked material'})

        except (ValueError, OSError, struct.error) as error:
            failures.append({'path': name, 'error': str(error)})

    provenance_count = 0
    for item in json.loads((ROOT / 'assets/manifest.json').read_text(encoding='utf-8')):
        if item.get('status') != 'approved':
            continue
        refs = [(item.get('sourceFile'), item.get('sourceSha256'))]
        refs += [(row.get('file'), row.get('sha256')) for row in item.get('dependencies', [])]
        refs += list(zip(item.get('derivativeFiles', []), item.get('derivativeSha256', [])))
        for name, digest in refs:
            if not name or not digest:
                continue
            provenance_count += 1
            path = ROOT / name
            if not path.is_file() or sha256(path) != digest:
                failures.append({'path': name, 'error': 'Approved provenance hash mismatch'})
    print(json.dumps({
        'passed': not failures, 'materialFilesChecked': checked,
        'materialBytes': sum(item['bytes'] for item in manifest['files']),
        'gltfModelsRead': model_count, 'linkedResourcesChecked': external_count,
        'approvedProvenanceReferencesChecked': provenance_count,
        'lineEndingsRestored': restored,
        'optionalUnusedPineDependenciesNotDownloaded': len(optional_missing),
        'optionalDownloadCommand': manifest['optionalAcquisition']['command'] if optional_missing else None,
        'failures': failures,
    }, ensure_ascii=False, indent=2))
    raise SystemExit(1 if failures else 0)


if __name__ == '__main__':
    main()

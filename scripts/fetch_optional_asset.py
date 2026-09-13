"""Restore the unused pine source candidate from the frozen official metadata."""
import argparse
import hashlib
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('asset', choices=['pine_tree_01'])
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--file', help='Fetch one dependency from the frozen metadata; default fetches all')
    args = parser.parse_args()
    metadata_path = ROOT / f'references/upstream-notes/{args.asset}.json'
    entry = json.loads(metadata_path.read_text(encoding='utf-8'))['gltf']['1k']['gltf']
    folder = ROOT / 'assets/source' / args.asset
    source = folder / f'{args.asset}.source.gltf'
    if hashlib.md5(source.read_bytes()).hexdigest() != entry['md5']:
        raise SystemExit('Source glTF differs from the frozen metadata; current file was left unchanged.')
    jobs = entry['include']
    if args.file:
        if args.file not in jobs:
            raise SystemExit('Unknown dependency; use a file name from the frozen metadata.')
        jobs = {args.file: jobs[args.file]}
    if args.dry_run:
        print(json.dumps({'asset': args.asset, 'dependencies': len(jobs), 'bytes': sum(x['size'] for x in jobs.values()), 'files': list(jobs), 'metadata': metadata_path.relative_to(ROOT).as_posix()}, indent=2))
        return
    records = []
    for name, spec in jobs.items():
        target = (folder / name).resolve()
        if not target.is_relative_to(folder.resolve()) or not spec['url'].startswith('https://dl.polyhaven.org/'):
            raise SystemExit('Invalid source path or download host in metadata.')
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_name(target.name + '.part')
            request = urllib.request.Request(spec['url'], headers={'User-Agent': 'DaguanyuanMaterialRecovery/1.0'})
            digest = hashlib.md5()
            size = 0
            with urllib.request.urlopen(request, timeout=150) as response, temporary.open('wb') as stream:
                while chunk := response.read(1024 * 1024):
                    stream.write(chunk)
                    digest.update(chunk)
                    size += len(chunk)
            if size != spec['size'] or digest.hexdigest() != spec['md5']:
                raise SystemExit(f'Upstream checksum mismatch: {name}; existing materials were left unchanged.')
            temporary.replace(target)
        with target.open('rb') as stream:
            md5 = hashlib.file_digest(stream, 'md5').hexdigest()
        if target.stat().st_size != spec['size'] or md5 != spec['md5']:
            raise SystemExit(f'Existing material differs: {name}; preserve your edits before retrying.')
        with target.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        records.append({'file': target.relative_to(ROOT).as_posix(), 'sha256': digest, 'upstreamMd5': spec['md5'], 'url': spec['url'], 'bytes': spec['size']})
        print(f'Verified {name}', flush=True)
    record = {'assetId': args.asset, 'sourceUrl': 'https://polyhaven.com/a/' + args.asset, 'licenseName': 'CC0-1.0', 'licenseEvidence': 'references/licenses/polyhaven.html', 'scope': 'Optional historical candidate; not used by the published garden.', 'metadataSha256': hashlib.sha256(metadata_path.read_bytes()).hexdigest(), 'filesVerifiedThisRun': records}
    (folder / 'download-manifest.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    main()

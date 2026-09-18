"""Fetch a pinned, hash-verified garden study from the user-specified Sun Wen album."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import quote

import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'references/sunwen'
REPOSITORY = 'https://github.com/changren-wcr/sunwen'
COMMIT = '9e9352d51a5f4a7006f77946ee8ace29d427a937'
SELECTED = {1, *range(44, 68), 71, 76, 77, 91, 92, 93, 95, 96, 97, 98, 99, 100, 108, 127, 136, 146, 158}


def acquire(row):
    name = Path(row['path']).name
    number = int(re.match(r'\d+', name).group())
    target = OUT / 'originals' / f'{number:03d}.jpg'
    url = 'https://raw.githubusercontent.com/changren-wcr/sunwen/' + COMMIT + '/' + quote(row['path'])
    if not target.exists():
        response = requests.get(url, timeout=(20, 120))
        response.raise_for_status()
        temporary = target.with_suffix('.part')
        temporary.write_bytes(response.content)
        temporary.replace(target)
    payload = target.read_bytes()
    blob = hashlib.sha1(b'blob ' + str(len(payload)).encode() + b'\0' + payload).hexdigest()
    if blob != row['oid']:
        raise ValueError('Not the pinned Git blob: ' + name)
    with Image.open(target) as picture:
        picture.verify()
    with Image.open(target) as picture:
        dimensions = list(picture.size)
    chapter_match = re.search(r'第(\d+)(?:-(\d+))?回', name)
    chapters = list(range(int(chapter_match[1]), int(chapter_match[2] or chapter_match[1]) + 1)) if chapter_match else []
    return {'id': f'SW{number:03d}', 'number': number, 'title': name[:-4], 'chapters': chapters,
            'sourcePath': row['path'], 'sourcePage': REPOSITORY + '/blob/' + COMMIT + '/' + quote(row['path']),
            'downloadUrl': url, 'gitBlob': blob, 'file': target.relative_to(ROOT).as_posix(),
            'sha256': hashlib.sha256(payload).hexdigest(), 'bytes': len(payload), 'dimensions': dimensions}


def main():
    (OUT / 'originals').mkdir(parents=True, exist_ok=True)
    catalogue = json.loads((OUT / 'catalogue.json').read_text())
    assert catalogue['commit'] == COMMIT
    selected = [r for r in catalogue['images'] if int(re.match(r'\d+', Path(r['path']).name).group()) in SELECTED]
    records, failures = [], []
    with ThreadPoolExecutor(max_workers=4) as pool:
        jobs = {pool.submit(acquire, row): row for row in selected}
        for future in as_completed(jobs):
            try:
                row = future.result(); records.append(row)
                print(row['id'], row['dimensions'], row['bytes'], flush=True)
            except Exception as error:
                failures.append({'path': jobs[future]['path'], 'error': str(error)})
                print('FAILED', failures[-1], flush=True)
    record = {'repository': REPOSITORY, 'commit': COMMIT, 'retrievedAt': datetime.now(timezone.utc).isoformat(),
              'catalogueEntries': len(catalogue['images']), 'files': sorted(records, key=lambda r: r['number']),
              'failures': failures,
              'rights': 'Historical paintings attributed by the supplied repository to Qing artist Sun Wen. The underlying historical works are public domain; the repository supplies no separate license for its digital scans. Preserve scan provenance and avoid claiming an explicit repository license.',
              'purpose': 'Primary visual standard for this garden: architecture, pigments, open ground and ornamental planting. Painterly spatial interpretation is separate from reviewed novel evidence.'}
    (OUT / 'provenance.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    main()

"""Acquire the user's selected Qing album references without runtime networking."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'references/paintings'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    index = BeautifulSoup((ROOT / '图文索引.html').read_text(encoding='utf-8'), 'html.parser')
    records = []
    for key in ['M02', 'M03', 'M04', 'M15']:
        card = index.find(id=key)
        links = card.select('.actions a')
        url = links[-1]['href']
        target = OUT / f'{key}.jpg'
        if not target.exists():
            response = requests.get(url, timeout=60)
            response.raise_for_status()
            target.write_bytes(response.content)
        with Image.open(target) as picture:
            picture.verify()
        with Image.open(target) as picture:
            dimensions = list(picture.size)
        records.append({
            'id': key, 'title': card.h2.get_text(), 'sourcePage': links[0]['href'],
            'downloadUrl': url, 'file': target.relative_to(ROOT).as_posix(),
            'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
            'dimensions': dimensions,
            'use': 'User-selected visual reference for color and enclosure; not a measured plan or model texture.',
            'rights': 'Commons file page identifies PD-Art (PD-old-100).' if key == 'M01' else
                      'Historical painting reference from the user-supplied public repository; no separate license for its digital edition asserted.',
        })
        print(f'{key}: {dimensions}, {target.stat().st_size} bytes', flush=True)
    (OUT / 'provenance.json').write_text(json.dumps({
        'retrievedAt': datetime.now(timezone.utc).isoformat(),
        'attributionNote': 'The album includes works by Sun Wen and Sun Yunmo. Preserve source titles; the overview attribution is discussed separately in the provincial museum exhibition notice.',
        'museumContext': 'https://whly.ln.gov.cn/whly/mtjj/2025072913500332504/index.shtml',
        'files': records,
    }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()

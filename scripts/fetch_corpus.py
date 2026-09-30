"""Archive the Wikisource collated reading text, without publishing raw HTML."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import requests
import bs4
import hashlib
import json
import datetime
import time

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/raw/corpus'


def fetch(chapter):
    OUT.mkdir(parents=True, exist_ok=True)
    stem = OUT / f'{chapter:03}'
    url = f'https://zh.wikisource.org/wiki/紅樓夢/第{chapter:03}回'
    if stem.with_suffix('.json').exists():
        return chapter
    for attempt in range(3):
        try:
            response = requests.get(url, timeout=45, headers={'User-Agent': 'DaguanyuanLiteraryGarden/1.0'})
            response.raise_for_status()
            soup = bs4.BeautifulSoup(response.content, 'html.parser')
            body = soup.select_one('.mw-parser-output')
            assert body, 'Missing article body'
            paragraphs = [p.get_text('', strip=True) for p in body.select('p') if not p.find_parent(['table', 'nav'])]
            paragraphs = [p for p in paragraphs if p]
            assert sum(map(len, paragraphs)) > 1500, f'Incomplete chapter {chapter}'
            raw = response.content
            stem.with_suffix('.html').write_bytes(raw)
            metadata = dict(chapter=chapter, url=url, retrievedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                            rawPath=stem.with_suffix('.html').relative_to(ROOT).as_posix(),
                            rawSha256=hashlib.sha256(raw).hexdigest(), paragraphs=paragraphs)
            stem.with_suffix('.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
            return chapter
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 + attempt)


if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=4) as pool:
        for chapter in pool.map(fetch, range(1, 121)):
            print(f'Archived chapter {chapter}', flush=True)

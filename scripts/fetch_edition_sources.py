"""Archive version evidence for manual review. No downloaded page is published."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import requests, bs4, json, hashlib, datetime

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/raw/editions'
SOURCES = {
    'cheng-097': 'https://zh.wikisource.org/wiki/紅樓夢/第097回',
    'cheng-098': 'https://zh.wikisource.org/wiki/紅樓夢/第098回',
    'cheng-105': 'https://zh.wikisource.org/wiki/紅樓夢/第105回',
    'cheng-120': 'https://zh.wikisource.org/wiki/紅樓夢/第120回',
    'guiyou-catalog': 'https://www.sanmin.com.tw/product/index/004615400',
    'guiyou-history': 'https://zh.wikipedia.org/wiki/吴氏石头记增删试评本',
}

def fetch(item):
    key, url = item
    page = OUT / f'{key}.html'
    if not page.exists():
        r = requests.get(url, headers={'User-Agent': 'DaguanyuanLiteraryGarden/1.0'}, timeout=45)
        r.raise_for_status()
        page.write_bytes(r.content)
    soup = bs4.BeautifulSoup(page.read_bytes(), 'html.parser')
    for tag in soup(['script', 'style']):
        tag.decompose()
    body = soup.select_one('.mw-parser-output') or soup
    text = body.get_text(' ', strip=True)
    (OUT / f'{key}.txt').write_bytes(text.encode())
    meta = dict(id=key, url=url, retrievedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                rawPath=f'data/raw/editions/{key}.html', textPath=f'data/raw/editions/{key}.txt',
                rawSha256=hashlib.sha256(page.read_bytes()).hexdigest(), normalizedTextSha256=hashlib.sha256(text.encode()).hexdigest())
    (OUT / f'{key}.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    return f'{key}: {len(text)} characters cached for review'

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=5) as pool:
        for result in pool.map(fetch, SOURCES.items()):
            print(result, flush=True)

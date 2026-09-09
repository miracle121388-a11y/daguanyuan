from pathlib import Path
import requests,bs4,json,hashlib,re,time,datetime
R=Path(__file__).resolve().parents[1]
H={'User-Agent':'DaguanyuanLiteraryGarden/1.0 (local educational research; limited chapter archive)'}
for ch in [17,18,23,26,27,37,38,40,41,49,50,63,74,76]:
 p=R/'data/raw'/f'chapter-{ch:03}.html'
 url=f'https://zh.wikisource.org/wiki/紅樓夢/第{ch:03}回'
 if not p.exists():
  r=requests.get(url,headers=H,timeout=45);r.raise_for_status();p.write_bytes(r.content);time.sleep(.3)
 soup=bs4.BeautifulSoup(p.read_bytes(),'html.parser');body=soup.select_one('.mw-parser-output');assert body
 paragraphs=[p.get_text(' ',strip=True) for p in body.find_all('p') if p.get_text(strip=True)]
 text='\n\n'.join(paragraphs)
 (R/'data/raw'/f'chapter-{ch:03}.txt').write_bytes(text.encode('utf-8'))
 m=re.search(r'"wgRevisionId":(\d+)',p.read_text(encoding='utf-8'))
 meta={'chapter':ch,'url':url,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'revisionId':m.group(1) if m else None,'rawSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'normalizedTextSha256':hashlib.sha256(text.encode()).hexdigest(),'paragraphs':paragraphs}
 (R/'data/raw'/f'chapter-{ch:03}.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
 print('Cached chapter',ch,'paragraphs',len(paragraphs),flush=True)

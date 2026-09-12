"""Restore the CC0 source leaf alpha for an actual 3D tree render, with hashes."""
from pathlib import Path
import json, hashlib, requests, os
R=Path(__file__).resolve().parents[1]
meta=json.loads((R/'references/upstream-notes/island_tree_01.json').read_text())
deps=meta['blend']['1k']['blend']['include']
manifest=json.loads((R/'assets/manifest.json').read_text(encoding='utf8'))
asset=next(a for a in manifest if a['assetId']=='island_tree_01')
for name in ['island_tree_01_leaves_alpha_1k.png','island_tree_01_leaves_diff_1k.png']:
 rel='textures/'+name;entry=deps[rel];p=R/'assets/source/island_tree_01'/rel
 if not p.exists():
  response=requests.get(entry['url'],timeout=(15,90));response.raise_for_status();p.write_bytes(response.content)
 data=p.read_bytes();assert hashlib.md5(data).hexdigest()==entry['md5']
 record={'file':p.relative_to(R).as_posix(),'sha256':hashlib.sha256(data).hexdigest()}
 asset['dependencies']=[x for x in asset['dependencies'] if x['file']!=record['file']]+[record]
 print(name,len(data))
p=R/'assets/manifest.json';q=p.with_suffix('.next');q.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8');os.replace(q,p)

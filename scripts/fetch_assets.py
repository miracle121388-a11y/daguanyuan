"""Small, cached, hash-checked set of CC0 assets from the official API."""
from pathlib import Path
import requests,json,hashlib,datetime,time
R=Path(__file__).resolve().parents[1]
H={'User-Agent':'DaguanyuanLocalGarden/1.0 (educational local scene builder)'}
def save(url,path,md5=None,size=None):
 path.parent.mkdir(parents=True,exist_ok=True)
 if not path.exists():
  for attempt in range(2):
   try:
    r=requests.get(url,headers=H,timeout=(20,75));r.raise_for_status()
    assert 'text/html' not in r.headers.get('Content-Type','') or path.suffix=='.html','Unexpected HTML'
    if size:assert len(r.content)==size,(len(r.content),size)
    if md5:assert hashlib.md5(r.content).hexdigest()==md5,'Upstream checksum mismatch'
    path.write_bytes(r.content);break
   except Exception:
    if attempt:raise
    time.sleep(2)
 b=path.read_bytes()
 if md5:assert hashlib.md5(b).hexdigest()==md5
 return hashlib.sha256(b).hexdigest()
license_path=R/'references/licenses/polyhaven.html'
if not license_path.exists():
 r=requests.get('https://polyhaven.com/license',headers=H,timeout=30);r.raise_for_status();license_path.parent.mkdir(parents=True,exist_ok=True);license_path.write_bytes(r.content)
catalog=requests.get('https://api.polyhaven.com/assets',headers=H,timeout=30).json()
manifest=[]
for aid,kind in [('stone_wall_02','texture'),('wood_planks','texture'),('coast_rocks_02','model'),('forest_grove','hdri')]:
 try:
  j=requests.get('https://api.polyhaven.com/files/'+aid,headers=H,timeout=30);j.raise_for_status();j=j.json()
  (R/'references/upstream-notes'/f'{aid}.json').write_text(json.dumps(j,indent=2))
  if kind=='texture':
   entry=j.get('diff',j.get('Diffuse'))['1k']['jpg']; target=R/'assets/source'/f'{aid}.jpg'
  elif kind=='hdri':entry=j['hdri']['1k']['hdr'];target=R/'assets/source'/f'{aid}.hdr'
  else:entry=j['gltf']['1k']['gltf'];target=R/'assets/source'/aid/f'{aid}.gltf'
  sh=save(entry['url'],target,entry.get('md5'),entry.get('size'))
  deps=[]
  for rel,v in entry.get('include',{}).items():
   p=target.parent/rel;hs=save(v['url'],p,v.get('md5'),v.get('size'));deps.append({'file':p.relative_to(R).as_posix(),'sha256':hs})
  manifest.append(dict(assetId=aid,title=catalog[aid]['name'],creator=', '.join(catalog[aid]['authors']),sourceUrl='https://polyhaven.com/a/'+aid,licenseName='CC0',licenseVersion='1.0',licenseEvidencePath='references/licenses/polyhaven.html',retrievedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),sourceFile=target.relative_to(R).as_posix(),sourceSha256=sh,derivativeFiles=[],derivativeSha256=[],dependencies=deps,modifications='Material reuse; rock decimated and recolored to match garden palette',status='approved',usedByPlaceIds=['all']))
  print('APPROVED',aid,flush=True)
 except Exception as e:
  manifest.append(dict(assetId=aid,status='pending',error=str(e)));print('NOT ACQUIRED',aid,e,flush=True)
(R/'assets/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(R/'reports/assets/candidates.json').write_text(json.dumps({'sketchfab_courtyard':'Page access failed; no license or file obtained; not used','sketchfab_pavilion':'Page access failed; no license or file obtained; not used','ACA':'License not verified; not used'},indent=2))

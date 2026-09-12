"""Acquire two CC0 source crowns, validating upstream digests and provenance."""
from pathlib import Path
import json,hashlib,datetime,requests,concurrent.futures
R=Path(__file__).resolve().parents[1]
catalog=json.loads((R/'references/upstream-notes/trees-r5-catalog.json').read_text(encoding='utf8'))
def download(pair):
 entry,target=pair;target.parent.mkdir(parents=True,exist_ok=True)
 if not target.exists():
  response=requests.get(entry['url'],timeout=(20,150));response.raise_for_status()
  data=response.content
  assert len(data)==entry['size'] and hashlib.md5(data).hexdigest()==entry['md5']
  temporary=target.with_suffix(target.suffix+'.part');temporary.write_bytes(data);temporary.replace(target)
 data=target.read_bytes();assert hashlib.md5(data).hexdigest()==entry['md5']
 return {'file':target.relative_to(R).as_posix(),'sha256':hashlib.sha256(data).hexdigest(),'url':entry['url']}
for aid in ['island_tree_02','pine_sapling_small']:
 metadata=json.loads((R/f'references/upstream-notes/{aid}-r5.json').read_text(encoding='utf8'))
 entry=metadata['gltf']['1k']['gltf'];folder=R/'assets/source'/aid
 jobs=[(entry,folder/(aid+'.gltf'))]+[(e,folder/name) for name,e in entry.get('include',{}).items()]
 for channel in (['leaves_diff','leaves_alpha'] if aid=='island_tree_02' else ['twig_diff','twig_alpha']):
  extra=metadata[channel]['1k']['png'];jobs.append((extra,folder/'textures'/Path(extra['url']).name))
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:records=list(pool.map(download,jobs))
 assets=json.loads((R/'assets/manifest.json').read_text(encoding='utf8'));assets=[a for a in assets if a['assetId']!=aid]
 assets.append({'assetId':aid,'title':catalog[aid]['name'],'creator':', '.join(catalog[aid]['authors']),'sourceUrl':'https://polyhaven.com/a/'+aid,'licenseName':'CC0','licenseVersion':'1.0','licenseEvidencePath':'references/licenses/polyhaven.html','retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceFile':records[0]['file'],'sourceSha256':records[0]['sha256'],'dependencies':records[1:],'derivativeFiles':[],'derivativeSha256':[],'modifications':'Source retained; garden LOD derivation pending.','status':'approved','usedByPlaceIds':[]})
 target=R/'assets/manifest.json';temporary=target.with_suffix('.json.next');temporary.write_text(json.dumps(assets,ensure_ascii=False,indent=2),encoding='utf8');temporary.replace(target)
 print('SOURCE CROWN VERIFIED',aid,flush=True)

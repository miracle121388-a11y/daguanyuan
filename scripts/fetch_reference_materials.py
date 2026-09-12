from pathlib import Path
import requests,json,hashlib,datetime,concurrent.futures,time
R=Path(__file__).resolve().parents[1];H={'User-Agent':'DaguanyuanReferenceGarden/2.0 (local literary garden; Poly Haven attribution included)'}
def get(url):
 for attempt in range(3):
  try:
   r=requests.get(url,headers=H,timeout=(20,100));r.raise_for_status();return r
  except requests.RequestException:
   if attempt==2:raise
   time.sleep(1)
def save(entry,target):
 target.parent.mkdir(parents=True,exist_ok=True)
 if not target.exists():
  data=get(entry['url']).content
  if entry.get('md5'):assert hashlib.md5(data).hexdigest()==entry['md5']
  if entry.get('size'):assert len(data)==entry['size']
  target.write_bytes(data)
 data=target.read_bytes()
 if entry.get('md5'):assert hashlib.md5(data).hexdigest()==entry['md5']
 return hashlib.sha256(data).hexdigest()
catalog=json.loads((R/'references/upstream-notes/catalog-reference.json').read_text());manifest=json.loads((R/'assets/manifest.json').read_text(encoding='utf8'))
for aid,model in [('island_tree_01',True),('leafy_grass',False),('mossy_cobblestone',False),('worn_mossy_plasterwall',False)]:
 meta=R/'references/upstream-notes'/f'{aid}.json'
 if not meta.exists():meta.write_text(json.dumps(get('https://api.polyhaven.com/files/'+aid).json(),indent=2),encoding='utf8')
 files=json.loads(meta.read_text());deps=[]
 if model:
  entry=files['gltf']['1k']['gltf'];target=R/'assets/source'/aid/(aid+'.gltf');sha=save(entry,target)
  with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
   jobs=[(rel,pool.submit(save,e,target.parent/rel)) for rel,e in entry['include'].items()]
   for rel,future in jobs:deps.append({'file':(target.parent/rel).relative_to(R).as_posix(),'sha256':future.result()})
 else:
  entry=files.get('diff',files.get('Diffuse'))['1k']['jpg'];target=R/'assets/source'/f'{aid}.jpg';sha=save(entry,target)
 manifest=[a for a in manifest if a['assetId']!=aid]+[{'assetId':aid,'title':catalog[aid]['name'],'creator':', '.join(catalog[aid]['authors']),'sourceUrl':'https://polyhaven.com/a/'+aid,'licenseName':'CC0','licenseVersion':'1.0','licenseEvidencePath':'references/licenses/polyhaven.html','retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceFile':target.relative_to(R).as_posix(),'sourceSha256':sha,'dependencies':deps,'derivativeFiles':[],'derivativeSha256':[],'modifications':'Tree converted to shared instanced geometry; ground textures mapped onto authored garden meshes.','status':'approved','usedByPlaceIds':['all']}]
 (R/'assets/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8');print('APPROVED',aid,flush=True)

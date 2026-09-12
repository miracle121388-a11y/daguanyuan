"""Calibrated source material roles for the r10 review-directed rebuild."""
from pathlib import Path
import json,hashlib,requests,datetime,copy
R=Path(__file__).resolve().parents[1]
aid='wood_table_001'
files=json.loads((R/f'references/upstream-notes/{aid}-r9.json').read_text(encoding='utf-8'))
info=json.loads((R/f'references/upstream-notes/{aid}-r9-info.json').read_text(encoding='utf-8'))
deps=[];checks=[]
for key in ['diff','nor_gl','rough']:
    actual=next(k for k in files if k.lower()=={'diff':'diffuse'}.get(key,key))
    entry=files[actual]['1k']['jpg'];path=R/'assets/source'/(aid+('' if key=='diff' else '_'+key)+'.jpg')
    if not path.exists():
        res=requests.get(entry['url'],timeout=(20,80));res.raise_for_status();data=res.content
        assert len(data)==entry['size'] and hashlib.md5(data).hexdigest()==entry['md5'];path.write_bytes(data)
    data=path.read_bytes();assert len(data)==entry['size'] and hashlib.md5(data).hexdigest()==entry['md5']
    sha=hashlib.sha256(data).hexdigest();checks.append({'file':path.relative_to(R).as_posix(),'sha256':sha,'upstreamMd5':entry['md5'],'bytes':len(data)})
    if key!='diff':deps.append({'file':path.relative_to(R).as_posix(),'sha256':sha})
afile=R/'assets/manifest.json';assets=json.loads(afile.read_text(encoding='utf-8'))
a=copy.deepcopy(next(x for x in assets if x['assetId']=='rosewood_veneer_02'))
a.update(assetId=aid,title=info['name'],creator=', '.join(info['authors']),sourceUrl='https://polyhaven.com/a/'+aid,retrievedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),sourceFile=checks[0]['file'],sourceSha256=checks[0]['sha256'],dependencies=deps,derivativeFiles=[],derivativeSha256=[],usage='Reviewed local timber surface for r10 joinery and furniture.',modifications='Source visually inspected; physical UV and material roles in config/craft.materials.json. No historical species claim.',status='approved')
assets=[x for x in assets if x['assetId']!=aid]+[a]
afile.write_text(json.dumps(assets,ensure_ascii=False,indent=2),encoding='utf-8')
(R/'reports/acceptance/r10-source-acquisition.json').write_text(json.dumps({'assetId':aid,'files':checks,'license':'CC0-1.0','origin':a['sourceUrl'],'review':'Source image opened; fine dark wood grain selected for joinery.'},ensure_ascii=False,indent=2),encoding='utf-8')
p=R/'config/craft.materials.json';c=json.loads(p.read_text(encoding='utf-8'));c['revision']='r10'
for role,value,sat,rough in [('wood',1.8,.58,.70),('darkwood',1.08,.52,.76),('latticewood',1.58,.58,.69),('floorwood',1.5,.48,.72),('furniture',1.28,.61,.54)]:
    c['materials'][role]={'source':aid,'saturation':sat,'value':value,'roughness':rough,'roughSourceWeight':.15,'period':[.55,2.8],'grain':'v','crop':[.61,.10,.27,.78],'normalStrength':.12}
for role in ['cutstone','stone','paving']:
    c['materials'][role]['period']=[1.65,.82];c['materials'][role]['roughness']=.88;c['materials'][role]['normalStrength']=.25
for role,value in [('cutstone',.80),('stone',.71),('paving',.65)]:c['materials'][role]['value']=value
p.write_text(json.dumps(c,ensure_ascii=False,indent=2),encoding='utf-8')
p=R/'config/garden.layout.json';d=json.loads(p.read_text(encoding='utf-8'));d['assetRevision']='spatial-garden-20260912-r10';p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
p=R/'scripts/prepare_spatial_layout.py';p.write_text(p.read_text(encoding='utf-8').replace('spatial-garden-20260912-r9','spatial-garden-20260912-r10'),encoding='utf-8')
p=R/'scripts/fetch_spatial_materials.py';p.write_text(p.read_text(encoding='utf-8').replace("'fern_02','rock_moss_set_01']","'fern_02','rock_moss_set_01','wood_table_001']"),encoding='utf-8')
p=R/'index.html';p.write_text(p.read_text(encoding='utf-8').replace('FORM: immersive garden, user-pinned reference world; seed 41ecba8d.','FORM: immersive garden fixed by the user; historical seed 41ecba8d has no surviving original output and is unverified.'),encoding='utf-8')
print('r10 source verified; material/scene revisions set. Spatial coordinates unchanged.')

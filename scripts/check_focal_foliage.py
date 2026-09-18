"""Read actual high/mobile GLB leaf maps, not just source-file presence."""
from pathlib import Path
from datetime import datetime,timezone
import json,struct,io
from PIL import Image,ImageStat
R=Path(__file__).resolve().parents[1];rows=[]
for tier in ['places','places-low']:
 for place in ['xiaoxiangguan','yihongyuan','hengwuyuan','qiushuangzhai']:
  path=R/f'public/models/{tier}/{place}.glb';data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+length]);start=28+length;roles=set()
  for index,mat in enumerate(doc['materials']):
   role=mat.get('name','')
   if not role.startswith('botanical_'):continue
   roles.add(role);source=R/f'assets/processed/focal-r12-fix2/{role.removeprefix("botanical_")}.png';texture=mat.get('pbrMetallicRoughness',{}).get('baseColorTexture');assert texture,f'{tier}/{place}/{role} lost its visible material map'
   image=doc['images'][doc['textures'][texture['index']]['source']]
   if 'uri' in image:blob=(path.parent/image['uri']).read_bytes()
   else:
    view=doc['bufferViews'][image['bufferView']];offset=start+view.get('byteOffset',0);blob=data[offset:offset+view['byteLength']]
   if mat.get('extras',{}).get('sunwenSurface'):source=R/mat['extras']['sunwenSurface']['file']
   actual=ImageStat.Stat(Image.open(io.BytesIO(blob)).convert('RGB'));expected=ImageStat.Stat(Image.open(source).convert('RGB'));error=max(abs(a-b) for a,b in zip(actual.mean,expected.mean))
   primitives=[p for mesh in doc['meshes'] for p in mesh['primitives'] if p.get('material')==index]
   uv_preserved=bool(primitives) and all('TEXCOORD_0' in p['attributes'] for p in primitives)
   rows.append({'tier':tier,'place':place,'role':role,'rgbMean':actual.mean,'sourceMean':expected.mean,'meanChannelError':error,'rgbStddev':actual.stddev,'uvPreserved':uv_preserved,'pass':error<3 and min(actual.stddev)>1 and uv_preserved})
  assert 'botanical_bamboo' in roles,f'Missing planted leaf role: {tier}/{place}'
  if place in ['xiaoxiangguan','yihongyuan']:assert {'botanical_banana','botanical_petal'}<=roles
report={'at':datetime.now(timezone.utc).isoformat(),'revision':json.loads((R/'public/scene-manifest.json').read_text(encoding='utf8'))['assetRevision'],'method':'Actual delivered focal leaf/petal/stem/litter maps retain source RGB variation and UVs in high and mobile partitions; no color-only substitute. Geometry and artistic quality require separate checks.','checks':len(rows),'pass':all(r['pass'] for r in rows),'rows':rows}
short='r'+report['revision'].split('-r')[-1]
(R/f'reports/acceptance/{short}-focal-pixels.json').write_text(json.dumps(report,indent=2),encoding='utf8');print('FOCAL LEAF PIXELS',len(rows),report['pass']);assert report['pass']

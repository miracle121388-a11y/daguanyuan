"""Detect stale packed source maps in the actual detailed GLB deliveries."""
import json,struct,io,datetime
from pathlib import Path
from PIL import Image,ImageStat
R=Path(__file__).resolve().parents[1]
config=json.loads((R/'config/craft.materials.json').read_text(encoding='utf-8'))
rows=[]
def rgb(blob):return ImageStat.Stat(Image.open(io.BytesIO(blob)).convert('RGB')).mean
for place in ['daguanyuan_gate','xiaoxiangguan','daguanlou','hengwuyuan']:
 path=R/'public/models/places'/f'{place}.glb';data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+length]);start=28+length
 for material in doc['materials']:
  role=material.get('name')
  if role not in config['materials']:continue
  index=material['pbrMetallicRoughness']['baseColorTexture']['index'];image=doc['images'][doc['textures'][index]['source']]
  if 'uri' in image:blob=(path.parent/image['uri']).read_bytes()
  else:
   view=doc['bufferViews'][image['bufferView']];offset=start+view.get('byteOffset',0);blob=data[offset:offset+view['byteLength']]
  source=R/f'assets/processed/materials-{config["revision"]}'/f'{role}_diff.png'
  delivered,expected=rgb(blob),rgb(source.read_bytes());error=max(abs(a-b) for a,b in zip(delivered,expected))
  rows.append({'place':place,'role':role,'sourceRgbMean':expected,'deliveredRgbMean':delivered,'maximumMeanChannelError':error,'passed':error<2.0})
assert len(rows)>=25,'Missing expected material coverage'
report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'Compare current baked albedo swatches with the real GLB baseColorTexture pixels; 2/255 mean-channel tolerance permits JPEG delivery encoding, not stale packed images.','checks':len(rows),'passed':all(r['passed'] for r in rows),'materials':rows}
(R/'reports/acceptance'/f'{config["revision"]}-craft-pixel-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('CRAFT PIXEL CHECK',len(rows),'passed',report['passed'])
if not report['passed']:raise RuntimeError('An exported material differs from its current swatch')
alpha_rows=[]
for variant in range(2):
 path=R/f'public/models/vegetation/fern-{variant}.glb';data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+length]);start=28+length
 for material in doc['materials']:
  index=material['pbrMetallicRoughness']['baseColorTexture']['index'];image=doc['images'][doc['textures'][index]['source']]
  if 'uri' in image:blob=(path.parent/image['uri']).read_bytes()
  else:
   view=doc['bufferViews'][image['bufferView']];offset=start+view.get('byteOffset',0);blob=data[offset:offset+view['byteLength']]
  im=Image.open(io.BytesIO(blob));extrema=im.getchannel('A').getextrema() if 'A' in im.getbands() else [255,255]
  visible=im.getchannel('A').point(lambda x:255 if x>128 else 0) if 'A' in im.getbands() else None
  visible_rgb=ImageStat.Stat(im.convert('RGB'),mask=visible).mean
  colour_present=max(visible_rgb)>30 and visible_rgb[1]>20
  alpha_rows.append({'variant':variant,'mode':im.mode,'alphaExtrema':extrema,'visibleLeafRgbMean':visible_rgb,'colourPresent':colour_present,'passed':extrema[0]<16 and extrema[1]>240 and colour_present})
alpha_report={'checks':len(alpha_rows),'passed':len(alpha_rows)==2 and all(x['passed'] for x in alpha_rows),'materials':alpha_rows,'method':'Actual delivered fern base-color image must retain transparent background, opaque leaf pixels, and nonblack colour in the visible leaf area. Alpha alone cannot detect a broken RGB/alpha image merge.'}
(R/'reports/acceptance'/f'{config["revision"]}-fern-alpha.json').write_text(json.dumps(alpha_report,indent=2),encoding='utf-8')
print('FERN ALPHA CHECK',alpha_report['checks'],'passed',alpha_report['passed'])
if not alpha_report['passed']:raise RuntimeError('Fern source transparency was lost in delivery')

# Also exercise the exact source-colour fault on every alpha-bearing crown LOD.
# A valid alpha mask with black RGB was invisible to the earlier alpha-only test.
leaf_rows=[]
for model,stem in [('fern-0','fern_02'),('fern-1','fern_02'),('broadleaf','island_tree_01_leaves'),('broadleaf-low','island_tree_01_leaves'),('broadleaf-2','island_tree_02_leaves'),('pine','pine_sapling_small_twig'),('shrub','island_tree_01_leaves')]:
 path=R/f'public/models/vegetation/{model}.glb';data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+length]);start=28+length
 expected=Image.open(R/f'assets/processed/foliage-{config.get("foliageRevision",config["revision"])}/{stem}_rgba.png')
 expected_mean=ImageStat.Stat(expected.convert('RGB'),expected.getchannel('A').point(lambda x:255 if x>128 else 0)).mean
 for material in doc['materials']:
  if material.get('alphaMode') not in ['BLEND','MASK']:continue
  index=material['pbrMetallicRoughness']['baseColorTexture']['index'];entry=doc['images'][doc['textures'][index]['source']]
  if 'uri' in entry:blob=(path.parent/entry['uri']).read_bytes()
  else:
   view=doc['bufferViews'][entry['bufferView']];offset=start+view.get('byteOffset',0);blob=data[offset:offset+view['byteLength']]
  actual=Image.open(io.BytesIO(blob)).convert('RGBA');alpha=actual.getchannel('A')
  delivered=ImageStat.Stat(actual.convert('RGB'),alpha.point(lambda x:255 if x>128 else 0)).mean
  error=max(abs(a-b) for a,b in zip(delivered,expected_mean));extrema=alpha.getextrema()
  leaf_rows.append({'model':model,'material':material.get('name'),'sourceVisibleRgbMean':expected_mean,'deliveredVisibleRgbMean':delivered,'maximumMeanChannelError':error,'alphaExtrema':extrema,'passed':error<2 and max(delivered)>35 and extrema[0]<16 and extrema[1]>240})
leaf_report={'checks':len(leaf_rows),'passed':len(leaf_rows)==7 and all(r['passed'] for r in leaf_rows),'materials':leaf_rows,'method':'Compare opaque leaf-area RGB in every delivered alpha-bearing fern/tree/shrub LOD against the current packed source PNG, with2/255 mean-channel tolerance; require actual transparent and opaque alpha pixels.'}
(R/'reports/acceptance'/f'{config["revision"]}-vegetation-pixel-verification.json').write_text(json.dumps(leaf_report,indent=2),encoding='utf-8')
print('VEGETATION PIXEL CHECK',len(leaf_rows),'passed',leaf_report['passed'])
if not leaf_report['passed']:raise RuntimeError('A delivered crown or fern has lost its source colour or alpha')

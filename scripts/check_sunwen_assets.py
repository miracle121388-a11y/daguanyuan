"""Verify historical provenance, bounded planting and unchanged spatial APIs."""
import hashlib,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((R/p).read_text())
sha=lambda p:hashlib.sha256((R/p).read_bytes()).hexdigest()
checks=[]
def check(ok,message):
    if not ok:raise AssertionError(message)
    checks.append(message)

spec=read('config/garden.sunwen.json');layout=read('config/garden.layout.json')
manifest=read('public/scene-manifest.json');planting=read('config/sunwen.planting.json')
provenance=read('references/sunwen/provenance.json')
check(provenance['commit']==spec['referenceCommit'],'Reference commit pinned')
check(len(provenance['files'])==42 and not provenance['failures'],'42 full historical scans present')
for row in provenance['files']:
    raw=(R/row['file']).read_bytes()
    check(hashlib.sha256(raw).hexdigest()==row['sha256'],row['id']+' original SHA-256')
    check(hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==row['gitBlob'],row['id']+' Git blob identity')
check(manifest['assetRevision']==spec['assetRevision'],'Manifest revision')
web=lambda p:[p[0],p[2],-p[1]]
check(manifest['pathNodes']==[{**n,'position':web(n['position'])} for n in layout['pathNodes']],'All route nodes retained')
check(manifest['pathEdges']==layout['pathEdges'],'All route edges retained')
check(manifest['lake']==layout['terrain']['lake'],'Water boundary retained')
check({p['id']:p['position'] for p in manifest['places']}=={p['id']:web(p['position']) for p in layout['places']},'15 place identities and anchors retained')
check(150<=sum(p['species']!=3 for p in manifest['vegetation'])<=450 and sum(p['species']==3 for p in manifest['vegetation'])<=240,'Separated canopy groups and low shrub budget')
check(set(p['species'] for p in manifest['vegetation'])==set(range(8)),'Eight distinct authored crown forms')
check(len(manifest['groundCover'])<=spec['planting']['groundCoverLimit'] and len(manifest['understory'])<=spec['planting']['understoryLimit'],'Bounded groundcover and understory')
check(len(manifest['sunwenPlanting'])<=spec['planting']['perennialLimit'],'Layered perennial group budget')
for key in ['vegetation','groundCover','understory']:
    check(len(manifest[key])==len(planting[key]),key+' native/delivery instance count')
    for a,b in zip(manifest[key],planting[key]):
        check(max(abs(x-y) for x,y in zip(a['position'],b['position']))<.0002,key+' grounded position')
check(not any(abs(p['position'][0])<21 and 0<p['position'][2]<162 for p in manifest['vegetation']),'Ceremonial approach remains clear')
landscape=read('config/sunwen.landscape.json')
ground=read('public/textures/ground/garden-ground.webp.json')
check(ground['sourceSha256']==sha('config/sunwen.landscape.json'),'Ground surfaces match the authored bed plan')
for row in ground['files']:check(sha(row['file'])==row['sha256'],'Tended garden surface '+row['file'])
grounding=read('config/garden.grounding.json')
lo,hi=grounding['softLandFraction']
check(lo<ground['metrics']['dryLandSoftFraction']<hi,'Soft garden ground with retained stone courts and paths, excluding water')
check(ground['metrics']['rootsOnSoftGround']==len(manifest['vegetation']),'Every actual tree/shrub root sits in a soft planted field')
check(ground['designSha256']==sha('config/garden.grounding.json'),'Grounding design hash')
check(set(p['kind'] for p in manifest['sunwenPlanting'])=={'iris','peony','lotus','chrysanthemum','orchid'},'Five distinct flowering ground layers')
check(len(manifest['sunwenPlanting'])>500,'Abundant grouped perennials')
art=read('public/art/manifest.json')
check(len(art)==15 and all(p['kind']=='historical-painting' for p in art),'AI garden gallery fully replaced')
for p in art:
    check(sha('public/'+p['url'])==p['sha256'] and sha(p['sourceFile'])==p['sourceSha256'],p['id']+' gallery source and derivative')
atlas=read('public/textures/vegetation/canopy-atlas.webp.json')
check(atlas['rows']==8 and len(atlas['renders'])==40,'Forty views of the eight actual crown meshes')
for row in atlas['renders']:check(sha(row['file'])==row['sha256'],'Authored crown render '+row['file'])
check(sha('public/textures/vegetation/canopy-atlas.webp')==atlas['sha256'],'Packed crown atlas hash')
light=read('public/textures/landscape-light.webp.json')
check(light['sourceMasterSha256']==sha('blender/daguanyuan_master.blend'),'Shadows baked from the current saved master')
check(sha('public/textures/landscape-light.webp')==light['sha256'],'Current shadow atlas hash')
preservation=read('reports/acceptance/r17-native-preservation.json')
check(preservation['geometryAndTransformsUnchanged'] and preservation['protectedMeshCount']>=423,'Existing architecture and hand edits preserved')
ornament=read('reports/acceptance/r18-architecture.json' if (R/'config/sunwen.architecture.json').exists() else 'reports/acceptance/r17-ornaments.json')
check(sum(r['faces'] for r in ornament['records'])>10000,'Polychrome ornament is real editable geometry')
if spec.get('architectureRevision')=='r18':
    check(ornament['originalGeometryUnchanged'] and ornament['retainedOriginalMeshes']>=423,'r18 original geometry and Manual_Adjustments retained')
    design=read('config/sunwen.architecture.json')
    check(len(ornament['records'])==18,'Fifteen retained places and three supplementary scenes')
    check(len({row['motif'] for row in ornament['records']})>=10,'Distinct modeled window and rail motifs')
    check({p['id'] for p in manifest['architecturalScenes']}=={'zilingzhou','zhuijinlou','jiayintang'},'Three scenery assemblies remain separate from canon places')
    check(design['places']['yihongyuan']['richness']>design['places']['hengwuyuan']['richness']*5,'Ornament hierarchy distinguishes rich and restrained courts')
(R/f'reports/acceptance/{layout["assetRevision"].rsplit("-",1)[-1]}-integrity.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'counts':{k:len(manifest[k]) for k in ['vegetation','groundCover','understory','sunwenPlanting']},'referenceCommit':spec['referenceCommit']},ensure_ascii=False,indent=2)+'\n')
print('PASS',len(checks),'Sun Wen asset checks')

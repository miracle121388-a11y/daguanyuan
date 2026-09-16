"""Verify public TLS assets and authenticated CLI status; never export credentials."""
from pathlib import Path
import subprocess,json,hashlib,datetime,os
R=Path(__file__).resolve().parents[1]
host='daguanyuan-rumeng.zeabur.app'
fetch_timeout=int(os.environ.get('GARDEN_VERIFY_TIMEOUT_SECONDS','60'))
if not 1<=fetch_timeout<=600:raise ValueError('Invalid verification request timeout')
def cli(*args):
 result=subprocess.run(['npx.cmd' if os.name=='nt' else 'npx','--yes','zeabur@0.22.2',*args,'-i=false','--json'],check=True,capture_output=True,encoding='utf8')
 return json.loads(result.stdout)
deployment=cli('deployment','get','--env-id','6aa142fbda9bc245fba1e845','--service-id','6aa143296c3d9581b71560fa')
project=cli('project','get','--id','6aa142fb6c3d9581b71560ed')
domains=cli('domain','list','--env-id','6aa142fbda9bc245fba1e845','--id','6aa143296c3d9581b71560fa')
domain=next(d for d in domains if d['domain']==host)
assert deployment['status']=='RUNNING' and domain['status']=='PROVISIONED'
assert project['Region']['ID']=='server-6a8eee0bb11fb81fb4aaca05'
def curl(*args):
 return subprocess.run(['curl.exe' if os.name=='nt' else 'curl','--silent','--show-error','--fail','--retry','2','--retry-delay','1','--retry-all-errors','--max-time',str(fetch_timeout),*args],check=True,capture_output=True).stdout
dns=json.loads(curl(f'https://dns.google/resolve?name={host}&type=A'))
ip=next(x['data'] for x in dns['Answer'] if x['type']==1)
def get(path,head=False):
 return curl(*(['--head'] if head else []),'--resolve',f'{host}:443:{ip}','--compressed',f'https://{host}{path}')
health=json.loads(get('/healthz'));assert health['status']=='ok'
assert health['revision']==json.loads((R/'public/scene-manifest.json').read_text(encoding='utf8'))['assetRevision']
files=[]
art=json.loads((R/'public/art/manifest.json').read_text(encoding='utf8'))
shared=next((R/'public/textures/shared').glob('*.jpg')).relative_to(R/'public').as_posix()
for relative in ['models/overview.glb','models/overview-low.glb','models/vegetation/ground-cover.glb','textures/ground/soil.jpg','textures/ground/surface-zones.png','scene-manifest.json','models/places-low/xiaoxiangguan.glb','textures/vegetation/canopy-atlas.webp','textures/landscape-light.webp','textures/forest_grove.hdr','art/manifest.json',art[0]['url'],shared,'data/sources.json']:
 body=get('/'+relative);actual=hashlib.sha256(body).hexdigest();expected=hashlib.sha256((R/'public'/relative).read_bytes()).hexdigest()
 assert actual==expected,relative
 files.append({'path':relative,'sha256':actual,'bytes':len(body),'matchesLocal':True})
build=json.loads((R/'dist/.vite/manifest.json').read_text(encoding='utf8'))
bundles={'index.html'}
for entry in build.values():
 bundles.add(entry['file']);bundles.update(entry.get('css',[]));bundles.update(entry.get('assets',[]))
for relative in sorted(bundles):
 body=get('/'+relative);actual=hashlib.sha256(body).hexdigest();expected=hashlib.sha256((R/'dist'/relative).read_bytes()).hexdigest()
 assert actual==expected,relative
 files.append({'path':relative,'sha256':actual,'bytes':len(body),'matchesLocal':True})
headers=get('/',True).decode();assert '200' in headers.splitlines()[0]
assert 'content-security-policy:' in headers.lower()
smoke=json.loads((R/'reports/acceptance/production-smoke.json').read_text(encoding='utf8'))
assert smoke['url']==f'https://{host}/' and smoke['sceneVisible'] and not smoke['errors'] and not smoke['failed']
assert smoke['revision']==health['revision'] and smoke['planView']
report={'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':f'https://{host}/',
 'server':{'id':'6a8eee0bb11fb81fb4aaca05','name':'Aliyun California 4C 8GB','city':'Los Angeles','country':'US','regionId':'server-6a8eee0bb11fb81fb4aaca05'},
 'projectId':deployment['projectID'],'serviceId':deployment['serviceID'],'environmentId':deployment['environmentID'],'deploymentId':deployment['ID'],
 'cliDeploymentStatus':deployment['status'],'cliDomainStatus':domain['status'],'health':health,'files':files,'responseHeaders':headers,
 'dns':{'publicAddress':ip,'source':'Google DNS over HTTPS queried during this verification','browserOverrideUsed':bool(smoke['dnsOverride']),'osDnsChanged':False},
 'tlsVerificationEnabled':True,'browserQuicDisabled':smoke['quicDisabled'],'productionSmoke':'production-smoke.json',
 'requestTimeoutSeconds':fetch_timeout,'browserObservationTimeoutMs':smoke.get('observationTimeoutMs',90000),
 'desktopReadyMs':smoke.get('desktopReadyMs'),'mobileReadyMs':smoke['mobile'].get('readyMs'),
 'networkObservationReport':os.environ.get('GARDEN_NETWORK_REPORT'),
 'newServerPurchased':False,'credentialsIncluded':False}
target=R/'reports/acceptance/zeabur-deployment.json';temporary=target.with_suffix('.json.next');temporary.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');temporary.replace(target)
print(f'Live HTTPS verification passed: current asset revision, health, CSP, {len(files)} matching published files including current JS/CSS, desktop selection and touch browser smoke.')

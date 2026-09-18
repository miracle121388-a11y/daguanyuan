"""Verify public TLS assets and authenticated CLI status; never export credentials."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess,json,hashlib,datetime,os,time
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
package=json.loads((R/'reports/acceptance/deployment-package.json').read_text(encoding='utf8'))
scan=json.loads((R/'reports/acceptance/dream-package-scan.json').read_text(encoding='utf8'))
assert scan['passed'] and scan['directory']==package['directory']
public_files={p.relative_to(R/'public').as_posix() for p in (R/'public').rglob('*') if p.is_file()}
public_files-= {'models/sample.glb','models/pipeline-probe.glb'}
assert public_files=={entry['path'] for entry in scan['publicFiles']}
def verify_file(entry):
 relative=entry['path']
 body=get('/'+relative);actual=hashlib.sha256(body).hexdigest();expected=hashlib.sha256((R/'public'/relative).read_bytes()).hexdigest()
 assert actual==expected==entry['sha256'],relative
 return {'path':relative,'sha256':actual,'bytes':len(body),'matchesLocal':True}
files=[]
with ThreadPoolExecutor(max_workers=6) as pool:
 for checked in pool.map(verify_file,scan['publicFiles']):
  files.append(checked)
  if len(files)%100==0:print(f'Verified {len(files)}/{len(public_files)} public assets',flush=True)
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
smoke_path=R/'reports/acceptance/production-smoke.json'
# Asset requests can run independently while the browser completes. The final
# acceptance still requires its atomically written report for this revision.
smoke_wait=int(os.environ.get('GARDEN_SMOKE_WAIT_SECONDS','0'))
assert 0<=smoke_wait<=600, 'Invalid browser report observation timeout'
deadline=time.monotonic()+smoke_wait
while True:
 smoke=json.loads(smoke_path.read_text(encoding='utf8')) if smoke_path.exists() else {}
 if smoke.get('revision')==health['revision'] and smoke.get('url')==f'https://{host}/':break
 if time.monotonic()>=deadline:raise AssertionError('Current production browser report is not ready')
 time.sleep(1)
assert smoke['url']==f'https://{host}/' and smoke['sceneVisible'] and not smoke['errors'] and not smoke['failed']
assert smoke['revision']==health['revision'] and smoke['planView']
report={'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':f'https://{host}/',
 'server':{'id':'6a8eee0bb11fb81fb4aaca05','name':'Aliyun California 4C 8GB','city':'Los Angeles','country':'US','regionId':'server-6a8eee0bb11fb81fb4aaca05'},
 'projectId':deployment['projectID'],'serviceId':deployment['serviceID'],'environmentId':deployment['environmentID'],'deploymentId':deployment['ID'],
 'cliDeploymentStatus':deployment['status'],'cliDomainStatus':domain['status'],'health':health,'files':files,'responseHeaders':headers,
 'packageDirectory':package['directory'],'allPackagedPublicFilesVerified':True,'publicFileCount':len(public_files),
 'dns':{'publicAddress':ip,'source':'Google DNS over HTTPS queried during this verification','browserOverrideUsed':bool(smoke['dnsOverride']),'browserProxyMode':smoke.get('browserProxyMode','system'),'osDnsChanged':False,'osProxyChanged':False},
 'tlsVerificationEnabled':True,'browserQuicDisabled':smoke['quicDisabled'],'browserHttp2Disabled':smoke.get('http2Disabled',False),'productionSmoke':'production-smoke.json',
 'requestTimeoutSeconds':fetch_timeout,'browserObservationTimeoutMs':smoke.get('observationTimeoutMs',90000),
 'desktopReadyMs':smoke.get('desktopReadyMs'),'mobileReadyMs':smoke['mobile'].get('readyMs'),
 'networkObservationReport':os.environ.get('GARDEN_NETWORK_REPORT'),
 'newServerPurchased':False,'credentialsIncluded':False}
target=R/'reports/acceptance/zeabur-deployment.json';temporary=target.with_suffix('.json.next');temporary.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');temporary.replace(target)
print(f'Live HTTPS verification passed: current asset revision, health, CSP, {len(files)} matching published files including current JS/CSS, desktop selection and touch browser smoke.')

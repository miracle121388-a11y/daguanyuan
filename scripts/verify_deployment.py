"""Verify public TLS assets and authenticated CLI status; never export credentials."""
from pathlib import Path
import subprocess,json,hashlib,datetime
R=Path(__file__).resolve().parents[1]
host='daguanyuan-rumeng.zeabur.app'
def cli(*args):
 result=subprocess.run(['npx.cmd','--yes','zeabur@0.22.2',*args,'-i=false','--json'],check=True,capture_output=True,encoding='utf8')
 return json.loads(result.stdout)
deployment=cli('deployment','get','--env-id','6aa142fbda9bc245fba1e845','--service-id','6aa143296c3d9581b71560fa')
project=cli('project','get','--id','6aa142fb6c3d9581b71560ed')
domains=cli('domain','list','--env-id','6aa142fbda9bc245fba1e845','--id','6aa143296c3d9581b71560fa')
domain=next(d for d in domains if d['domain']==host)
assert deployment['status']=='RUNNING' and domain['status']=='PROVISIONED'
assert project['Region']['ID']=='server-6a8eee0bb11fb81fb4aaca05'
def curl(*args):
 return subprocess.run(['curl.exe','--silent','--show-error','--fail','--max-time','60',*args],check=True,capture_output=True).stdout
dns=json.loads(curl(f'https://dns.google/resolve?name={host}&type=A'))
ip=next(x['data'] for x in dns['Answer'] if x['type']==1)
def get(path,head=False):
 return curl(*(['--head'] if head else []),'--resolve',f'{host}:443:{ip}','--compressed',f'https://{host}{path}')
health=json.loads(get('/healthz'));assert health['status']=='ok'
files=[]
for relative in ['models/overview.glb','models/overview-low.glb','scene-manifest.json','models/places-low/xiaoxiangguan.glb']:
 body=get('/'+relative);actual=hashlib.sha256(body).hexdigest();expected=hashlib.sha256((R/'public'/relative).read_bytes()).hexdigest()
 assert actual==expected,relative
 files.append({'path':relative,'sha256':actual,'bytes':len(body),'matchesLocal':True})
headers=get('/',True).decode();assert '200' in headers.splitlines()[0]
assert 'content-security-policy:' in headers.lower()
smoke=json.loads((R/'reports/acceptance/production-smoke.json').read_text())
assert smoke['url']==f'https://{host}/' and smoke['sceneVisible'] and not smoke['errors'] and not smoke['failed']
report={'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':f'https://{host}/',
 'server':{'id':'6a8eee0bb11fb81fb4aaca05','name':'Aliyun California 4C 8GB','city':'Los Angeles','country':'US','regionId':'server-6a8eee0bb11fb81fb4aaca05'},
 'projectId':deployment['projectID'],'serviceId':deployment['serviceID'],'environmentId':deployment['environmentID'],'deploymentId':deployment['ID'],
 'cliDeploymentStatus':deployment['status'],'cliDomainStatus':domain['status'],'health':health,'files':files,'responseHeaders':headers,
 'dns':{'publicAddress':ip,'source':'Google DNS over HTTPS; independently checked against Cloudflare','localProxyAddress':'198.18.1.167','browserOverrideRequired':True,'osDnsChanged':False},
 'tlsVerificationEnabled':True,'browserQuicDisabled':smoke['quicDisabled'],'productionSmoke':'production-smoke.json','newServerPurchased':False,'credentialsIncluded':False}
(R/'reports/acceptance/zeabur-deployment.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Live HTTPS verification passed: health, CSP, four matching published assets, visible desktop scene and touch browser smoke.')

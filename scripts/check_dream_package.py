"""Inspect the exact upload package, including losslessly compressed JavaScript."""
from pathlib import Path
import json,hashlib,brotli,os,gzip
root=Path(__file__).resolve().parents[1]
meta=json.loads((root/'reports/acceptance/deployment-package.json').read_text(encoding='utf-8'))
package=root/meta['directory'];secrets=[]
env_file=root/'.env'
for line in (env_file.read_text(encoding='utf-8') if env_file.exists() else '').splitlines():
 if '=' not in line:continue
 key,value=line.split('=',1)
 if key.endswith(('_KEY','_TOKEN','_PASSWORD','_SECRET')) and value.strip():secrets.append(value.strip().strip('"').strip("'").encode())
if os.environ.get('GARDEN_SECRET_VALUES_FILE'):
 values=json.loads(Path(os.environ['GARDEN_SECRET_VALUES_FILE']).read_text(encoding='utf8'))
 assert isinstance(values,list) and all(isinstance(value,str) and value for value in values)
 secrets.extend(value.encode() for value in values)
secrets=list(set(secrets))
files=[]
for file in package.rglob('*'):
 if not file.is_file():continue
 raw=file.read_bytes();decoded=brotli.decompress(raw) if file.suffix=='.br' else gzip.decompress(raw) if file.suffix=='.gz' else raw
 assert not any(value in raw or value in decoded for value in secrets),'Credential in deployment package'
 assert file.name!='.env' and '.local' not in file.parts
 files.append({'path':file.relative_to(package).as_posix(),'sha256':hashlib.sha256(raw).hexdigest()})
for source in (root/'server').glob('*.mjs'):
 assert (package/'server'/source.name).read_bytes()==source.read_bytes()
assert (package/'server.mjs').read_bytes()==(root/'server.mjs').read_bytes()
assert 'server/start.mjs' in (package/'Dockerfile').read_text()
aliases=json.loads((package/'dist/asset-aliases.json').read_text(encoding='utf8'))
build_manifest=package/'deploy-assets.json'
build_assets=json.loads(build_manifest.read_text(encoding='utf8'))['files'] if build_manifest.exists() else []
remote_files={entry['path']:entry for entry in build_assets}
if build_assets:
 assert os.environ.get('GARDEN_HYDRATED_DIST'), 'Run build-time restoration before verifying a split upload'
 assert (package/'hydrate-assets.mjs').read_bytes()==(root/'scripts/hydrate_deploy_assets.mjs').read_bytes()
 assert 'RUN node hydrate-assets.mjs' in (package/'Dockerfile').read_text()
def stored_bytes(relative):
 relative=aliases.get(relative,relative)
 if relative in remote_files:
  data=(Path(os.environ['GARDEN_HYDRATED_DIST'])/relative).read_bytes()
  assert hashlib.sha256(data).hexdigest()==remote_files[relative]['sha256'] and len(data)==remote_files[relative]['bytes']
  assert not any(value in data for value in secrets),'Credential in restored build asset'
  return data
 stored=package/'dist'/relative
 if stored.exists():return stored.read_bytes()
 if Path(str(stored)+'.br').exists():return brotli.decompress(Path(str(stored)+'.br').read_bytes())
 return gzip.decompress(Path(str(stored)+'.gz').read_bytes())
public_files=[]
for source in sorted((root/'public').rglob('*')):
 if not source.is_file():continue
 relative=source.relative_to(root/'public').as_posix()
 if relative in ['models/sample.glb','models/pipeline-probe.glb']:continue
 expected=source.read_bytes()
 assert stored_bytes(relative)==expected,relative
 public_files.append({'path':relative,'sha256':hashlib.sha256(expected).hexdigest(),'bytes':len(expected)})
build=json.loads((root/'dist/.vite/manifest.json').read_text(encoding='utf8'))
bundles={'index.html'}
for entry in build.values():
 bundles.add(entry['file']);bundles.update(entry.get('css',[]));bundles.update(entry.get('assets',[]))
for relative in bundles:
 actual=stored_bytes(relative)
 assert actual==(root/'dist'/relative).read_bytes(),relative
references=json.loads((root/'data/canon/dreamReferences.json').read_text(encoding='utf8'))
for ref in references['refs']:
 assert hashlib.sha256(stored_bytes(ref['path'])).hexdigest()==ref['sha256']
 assert (package/'dist'/(ref['path']+'.json')).read_bytes()==(root/'public'/(ref['path']+'.json')).read_bytes()
assert (package/'dist/data/dreamReferences.json').read_bytes()==(root/'public/data/dreamReferences.json').read_bytes()
(root/'reports/acceptance/dream-package-scan.json').write_text(json.dumps({'directory':meta['directory'],'files':files,'publicFiles':public_files,'buildAssetsVerified':len(build_assets),'credentialsFound':False,'knownSecretValuesChecked':len(secrets),'decodedBrotliChecked':True,'matchesCompletedBuild':True,'referencesMatched':len(references['refs']),'count':len(files),'passed':True},indent=2),encoding='utf-8')
print('PASS package scan:',len(files),'stored files;',len(public_files),'public resources byte-identical;',len(secrets),'known credentials checked')

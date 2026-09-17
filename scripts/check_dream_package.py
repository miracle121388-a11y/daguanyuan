"""Inspect the exact upload package, including losslessly compressed JavaScript."""
from pathlib import Path
import json,hashlib,brotli
root=Path(__file__).resolve().parents[1]
meta=json.loads((root/'reports/acceptance/deployment-package.json').read_text(encoding='utf-8'))
package=root/meta['directory'];secrets=[]
for line in (root/'.env').read_text(encoding='utf-8').splitlines():
 if '=' not in line:continue
 key,value=line.split('=',1)
 if key.endswith(('_KEY','_TOKEN')) and value.strip():secrets.append(value.strip().strip('"').strip("'").encode())
files=[]
for file in package.rglob('*'):
 if not file.is_file():continue
 raw=file.read_bytes();decoded=brotli.decompress(raw) if file.suffix=='.br' else raw
 assert not any(value in raw or value in decoded for value in secrets),'Credential in deployment package'
 assert file.name!='.env' and '.local' not in file.parts
 files.append({'path':file.relative_to(package).as_posix(),'sha256':hashlib.sha256(raw).hexdigest()})
for name in ['dream-api.mjs','dream-provider.mjs','dream-download.mjs','dream-prompts.mjs','start.mjs']:
 assert (package/'server'/name).read_bytes()==(root/'server'/name).read_bytes()
assert 'server/start.mjs' in (package/'Dockerfile').read_text()
(root/'reports/acceptance/dream-package-scan.json').write_text(json.dumps({'directory':meta['directory'],'files':files,'credentialsFound':False,'decodedBrotliChecked':True,'count':len(files),'passed':True},indent=2),encoding='utf-8')
print('PASS package scan:',len(files),'files, including decoded JavaScript; no credentials')

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
for name in ['dream-api.mjs','dream-provider.mjs','dream-download.mjs','dream-prompts.mjs','dream-style.mjs','dream-references.mjs','dream-cards.mjs','dream-scene-plan.mjs','start.mjs']:
 assert (package/'server'/name).read_bytes()==(root/'server'/name).read_bytes()
assert 'server/start.mjs' in (package/'Dockerfile').read_text()
build=json.loads((root/'dist/.vite/manifest.json').read_text(encoding='utf8'))
bundles={'index.html'}
for entry in build.values():
 bundles.add(entry['file']);bundles.update(entry.get('css',[]));bundles.update(entry.get('assets',[]))
for relative in bundles:
 stored=package/'dist'/relative
 actual=stored.read_bytes() if stored.exists() else brotli.decompress(Path(str(stored)+'.br').read_bytes())
 assert actual==(root/'dist'/relative).read_bytes(),relative
references=json.loads((root/'data/canon/dreamReferences.json').read_text(encoding='utf8'))
for ref in references['refs']:
 assert hashlib.sha256((package/'dist'/ref['path']).read_bytes()).hexdigest()==ref['sha256']
 assert (package/'dist'/(ref['path']+'.json')).read_bytes()==(root/'public'/(ref['path']+'.json')).read_bytes()
assert (package/'dist/data/dreamReferences.json').read_bytes()==(root/'public/data/dreamReferences.json').read_bytes()
(root/'reports/acceptance/dream-package-scan.json').write_text(json.dumps({'directory':meta['directory'],'files':files,'credentialsFound':False,'decodedBrotliChecked':True,'matchesCompletedBuild':True,'referencesMatched':len(references['refs']),'count':len(files),'passed':True},indent=2),encoding='utf-8')
print('PASS package scan:',len(files),'files, including decoded JavaScript; no credentials')

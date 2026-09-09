from pathlib import Path
import requests, re, hashlib, zipfile, json, platform, subprocess
ROOT=Path(__file__).resolve().parents[1]
for p in ['.tools','config','docs','references/licenses','references/upstream-notes','assets/source','assets/processed','blender','data/raw','data/canon','data/pending','data/staged','public/models/places','public/textures','public/data','src/scene','src/navigation','src/state','src/data','src/providers','src/styles','reports/blender','reports/browser','reports/assets','reports/acceptance']:
 (ROOT/p).mkdir(parents=True,exist_ok=True)
base='https://download.blender.org/release/Blender4.5/'
name='blender-4.5.9-windows-x64.zip'
checks=requests.get(base+'blender-4.5.9.sha256',timeout=30);checks.raise_for_status()
(ROOT/'references/upstream-notes/blender-4.5.9.sha256').write_text(checks.text)
expected=next(l.split()[0] for l in checks.text.splitlines() if name in l)
target=ROOT/'.tools'/name
if not target.exists():
 with requests.get(base+name,timeout=(30,90),stream=True) as r:
  r.raise_for_status()
  with target.open('wb') as f:
   for chunk in r.iter_content(1024*1024):f.write(chunk)
assert hashlib.sha256(target.read_bytes()).hexdigest()==expected,'Blender checksum mismatch'
print('Blender archive checksum verified',flush=True)
if not (ROOT/'.tools/blender-4.5.9-windows-x64/blender.exe').exists():
 with zipfile.ZipFile(target) as z:z.extractall(ROOT/'.tools')
print(subprocess.check_output([str(ROOT/'.tools/blender-4.5.9-windows-x64/blender.exe'),'--version'],text=True),flush=True)

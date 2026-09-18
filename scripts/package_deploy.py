"""Package only the reviewed static website and its tiny HTTP server."""
from pathlib import Path
import shutil,gzip,json,datetime,hashlib,os,subprocess,re
try:import brotli
except ImportError:brotli=None
R=Path(__file__).resolve().parents[1];target=(R/'.deploy'/('reference-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S-%f'))).resolve();output=target/'dist'
assert target.parent==R/'.deploy' and output.resolve().parent==target
target.mkdir(parents=True,exist_ok=False)
# Use the exact current Vite manifest and validated public tree. Old Windows
# build snapshots can retain unreferenced hashed files after directory cleanup.
shutil.copytree(R/'public',output);shutil.copy2(R/'dist/index.html',output/'index.html');(output/'assets').mkdir()
build=json.loads((R/'dist/.vite/manifest.json').read_text(encoding='utf8'));bundles=set()
for entry in build.values():bundles.add(entry['file']);bundles.update(entry.get('css',[]));bundles.update(entry.get('assets',[]))
for file in bundles:
 assert file.startswith('assets/') and '..' not in Path(file).parts
 shutil.copy2(R/'dist'/file,output/file)
shutil.copy2(R/'server.mjs',target/'server.mjs')
(target/'server').mkdir()
for server_file in (R/'server').glob('*.mjs'):shutil.copy2(server_file,target/'server'/server_file.name)
for name in ['sample.glb','pipeline-probe.glb']:(output/'models'/name).unlink(missing_ok=True)
# Identical LOD files need only one stored copy. Both public URLs continue to
# return the original bytes; source models in Git are left intact.
seen={};aliases={}
for model in sorted((output/'models').rglob('*.glb')):
 with model.open('rb') as stream:digest=hashlib.file_digest(stream,'sha256').hexdigest()
 relative=model.relative_to(output).as_posix()
 if digest in seen:aliases[relative]=seen[digest];model.unlink()
 else:seen[digest]=relative
(output/'asset-aliases.json').write_text(json.dumps(aliases,indent=2),encoding='utf-8')
(target/'Dockerfile').write_text('FROM node:24-alpine\nWORKDIR /app\nCOPY dist ./dist\nCOPY server.mjs ./server.mjs\nCOPY server ./server\nENV NODE_ENV=production\nENV PORT=3000\nEXPOSE 3000\nCMD ["node", "server/start.mjs"]\n')
raw=compressed=0
for f in list(output.rglob('*')):
 if not f.is_file():continue
 data=f.read_bytes();raw+=len(data)
 # GLB storage stays lossless. The server serves Brotli directly or decodes
 # the identical GLB for clients requesting gzip/identity.
 if f.suffix in ['.glb','.js','.wasm'] and brotli:
  packed=brotli.compress(data,quality=8);Path(str(f)+'.br').write_bytes(packed);f.unlink();compressed+=len(packed);continue
 # Text retains its raw fallback; the larger binary assets use one copy.
 if f.suffix in ['.html','.js','.css','.json','.wasm']:
  if brotli:
   packed=brotli.compress(data,quality=6);Path(str(f)+'.br').write_bytes(packed);compressed+=len(packed)
  else:
   gz=gzip.compress(data,compresslevel=9,mtime=0);Path(str(f)+'.gz').write_bytes(gz);compressed+=len(gz)
 else:compressed+=len(data)
upload_bytes=sum(f.stat().st_size for f in target.rglob('*') if f.is_file())
budget_mib=int(os.environ.get('GARDEN_DEPLOY_MAX_MIB','50'))
assert 1<=budget_mib<=1024, 'Invalid deployment package budget'
build_assets=[]
if upload_bytes>=budget_mib*1048576:
 # Keep every model and pixel. Oversized releases restore some public images
 # during Docker build, from an exact Git commit with mandatory SHA-256 checks.
 # Only Git-tracked, unchanged, non-LFS images qualify. No credentials or
 # external runtime URLs are included, and two MiB remain for ZIP overhead.
 def git(*args):return subprocess.check_output(['git',*args],cwd=R)
 commit=git('rev-parse','HEAD').decode().strip()
 origin=git('remote','get-url','origin').decode().strip()
 match=re.fullmatch(r'https://github\.com/([\w.-]+/[\w.-]+?)(?:\.git)?/?',origin)
 assert match, 'Pinned asset hydration requires the public GitHub HTTPS origin'
 repository=match.group(1)
 for f in sorted((f for f in output.rglob('*') if f.suffix in ['.webp','.jpg','.png']),key=lambda f:f.stat().st_size,reverse=True):
  if upload_bytes<max(1,budget_mib-2)*1048576:break
  relative=f.relative_to(output).as_posix();data=f.read_bytes()
  try:committed=git('show',f'{commit}:public/{relative}')
  except subprocess.CalledProcessError:continue
  if committed!=data:continue
  build_assets.append({'path':relative,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'url':f'https://raw.githubusercontent.com/{repository}/{commit}/public/{relative}'})
  f.unlink();upload_bytes-=len(data)
 assert build_assets, 'No unchanged public images available for build-time restoration'
 (target/'deploy-assets.json').write_text(json.dumps({'repository':repository,'commit':commit,'files':build_assets},indent=2)+'\n',encoding='utf8')
 shutil.copy2(R/'scripts/hydrate_deploy_assets.mjs',target/'hydrate-assets.mjs')
 docker=target/'Dockerfile'
 docker.write_text(docker.read_text().replace('COPY dist ./dist\n','COPY dist ./dist\nCOPY deploy-assets.json hydrate-assets.mjs ./\nRUN node hydrate-assets.mjs && rm deploy-assets.json hydrate-assets.mjs\n'))
 upload_bytes=sum(f.stat().st_size for f in target.rglob('*') if f.is_file())
assert upload_bytes<budget_mib*1048576, f'Deployment package exceeds {budget_mib} MiB budget: {upload_bytes}'
(R/'reports/acceptance/deployment-package.json').write_text(json.dumps({'directory':target.relative_to(R).as_posix(),'contents':['dist/','server.mjs','server/*.mjs','Dockerfile']+(['deploy-assets.json','hydrate-assets.mjs'] if build_assets else []),'rawBytes':raw,'compressedBytes':compressed,'uploadDirectoryBytes':upload_bytes,'uploadDirectoryBudgetMiB':budget_mib,'buildAssets':build_assets,'precompressedExtensions':['html','js','css','json','wasm'],'precompressedFormat':'br' if brotli else 'gzip','packedOnlyExtensions':['glb','js','wasm'] if brotli else [],'packedBinaryIdentity':'server returns losslessly decoded original bytes; no raw duplicate in upload' if brotli else None,'gzipFallback':'bounded runtime cache' if brotli else 'precompressed','brotli':bool(brotli),'contentAliases':aliases,'privateFilesIncluded':False,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat()},indent=2))
print('Deployment package:',round(raw/1048576,2),'MiB raw;',round(upload_bytes/1048576,2),'MiB upload directory;',round(compressed/1048576,2),'MiB transfer;',len(aliases),'identical model aliases; budget',budget_mib,'MiB')
if build_assets:print('Pinned build-time images:',len(build_assets),'; unchanged bytes:',sum(asset['bytes'] for asset in build_assets),'; commit:',commit)

"""Package only the reviewed static website and its tiny HTTP server."""
from pathlib import Path
import shutil,gzip,json,datetime,hashlib
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
shutil.copy2(R/'server/simulation-api.mjs',target/'server/simulation-api.mjs')
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
(target/'Dockerfile').write_text('FROM node:24-alpine\nWORKDIR /app\nCOPY dist ./dist\nCOPY server.mjs ./server.mjs\nCOPY server ./server\nENV NODE_ENV=production\nENV PORT=3000\nEXPOSE 3000\nUSER node\nCMD ["node", "server.mjs"]\n')
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
assert upload_bytes<50*1048576, f'Deployment package exceeds 50 MiB: {upload_bytes}'
(R/'reports/acceptance/deployment-package.json').write_text(json.dumps({'directory':target.relative_to(R).as_posix(),'contents':['dist/','server.mjs','server/simulation-api.mjs','Dockerfile'],'rawBytes':raw,'compressedBytes':compressed,'uploadDirectoryBytes':upload_bytes,'precompressedExtensions':['html','js','css','json','wasm'],'precompressedFormat':'br' if brotli else 'gzip','packedOnlyExtensions':['glb','js','wasm'] if brotli else [],'packedBinaryIdentity':'server returns losslessly decoded original bytes; no raw duplicate in upload' if brotli else None,'gzipFallback':'bounded runtime cache' if brotli else 'precompressed','brotli':bool(brotli),'contentAliases':aliases,'privateFilesIncluded':False,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat()},indent=2))
print('Deployment package:',round(raw/1048576,2),'MiB raw;',round(upload_bytes/1048576,2),'MiB upload directory;',round(compressed/1048576,2),'MiB transfer;',len(aliases),'identical model aliases')

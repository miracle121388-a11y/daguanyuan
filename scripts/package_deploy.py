"""Package only the reviewed static website and its tiny HTTP server."""
from pathlib import Path
import shutil,gzip,json,datetime
try:import brotli
except ImportError:brotli=None
R=Path(__file__).resolve().parents[1];target=(R/'.deploy').resolve();output=target/'dist'
assert target==R/'.deploy' and output.resolve().parent==target
target.mkdir(exist_ok=True)
if output.exists():shutil.rmtree(output)
shutil.copytree(R/'dist',output);shutil.copy2(R/'server.mjs',target/'server.mjs')
for name in ['sample.glb','pipeline-probe.glb']:(output/'models'/name).unlink(missing_ok=True)
(target/'Dockerfile').write_text('FROM node:24-alpine\nWORKDIR /app\nCOPY dist ./dist\nCOPY server.mjs ./server.mjs\nENV NODE_ENV=production\nENV PORT=3000\nEXPOSE 3000\nUSER node\nCMD ["node", "server.mjs"]\n')
raw=compressed=0
for f in list(output.rglob('*')):
 if not f.is_file():continue
 data=f.read_bytes();raw+=len(data)
 # GLBs already contain Draco-compressed geometry; shipping three copies wastes
 # the deployment upload budget for little transfer benefit.
 if f.suffix in ['.html','.js','.css','.json','.wasm']:
  gz=gzip.compress(data,compresslevel=9,mtime=0);Path(str(f)+'.gz').write_bytes(gz)
  if brotli:
   packed=brotli.compress(data,quality=6);Path(str(f)+'.br').write_bytes(packed);compressed+=len(packed)
  else:compressed+=len(gz)
 else:compressed+=len(data)
upload_bytes=sum(f.stat().st_size for f in target.rglob('*') if f.is_file())
assert upload_bytes<50*1048576, f'Deployment package exceeds 50 MiB: {upload_bytes}'
(R/'reports/acceptance/deployment-package.json').write_text(json.dumps({'directory':'.deploy','contents':['dist/','server.mjs','Dockerfile'],'rawBytes':raw,'compressedBytes':compressed,'uploadDirectoryBytes':upload_bytes,'precompressedExtensions':['html','js','css','json','wasm'],'brotli':bool(brotli),'privateFilesIncluded':False,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat()},indent=2))
print('Deployment package:',round(raw/1048576,2),'MiB raw;',round(upload_bytes/1048576,2),'MiB upload directory;',round(compressed/1048576,2),'MiB transfer')

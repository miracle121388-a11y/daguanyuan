"""Read-only verification of the current Alibaba Cloud deployment (run in Conda)."""
import json, subprocess, hashlib
from pathlib import Path
R = Path(__file__).resolve().parents[1]
TARGET = json.loads((R / 'deploy/aliyun/target.json').read_text())
def remote(command):
    result = subprocess.run(['workbench', 'exec', '-P', TARGET['profile'], '-r', TARGET['region'], '-i', TARGET['instance'], '-c', command, '--output', 'json'], check=True, capture_output=True, text=True)
    response = json.loads(result.stdout)
    assert response['exit_code'] == 0, 'Remote verification failed'
    return response.get('stdout') or response.get('output') or ''
def get(path):
    return subprocess.check_output(['curl', '--fail', '--silent', '--show-error', '--compressed', '--max-time', '60', TARGET['url'] + path])
assert json.loads(get('/healthz'))['status'] == 'ok'
docker = 'docker -H ' + TARGET['dockerHost']
assert json.loads(remote(docker + ' inspect daguanyuan'))[0]['State']['Health']['Status'] == 'healthy'
manifest = json.loads((R / 'dist/.vite/manifest.json').read_text())
files = {'index.html', 'reading.html', 'scene-manifest.json', 'asset-index.json'}
for item in manifest.values():
    files.add(item['file'])
    files.update(item.get('css', []))
    files.update(item.get('assets', []))
for path in sorted(files):
    assert hashlib.sha256(get('/' + path)).digest() == hashlib.sha256((R / 'dist' / path).read_bytes()).digest(), path
for path in ['/migrate.html', '/migration.js', '/.env', '/server/private-corpus/guiyou108/manifest.json']:
    code = subprocess.check_output(['curl', '-sS', '--max-time', '30', '-o', '/dev/null', '-w', '%{http_code}', TARGET['url'] + path]).decode()
    assert code == '404', (path, code)
print(f'Current ECS healthy; {len(files)} HTTPS files match; obsolete/private paths return 404.')

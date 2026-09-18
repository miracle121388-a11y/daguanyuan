// Build-time only: restore pinned public images and reject any byte mismatch.
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, dirname, sep} from 'node:path';
import {createHash} from 'node:crypto';

const manifest = JSON.parse(await readFile('deploy-assets.json', 'utf8'));
const output = resolve(process.env.GARDEN_HYDRATE_DIST || 'dist');
await mkdir(output, {recursive: true});
const restore = async asset => {
  const file = resolve(output, asset.path), url = new URL(asset.url);
  if (!file.startsWith(output + sep) || url.protocol !== 'https:' || url.hostname !== 'raw.githubusercontent.com' ||
      !url.pathname.startsWith(`/${manifest.repository}/${manifest.commit}/public/`)) throw Error('Invalid pinned asset');
  const valid = body => body.length === asset.bytes && createHash('sha256').update(body).digest('hex') === asset.sha256;
  try {if (valid(await readFile(file))) return;} catch { /* First build has no cached file. */ }
  let body;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {signal: AbortSignal.timeout(60000)});
      if (!response.ok) throw Error(`HTTP ${response.status}: ${asset.path}`);
      body = Buffer.from(await response.arrayBuffer());
      if (!valid(body)) throw Error(`Asset hash mismatch: ${asset.path}`);
      break;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  await mkdir(dirname(file), {recursive: true});
  await writeFile(file, body);
  console.log(`Verified build asset: ${asset.path}`);
};
for (let offset = 0; offset < manifest.files.length; offset += 4) await Promise.all(manifest.files.slice(offset, offset + 4).map(restore));
console.log(`Restored ${manifest.files.length} pinned images; runtime remains fully local.`);

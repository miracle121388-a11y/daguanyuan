import {afterEach, expect, it} from 'vitest';
import {cp, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {dirname, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import sharp from 'sharp';

const repository = resolve('.'), roots = [];
const json = async path => JSON.parse(await readFile(path, 'utf8'));
async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), 'daguanyuan-dream-sources-'));
  roots.push(root);
  for (const path of ['config/dream.references.json', 'data/canon/comicArt.json', 'public/comics', 'public/art/manifest.json', 'references/dream-scene-sources']) {
    await mkdir(dirname(resolve(root, path)), {recursive: true});
    await cp(resolve(repository, path), resolve(root, path), {recursive: true});
  }
  return root;
}
const generate = root => spawnSync(process.execPath, [resolve(repository, 'scripts/prepare_dream_references.mjs')], {cwd: root, encoding: 'utf8', timeout: 30000});
afterEach(async () => {for (const root of roots.splice(0)) await rm(root, {recursive: true, force: true});});

it('rebuilds the comic references from archived sources while retaining the Sun Wen gallery', async () => {
  const root = await fixture(), gallery = await readFile(resolve(root, 'public/art/manifest.json'));
  expect(JSON.parse(gallery).every(item => item.kind === 'historical-painting' && item.artist === '孙温')).toBe(true);
  const result = generate(root);
  expect(result.status, result.stderr).toBe(0);
  expect(await readFile(resolve(root, 'public/art/manifest.json'))).toEqual(gallery);
  const rebuilt = await json(resolve(root, 'data/canon/dreamReferences.json'));
  expect(rebuilt.refs).toHaveLength(21);
  const scenes = rebuilt.refs.filter(ref => ref.role === 'scene');
  expect(scenes).toHaveLength(5);
  for (const ref of scenes) {
    expect(ref.sources[0].catalog).toBe('references/dream-scene-sources/manifest.json');
    expect(ref.sources[0].originalCatalog).toBe('public/art/manifest.json');
    // Archive paths change EXIF provenance; the actual image pixels must remain identical.
    // Buffer input avoids libvips retaining Windows file handles after decoding.
    const generated = await sharp(await readFile(resolve(root, 'public', ref.path))).raw().toBuffer();
    expect(generated).toEqual(await sharp(await readFile(resolve(repository, 'public', ref.path))).raw().toBuffer());
  }
}, 45000);

it('rejects a modified archived scene instead of borrowing a historical gallery picture', async () => {
  const root = await fixture(), entries = await json(resolve(root, 'references/dream-scene-sources/manifest.json'));
  await writeFile(resolve(root, entries[0].archivePath), 'invalid archived image');
  const result = generate(root);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Unreviewed place source: xiaoxiangguan');
}, 45000);

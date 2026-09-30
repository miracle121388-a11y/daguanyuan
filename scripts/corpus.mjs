import {readFileSync, readdirSync, mkdirSync, copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, dirname} from 'node:path';

const root = resolve('data/canon/corpus');
const read = p => readFileSync(resolve(root, p));
const hash = data => createHash('sha256').update(data).digest('hex');
export function verifyCorpus() {
  const manifest = JSON.parse(read('manifest.json'));
  if (manifest.reviewStatus !== 'source_checked' || manifest.chapters.length !== 120) throw Error('Unreviewed or incomplete corpus');
  for (const [i, chapter] of manifest.chapters.entries()) {
    if (chapter.chapter !== i + 1 || chapter.path !== `chapters/${String(i + 1).padStart(3, '0')}.txt`) throw Error('Chapter sequence');
    if (hash(readFileSync(chapter.rawPath)) !== chapter.rawSha256) throw Error('Raw chapter hash');
    const expected = chapter.title + '\n\n' + chapter.paragraphs.map(p => p.text).join('\n\n') + '\n';
    if (read(chapter.path).toString('utf8') !== expected || hash(read(chapter.path)) !== chapter.sha256) throw Error('Chapter text/index mismatch');
    if (chapter.paragraphs.some((p, j) => p.id !== `collated-${String(i + 1).padStart(3, '0')}-p${String(j + 1).padStart(4, '0')}`)) throw Error('Paragraph IDs');
  }
  for (const [edition, count] of [['original80', 80], ['cheng120', 120]]) {
    const expected = manifest.chapters.slice(0, count).map(c => read(c.path).toString('utf8')).join('\n');
    if (read(`${edition}.txt`).toString('utf8') !== expected) throw Error('Edition text mismatch');
  }
  if (manifest.editions.find(e => e.id === 'guiyou108')?.status !== 'missing_fulltext') throw Error('Guiyou provenance requires separate review');
  const archive = JSON.parse(read('archive.json'));
  const files = [...manifest.files, archive];
  for (const file of files) {
    if (!/^(chapters\/\d{3}\.txt|original80\.txt|cheng120\.txt|NOTICE\.txt|guiyou108-status\.json|daguanyuan-texts\.zip)$/.test(file.path)) throw Error('Corpus path');
    const data = read(file.path);
    if (hash(data) !== file.sha256 || data.length !== file.bytes) throw Error(`Corpus hash: ${file.path}`);
  }
  const allowed = [...files.map(f => f.path), 'manifest.json', 'archive.json'];
  const walk = (dir, prefix = '') => readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(resolve(dir, e.name), prefix + e.name + '/') : [prefix + e.name]);
  if (walk(root).some(p => !allowed.includes(p))) throw Error('Unexpected corpus file');
  return allowed;
}
export function publishCorpus() {
  const files = verifyCorpus();
  for (const path of files) {
    const dest = resolve('public/data/corpus', path);
    mkdirSync(dirname(dest), {recursive: true});
    copyFileSync(resolve(root, path), dest);
  }
}

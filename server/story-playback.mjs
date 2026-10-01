import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {draftReferences, loadCorpus, searchCorpus} from './literary-corpus.mjs';

const hash = data => createHash('sha256').update(data).digest('hex');
const books = new Map();
export const defaultGuiyouRoot = () => resolve(existsSync('server/private-corpus/guiyou108/manifest.json') ? 'server/private-corpus/guiyou108' : '.local/corpus/guiyou108');
// Bound to the reviewed user PDF, never substituted with another continuation.
const pdfHash = 'bc2fdebcca79d05b6bc1db22d3ae3696f2a97fb3e15b263a6f7515cf1086dd77';
const textHash = 'e37f8c440bd38da412302925dab7d7e1033f06ffbc00aa756c1a927620ba7fcf';
/** Annotations and editorial guesses are not events in the novel. */
export function narrativeText(text) {
  return text.replace(/【[^【】]*(?:【[^【】]*】[^【】]*)*】/gs, '')
    .replace(/\[(?:批语|回前批|按|另有批语)[^\]]*\]/gs, '')
    .replace(/（此条批语真假未知）/g, '').trim();
}
export function loadGuiyou(root = defaultGuiyouRoot()) {
  const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
  if (manifest.reviewStatus !== 'extraction_checked' || manifest.distribution !== 'private_import_only'
      || manifest.source.sha256 !== pdfHash || manifest.chapters.length !== 108) throw Error('Unreviewed Guiyou source');
  const chapters = manifest.chapters.map((c, i) => {
    if (c.chapter !== i + 1 || c.path !== `chapters/${String(i + 1).padStart(3, '0')}.txt`) throw Error('Guiyou chapter sequence');
    const raw = readFileSync(resolve(root, c.path));
    if (hash(raw) !== c.sha256) throw Error('Guiyou chapter hash');
    const text = narrativeText(raw.toString('utf8'));
    return {...c, raw: raw.toString('utf8'), paragraphs: text.split(/\n\s*\n/).filter(Boolean).map((text, j) => ({id: `guiyou-${i + 1}-p${j + 1}`, text})), url: null};
  });
  if (hash(chapters.map(c => c.raw).join('\n')) !== textHash) throw Error('Guiyou full text hash');
  return {...manifest, sourceEdition: 'user-pdf-guiyou108', editions: [{id: 'guiyou108', status: 'available', lastChapter: 108}], chapters};
}
function book(editionId, corpusRoot, guiyouRoot) {
  const root = editionId === 'guiyou108' ? guiyouRoot ?? defaultGuiyouRoot() : corpusRoot ?? resolve('dist/data/corpus');
  const key = `${editionId}:${resolve(root)}`;
  if (!books.has(key)) books.set(key, editionId === 'guiyou108' ? loadGuiyou(root) : loadCorpus(root));
  return books.get(key);
}
export function playbackSource(editionId, chapter, corpusRoot, guiyouRoot) {
  if (!['cheng120', 'guiyou108'].includes(editionId) || !Number.isInteger(chapter) || chapter < 81
      || chapter > (editionId === 'cheng120' ? 120 : 108)) throw Error('Invalid playback chapter');
  const manifest = book(editionId, corpusRoot, guiyouRoot);
  const c = manifest.chapters.find(c => c.chapter === chapter);
  if (!c) throw Error('Missing playback chapter');
  return {chapter, title: c.title, sourceEdition: manifest.sourceEdition, sha256: c.sha256,
    text: c.paragraphs.map(p => p.text).join('\n\n'), notesExcluded: editionId === 'guiyou108',
    scope: '仅此回叙事正文；不提供后续回目，不将批语、预言或编者意见当作已发生剧情。'};
}
export function guiyouReferences(payload, guiyouRoot) {
  try {
    const manifest = book('guiyou108', undefined, guiyouRoot), through = payload.source.through;
    const c = manifest.chapters.find(c => c.chapter === through);
    if (!c) throw Error('Missing Guiyou endpoint');
    let remaining = 6000;
    const endpoint = c.paragraphs.slice().reverse().flatMap(p => {
      if (!remaining) return [];
      const startOffset = Math.max(0, p.text.length - remaining); remaining -= p.text.length - startOffset;
      return [{editionId: 'guiyou108', sourceEdition: manifest.sourceEdition, chapter: through, paragraphId: p.id,
        text: p.text.slice(startOffset), startOffset, endOffset: p.text.length, sha256: c.sha256,
        path: `private-corpus/guiyou108/${c.path}`, url: null, truncated: startOffset > 0}];
    }).reverse();
    return {status: 'available', endpoint, verificationExcerpts:draftReferences(manifest,payload).map(p=>({...p,path:`private-corpus/guiyou108/chapters/${String(p.chapter).padStart(3,'0')}.txt`})), excerpts: searchCorpus(manifest, {editionId: 'guiyou108', maxChapter: through - 1,
      query: [payload.memory, ...payload.threads, ...payload.stageActors.map(a => a.name)].join(' '), limit: 3}).map(p=>({...p,path:`private-corpus/guiyou108/chapters/${String(p.chapter).padStart(3,'0')}.txt`})),
      note: '用户提供PDF的独立正文；批语与按语不作叙事事实。仅资料终点与此前片段，不认证其古本真伪。'};
  } catch { return {status: 'unavailable', excerpts: [], note: '癸酉本私人正文缺失或校验失败；不借用程高本，不补造原文。'}; }
}

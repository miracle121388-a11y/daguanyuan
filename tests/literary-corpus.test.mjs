import {describe, it, expect} from 'vitest';
import {readFileSync, mkdtempSync, writeFileSync, rmSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, sep} from 'node:path';
import {loadCorpus, searchCorpus, literaryReferences, continuationReferences} from '../server/literary-corpus.mjs';
import {verifyCorpus} from '../scripts/corpus.mjs';

const root = 'data/canon/corpus';
const corpus = loadCorpus(root);
describe('local literary corpus', () => {
  it('verifies all 120 chapters, edition files and archive hashes', () => {
    expect(verifyCorpus()).toContain('daguanyuan-texts.zip');
    expect(corpus.chapters).toHaveLength(120);
    expect(readFileSync(`${root}/original80.txt`, 'utf8')).not.toContain(corpus.chapters[96].title);
  });
  it('retrieves exact local evidence with stable citation and chapter boundary', () => {
    const result = searchCorpus(corpus, {editionId: 'original80', maxChapter: 27, query: '黛玉葬花手把花鋤'});
    expect(result.length).toBeGreaterThan(0);
    for (const row of result) {
      expect(row.chapter).toBeLessThanOrEqual(27);
      expect(corpus.chapters[row.chapter - 1].paragraphs.find(p => p.id === row.paragraphId).text.slice(row.startOffset, row.endOffset)).toBe(row.text);
      expect(row.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });
  it('matches simplified character names against preserved traditional text', () => {
    const rows = searchCorpus(corpus, {editionId: 'original80', maxChapter: 80, query: '宝钗'});
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some(r => r.text.includes('寶釵'))).toBe(true);
  });
  it('does not fill guiyou gaps with Cheng text or exceed original80', () => {
    expect(searchCorpus(corpus, {editionId: 'guiyou108', maxChapter: 108, query: '黛玉'})).toEqual([]);
    expect(searchCorpus(corpus, {editionId: 'original80', maxChapter: 120, query: '黛玉'}).every(r => r.chapter <= 80)).toBe(true);
    expect(literaryReferences({literary: {id: 'guiyou108', chapter: 91}}, root).status).toBe('missing_fulltext');
  });
  it('excludes current chapter and future from character prompts', () => {
    const result = literaryReferences({literary: {id: 'cheng120', chapter: 27}, message: '黛玉'}, root);
    expect(result.status).toBe('available');
    expect(result.excerpts.every(r => r.chapter < 27)).toBe(true);
    expect(literaryReferences({literary: {id: 'original80', chapter: 1}, message: '黛玉'}, root).excerpts).toEqual([]);
  });
  it('grounds continuation at the selected ending without leaking future chapters or replacing private imports', () => {
    const payload = {edition: {id: 'original80'}, source: {through: 80, imported: false}, direction: '黛玉', memory: '', threads: [], history: [], stageActors: []};
    const refs = continuationReferences(payload, root);
    expect(refs.status).toBe('available');
    expect(refs.endpoint.map(p => p.text).join('')).toBe(corpus.chapters[79].paragraphs.map(p => p.text).join('').slice(-6000));
    for (const p of [...refs.endpoint, ...refs.excerpts]) {
      expect(p.chapter).toBeLessThanOrEqual(80);
      expect(corpus.chapters[p.chapter - 1].paragraphs.find(row => row.id === p.paragraphId).text.slice(p.startOffset, p.endOffset)).toBe(p.text);
    }
    expect(continuationReferences({...payload, edition: {id: 'guiyou108'}}, root).status).toBe('missing_fulltext');
    expect(continuationReferences({...payload, source: {...payload.source, imported: true}}, root)).toMatchObject({status: 'user_source', excerpts: []});
    expect(continuationReferences(payload, 'nonexistent/corpus').status).toBe('unavailable');
  });
  it('fails closed for damaged text and does not pretend retrieval succeeded', () => {
    const temporary = mkdtempSync(join(tmpdir(), 'daguanyuan-corpus-'));
    if (!resolve(temporary).startsWith(resolve(tmpdir()) + sep)) throw Error('Unsafe temporary path');
    try {
      mkdirSync(join(temporary, 'chapters'));
      writeFileSync(join(temporary, 'manifest.json'), JSON.stringify({...corpus, chapters: [corpus.chapters[0]]}));
      writeFileSync(join(temporary, 'chapters/001.txt'), 'damaged');
      expect(() => loadCorpus(temporary)).toThrow('Corrupt corpus');
      expect(literaryReferences({literary: {id: 'original80', chapter: 27}}, temporary).status).toBe('unavailable');
    } finally {
      rmSync(temporary, {recursive: true, force: true});
    }
  });
});

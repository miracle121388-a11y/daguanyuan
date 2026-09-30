"""Extract the user-supplied 621-page PDF for private story-source import.

This profile is bound to one PDF hash. It is not an OCR tool or an edition
authentication. Original annotations remain source material, not instructions.
Run with the project's conda environment and requirements-pdf.txt.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
SOURCE_SHA256 = 'bc2fdebcca79d05b6bc1db22d3ae3696f2a97fb3e15b263a6f7515cf1086dd77'
HEADING = re.compile(r'^第([零〇一二三四五六七八九十百0-9\s]+)回\s+(.+)$')
DIGITS = dict(zip('零〇一二三四五六七八九', [0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]))


def digest(data):
    return hashlib.sha256(data).hexdigest()


def number(token):
    token = re.sub(r'\s+', '', token)
    if token.isdigit():
        return int(token)
    total = current = 0
    for char in token:
        if char in '十百':
            total += (current or 1) * (10 if char == '十' else 100)
            current = 0
        else:
            current = DIGITS[char]
    return total + current


def normalize(text):
    return re.sub(r'\s+', ' ', text).strip()


def body_text(page):
    """Keep complete glyphs using line centres, rather than clipping glyph boxes.

    Pages 1–432 are A4; page 433 onward uses Letter. Three A4 body lines
    extend into the nominal footer margin. Centre selection preserves them.
    """
    blocks = []
    removed = []
    for block in page.get_text('dict', sort=True)['blocks']:
        lines = []
        for line in block.get('lines', []):
            text = ''.join(span['text'] for span in line['spans'])
            if not text.strip():
                continue
            centre = (line['bbox'][1] + line['bbox'][3]) / 2
            if 60 < centre < page.rect.height - 72:
                lines.append(normalize(text))
            else:
                furniture = text.strip()
                if not (furniture.isdigit() or furniture.startswith('108 回《癸酉本石头记》') or HEADING.match(furniture)):
                    raise ValueError(f'Unrecognized text outside body: {furniture}')
                removed.append(furniture)
        if lines:
            blocks.append('\n'.join(lines))
    result = '\n\n'.join(blocks).strip()
    if '108 回《癸酉本石头记》' in result or '\ufffd' in result:
        raise ValueError('Footer leak or replacement character')
    return result, removed


def extract(source, output, through):
    raw = source.read_bytes()
    if digest(raw) != SOURCE_SHA256:
        raise ValueError('PDF differs from the reviewed source; this layout profile cannot be reused blindly')
    # Never place an unlicensed private import inside a public/build/canon path.
    output = output.resolve()
    if output.is_relative_to(ROOT) and not output.is_relative_to(ROOT / '.local'):
        raise ValueError('Project-local output must be inside .local/')
    with pymupdf.open(source) as doc:
        if doc.is_encrypted or len(doc) != 621:
            raise ValueError('Expected unencrypted 621-page source')
        toc = []
        for page in doc[:3]:
            for line in page.get_text(sort=True).splitlines():
                match = re.match(r'^(第[零〇一二三四五六七八九十百\s]+回\s+.+?)\s*\.{3,}\s*(\d+)\s*$', line.strip())
                if match:
                    heading = normalize(match[1])
                    n = number(HEADING.match(heading)[1])
                    toc.append(dict(chapter=n, title=heading, printedPage=int(match[2]), pdfPage=int(match[2]) + 3))
        if [c['chapter'] for c in toc] != list(range(1, 109)):
            raise ValueError('TOC sequence is incomplete')
        pages = []
        blank_pages = []
        removed_count = 0
        glyphs = Counter()
        body_headings = []
        for i in range(3, len(doc)):
            text, removed = body_text(doc[i])
            printed = Counter(re.sub(r'\s+', '', doc[i].get_text('text')))
            furniture = Counter(re.sub(r'\s+', '', ''.join(removed)))
            if furniture - printed:
                raise ValueError('Furniture glyphs not found in independent text extraction')
            printed.subtract(furniture)
            glyphs.update(printed)
            if not text:
                blank_pages.append(i + 1)
            removed_count += len(removed)
            pages.append(text)
            for line in text.splitlines():
                match = HEADING.match(line)
                if match:
                    body_headings.append((number(match[1]), i + 1))
        if body_headings != [(c['chapter'], c['pdfPage']) for c in toc]:
            raise ValueError('Body headings and TOC disagree')
        output.mkdir(parents=True, exist_ok=True)
        chapter_texts = []
        chapters = []
        for i, entry in enumerate(toc):
            start = entry['pdfPage']
            end = toc[i + 1]['pdfPage'] - 1 if i + 1 < len(toc) else len(doc)
            text = '\n\n'.join(pages[start - 4:end - 3]) + '\n'
            if len(text) < 1500:
                raise ValueError(f"Suspiciously short chapter {entry['chapter']}")
            filename = f"chapters/{entry['chapter']:03}.txt"
            path = output / filename
            path.parent.mkdir(exist_ok=True)
            encoded = text.encode('utf-8')
            path.write_bytes(encoded)
            chapter_texts.append(text)
            chapters.append(dict(**entry, endPdfPage=end, path=filename, characters=len(text),
                                 bytes=len(encoded), sha256=digest(encoded)))
        full = '\n'.join(chapter_texts)
        if glyphs != Counter(re.sub(r'\s+', '', full)):
            raise ValueError('Extracted body glyph counts differ from printed PDF text')
        if blank_pages != [238]:
            raise ValueError('Unexpected blank body pages')
        if '本书至此告一段落' not in chapter_texts[-1]:
            raise ValueError('Final chapter ending not found')
        files = []
        for end in sorted({108, through}):
            text = '\n'.join(chapter_texts[:end])
            name = '癸酉本吴氏石头记_全108回_推演用.txt' if end == 108 else f'癸酉本吴氏石头记_截至第{end}回_推演用.txt'
            encoded = text.encode('utf-8')
            (output / name).write_bytes(encoded)
            files.append(dict(path=name, through=end, characters=len(text), bytes=len(encoded), sha256=digest(encoded)))
        manifest = dict(version=1, editionId='guiyou108', reviewStatus='extraction_checked',
                        distribution='private_import_only', license='unspecified_in_supplied_pdf',
                        source=dict(filename=source.name, sha256=SOURCE_SHA256, bytes=len(raw),
                                    pages=len(doc), metadata=doc.metadata),
                        identity='用户提供的108回PDF电子整理本；不认证其作者、年代或底本真伪。PDF author元数据不是作者证据。',
                        processing='去除3页目录及逐页页眉页码；保留原文、异体字、注音、批语、按语和物理行换行；不跨版本补文，不作逐字校勘。',
                        checks=dict(bodyPages=len(pages), chapterSequence=list(range(1, 109)),
                                    tocAndBodyAgree=True, replacementCharacters=full.count('\ufffd'),
                                    nonWhitespaceGlyphCountsMatchPDF=True,
                                    removedHeaderFooterLines=removed_count,
                                    terminalChapterPresent=True, blankBodyPages=blank_pages, modelRead=False),
                        extractor=dict(library='PyMuPDF', version=pymupdf.VersionBind), chapters=chapters, files=files)
        (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(json.dumps(dict(output=str(output), pages=len(doc), chapters=len(chapters), files=files), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('--output', type=Path, default=ROOT / '.local/corpus/guiyou108')
    parser.add_argument('--through', type=int, default=108, choices=range(1, 109))
    args = parser.parse_args()
    extract(args.pdf, args.output, args.through)

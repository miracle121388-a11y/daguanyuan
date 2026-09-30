"""Prepare source-checked local reading files; never synthesize missing editions."""
from pathlib import Path
import bs4
import hashlib
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/canon/corpus'
def digest(data):
    return hashlib.sha256(data).hexdigest()
def save(name, data):
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return dict(path=name, sha256=digest(data), bytes=len(data))

def main():
    chapters = []
    files = []
    full = []
    for number in range(1, 121):
        metadata = json.loads((ROOT / f'data/raw/corpus/{number:03}.json').read_text(encoding='utf-8'))
        raw = (ROOT / metadata['rawPath']).read_bytes()
        assert digest(raw) == metadata['rawSha256']
        soup = bs4.BeautifulSoup(raw.decode('utf-8'), 'html.parser')
        body = soup.select_one('.mw-parser-output')
        # Keep prose and poems, strip navigation, footnote markers and license furniture.
        for element in body.select('sup.reference, .reflist, .references, .licensetpl, .licenseContainer, table, style, script, nav'):
            element.decompose()
        title = next((e.get_text(' ', strip=True) for e in body.select('.center') if '回' in e.get_text()), f'第{number}回')
        paragraphs = []
        for p in body.select('p'):
            text = p.get_text('', strip=True)
            if not text or any(x in text for x in ['回目录', '回目錄', 'Public domain', '此作品在全世界', '本作品在全世界']):
                continue
            if p.find_parent(class_=re.compile('license|licensetpl|noprint')):
                continue
            for br in p.select('br'):
                br.replace_with('\n')
            paragraphs.append(p.get_text('', strip=True))
        assert sum(map(len, paragraphs)) > 1500
        assert not any('�' in p for p in paragraphs)
        text = title + '\n\n' + '\n\n'.join(paragraphs) + '\n'
        entry = save(f'chapters/{number:03}.txt', text.encode('utf-8'))
        files.append(entry)
        chapters.append(dict(chapter=number, title=title, **entry, url=metadata['url'],
                             rawPath=metadata['rawPath'], rawSha256=metadata['rawSha256'],
                             retrievedAt=metadata['retrievedAt'],
                             revisionId=(re.search(r'"wgRevisionId":(\d+)', raw.decode('utf-8')) or [None, None])[1],
                             paragraphs=[dict(id=f'collated-{number:03}-p{i:04}', text=p) for i, p in enumerate(paragraphs, 1)]))
        full.append(text)
    for edition, count in [('original80', 80), ('cheng120', 120)]:
        files.append(save(f'{edition}.txt', '\n'.join(full[:count]).encode('utf-8')))
    notice = '''大观园原文资料包

original80.txt：维基文库《红楼梦》数字汇校本第1—80回的阅读范围，不是独立脂本校勘。
cheng120.txt：同一数字汇校本第1—120回；前80回以庚辰本、后40回以程甲本为底本。不是程甲/程乙刻本逐字影印转录。
chapters/：同一底本的分回UTF-8正文，保留繁体及原有异体字。去除网页导航、脚注标号、页脚；诗歌保留换行。未做简繁转换或自动补文。
guiyou108：全文缺失。现有2014年ISBN 9787510827310书目仅支持回目证据，不能以120回截取108回冒充，也不能把共同前80回说成癸酉本异文。

来源：https://zh.wikisource.org/wiki/紅樓夢
底本说明：https://zh.wikisource.org/wiki/Portal:紅樓夢
署名：曹雪芹及后四十回相关作者；维基文库各页贡献者（各章节URL的历史页可查）。
古籍正文为公版；数字整理保守按CC BY-SA 4.0署名及相同方式共享：https://creativecommons.org/licenses/by-sa/4.0/
贡献历史：每回URL追加?action=history。原始HTML含当次修订及许可信息并保存在仓库data/raw/corpus。
manifest.json记录每回来源、获取时间、原始/整理文件SHA-256及稳定段落编号。source_checked仅表示来源/结构/哈希检查，不表示逐字学术校勘。
引用格式：版本阅读范围 + 数字汇校本 + 第N回 + collated-NNN-pNNNN + 章节文件SHA-256；原文、空间解释与虚构推演分开。
'''
    files.append(save('NOTICE.txt', notice.encode('utf-8')))
    candidates = dict(editionId='guiyou108', status='missing_fulltext', checkedAt='2026-09-30',
                      candidates=[dict(url='https://github.com/vicalloy/the-guiyou-version-of-dream-of-the-red-chamber',
                                       finding='后28回公开整理仓库；未声明转载许可，也不是全108回独立校本。'),
                                  dict(url='https://commons.wikimedia.org/wiki/File:吴氏石头记增删试评本_钞本〖阅〗108.pdf',
                                       finding='页面标为删减版、17页、CC BY-SA 4.0；不能作为全108回正文。'),
                                  dict(url='https://www.sanmin.com.tw/product/index/004615400',
                                       finding='2014年九州版后28回书目；既有回目证据，不含可分发全文。')],
                      policy='不拼接他本，不生成缺章；新增正文须核实具体版本、完整性、来源与收录许可。')
    files.append(save('guiyou108-status.json', (json.dumps(candidates, ensure_ascii=False, indent=2)+'\n').encode('utf-8')))
    manifest = dict(version=1, reviewStatus='source_checked', sourceEdition='wikisource-collated',
                    editions=[dict(id='original80', status='available', firstChapter=1, lastChapter=80, textPath='original80.txt'),
                              dict(id='cheng120', status='available', firstChapter=1, lastChapter=120, textPath='cheng120.txt'),
                              dict(id='guiyou108', status='missing_fulltext', firstChapter=1, lastChapter=108, textPath=None,
                                   reason='仅有2014年版公开书目；待可核实来源及可收录的正文，不跨版本补齐。')],
                    license='CC-BY-SA-4.0', attribution=notice, chapters=chapters, files=files)
    save('manifest.json', (json.dumps(manifest, ensure_ascii=False, indent=2)+'\n').encode('utf-8'))
    # Fixed timestamps and order make the archive reproducible.
    with zipfile.ZipFile(OUT / 'daguanyuan-texts.zip', 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for name in sorted([f['path'] for f in files] + ['manifest.json']):
            info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, (OUT / name).read_bytes())
    archive = (OUT / 'daguanyuan-texts.zip').read_bytes()
    save('archive.json', (json.dumps(dict(path='daguanyuan-texts.zip', sha256=digest(archive), bytes=len(archive)), indent=2)+'\n').encode())
    print(f'Prepared {len(chapters)} chapters, {sum(len(c["paragraphs"]) for c in chapters)} paragraphs; guiyou108 full text remains unavailable.')

if __name__ == '__main__':
    main()

"""Publishable, manually reviewed key-node annotations, separate from existing canon."""
from pathlib import Path
import json, hashlib
R = Path(__file__).resolve().parents[1]
read = lambda p: json.loads((R / p).read_text(encoding='utf-8'))
sources = []
def source(key, title, needle, locator, common=None, catalog=False):
    if common:
        meta = read(f'data/raw/chapter-{common:03}.json')
        meta.update(rawPath=f'data/raw/chapter-{common:03}.html', textPath=f'data/raw/chapter-{common:03}.txt')
    else:
        meta = read(f'data/raw/editions/{key}.json')
    text = (R / meta['textPath']).read_text(encoding='utf-8')
    assert needle in text, (key, needle)
    sources.append({k: meta[k] for k in ['url','retrievedAt','rawPath','textPath','rawSha256','normalizedTextSha256']} | dict(
        id=key, title=title, excerpt=needle, locator=locator, reviewStatus='source_checked',
        licenseNote='公开书目，仅引用短回目以说明版本；未复制或分发当代整理全文。' if catalog else '公版古籍；维基文库数字整理按 CC BY-SA 4.0 / GFDL 署名。'))
    return key

flower = source('common-27', '《红楼梦》第27回', '手把花鋤出繡閨', '葬花吟段落', common=27)
poetry = source('common-37', '《红楼梦》第37回', '海棠', '海棠诗社段落', common=37)
search = source('common-74', '《红楼梦》第74回', '豁一聲將箱子掀開', '晴雯倒箱段落', common=74)
burn = source('cheng-097', '程高续本 · 第97回', '回手又把那詩稿拿起來', '黛玉焚稿段落')
raid = source('cheng-105', '程高续本 · 第105回', '不能不盡行查抄', '西平王与赵堂官查抄段落')
death = source('cheng-098', '程高续本 · 第98回', '當時黛玉氣絕', '黛玉之死段落；用于第105回起点的人物退场限制')
gui = source('guiyou-catalog', '癸酉本后28回 · 2014九州版书目', '林黛玉悶作十獨吟', '三民书店：ISBN 9787510827310，第82、90、91回目录', catalog=True)

editions = [
 dict(id='original80', title='前八十回', shortTitle='八十回本', chapters=80, description='以曹雪芹前八十回为依据，未完处留白。', boundary='第八十回之后保持开放，不预设任何续本结局。', coverage='沿用项目已核对的前八十回数字文本，非单一脂本的逐字校勘。'),
 dict(id='cheng120', title='程高本 · 一百二十回', shortTitle='程高本', chapters=120, description='含程伟元、高鹗整理刊行的后四十回，常称高鹗续本。', boundary='后四十回独立标注；其作者归属存在讨论，不与前八十回混称。', coverage='前八十回共同节点，加第97、105回已核对片段；不是全120回的逐回剧情库。'),
 dict(id='guiyou108', title='癸酉本 · 一百零八回', shortTitle='癸酉本', chapters=108, description='又称《吴氏石头记》，后续走向独立。', boundary='来源与真伪有争议，不作为曹雪芹原稿的定论。', coverage='前八十回借用共同节点，未作异文校勘；后续依据2014年版公开回目设定起点，未收录全文。'),
]
all_editions = [e['id'] for e in editions]
def frames(rows, focus='60% 40%'):
    return [dict(title=t, text=s, position=p, scale=z) for (t,s),p,z in zip(rows,['50% 50%',focus,'50% 50%'],[1,1.14,1.04])]
def node(id, editions, chapter, title, summary, ref, art, place, focus, atmosphere, rows, memory, goal, calm=58, stability=80, finance=70, event=None, heading=False):
    result = dict(id=id, editions=editions, chapter=chapter, title=title, summary=summary, sourceRefs=[ref],
      evidenceKind='chapter_heading' if heading else 'chapter_excerpt', art=art, place=place, focus=focus, atmosphere=atmosphere,
      staging='三维人物位置、同场关系、天气与数值为本幕舞台设定；不是原文测绘或完整事件重演。',
      frames=frames(rows, '44% 36%' if art=='storm' else '60% 40%'),
      seed=dict(stability=stability, finance=finance, agents=[dict(id=focus,memory=memory,goal=goal,calm=calm)]))
    if event: result['eventId']=event
    return result
nodes = [
 node('flowers-27',all_editions,27,'落花成冢','黛玉借葬花吟寄托伤春之情，宝玉听见吟咏。',flower,'petals','xiaoxiangguan','daiyu','petals',
      [('花落','春光仍在，花却已经落了。'),('惜春','她俯身收起落花，心事藏在花影里。'),('留白','如果此刻有人听懂她，故事会怎样继续？')], '【本幕改编起点】我正在惜花伤春，希望自己的心事被真诚理解。','静静整理心绪，再决定是否向宝玉倾诉'),
 node('poetry-37',all_editions,37,'海棠初社','探春发起海棠诗社，众人以诗相聚。',poetry,'poetry','qiushuangzhai','baoyu','light',
      [('入社','一纸相邀，园中的故人围案而坐。'),('落笔','白海棠照着素笺，诗意在目光间流转。'),('相知','诗句之外，还有未说出口的心事。')], '【本幕改编起点】我来到诗社，想与姊妹们谈诗。','与眼前的人商议诗意',72,event='poetry-club'),
 node('search-74',all_editions,74,'抄检之夜','搜检来到怡红院，晴雯倒出箱中物件。图中园门与凤姐是对紧张气氛的借景。',search,'storm','yihongyuan','wangxifeng','rain',
      [('夜来','灯影摇动，平日熟悉的院门忽然陌生。'),('裂隙','一场搜检，让积存的不平浮出水面。'),('抉择','此刻，先听谁说话，又该护住什么？')], '【本幕改编起点】搜检引起不满，我需要处理眼前的家务纷争。','先听院中人的解释，谨慎安排家务',42,54,55,event='search-chest'),
 node('manuscript-97',['cheng120'],97,'焚稿断痴情','程高续本第97回，黛玉焚毁诗稿；宝钗成婚的叙事与之交错。本幕从焚稿前的可改变时刻入局。',burn,'manuscript','xiaoxiangguan','daiyu','embers',
      [('灯下','诗笺还在手中，窗外竹影已沉。'),('将焚','那些写给知己的字，正走向一盆火。'),('一念','把时间停在纸落下之前。你愿意对她说什么？')], '【程高本第97回改编起点】我心灰意冷，正在犹豫是否毁去自己的诗稿。','守住自己的心事，决定如何处置诗稿',24,45,45),
 node('raid-105',['cheng120'],105,'锦衣查抄','程高续本第105回写查抄贾府。本幕以园门借景，把家族危机作为推演条件。',raid,'storm','daguanyuan_gate','wangxifeng','rain',
      [('门前','脚步声停在门外，旧日繁华沉入雨色。'),('危局','家产与生计都成了眼前的问题。'),('余地','若还能改变一件事，是守住财物，还是先顾身边的人？')], '【程高本第105回改编起点】查抄的危机已临到家中，我要先顾眼前人的安顿。','在危机中安排眼前的事务',26,20,18),
 node('poems-82',['guiyou108'],82,'竹窗独吟','2014年版公开目录第82回列“林黛玉闷作十独吟”。本幕仅据回目设定写诗情境，未核对该回全文。',gui,'bamboo','xiaoxiangguan','daiyu','light',
      [('竹窗','风经过竹梢，案上的纸仍等着落笔。'),('独吟','心事可以写成诗，也可以暂且不说。'),('相问','若有人走到窗前，这份独处会如何改变？')], '【癸酉本第82回回目改编】我正独自写诗，整理自己的烦闷。','借写诗理清心绪',44,63,58,heading=True),
 node('hope-90',['guiyou108'],90,'春日待好姻','2014年版公开目录第90回列“林黛玉嬉春待好姻”，与程高本后续的叙事顺序不同。这里只据回目设定期待。',gui,'bamboo','xiaoxiangguan','daiyu','petals',
      [('春信','窗外有了新绿，一天也似乎长了些。'),('待音','怀着期待等候，连风声也像远来的消息。'),('未定','未来尚未抵达。先把此刻交给相见的人。')], '【癸酉本第90回回目改编】我正怀着期待等候有关姻缘的好消息，尚不知道此后的结果。','与可信任的人谈谈期待',76,55,48,heading=True),
 node('siege-91',['guiyou108'],91,'园门戒严','2014年版公开目录第91回写查抄荣宁府、戒严大观园。图中凤姐仅作为家务危机的舞台人物，不据此断言她在本回现场。',gui,'storm','daguanyuan_gate','wangxifeng','rain',
      [('风起','重门之外，雨声压过了园中的笑语。'),('封园','家府被查，大观园也处于戒严之中。'),('岔路','在这一版的危局里，重新选择先要守护的人。')], '【癸酉本第91回回目改编】查抄与封园构成眼前的危机；我的在场身份为舞台设定。','在受限的园中照顾身边的人',22,16,22,heading=True),
]
# Directory-only nodes each retain the exact short heading they depend on.
late = next(n for n in nodes if n['id']=='raid-105')
late['seed']['inactiveAgents']=['daiyu']
late['sourceRefs'].append(death)
for key, needle in [('poems-82','林黛玉悶作十獨吟'),('hope-90','林黛玉嬉春待好姻'),('siege-91','御林軍戒嚴大觀園')]:
    if key == 'poems-82': continue
    ref = source('guiyou-catalog', '癸酉本后28回 · 2014九州版书目', needle, '三民书店公开目录，ISBN 9787510827310', catalog=True)
    sources[-1]['id'] = key+'-source'
    next(n for n in nodes if n['id']==key)['sourceRefs']=[sources[-1]['id']]
(R/'data/canon/editionCatalog.json').write_text(json.dumps(dict(editions=editions,sources=sources,nodes=nodes),ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Reviewed {len(editions)} editions, {len(nodes)} key nodes, {len(sources)} evidence excerpts.')

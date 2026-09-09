"""Rebuild reviewed annotations from cached primary text; never infer facts automatically."""
from pathlib import Path
import json,hashlib,subprocess,sys
R=Path(__file__).resolve().parents[1]
if not (R/'data/raw/chapter-076.json').exists():subprocess.run([sys.executable,str(R/'scripts/fetch_content.py')],check=True)
sources=[];reviews=[]
def source(ch,needle,why):
 raw=json.loads((R/'data/raw'/f'chapter-{ch:03}.json').read_text(encoding='utf-8'))
 matches=[(i,p) for i,p in enumerate(raw['paragraphs']) if needle in p]
 assert matches,(ch,needle)
 i,p=matches[0];ix=p.index(needle);excerpt=p[max(0,ix-25):ix+len(needle)+65]
 sid=f's{ch}-{len(sources)+1}'
 sources.append(dict(id=sid,title=f'《红楼梦》第{ch}回',editionDescription='维基文库《紅樓夢》分回数字文本，按获取日期与页面修订号固定；未辨明为单一权威校勘本，保留页面混用字形。',url=raw['url'],retrievedAt=raw['retrievedAt'],revisionId=raw['revisionId'],rawSha256=raw['rawSha256'],normalizedTextSha256=raw['normalizedTextSha256'],paragraphLocator=f'正文段落 {i+1}（本地规范化段落序号）',paragraphIndex=i,evidenceExcerpt=excerpt,chapter=ch,licenseNote='原著为公版古籍；维基文库数字整理按页面 CC BY-SA 4.0 / GFDL 声明署名。',reviewStatus='source_checked'))
 reviews.append({'sourceId':sid,'reviewer':'execution_agent','reviewStatus':'source_checked','reason':why})
 return sid
res=source(23,'薛寶釵住了蘅蕪苑','逐字核对五个已纳入地点与入住人物；未扩张为全书恒定居所。')
names=source(18,'有鳳來儀','核对赐名与别名。浣葛山庄与稻香村作为异名沿革，不将本次尺寸当成原文。')
gate=source(17,'那門欄窗槅','入口白墙与石台基，选用节制木构和白墙。')
qu=source(17,'曲徑通幽處','核对题额措辞。代码ID保留，aliases存较完整原文题名。')
di=source(27,'一直跟到池中滴翠亭上','地点与宝钗扑蝶及听语的上下文明确；不推断她住于此处。')
ou=source(38,'原來這藕香榭蓋在池中','核对曲廊、竹桥、跨水接岸。')
lu=source(49,'原來這蘆雪庵蓋在傍山臨水河灘之上','补查前回：原文明示芦雪庵名称、茅檐土壁、槿篱竹牖以及通藕香榭的去径。第49回末至50回开头为连续的同一诗会。')
ao=source(76,'故顏其額曰“凹晶溪館”','原文明示凹晶溪馆为凸碧山庄退居，近水且房宇矮小；绝对位置仍为设计解释。')
place_info=[
('daguanyuan_gate','大观园入口',[], '白墙石阶，层层递进。由此入园，先收住视线，再向山水深处行去。',[gate], '入园'),
('qujingtongyou','曲径通幽',['曲徑通幽處'],'山石遮掩，小径回转。入口处的题额，把游园变成一段逐步展开的阅读。',[qu],'山径'),
('xiaoxiangguan','潇湘馆',['瀟湘館','有鳳來儀'],'翠竹夹路，窗下笔砚。林黛玉居于此，竹影与书卷构成一处安静的园中书斋。',[res,names], '竹影'),
('yihongyuan','怡红院',['怡紅院','紅香綠玉','怡紅快綠'],'宝玉的园中居所。以花木、回廊与日常陈设，呈现院落里细密的生活。',[res,names], '红香'),
('hengwuyuan','蘅芜苑',['蘅蕪苑','蘅芷清芬'],'宝钗的园中居所。山石与异草相映，素净的室内陈设与繁盛草木相对。',[res,names], '幽芳'),
('qiushuangzhai','秋爽斋',['秋爽齋'],'探春居所，也是海棠诗社发起之地。开敞的空间容纳书画、谈笑和诗意。',[res], '疏朗'),
('daoxiangcun','稻香村',['稻香村','杏帘在望','浣葛山莊'],'李纨的园中居所。篱落、田畦与茅堂意象，将村野趣味引入园林。',[res,names], '田趣'),
('ouxiangxie','藕香榭',['藕香榭'],'临池的亭榭，以曲廊与竹桥接岸。赏桂食蟹、菊花诗会在这里展开。',[ou], '水榭'),
('dicuiting','滴翠亭',['滴翠亭'],'水中的玲珑亭子，游廊曲桥四面相接。宝钗扑蝶的脚步在此停下。',[di], '碧水'),
('luxuean','芦雪庵',['蘆雪庵'],'傍山临水，茅檐土壁，芦苇掩映。第49—50回的冬日诗会在这里展开。',[lu], '雪意'),
('tubishanzhuang','凸碧山庄',['凸碧山庄','凸碧山莊'],'高处赏月的园林节点，与低处近水的凹晶溪馆形成一高一低的对景。',[ao], '山月'),
('aojingxiguan','凹晶溪馆',['凹晶溪館','凹晶館'],'房宇不多，矮小近水。黛玉与湘云在卷棚下临水赏月，接续诗句。',[ao], '水月')]
places=[dict(id=i,name=n,aliases=a,description=d,sourceRefs=s,spatialInterpretation='interpretive',theme=t) for i,n,a,d,s,t in place_info]
ev=[]
def event(id,title,ch,summary,chars,place,needle,why,display=None):
 s=source(ch,needle,why);ev.append(dict(id=id,title=title,chapter=ch,summary=summary,characterIds=chars,canonicalPlaceId=place,displayPlaceId=display or place,locationCertainty='explicit' if place else 'display_only',sourceRefs=[s],contentType='canonical',reviewStatus='source_checked'))
event('naming-path','试才题额 · 曲径通幽',17,'宝玉借用旧诗为入园山径拟题，园景由此有了可以吟咏的名字。',['baoyu','jiazheng'],'qujingtongyou','曲徑通幽處','场景、人物和题名均明示。')
event('moving-in','春日入园 · 分居诸院',23,'奉命收拾后，宝钗、黛玉、探春、李纨和宝玉等分住园中各处。此条展示在入口，分居发生于全园，非同一院落。',['baoyu','daiyu','baochai','tanchun','liwan'],None,'薛寶釵住了蘅蕪苑','全园居所分配事件，不伪造单点发生地。','daguanyuan_gate')
event('read-west','共读西厢 · 桃花树下',23,'宝玉在沁芳闸桥边读《会真记》，黛玉随后同看。沁芳闸桥未作为独立首版节点，此条借潇湘馆展示。',['baoyu','daiyu'],None,'走到沁芳閘橋邊桃花底下','明确原文是沁芳闸桥边，不把事件发生地改为潇湘馆。','xiaoxiangguan')
event('closed-door','院门误会 · 黛玉叩门',26,'晴雯未听出黛玉的声音，带着不快拒绝开门。黛玉又听见院内笑语，误会由此生起。',['daiyu','qingwen','baoyu','baochai'],'yihongyuan','晴雯偏生還沒聽出來','原文连续场景在怡红院门内外；晴雯未认出声音而非故意针对黛玉。')
event('butterflies','宝钗扑蝶 · 滴翠闻声',27,'宝钗逐蝶来到池中的滴翠亭，在亭外听见内里有人交谈。',['baochai'],'dicuiting','一直跟到池中滴翠亭上','核对扑蝶至亭的连续动作；未加入黛玉现场。')
event('poetry-club','海棠结社 · 秋爽起兴',37,'探春发起诗社，众人聚于秋爽斋议社、定题、限韵，以白海棠起兴。',['tanchun','baoyu','daiyu','baochai','liwan'],'qiushuangzhai','同翠墨往秋爽齋來','核对发起人与到场；湘云尚未参加初次作诗，未列为参与者。')
event('haitang-gifts','海棠送到 · 袭人酬谢',37,'海棠送入后，袭人赏了抬花的人，又托人向湘云送物。诗社之外，院落的日常也在继续。',['xiren','baoyu'],'yihongyuan','自己房內秤了六錢銀子','核对院内送花与酬谢；不是新增独立诗社。')
event('plan-chrysanthemum','灯下拟题 · 十二菊意',37,'宝钗邀湘云到蘅芜苑安歇，两人在灯下商量宴客和菊花诗题，编排先后次序。',['baochai','xiangyun'],'hengwuyuan','寶釵將湘雲邀往蘅蕪苑安歇去','邀请安歇明确，但不扩张为湘云常住。')
event('crab-feast','赏桂食蟹 · 水榭开宴',38,'湘云设东，贾母等赴藕香榭赏桂食蟹，凤姐与李纨照料席间事务。',['xiangyun','jiamu','wangxifeng','liwan','baoyu','daiyu','baochai'],'ouxiangxie','藕香榭已經擺下了','宴席场地与人物可由本回第一段与席位段互证。')
event('chrysanthemum','菊花诗会 · 潇湘夺魁',38,'席散后众人作菊花诗。李纨评《咏菊》《问菊》《菊梦》为前三，推黛玉为魁。',['liwan','daiyu','baoyu','baochai','xiangyun','tanchun'],'ouxiangxie','惱不得要推瀟湘妃子為魁了','本回场景未离开藕香榭；与前半场宴席是不同文学活动。')
event('visit-bamboo','竹径访书 · 刘姥姥入馆',40,'贾母带刘姥姥来到潇湘馆。她看见笔砚与满架书籍，把这里认作公子的书房。',['liulaolao','jiamu','daiyu','wangxifeng'],'xiaoxiangguan','先到了瀟湘館','黛玉亲自奉茶；此时宝玉在船上，未列为到场。')
event('window-gauze','软烟罗 · 细说窗纱',40,'贾母见窗纱颜色旧了，讲起软烟罗的颜色与用途，并吩咐用银红色替黛玉糊窗。',['jiamu','wangxifeng','daiyu','liulaolao'],'xiaoxiangguan','正經名字叫作『軟煙羅』','与到访书房不同的材料、陈设叙事；保留银红窗纱证据。')
event('granny-banquet','晓翠堂前 · 宴间笑语',40,'早饭摆在秋爽斋晓翠堂。凤姐与鸳鸯安排席间玩笑，刘姥姥的言语引众人发笑。',['liulaolao','jiamu','wangxifeng','liwan','baoyu','daiyu','baochai','xiangyun','tanchun'],'qiushuangzhai','抄著近路到了秋爽齋','原文直接命名晓翠堂；此处不省略宴饮环境。')
event('plain-room','雪洞一般 · 蘅芜看陈设',40,'众人入蘅芜苑，见室中陈设素净。贾母谈起年轻姑娘房间的布置，并命人送来器物。',['jiamu','baochai','liulaolao','wangxifeng'],'hengwuyuan','一同進了蘅蕪苑','拜访及陈设有直接描写。')
event('granny-sleep','误入怡红 · 醉卧床帐',41,'刘姥姥醉后误入怡红院，睡在宝玉床上。袭人发现后将她唤醒并带出去。',['liulaolao','xiren'],'yihongyuan','只見劉姥姥扎手舞腳的仰臥在床上','宝玉不在此现场，不能因床属于宝玉便列为参与者。')
event('snow-gathering','雪前议社 · 稻香相邀',49,'李纨邀众人商议次日的雪中诗会。宝玉与黛玉踏雪到稻香村，众人议定到芦雪庵围炉作诗。',['liwan','baoyu','daiyu','baochai','xiangyun'],'daoxiangcun','寶玉便邀著黛玉同往稻香村來','这一段明确到稻香村商议，次日才到芦雪庵；不合并两个地点。')
event('snow-poem','雪日联句 · 北风起笔',50,'承接前回芦雪庵中的雅集，凤姐以“一夜北风紧”起句，众人接续联诗。',['wangxifeng','liwan'],'luxuean','就是‘一夜北風緊’','第49回末齐往芦雪庵，50回开头继续在座联诗，结合两回核对地点。')
ev[-1]['sourceRefs'].append(lu)
event('flower-lots','寿怡红 · 夜宴花签',63,'众人在怡红院相聚，晴雯拿来花签筒，摇骰抽签，以花名行令。',['baoyu','daiyu','baochai','xiangyun','tanchun','liwan','xiren','qingwen'],'yihongyuan','會齊，先後都到了怡紅院中','结合后文湘云抽海棠签，核对参与者，非实时人物。')
event('search-chest','抄检之夜 · 晴雯倒箱',74,'抄检来到怡红院，晴雯把箱中物件尽数倒出，以行动回应搜查。',['qingwen','xiren','baoyu','wangxifeng'],'yihongyuan','豁一聲將箱子掀開','人物与行为直接明示；不提前写后续命运。')
event('tanchun-protest','秉烛待检 · 探春抗言',74,'搜检到探春院中，探春命人开门秉烛相待，反对任意搜查丫鬟。',['tanchun','wangxifeng'],'qiushuangzhai','又到探春院內','按第23回居所关联定位，非本回直接写秋爽斋；标记为依据居所推定。')
ev[-1]['locationCertainty']='residency_inference'
event('moon-poem','凹晶联诗 · 一池清月',76,'黛玉与湘云下山到凹晶溪馆，在卷棚下近水赏月，继而联诗。',['daiyu','xiangyun'],'aojingxiguan','咱們就在這卷棚底下近水賞月如何','原文地点与人物明确；高低关系仅在地图作解释性呈现。')
event('miaoyu-arrives','石后闻诗 · 妙玉相邀',76,'妙玉从山石后现身，评论两人的诗意，邀黛玉、湘云到栊翠庵喝茶。续诗发生于栊翠庵，不在此馆。',['miaoyu','daiyu','xiangyun'],'aojingxiguan','一語未了，只見欄外山石後轉出一個人來','区分现身相邀与后续栊翠庵续诗。')
bio_rows=[('baoyu','贾宝玉',['怡红公子'],'入园后居怡红院，喜与姊妹谈诗。','yihongyuan',23),('daiyu','林黛玉',['潇湘妃子'],'入园后居潇湘馆，案上有笔砚，架上有书。','xiaoxiangguan',23),('baochai','薛宝钗',['蘅芜君'],'入园后居蘅芜苑，参与诗社，与湘云商议诗题。','hengwuyuan',23),('tanchun','贾探春',['蕉下客'],'居秋爽斋，发起海棠诗社。','qiushuangzhai',23),('xiangyun','史湘云',['枕霞旧友'],'到园中与众人相聚，曾受宝钗邀请在蘅芜苑安歇。',None,37),('liwan','李纨',['稻香老农'],'居稻香村，在诗社中出题评诗。','daoxiangcun',23),('miaoyu','妙玉',[],'在栊翠庵接待贾母等人，懂得茶具与品茗。首版不设栊翠庵独立节点。',None,41),('wangxifeng','王熙凤',['凤姐'],'在游园宴饮中照料安排，言语常引众人发笑。',None,38),('jiamu','贾母',['史太君'],'率众游园，赏景、饮宴，也关照院中日用陈设。',None,38),('liulaolao','刘姥姥',[],'随贾母游园，从自己的生活经验观看园中的房屋与器物。',None,40),('xiren','袭人',['花袭人'],'在怡红院照料日常，接待送花人，也曾唤醒误入的刘姥姥。',None,37),('qingwen','晴雯',[],'怡红院中的丫鬟，参与宝玉身边的日常生活。',None,26),('jiazheng','贾政',[],'游园试才题额时，带领众人观看园景并考察宝玉。',None,17)]
chars=[]
for id,n,aliases,bio,home,intro in bio_rows:
 refs=[res] if home else [e['sourceRefs'][0] for e in ev if id in e['characterIds']][:2]
 if id=='miaoyu':refs=[source(41,'妙玉親自捧了一個','人物茶事资料仅在第41回以后显示。')]
 # A spoiler-safe base bio only contains the fact proven at introduction.
 safe={'baoyu':'第23回入园，居怡红院。','daiyu':'第23回入园，居潇湘馆。','baochai':'第23回入园，居蘅芜苑。','tanchun':'第23回入园，居秋爽斋。','liwan':'第23回入园，居稻香村。','xiren':'在怡红院照料日常，第37回接待送花人并给予酬谢。'}.get(id,bio)
 chars.append(dict(id=id,name=n,aliases=aliases,shortBio=safe,introductionChapter=intro,sourceRefs=refs,residencies=[{'placeId':home,'fromChapter':23,'toChapter':None,'validity':'入住明确，结束回目未知','sourceRefs':[res]}] if home else []))
relation_source=source(40,'這是我這外孫女兒的屋子','贾母明言外孙女，亲属关系不由同场出现推断。')
relations=[dict(fromId='jiamu',toId='daiyu',relationType='maternal_grandmother',label='外祖母与外孙女',validity={'fromChapter':40,'toChapter':None},sourceRefs=[relation_source])]
routes=[dict(id='first-look',title='园林初览',description='从曲径到四处院落，读一遍园林的性情。',orderedStops=['daguanyuan_gate','qujingtongyou','xiaoxiangguan','hengwuyuan','qiushuangzhai','yihongyuan'],eventIds=['naming-path','moving-in','visit-bamboo','plain-room','poetry-club'],pathNodeIds=[],routeType='interpretive',sourceRefs=[qu,res]),dict(id='poetry',title='诗社与雅集',description='海棠、菊花与水月，沿诗意重访相聚之处。',orderedStops=['qiushuangzhai','hengwuyuan','ouxiangxie','luxuean','aojingxiguan'],eventIds=['poetry-club','plan-chrysanthemum','chrysanthemum','snow-poem','moon-poem'],pathNodeIds=[],routeType='interpretive',sourceRefs=[ou,ao,lu]),dict(id='granny',title='刘姥姥游园',description='跟随原著片段，看竹径、书房与院中日常。',orderedStops=['daguanyuan_gate','xiaoxiangguan','qiushuangzhai','hengwuyuan','yihongyuan'],eventIds=['visit-bamboo','granny-banquet','plain-room','granny-sleep'],pathNodeIds=[],routeType='interpretive',sourceRefs=[e['sourceRefs'][0] for e in ev if e['id'] in ['visit-bamboo','granny-banquet','plain-room','granny-sleep']])]
layout=json.loads((R/'config/garden.layout.json').read_text(encoding='utf-8'))
graph={n['id']:[] for n in layout['pathNodes']}
for edge in layout['pathEdges']:graph[edge['from']].append(edge['to']);graph[edge['to']].append(edge['from'])
def shortest(a,b):
 q=[[a]];seen={a}
 for p in q:
  if p[-1]==b:return p
  for next in graph[p[-1]]:
   if next not in seen:seen.add(next);q.append(p+[next])
 raise ValueError('Disconnected route')
for route in routes:
 route['pathNodeIds']=[route['orderedStops'][0]]
 for a,b in zip(route['orderedStops'],route['orderedStops'][1:]):route['pathNodeIds']+=shortest(a,b)[1:]
for name,value in [('places',places),('characters',chars),('events',ev),('sources',sources),('relations',relations),('routes',routes)]:
 (R/'data/canon'/f'{name}.json').write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
(R/'references/sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf-8')
(R/'reports/acceptance/content-review.json').write_text(json.dumps(reviews,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Prepared {len(places)} places, {len(chars)} characters, {len(ev)} checked events, {len(set(e["chapter"] for e in ev))} chapters, {len(routes)} routes')

"""Reviewed architectural passages, separate from interpreted dimensions/layout."""
from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((R/p).read_text(encoding='utf8'))
write=lambda p,j:(R/p).write_text(json.dumps(j,ensure_ascii=False,indent=2),encoding='utf8')
spec=[
 ('gate-five-bays','daguanyuan_gate',17,3,'正門五間','五间正门、桶瓦泥鳅脊与素木门窗，白石台基和虎皮石墙脚。'),
 ('xiao-three-bays','xiaoxiangguan',17,7,'一明兩暗','两三间小舍，一明两暗；前接曲廊与石子甬路。'),
 ('xiao-rear-spring','xiaoxiangguan',17,7,'後院','后院梨花、芭蕉与两间退步；细泉绕阶缘屋，在竹下流出。'),
 ('xiao-bamboo-path','xiaoxiangguan',40,4,'翠竹夾路','翠竹夹路，苔地之间留一条曲折的石子路；窗下有笔砚与书架。'),
 ('yi-banana-crabapple','yihongyuan',17,26,'游廊相接','两侧游廊相接，院中点石；芭蕉与西府海棠分植两边。'),
 ('heng-rock-screen','hengwuyuan',17,18,'大玲瓏山石','入门山石遮住房屋，异草藤蔓穿隙垂檐，形成独特的幽芳院景。'),
 ('heng-five-hall','hengwuyuan',17,19,'五間清廈','五间清厦连着卷棚，四面出廊；绿窗油壁。'),
 ('heng-spare-room','hengwuyuan',40,13,'雪洞一般','室内素净，案上只见土定瓶、菊花、书与茶具，床上青纱帐幔。'),
 ('qiu-open-hall','qiushuangzhai',40,9,'并不曾隔斷','三间屋不隔断，以阔朗空间容纳花梨大理石大案与笔墨法帖。'),
 ('qiu-vase-scroll','qiushuangzhai',40,9,'汝窯花囊','大花囊插白菊，西墙挂山水画与联语；本模型陈设为意象转译。'),
 ('farm-thatched','daoxiangcun',17,11,'黃泥','黄泥矮墙、茅屋、青篱与杏花；院外列菜畦，并有土井和汲水器具。'),
]
sources=[x for x in read('data/canon/sources.json') if not x['id'].startswith('architecture-')];places=read('data/canon/places.json');features={};records=[]
for aid,pid,ch,index,needle,description in spec:
 raw=read(f'data/raw/chapter-{ch:03}.json');paragraph=raw['paragraphs'][index];assert needle in paragraph
 base=next(s for s in sources if s['chapter']==ch);id='architecture-'+aid
 offset=max(0,paragraph.index(needle)-15);excerpt=paragraph[offset:offset+170]
 source={**base,'id':id,'paragraphIndex':index,'paragraphLocator':f'正文段落 {index+1}（本地规范化段落序号）','evidenceExcerpt':excerpt,'reviewStatus':'source_checked'}
 sources.append(source);features.setdefault(pid,[]).append({'text':description,'sourceRefs':[id]});records.append({'placeId':pid,'feature':description,'sourceRefs':[id],'chapter':ch,'paragraphIndex':index,'excerpt':excerpt,'geometryInterpretation':'构件数量与景物关系取自原文；尺寸、曲线、雕纹和具体摆位为设计解释。'})
for p in places:
 p['features']=features.get(p['id'],[]);p['sourceRefs']=[x for x in p['sourceRefs'] if not x.startswith('architecture-')]+[r for f in p['features'] for r in f['sourceRefs']]
write('data/canon/sources.json',sources);write('data/canon/places.json',places);write('config/architecture.json',records);write('references/sources.json',sources)
layout=read('config/garden.layout.json');layout['terrain']['radius']=[135,122]
names={
 'xiaoxiangguan':[('曲廊与竹径',[0,-11,2]),('竹下泉渠',[7,-6,1.8]),('一明两暗的书斋',[0,6,3.1])],
 'yihongyuan':[('游廊与院门',[0,-11,2]),('蕉棠两植',[-6,-1,3]),('雕窗与抱厦',[0,6,3.7])],
 'hengwuyuan':[('入院曲廊',[-8,-9,2]),('玲珑山石与藤蔓',[0,-3,4.2]),('五间清厦与卷棚',[0,9,3.8])],
 'qiushuangzhai':[('疏朗前庭',[0,-10,2]),('白菊与大花囊',[-8,7,2.4]),('大理石书案与笔墨',[0,5.5,2.2])]
}
for p in layout['places']:
 if p['id'] in names:
  for h,(name,pos) in zip(p['hotspots'],names[p['id']]):h['name']=name;h['position']=pos
  p['bounds']=[36,39,14];p['cameraOffset']=[29,26,40]
write('config/garden.layout.json',layout)
print('Prepared',len(records),'reviewed architectural features')

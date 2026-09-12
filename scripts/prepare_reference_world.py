"""Prepare reviewed additions, one continuous layout and optimized reference images."""
from pathlib import Path
import json,math,hashlib,heapq
from PIL import Image
R=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((R/p).read_text(encoding='utf8'))
def write(p,v):
 (R/p).parent.mkdir(parents=True,exist_ok=True)
 (R/p).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
layout=read('config/garden.layout.json')
positions={'daguanyuan_gate':(0,-100,0),'qujingtongyou':(-42,-78,0),'xiaoxiangguan':(-78,-25,0),'yihongyuan':(66,-65,0),'hengwuyuan':(-74,44,0),'qiushuangzhai':(80,12,0),'daoxiangcun':(-40,88,0),'ouxiangxie':(40,21,0),'dicuiting':(-16,-39,0),'luxuean':(32,84,0),'tubishanzhuang':(108,80,5),'aojingxiguan':(67,54,0)}
for p in layout['places']:
 if p['id'] in positions:p['position']=list(positions[p['id']])
 p['cameraOffset']=[27,19,35] if p['featured'] else [25,20,34]
extras=[('daguanlou','大观楼',[0,106,0],'tower',[44,41,59]),('longcuian','栊翠庵',[-111,86,1],'temple',[27,23,35]),('nuanxiangwu','暖香坞',[109,-30,0],'painting',[27,19,33])]
for pid,name,pos,style,cam in extras:
 existing=next((p for p in layout['places'] if p['id']==pid),None)
 p={'id':pid,'name':name,'position':pos,'style':style,'featured':True,'bounds':[44 if style=='tower' else 36,42,28 if style=='tower' else 14],'cameraOffset':cam,'hotspots':[{'id':pid+'-gate','name':'临水石阶' if style=='tower' else '院门与回廊','position':[0,-12,2]},{'id':pid+'-garden','name':'层楼与玉栏' if style=='tower' else '红梅与禅院' if style=='temple' else '冬窗与毡帘','position':[-8,1,6 if style=='tower' else 3]},{'id':pid+'-study','name':'殿前回廊' if style=='tower' else '东禅堂茶事' if style=='temple' else '惜春画案','position':[0,4,3]}]}
 if existing:existing.update(p)
 else:layout['places'].append(p)
layout['terrain']={'radius':[182,164],'lake':{'center':[0,16],'radius':[49,65],'irregular':True,'islands':[{'center':[-16,-39],'radius':[8,7]},{'center':[18,31],'radius':[6,5]}]}}
nodes=[('south',0,-117,0),('sw',-43,-101,0),('westlow',-105,-58,0),('west',-105,-5,0),('westhigh',-101,61,0),('nw',-39,123,0),('north',33,116,0),('ne',128,98,0),('east',115,12,0),('se',93,-84,0),('southeast',66,-89,0),('waterwest',-42,-58,0),('bridge-west',-15,-53,0),('bridge-east',15,-53,0),('watereast',46,-57,0),('lakeeast',60,6,0),('moonway',59,39,0),('hillway',108,60,5)]
edges=[['south','sw'],['sw','westlow'],['westlow','west'],['west','westhigh'],['westhigh','nw'],['nw','north'],['north','ne'],['ne','east'],['east','se'],['se','southeast'],['southeast','south'],['sw','waterwest'],['waterwest','bridge-west'],['bridge-west','bridge-east'],['bridge-east','watereast'],['watereast','southeast'],['watereast','lakeeast'],['lakeeast','east'],['lakeeast','moonway'],['moonway','hillway'],['hillway','ne']]
attach=['south','sw','west','southeast','westhigh','east','nw','lakeeast','waterwest','north','hillway','moonway','north','westhigh','east']
for p,near in zip(layout['places'],attach):
 x,y,z=p['position'];nodes.append((p['id'],x,y-16,z))
 approaches={'xiaoxiangguan':[(-105,-41)],'hengwuyuan':[(-101,28)],'qiushuangzhai':[(115,-4)],'daoxiangcun':[(-62,120),(-62,72)],'luxuean':[(53,116),(53,68)],'daguanlou':[(27,90)],'longcuian':[(-128,61),(-128,70)],'nuanxiangwu':[(131,12),(131,-46)]}.get(p['id'],[])
 prev=near
 for i,(a,b) in enumerate(approaches):
  n=f'approach-{p["id"]}-{i}';nodes.append((n,a,b,z));edges.append([prev,n]);prev=n
 edges.append([prev,p['id']])
layout['pathNodes']=[{'id':pid,'position':[x,y,z+.21]} for pid,x,y,z in nodes]
layout['pathEdges']=[{'from':a,'to':b,'kind':'bridge' if b in ['dicuiting','ouxiangxie'] or (a=='bridge-west' and b=='bridge-east') else 'path'} for a,b in edges]
layout['overviewCamera']={'position':[108,95,179],'target':[-4,2,-17]}
write('config/garden.layout.json',layout)
sources=read('data/canon/sources.json');places=read('data/canon/places.json')
descriptions=[('daguanlou',18,21,'正樓曰','大观楼','正楼','正楼大观楼与东、西侧楼共同组成省亲建筑群。层楼、复道与玉栏取意第十七至十八回，具体层数与尺度为美术设定。'),('longcuian',41,5,'櫳翠庵','栊翠庵','禅院','花木繁盛的栊翠庵中，妙玉在东禅堂奉茶。此处以小型禅院、梅树与茶席构成空间，冬景参看雪梅参考图。'),('nuanxiangwu',50,113,'暖香塢','暖香坞','画室','惜春的卧房题作暖香坞，回廊通向挂猩红毡帘的门口。天气寒冷，画胶凝涩，园景画暂被收起。')]
for pid,ch,index,needle,name,theme,description in descriptions:
 raw=read(f'data/raw/chapter-{ch:03}.json');paragraph=raw['paragraphs'][index];assert needle in paragraph
 sid='reference-world-'+pid;offset=max(0,paragraph.index(needle)-45)
 source={**next(s for s in sources if s['chapter']==ch),'id':sid,'paragraphIndex':index,'paragraphLocator':f'正文段落 {index+1}（本地规范化段落序号）','evidenceExcerpt':paragraph[offset:offset+230]}
 sources=[s for s in sources if s['id']!=sid]+[source]
 item={'id':pid,'name':name,'aliases':[],'theme':theme,'description':description,'sourceRefs':[sid],'spatialInterpretation':'interpretive','features':[{'text':description,'sourceRefs':[sid]}]}
 places=[p for p in places if p['id']!=pid]+[item]
write('data/canon/sources.json',sources);write('data/canon/places.json',places);write('references/sources.json',sources)
routes=read('data/canon/routes.json');nds={n['id']:n['position'] for n in layout['pathNodes']};graph={k:[] for k in nds}
for e in layout['pathEdges']:
 a,b=e['from'],e['to'];d=math.dist(nds[a],nds[b]);graph[a].append((b,d));graph[b].append((a,d))
def shortest(a,b):
 heap=[(0,a,[])];seen=set()
 while heap:
  cost,n,path=heapq.heappop(heap)
  if n==b:return path+[n]
  if n in seen:continue
  seen.add(n)
  for nxt,d in graph[n]:heapq.heappush(heap,(cost+d,nxt,path+[n]))
 raise ValueError('Disconnected path')
for route in routes:
 if route['id']=='first-look' and 'daguanlou' not in route['orderedStops']:route['orderedStops'].append('daguanlou')
 path=[]
 for a,b in zip(route['orderedStops'],route['orderedStops'][1:]):
  part=shortest(a,b);path+=part if not path else part[1:]
 route['pathNodeIds']=path
write('data/canon/routes.json',routes)
image_root=R/'output/imagegen/daguanyuan-reference-20260910';image_manifest=read('output/imagegen/daguanyuan-reference-20260910/manifest.json');log=read('output/imagegen/daguanyuan-reference-20260910/generation-log.json')
mapping={1:None,2:'yihongyuan',3:'yihongyuan',4:'xiaoxiangguan',5:'xiaoxiangguan',6:'hengwuyuan',7:'qiushuangzhai',8:'daoxiangcun',9:'longcuian',10:'daguanlou',11:'ouxiangxie',12:'luxuean',13:'nuanxiangwu',14:None,15:None}
art=[]
for im in image_manifest:
 source=image_root/im['file'];out=R/'public/art'/f'{im["id"]}.webp';out.parent.mkdir(exist_ok=True)
 with Image.open(source) as img:
  img.thumbnail((1440,960));img.save(out,'WEBP',quality=85,method=6)
  img.thumbnail((480,320));img.save(out.with_name(im['id']+'-thumb.webp'),'WEBP',quality=79,method=6)
 art.append({'id':im['id'],'n':im['n'],'title':im['title'],'placeId':mapping[im['n']],'url':'art/'+out.name,'thumbnail':'art/'+im['id']+'-thumb.webp','chapters':im['chapters'],'sourceSha256':im['sha256'],'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'provenance':'User-approved image_gen reference, generated 2026-09-10; resized and encoded as WebP for delivery.','prompt':next(o['finalInvocation']['prompt'] for o in log['outputs'] if o['n']==im['n'])})
write('public/art/manifest.json',art)
print('Prepared 15 connected destinations and 15 optimized, attributed reference images.')

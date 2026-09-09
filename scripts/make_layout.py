import json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
rows=[
('daguanyuan_gate','大观园入口',0,-88,'gate',0),('qujingtongyou','曲径通幽',-43,-70,'rockery',0),
('xiaoxiangguan','潇湘馆',-70,-26,'bamboo',0),('yihongyuan','怡红院',57,-55,'flower',0),
('hengwuyuan','蘅芜苑',-63,43,'herb',0),('qiushuangzhai','秋爽斋',70,19,'study',0),
('daoxiangcun','稻香村',-35,79,'farm',0),('ouxiangxie','藕香榭',29,12,'waterside',0),
('dicuiting','滴翠亭',-10,-31,'pavilion',0),('luxuean','芦雪庵',28,75,'reeds',0),
('tubishanzhuang','凸碧山庄',80,67,'hill',5),('aojingxiguan','凹晶溪馆',51,49,'moon',0)]
places=[]
for id,name,x,y,style,z in rows:
 detail=style in ['bamboo','flower','herb','study']
 places.append(dict(id=id,name=name,position=[x,y,z],style=style,featured=detail,bounds=[34 if detail else 26,34 if detail else 24,14],cameraOffset=[30,31,39] if detail else [26,29,35],hotspots=[{'id':id+'-gate','name':'院门与曲径','position':[0,-13,2]},{'id':id+'-garden','name':'庭中景物','position':[-8,-2,2]},{'id':id+'-study','name':'书斋与窗格','position':[0,7,4]}] if detail else []))
nodes=[('south',0,-105,0),('sw',-43,-91,0),('westlow',-96,-55,0),('west',-96,-6,0),('westhigh',-94,59,0),('nw',-35,101,0),('north',28,99,0),('ne',98,77,0),('east',104,19,0),('se',90,-70,0),('southeast',57,-79,0),('waterwest',-40,-45,0),('watereast',45,-45,0),('lakeeast',44,-3,0),('moonway',45,32,0),('hillway',80,48,5)]
edges=[['south','sw'],['sw','westlow'],['westlow','west'],['west','westhigh'],['westhigh','nw'],['nw','north'],['north','ne'],['ne','east'],['east','se'],['se','southeast'],['southeast','south'],['sw','waterwest'],['waterwest','watereast'],['watereast','southeast'],['watereast','lakeeast'],['lakeeast','east'],['lakeeast','moonway'],['moonway','hillway'],['hillway','ne']]
attach=['south','sw','west','southeast','westhigh','east','nw','lakeeast','waterwest','north','hillway','moonway']
for p,near in zip(places,attach):
 x,y,z=p['position'];nodes.append((p['id'],x,y-16,z))
 approaches={'xiaoxiangguan':[(-96,-42)],'hengwuyuan':[(-94,27)],'qiushuangzhai':[(104,3)],'daoxiangcun':[(-57,101),(-57,63)],'luxuean':[(48,99),(48,64),(28,64)]}.get(p['id'],[])
 previous=near
 for i,(ax,ay) in enumerate(approaches):
  node=f"approach-{p['id']}-{i}";nodes.append((node,ax,ay,z));edges.append([previous,node]);previous=node
 edges.append([previous,p['id']])
layout={'units':'meters','coordinateSystem':'Blender Z-up; Web (x,z,-y)','spatialInterpretation':'interpretive','seed':1949,'terrain':{'radius':[125,112],'lake':{'center':[0,14],'radius':[34,53]}},'places':places,'pathNodes':[{'id':id,'position':[x,y,.25+z]} for id,x,y,z in nodes],'pathEdges':[{'from':a,'to':b,'kind':'bridge' if b in ['dicuiting','ouxiangxie'] else 'path'} for a,b in edges]}
(R/'config/garden.layout.json').write_text(json.dumps(layout,ensure_ascii=False,indent=2),encoding='utf-8')
(R/'config/quality.json').write_text(json.dumps({'high':{'dpr':1.5,'shadows':True,'motion':True},'low':{'dpr':1,'shadows':False,'motion':False}},indent=2))

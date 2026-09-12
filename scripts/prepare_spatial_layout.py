"""One coherent, explicitly interpretive garden, after the user's P01/P02 atlas.
Coordinates are design dimensions, never measurements asserted by the novel.
The canal outline is shared by Blender, WebGL, the map and the route audit.
"""
from pathlib import Path
import json, math, heapq, os
R=Path(__file__).resolve().parents[1]
def write(p,value):
 q=p.with_suffix('.next');q.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf8');os.replace(q,p)
layout=json.loads((R/'config/garden.layout.json').read_text(encoding='utf8'))
layout['assetRevision']='spatial-garden-20260912-r12'
layout['spatialInterpretation']='interpretive'
layout['spatialBasis']={'plan':'P01 / P02 — 《红楼梦建筑图解》成对总平面与鸟瞰','url':'https://www.sohu.com/a/206191725_410481','note':'采用中央省亲组群、绕行水路和分区院落的构图解释；不是原著唯一平面，也不是测绘。具体坐标、距离与可行走路线为展示推演。','canonChapters':[17,18,38,76]}
locations={
 'daguanyuan_gate':(0,-137,0),'qujingtongyou':(0,-111,0),
 'xiaoxiangguan':(-101,-62,0),'yihongyuan':(104,-99,0),
 'hengwuyuan':(-104,59,0),'qiushuangzhai':(106,-40,0),
 'daoxiangcun':(-105,0,0),'ouxiangxie':(79,63,0),
 'dicuiting':(-31,-59,0),'luxuean':(-62,110,0),
 'tubishanzhuang':(25,119,8),'aojingxiguan':(54,105,0),
 'daguanlou':(0,-1,0),'longcuian':(-115,115,2),
 'nuanxiangwu':(116,8,0)}
for p in layout['places']:
 p['position']=list(locations[p['id']]);p['entrance']=[0,-16,.22]
 if p['id']=='qujingtongyou':p['entrance']=[-20,-9,.22]
 if p['id']=='daguanyuan_gate':p['entrance']=[0,-5,.22]
 if p['id']=='daguanlou':
  p['bounds']=[78,102,27];p['cameraOffset']=[55,57,87];p['entrance']=[0,-34,.22]
  p['hotspots']=[{'id':'daguanlou-gate','name':'省亲牌坊与前庭','position':[0,-30,2]},{'id':'daguanlou-garden','name':'含芳阁、大观楼、缀锦阁','position':[0,1,11]},{'id':'daguanlou-study','name':'顾恩思义殿','position':[0,35,3]}]
  p['interiorCamera']={'position':[8,3.7,-30],'target':[0,2,-38],'fov':64}
 if p['id']=='ouxiangxie':p['entrance']=[0,0,1.0]
 if p['id']=='dicuiting':p['entrance']=[-5,0,.6]
 if p['id']=='aojingxiguan':p['cameraOffset']=[24,15,26]
 if p['id']=='aojingxiguan':p['entrance']=[0,-4,.22]
 if p['id']=='tubishanzhuang':p['cameraOffset']=[28,24,37]
 if p['id']=='tubishanzhuang':p['entrance']=[0,-7,.22]

def smooth(points,steps=5):
 out=[];n=len(points)
 for i in range(n):
  a,b,c,d=[points[k%n] for k in [i-1,i,i+1,i+2]]
  for j in range(steps):
   t=j/steps;out.append([round(.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t),4) for k in [0,1]])
 return out
# A narrow western branch, southern crossing pool, broad northeastern water,
# and a large central land mass for the complete ceremonial ensemble.
outline=smooth([(-56,-44),(-54,-18),(-55,17),(-58,47),(-53,75),(-41,97),(-17,105),(12,103),(38,98),(65,96),(84,97),(100,90),(104,69),(100,46),(87,32),(76,18),(67,-2),(66,-25),(56,-43),(33,-51),(10,-64),(-15,-70),(-42,-72),(-58,-62)])
island=smooth([(-44,-39),(-45,0),(-45,42),(-43,70),(-37,89),(-16,96),(15,93),(34,84),(45,67),(47,41),(47,10),(46,-21),(33,-39),(0,-47)],4)
layout['terrain']={'radius':[150,152],'boundary':[[-147,-137],[147,-137],[147,147],[-147,147]],'lake':{'center':[20,26],'radius':[84,87],'outline':outline,'holes':[island],'islands':[]},'hills':[{'center':[25,122],'radius':[28,23],'height':8},{'center':[-115,118],'radius':[32,35],'height':2}]}
layout['overviewCamera']={'position':[92,126,226],'mobilePosition':[92,146,255],'target':[0,4,8]}
nodes={};edges=[]
def node(name,pos):nodes[name]={'id':name,'position':list(pos)};return name
def run(names,kind='path'):
 for a,b in zip(names,names[1:]):edges.append({'from':a,'to':b,'kind':kind})
def chain(prefix,pts,kind='path'):
 ids=[node(prefix+str(i),p if len(p)==3 else [*p,.22]) for i,p in enumerate(pts)];run(ids,kind);return ids
for p in layout['places']:node(p['id'],[p['position'][i]+p['entrance'][i] for i in range(3)])
south=chain('arrival-',[(0,-142),(0,-128),(-20,-120),(-25,-110),(-19,-98),(3,-94),(0,-81)])
run(['daguanyuan_gate',south[0]]);run([south[2],'qujingtongyou',south[3]])
q=chain('qinfang-',[(0,-81),(0,-35)],'bridge');run([south[-1],q[0]])
center=chain('ceremonial-',[(0,-35),(0,-34)],'path');run([q[-1],center[0],center[-1],'daguanlou'])
# A perimeter circuit with authored bends; approaches meet the actual gate gap.
west=chain('west-',[(0,-81),(-50,-87),(-75,-86),(-101,-78),(-129,-81),(-133,-54),(-132,-21),(-127,-16),(-127,23),(-126,43),(-130,77),(-135,98),(-115,93),(-98,94),(-82,99),(-62,94)])
run([q[0],west[0]]);run([west[3],'xiaoxiangguan']);run([west[7],'daoxiangcun']);run([west[9],'hengwuyuan']);run([west[12],'longcuian'],'stairs');run([west[-1],'luxuean'])
east=chain('east-',[(0,-94),(36,-101),(66,-117),(104,-115),(135,-111),(137,-79),(134,-60),(137,-56),(137,-33),(137,-10),(137,-8),(137,37),(127,66),(119,105),(91,123),(56,133),(67,128)])
run([south[5],east[0]]);run([east[3],'yihongyuan']);run([east[7],'qiushuangzhai']);run([east[10],'nuanxiangwu'])
north=chain('north-', [(-62,94),(-47,116),(-20,131),(3,141),(26,144),(56,133)])
run([west[-1],north[0]]);run([north[-1],east[-2]])
# Causeways crossing the narrow branch have both abutments on land.
wb=chain('westbridge-', [(-69,31),(-36,31)],'bridge')
wa=chain('westapproach-', [(-127,23),(-117,31),(-91,31),(-69,31)])
run([west[8],wa[0]]);run([wa[-1],wb[0]])
inner=chain('inner-', [(-36,31),(-34,22),(-19,18),(-18,-19),(0,-35)])
run([wb[-1],inner[0]]);run([inner[-1],'daguanlou'])
# Dicui stands in the crossing pool and is approached by a short light bridge.
dc=chain('dicui-', [(-51,-77),(-40,-77),(-36,-75),(-36,-59,.6)])
run([west[1],dc[0]]);edges[-1]['kind']='path';edges[-2]['kind']='bridge';run([dc[-1],'dicuiting'])
# Waterside ensemble: bent galleries to both banks, bamboo back bridge.
ouleft=chain('ouleft-',[(39,57,1),(50,57,1),(61,63,1),(71,63,1)],'gallery')
ouright=chain('ouright-',[(87,63,1),(95,63,1),(103,56,1),(109,56,1)],'gallery')
ourear=chain('ourear-',[(79,67,1),(79,73,1),(84,76,1),(84,99,1)],'bamboo_bridge')
run(['ouxiangxie',ourear[0]],'bamboo_bridge');run([ouleft[-1],'ouxiangxie',ouright[0]],'gallery')
shore=chain('eastshore-',[(112,56),(113,76),(112,96),(91,107),(73,113),(70,101),(54,101)])
run([ouright[-1],shore[0]],'stairs');run([ourear[-1],shore[3]]);run([shore[-1],'aojingxiguan']);run([shore[2],east[13]])
descent=chain('moonsteps-',[(25,112,8.22),(35,111,8.22),(46,117,4.82),(57,118,.22),(66,115,.22),(67,101,.22),(54,101,.22)],'stairs')
run(['tubishanzhuang',descent[0]]);run([descent[-1],'aojingxiguan'])
run([east[-1],descent[4]])
rearwalk=chain('rearwalk-',[(39,54),(34,54),(24,55),(-24,55),(-34,54),(-36,31)])
run([ouleft[0],rearwalk[0]],'stairs');run([rearwalk[-1],inner[0]])
# Strip zero-length connector edges so camera interpolation never stalls.
layout['pathNodes']=list(nodes.values());layout['pathEdges']=[e for e in edges if math.dist(nodes[e['from']]['position'],nodes[e['to']]['position'])>.02]
# Coincident endpoints have shared graph connectivity but no duplicate geometry.
for i,a in enumerate(list(nodes)):
 for b in list(nodes)[i+1:]:
  if math.dist(nodes[a]['position'],nodes[b]['position'])<.025:layout['pathEdges'].append({'from':a,'to':b,'kind':'connection'})
write(R/'config/garden.layout.json',layout)
graph={k:[] for k in nodes}
for e in layout['pathEdges']:
 a,b=e['from'],e['to'];d=math.dist(nodes[a]['position'],nodes[b]['position']);graph[a].append((b,d));graph[b].append((a,d))
def shortest(a,b):
 queue=[(0,a,[])];seen=set()
 while queue:
  cost,n,path=heapq.heappop(queue)
  if n==b:return path+[n]
  if n in seen:continue
  seen.add(n)
  for nxt,d in graph[n]:heapq.heappush(queue,(cost+d,nxt,path+[n]))
 raise ValueError('Disconnected route '+a+' '+b)
routes=json.loads((R/'data/canon/routes.json').read_text(encoding='utf8'))
for route in routes:
 path=[]
 for a,b in zip(route['orderedStops'],route['orderedStops'][1:]):
  part=shortest(a,b);path+=part if not path else part[1:]
 route['pathNodeIds']=path
write(R/'data/canon/routes.json',routes)
print('Spatial layout:',len(nodes),'nodes',len(layout['pathEdges']),'edges; all curated tours connected')

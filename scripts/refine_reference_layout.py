"""Curved traversable approaches and connected planted islands."""
from pathlib import Path
import json,math,heapq
R=Path(__file__).resolve().parents[1];file=R/'config/garden.layout.json';layout=json.loads(file.read_text(encoding='utf8'))
layout['overviewCamera']={'position':[94,114,194],'target':[0,1,-28]}
layout['terrain']['lake']['islands']=[{'center':[-16,-39],'radius':[8,7]},{'center':[12,21],'radius':[14,10]},{'center':[-9,62],'radius':[8,12]}]
for p in layout['places']:
 if p['style'] in ['bamboo','flower','herb','study','temple','painting']:p['cameraOffset']=[23,16,30]
nodes={n['id']:n['position'] for n in layout['pathNodes']};edges=[]
if not any('-bend-' in n for n in nodes):
 for index,e in enumerate(layout['pathEdges']):
  a,b=nodes[e['from']],nodes[e['to']];length=math.dist(a,b)
  if e['kind']=='bridge' or length<16:edges.append(e);continue
  dx,dy=b[0]-a[0],b[1]-a[1];swing=min(5,length*.085)*(1 if index%2 else -1);last=e['from']
  for i in range(1,4):
   t=i/4;curve=math.sin(t*math.pi)*swing;node=f'{e["from"]}-bend-{index}-{i}';pos=[a[0]+dx*t-dy/length*curve,a[1]+dy*t+dx/length*curve,a[2]+(b[2]-a[2])*t];nodes[node]=pos;layout['pathNodes'].append({'id':node,'position':pos});edges.append({'from':last,'to':node,'kind':'path'});last=node
  edges.append({'from':last,'to':e['to'],'kind':'path'})
 layout['pathEdges']=edges
file.write_text(json.dumps(layout,ensure_ascii=False,indent=2),encoding='utf8')
graph={key:[] for key in nodes}
for e in layout['pathEdges']:
 a,b=e['from'],e['to'];d=math.dist(nodes[a],nodes[b]);graph[a].append((b,d));graph[b].append((a,d))
def shortest(a,b):
 queue=[(0,a,[])];seen=set()
 while queue:
  cost,n,path=heapq.heappop(queue)
  if n==b:return path+[n]
  if n in seen:continue
  seen.add(n)
  for nxt,d in graph[n]:heapq.heappush(queue,(cost+d,nxt,path+[n]))
 raise ValueError('Disconnected garden route')
routefile=R/'data/canon/routes.json';routes=json.loads(routefile.read_text(encoding='utf8'))
for route in routes:
 path=[]
 for a,b in zip(route['orderedStops'],route['orderedStops'][1:]):
  part=shortest(a,b);path+=part if not path else part[1:]
 route['pathNodeIds']=path
routefile.write_text(json.dumps(routes,ensure_ascii=False,indent=2),encoding='utf8')

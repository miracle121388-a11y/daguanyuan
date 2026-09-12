"""Geometry constraints independent of the scene renderer or navigation graph."""
from pathlib import Path
from shapely.geometry import Polygon, Point, LineString, box
import json, math, os
R=Path(__file__).resolve().parents[1];d=json.loads((R/'config/garden.layout.json').read_text(encoding='utf8'))
water=Polygon(d['terrain']['lake']['outline'],d['terrain']['lake']['holes']);nodes={n['id']:n['position'] for n in d['pathNodes']};places={p['id']:p for p in d['places']};failures=[];checks=[]
obstacles=[]
for p in d['places']:
 x,y,z=p['position'];shapes={'bamboo':(13.2,6.4,7),'flower':(20,8,9),'herb':(23,7.5,11),'study':(23,9,8),'temple':(18,8,8),'painting':(17,8,7),'hill':(19,9,4),'moon':(17,9,4)}
 if p['style'] in shapes:
  w,depth,dy=shapes[p['style']];obstacles.append((p['id'],box(x-w/2,y+dy-depth/2,x+w/2,y+dy+depth/2)))
obstacles.extend([('main_lou',box(-14,-6.5,14,8.5)),('west_ge',box(-36,-2, -22,8)),('east_ge',box(22,-2,36,8)),('main_dian',box(-14,28,14,43)),('rear_hall',box(-10.5,62.5,10.5,71.5)),('entry_rock_screen',box(-17,-115,17,-105))])
def check(name,value,detail=''):
 checks.append({'check':name,'passed':bool(value),'detail':detail})
 if not value:failures.append(name+': '+detail)
check('Canal polygon and dry interior are valid',water.is_valid)
for e in d['pathEdges']:
 a,b=nodes[e['from']],nodes[e['to']];line=LineString([a[:2],b[:2]])
 check('No vertical navigation jump '+e['from']+' → '+e['to'],math.dist(a[:2],b[:2])>.01 or abs(a[2]-b[2])<.05)
 if e['kind']=='stairs':check('Walkable stair slope '+e['from'],abs(a[2]-b[2])/max(.01,line.length)<.8)
 if e['kind']=='path' and not any('dicuit' in k for k in [e['from'],e['to']]):
  length=line.intersection(water).length
  check('Dry path '+e['from']+' → '+e['to'],length<1.1,f'{length:.2f} m crosses water')
  clashes=[name for name,shape in obstacles if line.intersection(shape.buffer(.8)).length>.5]
  check('Path clears buildings '+e['from']+' → '+e['to'],not clashes,', '.join(clashes))
 if e['kind']=='bridge':
  for name,p in [(e['from'],a),(e['to'],b)]:
   if name.startswith('dicui-') and name.endswith('3'):continue
   check('Bridge abutment '+name,not water.buffer(-.35).contains(Point(p[:2])))
for p in d['places']:
 if p['style'] in ['waterside','pavilion','rockery']:continue
 x,y,z=p['position'];footprint=box(x-13,y+1,x+13,y+13)
 if p['id']=='daguanlou':footprint=box(-36,-28,36,75)
 overlap=footprint.intersection(water).area
 check('Dry building footprint '+p['id'],overlap<.5,f'{overlap:.2f} m² over water')
 x,y,z=p['position'];a=p['entrance'];n=nodes[p['id']]
 check('Entrance aligned '+p['id'],math.dist([x+a[0],y+a[1],z+a[2]],n)<.01)
# Specific text-supported relations, without treating inferred bearings as canon.
g=places['daguanyuan_gate']['position'];r=places['qujingtongyou']['position']
check('Entry screen stands in front of the garden interior',abs(g[0]-r[0])<3 and 15<r[1]-g[1]<35)
ou=places['ouxiangxie']['position'];check('Ou pavilion stands within the pool',water.contains(Point(ou[:2])))
hi=places['tubishanzhuang']['position'];lo=places['aojingxiguan']['position'];check('Convex hill and concave shore are adjacent and differ in height',math.dist(hi[:2],lo[:2])<40 and hi[2]-lo[2]>=6)
check('Concave hall is beside water',water.distance(Point(lo[:2]))<12)
report={'revision':d['assetRevision'],'waterAreaM2':round(water.area,1),'checks':checks,'passed':not failures,'limitations':'Geometric consistency of this spatial interpretation; it cannot verify a unique canonical plan.'}
p=R/'reports/acceptance/spatial-layout.json';q=p.with_suffix('.next');q.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');os.replace(q,p)
print(json.dumps({'checks':len(checks),'passed':not failures,'failures':failures},ensure_ascii=False,indent=2))
raise SystemExit(bool(failures))

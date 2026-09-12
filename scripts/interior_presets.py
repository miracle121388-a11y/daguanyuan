"""Authored camera positions are inside each actual room, in local web axes."""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1];p=R/'config/garden.layout.json';d=json.loads(p.read_text(encoding='utf8'))
views={
 'xiaoxiangguan':([-5.5,2.8,-4.65],[-3.2,1.45,-8.0],64),
 'yihongyuan':([1.3,2.7,-6.0],[-3.5,1.55,-9.0],65),
 'hengwuyuan':([1.0,2.7,-8.0],[-1.5,1.55,-12.0],64),
 'qiushuangzhai':([5.5,3.2,-4.3],[0,1.75,-7.0],62),
 'longcuian':([11.5,2.5,2.0],[10.0,1.4,-1.0],64),
 'nuanxiangwu':([6.0,2.7,-4.2],[1,1.55,-6.5],62),
 'daguanlou':([6,5,-6],[0,4,-13],60),
 'daoxiangcun':([2.5,2.3,-4.8],[-1,1.4,-7.5],62),
 'luxuean':([4.5,2.4,-2],[0,1.4,-6],62),
 'ouxiangxie':([5.5,2.8,2.3],[0,1.5,-.8],62),
 'daguanyuan_gate':([5,2.8,1],[0,2,-1],60),
 'aojingxiguan':([6,3.0,-1],[0,1.8,-6],62),
 'tubishanzhuang':([6,3.0,-1],[0,1.8,-6],62)}
for place in d['places']:
 if place['id'] in views:
  a,b,fov=views[place['id']];place['interiorCamera']={'position':a,'target':b,'fov':fov}
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')

"""Commit the r12 material interpretation without moving the reviewed plan."""
from pathlib import Path
import json,copy,datetime
R=Path(__file__).resolve().parents[1]
p=R/'config/craft.materials.json';spec=json.loads(p.read_text(encoding='utf-8'));spec['revision']='r12'
for name in ['paving','courtbase']:
    spec['materials'][name].update(value=.205,saturation=.12,normalStrength=.20,roughness=.82)
spec['materials']['cutstone'].update(value=.43,saturation=.18,roughness=.79)
spec['materials']['stone'].update(value=.32,saturation=.20,roughness=.86)
spec['materials']['bankstone'].update(value=.80,saturation=.40,normalStrength=.48,roughness=.80,period=[2.4,1.6])
spec['materials']['wood'].update(value=4.05,saturation=.58,roughness=.64,normalStrength=.08)
spec['materials']['darkwood'].update(value=2.75,saturation=.50,roughness=.74,normalStrength=.07)
spec['materials']['latticewood'].update(value=3.8,saturation=.56,roughness=.63,normalStrength=.07)
spec['materials']['floorwood'].update(value=2.9,saturation=.44,roughness=.81,normalStrength=.055,period=[.38,3.2])
spec['materials']['furniture'].update(value=3.35,saturation=.66,roughness=.43,normalStrength=.045,period=[.72,4.6])
p.write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=R/'config/garden.layout.json';layout=json.loads(p.read_text(encoding='utf-8'));before=copy.deepcopy(layout)
layout['assetRevision']='spatial-garden-20260912-r12';p.write_text(json.dumps(layout,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
source=R/'scripts/prepare_spatial_layout.py';source.write_text(source.read_text(encoding='utf-8').replace('spatial-garden-20260912-r11','spatial-garden-20260912-r12'),encoding='utf-8')
checks={key:before[key]==layout[key] for key in ['places','pathNodes','pathEdges','terrain','overviewCamera']}
(R/'reports/acceptance/r12-layout-preservation.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':all(checks.values()),'checks':checks,'scope':'Spatial interpretation retained, not an assertion of a unique novel plan.'},indent=2),encoding='utf-8')
assert all(checks.values())
print('R12 material roles updated; all layout groups preserved.')

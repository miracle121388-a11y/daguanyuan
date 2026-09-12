"""Fill only shoreline grid gaps; never stack a flat plane below the terrain."""
from pathlib import Path
import json,hashlib
from shapely.geometry import Polygon,box
from shapely.ops import triangulate
R=Path(__file__).resolve().parents[1]
lake=json.loads((R/'config/garden.layout.json').read_text(encoding='utf-8'))['terrain']['lake']
water=Polygon(lake['outline'],lake['holes']);assert water.is_valid
def inside(poly,x,y):
 result=False
 for i,a in enumerate(poly):
  c=poly[(i+1)%len(poly)]
  if (a[1]>y)!=(c[1]>y) and x<(c[0]-a[0])*(y-a[1])/(c[1]-a[1])+a[0]:result=not result
 return result
def wet(x,y):return inside(lake['outline'],x,y) and not any(inside(h,x,y) for h in lake['holes'])
vertices=[];faces=[]
for y in range(-308,372,4):
 for x in range(-360,360,4):
  if all(not wet(a,b) for a,b in [(x,y),(x+4,y),(x+4,y+4),(x,y+4),(x+2,y+2)]):continue
  dry=box(x,y,x+4,y+4).difference(water)
  if dry.is_empty:continue
  polygons=[dry] if dry.geom_type=='Polygon' else list(dry.geoms)
  for polygon in polygons:
   for triangle in triangulate(polygon):
    if not polygon.buffer(1e-9).covers(triangle):continue
    coords=list(triangle.exterior.coords)[:3]
    if (coords[1][0]-coords[0][0])*(coords[2][1]-coords[0][1])-(coords[1][1]-coords[0][1])*(coords[2][0]-coords[0][0])<0:coords.reverse()
    i=len(vertices);vertices.extend([[a,b,.025] for a,b in coords]);faces.append([i,i+1,i+2])
record={'method':'Exact dry portions of 4m cells omitted by the sampled terrain; triangles clipped to the shared lake boundary. No duplicate all-garden base plane.','lakeSha256':hashlib.sha256(json.dumps(lake,sort_keys=True).encode()).hexdigest(),'vertices':vertices,'faces':faces}
p=R/'config/shore-fill.json';q=p.with_suffix('.json.next');q.write_text(json.dumps(record),encoding='utf-8');q.replace(p)
print('Clipped shoreline fill:',len(faces),'triangles')

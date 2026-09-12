"""Compute material zones from the exact shoreline and planted master, not a scene image."""
import bpy,json,hashlib,sys
import numpy as np
from pathlib import Path
R=Path(__file__).resolve().parents[1];master=R/'blender/daguanyuan_master.blend';layout_path=R/'config/garden.layout.json'
sys.path.insert(0,str(R/'blender'))
bpy.ops.wm.open_mainfile(filepath=str(master))
layout=json.loads(layout_path.read_text(encoding='utf-8'));n=768;span=768.;axis=(np.arange(n,dtype=np.float32)+.5)/n*span-span/2;x,y=np.meshgrid(axis,axis)
soil=np.zeros((n,n),dtype=np.float32);distance=np.full((n,n),999.,dtype=np.float32)
for ob in bpy.data.collections['Reference_Living_Trees'].objects:
 px,py,_=ob.location
 low=ob.get('plantingLayer')=='understorey'
 r=(1.7 if low else 2.5)*ob.scale.x
 i=int((px+span/2)/span*n);j=int((py+span/2)/span*n);rad=int(r*2.5/span*n)+1
 a,b=max(0,i-rad),min(n,i+rad+1);c,d=max(0,j-rad),min(n,j+rad+1)
 if a>=b or c>=d:continue
 noise=.72+.16*np.sin(x[c:d,a:b]*1.27+y[c:d,a:b]*.91)+.12*np.sin(y[c:d,a:b]*2.03-x[c:d,a:b]*.77)
 stamp=np.exp(-((x[c:d,a:b]-px)**2+(y[c:d,a:b]-py)**2)/(r*r))*(.36 if low else .76)*noise
 soil[c:d,a:b]=np.maximum(soil[c:d,a:b],stamp)
# Actual bamboo foot vertices define an irregular soil edge, without overlay plates.
bpy.context.view_layer.update();roots=set()
for ob in bpy.data.objects:
 if ob.type!='MESH' or not ob.parent or ob.parent.name!='xiaoxiangguan' or not any(m.name in ['bamboo','botanical_stem'] for m in ob.data.materials):continue
 for v in ob.data.vertices:
  if v.co.z>.14:continue
  world=ob.matrix_world@v.co;roots.add((round(world.x*4)/4,round(world.y*4)/4))
for px,py in roots:
 i=int((px+span/2)/span*n);j=int((py+span/2)/span*n);rad=6
 a,b=max(0,i-rad),min(n,i+rad+1);c,d=max(0,j-rad),min(n,j+rad+1)
 stamp=np.exp(-((x[c:d,a:b]-px)**2+(y[c:d,a:b]-py)**2)/2.7)*.95
 soil[c:d,a:b]=np.maximum(soil[c:d,a:b],stamp)
planting_path=R/'config/garden.planting.json'
if planting_path.exists():
 planting=json.loads(planting_path.read_text(encoding='utf8'))
 places={p['id']:p for p in layout['places']}
 for key,beds in planting['courts'].items():
  px,py,_=places[key]['position']
  for cx,cy,rx,ry,angle in beds:
   dx=x-px-cx;dy=y-py-cy;u=(dx*np.cos(angle)+dy*np.sin(angle))/rx;v=(-dx*np.sin(angle)+dy*np.cos(angle))/ry
   radius=np.sqrt(u*u+v*v);edge=.88+.09*np.sin((x-px)*1.7+(y-py)*1.2)+.05*np.sin((x-px)*3.9-(y-py)*2.5)
   stamp=np.clip((edge+.12-radius)/.22,0,1)*(.79+.16*np.sin(x*2.8+y*1.7)**2)
   soil=np.maximum(soil,stamp)
for ring in [layout['terrain']['lake']['outline']]+layout['terrain']['lake']['holes']:
 for a,b in zip(ring,ring[1:]+ring[:1]):
  dx,dy=b[0]-a[0],b[1]-a[1];t=np.clip(((x-a[0])*dx+(y-a[1])*dy)/max(.001,dx*dx+dy*dy),0,1)
  distance=np.minimum(distance,np.hypot(x-a[0]-t*dx,y-a[1]-t*dy))
wet=np.exp(-distance/3.8)
# The path shoulder is derived from the same reviewed edges, not drawn by eye.
road=np.full((n,n),999.,dtype=np.float32);nodes={p['id']:p['position'] for p in layout['pathNodes']}
for edge in layout['pathEdges']:
 if edge['kind'] not in ['path','stairs']:continue
 a,b=nodes[edge['from']],nodes[edge['to']];dx,dy=b[0]-a[0],b[1]-a[1]
 t=np.clip(((x-a[0])*dx+(y-a[1])*dy)/max(.001,dx*dx+dy*dy),0,1)
 road=np.minimum(road,np.hypot(x-a[0]-t*dx,y-a[1]-t*dy))
shoulder=np.exp(-(np.maximum(0,road-1.2)/1.15)**2)*(.80+.2*np.sin(x*.77+y*.57)**2)
pixels=np.stack([soil,wet,shoulder,np.ones_like(soil)],axis=-1)
# A scalar control texture needs no sub-byte precision; quantization preserves
# smooth filtering while reducing its transfer size. This is not scene imagery.
pixels=np.round(pixels*63)/63
image=bpy.data.images.new('Master_Surface_Zones',width=n,height=n,alpha=True);image.colorspace_settings.name='Non-Color';image.pixels.foreach_set(pixels.ravel());image.update()
target=R/'public/textures/ground/surface-zones.png';image.filepath_raw=str(target);image.file_format='PNG';image.save()
from native_ground import attach
attach(image)
bpy.ops.wm.save_as_mainfile(filepath=str(master))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
record={'origin':'Blender/Python geometry-derived scalar masks','sourceFile':'blender/daguanyuan_master.blend','sourceSha256':sha(master),'layoutSha256':sha(layout_path),'sha256':sha(target),'resolution':n,'quantizationLevels':64,'worldSpanMetres':span,'channels':{'R':'Irregular soil beneath actual canopies: radius2.5 x scale / weight.76; low shrubs radius1.7 x scale / weight.36; bamboo feet1.64m falloff','G':'Shore proximity exp(-distance/3.8m), exact reviewed polygon','B':'Reviewed path shoulder exp(-(max(0,d-1.2)/1.15)^2), irregular .8–1 edge factor'},'prompt':'Compute material zones from the actual planted master, reviewed route edges and shoreline with blender/bake_surface_zones.py. No photographed or generated building image.'}
record['plantingFile']='config/garden.planting.json';record['plantingSha256']=sha(planting_path);record['channels']['R']+='; continuous authored courtyard beds with .22 normalized edge falloff shared with the actual 3D planting';record['nativeCounterpart']='Packed into native earth surface; export preserves original grass map for equivalent browser blend.'
target.with_suffix('.png.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
print('GEOMETRY SURFACE MASK',target.stat().st_size,flush=True)

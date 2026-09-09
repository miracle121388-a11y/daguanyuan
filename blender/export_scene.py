import bpy,json
from pathlib import Path
def export_selected(path,objects):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.hide_set(False);o.select_set(True)
 path.parent.mkdir(parents=True,exist_ok=True)
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_cameras=False,export_lights=False,export_apply=True,export_yup=True,export_image_format='JPEG',export_jpeg_quality=82)
def web(p):return [p[0],p[2],-p[1]]
def manifest(layout):
 places=[]
 for p in layout['places']:
  pos=web(p['position']);off=p['cameraOffset']
  places.append({**p,'position':pos,'model':'models/places/'+p['id']+'.glb','mobileModel':'models/places-low/'+p['id']+'.glb','cameraPosition':[pos[i]+off[i] for i in range(3)],'cameraTarget':[pos[0],pos[1]+1.6,pos[2]],'hotspots':[{**h,'position':web(h['position'])} for h in p['hotspots']],'lod':{'overview':p['id'],'detail':p['id']},'boundingBox':{'min':[pos[0]-p['bounds'][0]/2,pos[1]-.5,pos[2]-p['bounds'][1]/2],'max':[pos[0]+p['bounds'][0]/2,pos[1]+p['bounds'][2],pos[2]+p['bounds'][1]/2]}})
 return {'version':1,'overview':'models/overview.glb','overviewCamera':{'position':[170,165,218],'target':[0,0,0]},'spatialInterpretation':layout['spatialInterpretation'],'places':places,'pathNodes':[{**n,'position':web(n['position'])} for n in layout['pathNodes']],'pathEdges':layout['pathEdges'],'lake':layout['terrain']['lake']}

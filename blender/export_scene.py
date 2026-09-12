import bpy,json,os
from pathlib import Path
def export_selected(path,objects):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.hide_set(False);o.select_set(True)
 path.parent.mkdir(parents=True,exist_ok=True)
 temp=path.with_name(path.stem+'.exporting.glb')
 # Native world-coordinate blending is applied by the web shader after export.
 # Export the same original ground image, without asking glTF to flatten nodes.
 restore=[]
 for m in bpy.data.materials:
  if not m.use_nodes or not m.get('nativeGroundSource'):continue
  bs=m.node_tree.nodes.get('Principled BSDF');source=m.node_tree.nodes.get(m['nativeGroundSource'])
  if not bs or not source:continue
  socket=bs.inputs['Base Color'];old=socket.links[0].from_socket if socket.is_linked else None;restore.append((m,socket,old));m.node_tree.links.new(source.outputs['Color'],socket)
 try:bpy.ops.export_scene.gltf(filepath=str(temp),export_format='GLB',use_selection=True,export_extras=True,export_cameras=False,export_lights=False,export_apply=True,export_yup=True,export_image_format='AUTO',export_jpeg_quality=80,export_vertex_color='ACTIVE')
 finally:
  for m,socket,source in restore:
   if source:m.node_tree.links.new(source,socket)
 os.replace(temp,path)
def web(p):return [p[0],p[2],-p[1]]
def manifest(layout):
 places=[]
 for p in layout['places']:
  pos=web(p['position']);off=p['cameraOffset']
  places.append({**p,'position':pos,'model':'models/places/'+p['id']+'.glb','mobileModel':'models/places-low/'+p['id']+'.glb','cameraPosition':[pos[i]+off[i] for i in range(3)],'cameraTarget':[pos[0],pos[1]+1.6,pos[2]],'hotspots':[{**h,'position':web(h['position'])} for h in p['hotspots']],'lod':{'overview':p['id'],'detail':p['id']},'boundingBox':{'min':[pos[0]-p['bounds'][0]/2,pos[1]-.5,pos[2]-p['bounds'][1]/2],'max':[pos[0]+p['bounds'][0]/2,pos[1]+p['bounds'][2],pos[2]+p['bounds'][1]/2]}})
 return {'version':1,'overview':'models/overview.glb','overviewCamera':{'position':[170,165,218],'target':[0,0,0]},'spatialInterpretation':layout['spatialInterpretation'],'places':places,'pathNodes':[{**n,'position':web(n['position'])} for n in layout['pathNodes']],'pathEdges':layout['pathEdges'],'lake':layout['terrain']['lake']}

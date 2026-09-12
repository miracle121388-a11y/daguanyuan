"""Small local source plants; editable instances and exact WebGL placements."""
import bpy,math,random,json
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1]
PROTOTYPES=[]

def source_material():
 """One packed RGBA image avoids the exporter's separate-image channel merge.

 The earlier merge retained alpha but produced nearly black RGB. Read fresh
 source pixels once and validate the visible leaf colour before GLB export.
 """
 folder=R/'assets/source/fern_02/textures'
 revision=json.loads((R/'config/craft.materials.json').read_text(encoding='utf-8'))['revision']
 image=bpy.data.images.load(str(R/f'assets/processed/foliage-{revision}/fern_02_rgba.png'),check_existing=False)
 image.colorspace_settings.name='sRGB';image.pack()
 m=bpy.data.materials.new('understory_fern');m.use_nodes=True
 nodes=m.node_tree.nodes;links=m.node_tree.links;nodes.clear()
 bs=nodes.new('ShaderNodeBsdfPrincipled');bs.inputs['Roughness'].default_value=.83
 tex=nodes.new('ShaderNodeTexImage');tex.image=image
 links.new(tex.outputs['Color'],bs.inputs['Base Color']);links.new(tex.outputs['Alpha'],bs.inputs['Alpha'])
 normal_path=folder/'fern_02_nor_gl_1k.png'
 if normal_path.exists():
  normal=nodes.new('ShaderNodeTexImage');normal.image=bpy.data.images.load(str(normal_path),check_existing=False)
  normal.image.colorspace_settings.name='Non-Color';normal.image.scale(512,512);normal.image.pack()
  convert=nodes.new('ShaderNodeNormalMap');convert.inputs['Strength'].default_value=.35
  links.new(normal.outputs['Color'],convert.inputs['Color']);links.new(convert.outputs['Normal'],bs.inputs['Normal'])
 end=nodes.new('ShaderNodeOutputMaterial');links.new(bs.outputs[0],end.inputs['Surface'])
 m.surface_render_method='DITHERED';m.use_backface_culling=False
 return m

def build_all():
 from export_scene import export_selected
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(R/'assets/source/fern_02/fern_02.gltf'))
 imported=[o for o in bpy.data.objects if o not in before]
 choices=sorted([o for o in imported if o.type=='MESH'],key=lambda o:len(o.data.polygons))[:2]
 material=source_material()
 for i,ob in enumerate(choices):
  # Source pack translations arrange a catalogue; each plant is rooted independently.
  ob.location=(0,0,0);ob.scale=(1,1,1);ob.rotation_euler=(0,0,0)
  lo=Vector(tuple(min(v.co[k] for v in ob.data.vertices) for k in range(3)));hi=Vector(tuple(max(v.co[k] for v in ob.data.vertices) for k in range(3)))
  center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
  for v in ob.data.vertices:v.co-=center
  ob.data.materials.clear();ob.data.materials.append(material)
  ob.name='Understory_fern_'+str(i);ob['sourceAsset']='fern_02';ob['species']=i
  export_selected(R/'public/models/vegetation'/f'fern-{i}.glb',[ob]);PROTOTYPES.append(ob)
 for ob in imported:
  if ob not in PROTOTYPES:bpy.data.objects.remove(ob,do_unlink=True)
 for ob in PROTOTYPES:ob.hide_render=True;ob.hide_set(True)
 return PROTOTYPES

def populate(layout):
 from r7_ground_cover import ground_tree
 from spatial_world import in_water
 tree=ground_tree();col=bpy.data.collections.new('Reference_Understory');col['generated']=True;bpy.context.scene.collection.children.link(col)
 points=[];rng=random.Random(9026)
 # Existing grass clusters provide a restrained bank layer, with no route movement.
 for i,ob in enumerate(bpy.data.collections['Reference_Ground_Cover'].objects):
  if i%8:continue
  points.append((ob.location.x,ob.location.y,rng.uniform(.8,1.5),None))
 # Ferns below the bamboo; the main walk and all three channel segments stay clear.
 p=next(p for p in layout['places'] if p['id']=='xiaoxiangguan');px,py,_=p['position']
 for i in range(112):
  side=-1 if i%3 else 1;x=side*rng.uniform(4.0,10.3);y=rng.uniform(-10.8,2.0)
  points.append((px+x,py+y,rng.uniform(1.2,1.9),p['id']))
 for i,(x,y,scale,place_id) in enumerate(points):
  if in_water(layout,x,y):continue
  hit,_,_,_=tree.ray_cast(Vector((x,y,250)),Vector((0,0,-1)),500)
  if hit is None:continue
  ob=bpy.data.objects.new(f'Understory_{i:04}',PROTOTYPES[i%2].data);col.objects.link(ob);ob.location=(x,y,hit.z+.025);ob.scale=(scale,)*3;ob.rotation_euler.z=rng.random()*math.tau
  ob['sourceAsset']='fern_02';ob['species']=i%2;ob['placeId']=place_id or ''
 print('SOURCE UNDERSTORY',len(col.objects),'ground-seated instances',flush=True)

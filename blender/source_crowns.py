"""Full native crowns and coverage-preserving surface simplification for WebGL."""
import bpy,math,random,json
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1]
SOURCES=[('island_tree_01','broadleaf'),('island_tree_02','broadleaf-2'),('pine_sapling_small','pine')]

def shrub_source():
 """Reprofile a source crown as a low planted mass, retaining real leaf islands.

 This is landscape interpretation, not a botanical species attributed to Cao.
 The same deformation is rendered into the distance atlas and exported as mesh.
 """
 ob=source('island_tree_01');ob['sourceAsset']='island_tree_01'
 for v in ob.data.vertices:
  v.co.x*=1.05;v.co.y*=1.05
  v.co.z=v.co.z*.12 if v.co.z<1.45 else .174+(v.co.z-1.45)*.34
 return ob

def source(aid):
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(R/'assets/source'/aid/(aid+'.gltf')))
 imported=[o for o in bpy.data.objects if o not in before]
 meshes=[o for o in imported if o.type=='MESH']
 # A source pack can contain several complete saplings; take its largest variant.
 ob=max(meshes,key=lambda o:len(o.data.polygons))
 for other in imported:
  if other!=ob:bpy.data.objects.remove(other,do_unlink=True)
 matrix=ob.matrix_world.copy()
 for v in ob.data.vertices:v.co=matrix@v.co
 ob.matrix_world.identity()
 lo=Vector(tuple(min(v.co[i] for v in ob.data.vertices) for i in range(3)));hi=Vector(tuple(max(v.co[i] for v in ob.data.vertices) for i in range(3)))
 factor=5.1/max(hi-lo);center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
 for v in ob.data.vertices:v.co=(v.co-center)*factor
 # Tropical buttress roots are unsuitable for the garden's near-room scale.
 # Keep the source crown/UV islands, but re-author the lower trunk profile.
 # Both the mesh LOD and its atlas call this same deformation.
 if aid.startswith('island_tree'):
  height=max(v.co.z for v in ob.data.vertices)
  for v in ob.data.vertices:
   t=max(0,min(1,v.co.z/max(.001,height*.45)));blend=t*t*(3-2*t)
   width=.22+.78*blend
   v.co.x*=width;v.co.y*=width
 for material in ob.data.materials:
  if not material.use_nodes:continue
  bs=material.node_tree.nodes.get('Principled BSDF')
  bs.inputs['Roughness'].default_value=.87
  kind='twig' if 'twig' in material.name else 'leaves' if 'leaves' in material.name else None
  if kind:
   revision=json.loads((R/'config/craft.materials.json').read_text(encoding='utf-8'))['revision']
   path=R/f'assets/processed/foliage-{revision}'/f'{aid}_{kind}_rgba.png'
   image=bpy.data.images.load(str(path),check_existing=False);image.colorspace_settings.name='sRGB';image.pack()
   node=material.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
   material.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color'])
   material.node_tree.links.new(node.outputs['Alpha'],bs.inputs['Alpha'])
   material.surface_render_method='DITHERED';material.use_backface_culling=False
  for node in material.node_tree.nodes:
   if node.type=='TEX_IMAGE' and node.image:node.image.pack()
 return ob

def compact(ob,name,leaf_budget=2400):
 mesh=ob.data;selected=[];foliage=[]
 for i,m in enumerate(mesh.materials):
  faces=[p for p in mesh.polygons if p.material_index==i]
  if not any(s in m.name for s in ['leaves','twig']):
   selected.extend(faces);continue
  # Start from the whole crown. Sampling 5,000 out of a million leaf faces
  # retained less than one percent of its area and left bare branches.
  foliage.extend(faces)
 def mesh_copy(polygons,suffix):
  ids=sorted({v for p in polygons for v in p.vertices});index={v:i for i,v in enumerate(ids)}
  data=bpy.data.meshes.new(name+suffix);data.from_pydata([tuple(mesh.vertices[i].co) for i in ids],[],[tuple(index[i] for i in p.vertices) for p in polygons]);data.update()
  for m in mesh.materials:data.materials.append(m)
  uv=data.uv_layers.new(name='UVMap');source_uv=mesh.uv_layers.active.data
  for new,old in zip(data.polygons,polygons):
   new.material_index=old.material_index;new.use_smooth=old.use_smooth
   for ni,oi in zip(new.loop_indices,old.loop_indices):uv.data[ni].uv=source_uv[oi].uv
  copy=bpy.data.objects.new(name+suffix,data);bpy.context.scene.collection.objects.link(copy);return copy
 trunk=mesh_copy(selected,'_bark');leaves=mesh_copy(foliage,'_foliage')
 bpy.ops.object.select_all(action='DESELECT');leaves.select_set(True);bpy.context.view_layer.objects.active=leaves
 planar=leaves.modifiers.new('Leaf surface simplification','DECIMATE');planar.decimate_type='DISSOLVE';planar.angle_limit=math.radians(18);planar.use_dissolve_boundaries=False;planar.delimit={'MATERIAL','UV'}
 bpy.ops.object.modifier_apply(modifier=planar.name)
 leaves.data.calc_loop_triangles();count=len(leaves.data.loop_triangles)
 if count>leaf_budget:
  reduce=leaves.modifiers.new('Bounded leaf geometry','DECIMATE');reduce.ratio=leaf_budget/count;reduce.use_collapse_triangulate=True
  bpy.ops.object.modifier_apply(modifier=reduce.name)
 original_area=sum(p.area for p in foliage);retained_area=sum(p.area for p in leaves.data.polygons)
 print('CROWN COVERAGE LOD',name,'all-source faces',len(foliage),'planar triangles',count,'final polygons',len(leaves.data.polygons),'leaf surface area ratio',round(retained_area/max(original_area,.00001),3),flush=True)
 bpy.ops.object.select_all(action='DESELECT');trunk.select_set(True);bpy.context.view_layer.objects.active=trunk
 if len(trunk.data.polygons)>500:
  md=trunk.modifiers.new('BarkLOD','DECIMATE');md.ratio=min(1,1300/len(trunk.data.polygons));bpy.ops.object.modifier_apply(modifier=md.name)
 leaves.select_set(True);bpy.ops.object.join();trunk.name=name
 trunk['sourceAsset']=ob.get('sourceAsset','');return trunk

def build_all():
 from export_scene import export_selected
 prototypes=[]
 for aid,name in SOURCES:
  src=source(aid);src['sourceAsset']=aid
  high=compact(src,'Crown_'+name,22000 if name!='pine' else 10000)
  export_selected(R/'public/models/vegetation'/f'{name}.glb',[high])
  if name=='broadleaf':
   low=compact(src,'Crown_mobile',6500);export_selected(R/'public/models/vegetation/broadleaf-low.glb',[low]);bpy.data.objects.remove(low,do_unlink=True)
  src.name='Master_Crown_'+name;src.hide_render=True;src.hide_set(True);prototypes.append(src)
  print('NATIVE CROWN LOD',name,len(high.data.polygons),flush=True)
  bpy.data.objects.remove(high,do_unlink=True)
 src=shrub_source();low=compact(src,'Crown_shrub',9000)
 export_selected(R/'public/models/vegetation/shrub.glb',[low])
 src.name='Master_Crown_shrub';src.hide_render=True;src.hide_set(True);prototypes.append(src);bpy.data.objects.remove(low,do_unlink=True)
 return prototypes

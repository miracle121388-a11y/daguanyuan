"""Record actual roots and ground receivers for a surface/underplanting update."""
import bpy,json,sys,hashlib
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
from sunwen_architecture import geometry_hash
bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
bpy.context.view_layer.update()
roots=[]
design=json.loads((R/'config/garden.grounding.json').read_text())
from sunwen_architecture import ground_tree
terrain=ground_tree();moves={}
for ob in sorted(bpy.data.collections['Reference_Living_Trees'].objects,key=lambda o:o.name):
    if ob.get('urbanRetired') or ob.hide_render:continue
    position=list(ob.location)
    if ob.name in design.get('rootAdjustments',{}):
        x,y=design['rootAdjustments'][ob.name]
        hit=terrain.ray_cast(Vector((x,y,90)),Vector((0,0,-1)),180)[0]
        assert hit is not None,'Relocated tree must sit on native terrain'
        position=[x,y,hit.z+.02]
        if (Vector(position)-ob.location).length>.001:
            moves[ob.name]={'from':list(ob.location),'to':position,'originalMatrix':[list(r) for r in ob.matrix_world]}
    roots.append({'name':ob.name,'position':position,'scale':list(ob.scale),
                  'species':int(ob['sunwenSpecies']),'screen':bool(ob.get('urbanScreenCrown'))})
protected={o.name:geometry_hash(o) for col in bpy.data.collections
           if col.name.startswith('Place_') or col.name in ['Garden_Landscape','Urban_Context','Urban_Garden_Ground','Manual_Adjustments','Sunwen_Architectural_Details','Reference_Living_Trees','Sunwen_Garden_Details','Reference_Sunwen_Planting']
           for o in col.all_objects if o.type=='MESH'}
inventory=[]
focal_roots=[]
for ob in bpy.context.scene.objects:
    if ob.type!='MESH' or ob.hide_render or ob.get('sunwenPrototype') or ob.get('urbanPrototype'):continue
    if any(word in ob.name.lower() for word in ['bamboo','banana','botany','plant','tree']) and not ob.name.startswith(('LivingTree','SunwenPlant','Urban_')):
        points=[ob.matrix_world@Vector(v) for v in ob.bound_box]
        inventory.append({'name':ob.name,'bounds':[[min(v[i] for v in points) for i in range(3)],[max(v[i] for v in points) for i in range(3)]],'materials':[m.name for m in ob.data.materials if m]})
    # Built-in flowering trees are batched into courtyard bark meshes, not the
    # separate living-tree instance list. Read their actual lower trunk rings.
    parent=ob
    while parent.parent:parent=parent.parent
    pid=parent.get('placeId')
    if not pid or not any(m and m.get('sunwenRole',m.name)=='bark' for m in ob.data.materials):continue
    low=[ob.matrix_world@v.co for v in ob.data.vertices if (ob.matrix_world@v.co).z<parent.location.z+.13]
    groups=[]
    for point in low:
        group=next((g for g in groups if (point.xy-g[0].xy).length<.85),None)
        if group is None:groups.append([point])
        else:group.append(point)
    for i,group in enumerate(groups):
        if len(group)<5:continue
        center=sum(group,Vector())/len(group)
        radius=max((v.xy-center.xy).length for v in group)
        # Fine 3–7 cm shrub twigs are already in the courtyard undergrowth.
        # Keep the substantial lower trunk rings of the built-in trees here.
        if radius<.12:continue
        focal_roots.append({'name':ob.name+'-root-'+str(i),'sourceObject':ob.name,'placeId':pid,'position':list(center),'trunkRadius':radius,'radii':[1.9,1.6],'angle':i*2.399,'species':5})
folder=R/'assets/processed/grounding-r21';folder.mkdir(parents=True,exist_ok=True)
record={'roots':roots,'focalRoots':focal_roots,'plannedMoves':moves,'protected':protected,'otherPlantMeshes':inventory,
        'layoutSha256':hashlib.sha256((R/'config/garden.layout.json').read_bytes()).hexdigest(),
        'baseline':'before-grounding-update','method':__doc__}
(folder/'source.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print('GROUNDING SOURCE',len(roots),'actual roots',len(protected),'protected meshes',flush=True)
print('BUILT-IN COURT ROOTS',json.dumps(focal_roots,ensure_ascii=False),flush=True)
print('OTHER PLANT MESHES',json.dumps(inventory[:70],ensure_ascii=False),flush=True)

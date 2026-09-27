"""Generate reproducible, complete Asian phenotype bodies with the MPFB tool.

MPFB is an external GPL Blender tool in .tools; its generated asset output is CC0.
Run via Conda and the project Blender. No user Blender preferences are saved.
"""
import bpy, importlib, addon_utils, json, hashlib, subprocess
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
TOOL=ROOT/'.tools/mpfb2'
COMMIT='3edf9df0551765be43563d047888cf7877eb89b4'
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=TOOL,text=True).strip()==COMMIT
bpy.context.preferences.extensions.repos.new(name='Garden MPFB',module='garden_mpfb',custom_directory=str(TOOL/'src'))
addon_utils.enable('bl_ext.garden_mpfb.mpfb',default_set=True)
HumanService=importlib.import_module('bl_ext.garden_mpfb.mpfb.services.humanservice').HumanService
TargetService=importlib.import_module('bl_ext.garden_mpfb.mpfb.services.targetservice').TargetService
DESIGN=json.loads((ROOT/'config/simulation.characters.json').read_text())
OUT=ROOT/'assets/characters/mpfb/generated';OUT.mkdir(exist_ok=True,parents=True)
measurements=[]
for cid,c in DESIGN['characters'].items():
    a=c['anatomy'];macro=TargetService.get_default_macro_info_dict()
    macro.update({k:a[k] for k in ['gender','age','weight','muscle']});macro['race']={'asian':1.,'caucasian':0.,'african':0.}
    obj=HumanService.create_human(mask_helpers=False,feet_on_ground=False,scale=.1,macro_detail_dict=macro)
    for name,value in a['targets'].items():TargetService.load_target(obj,str(TOOL/'src/mpfb/data/targets'/(name+'.target.gz')),weight=value)
    bpy.context.view_layer.update();graph=bpy.context.evaluated_depsgraph_get();evaluated=obj.evaluated_get(graph);mesh=evaluated.to_mesh()
    # Blender Z-up -> application's Y-up, retaining exact HM08 vertex ordering.
    vertices=[Vector((v.co.x,v.co.z,-v.co.y)) for v in mesh.vertices]
    groups={g.name:[v.index for v in obj.data.vertices if any(x.group==g.index for x in v.groups)] for g in obj.vertex_groups if g.name=='body' or g.name.startswith('joint-')}
    def center(name):return sum((vertices[i] for i in groups[name]),Vector())/len(groups[name])
    # A slight anatomically bounded cranial size variation, blended through the neck.
    pivot=center('joint-head');neck=center('joint-neck') if 'joint-neck' in groups else pivot-Vector((0,.08,0))
    for i,v in enumerate(vertices):
        w=max(0,min(1,(v.y-neck.y)/max(.03,pivot.y-neck.y)));vertices[i]=v+(v-pivot)*(a['headScale']-1)*w
    ground=min(vertices[i].y for i in groups['body']);top=max(vertices[i].y for i in groups['body']);scale=a['height']/(top-ground)
    vertices=[Vector((v.x*scale,(v.y-ground)*scale,v.z*scale)) for v in vertices]
    joints={k:list(center(k)) for k in groups if k.startswith('joint-')}
    body={'id':cid,'generator':'MPFB 2','toolCommit':COMMIT,'phenotype':macro,'design':a,'unit':'metre','axis':'Y-up','sourceVertexCount':len(vertices),'vertices':[[round(n,7) for n in v] for v in vertices],'joints':joints,'sourceScale':.1*scale}
    (OUT/(cid+'.json')).write_text(json.dumps(body,separators=(',',':'))+'\n')
    measurements.append({'id':cid,'height':a['height'],'headJoint':joints['joint-head'],'neck':joints.get('joint-neck'),'shoulderLeft':joints.get('joint-l-shoulder'),'shoulderRight':joints.get('joint-r-shoulder')})
    evaluated.to_mesh_clear();bpy.data.objects.remove(obj,do_unlink=True)
(OUT/'measurements.json').write_text(json.dumps(measurements,indent=2)+'\n')
print('BODY_MEASUREMENTS',json.dumps(measurements))

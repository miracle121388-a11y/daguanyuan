"""Repair native crown coverage without rebuilding architecture or moving plants."""
import bpy,json,sys,hashlib,datetime
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
master=R/'blender/daguanyuan_master.blend';bpy.ops.wm.open_mainfile(filepath=str(master),load_ui=False,use_scripts=False)
trees=list(bpy.data.collections['Reference_Living_Trees'].objects)
before={o.name:tuple(tuple(row) for row in o.matrix_world) for o in trees}
from source_crowns import build_all,SOURCES
prototypes=build_all();source_ids=[aid for aid,_ in SOURCES]
for tree in trees:
 index=3 if tree.get('plantingLayer')=='understorey' else source_ids.index(tree['sourceAsset'])
 tree.data=prototypes[index].data;tree['nativeGeometry']='full-source-crown'
bpy.context.view_layer.update()
assert all(tuple(tuple(row) for row in o.matrix_world)==before[o.name] for o in trees)
bpy.ops.wm.save_as_mainfile(filepath=str(master))
from publish_manifest import publish
layout=json.loads((R/'config/garden.layout.json').read_text(encoding='utf-8'));publish(layout)
record={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'revision':layout['assetRevision'],'treeCount':len(trees),'allTransformsPreserved':True,'masterSha256':hashlib.sha256(master.read_bytes()).hexdigest(),'nativePrototypes':[{'name':o.name,'polygons':len(o.data.polygons),'sourceAsset':o.get('sourceAsset')} for o in prototypes],'method':'Native master uses linked complete normalized source crowns. Web LODs simplify the complete leaf surface before a bounded reduction, retaining source UV/alpha; they no longer randomly omit nearly all source leaves. Architecture, plant placement, Manual_Adjustments and literature data are unchanged.'}
(R/'reports/acceptance/r12-crown-coverage-repair.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
print('CROWN COVERAGE REPAIRED',len(trees),'fixed plant transforms',flush=True)

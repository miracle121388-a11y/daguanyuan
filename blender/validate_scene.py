import bpy,json,sys
from pathlib import Path
R=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
roots=[o for o in bpy.data.objects if o.get('entityType')=='place']
missing=[im.filepath for im in bpy.data.images if im.source=='FILE' and not im.packed_file and not Path(bpy.path.abspath(im.filepath)).exists()]
assert len(roots)==15;assert not missing,missing
trees=list(bpy.data.collections['Reference_Living_Trees'].objects)
if 'Sunwen_Prototypes' in bpy.data.collections:
 spec=json.loads((R/'config/garden.sunwen.json').read_text())
 prototypes={o['sunwenPrototype']:o for o in bpy.data.collections['Sunwen_Prototypes'].objects}
 native_crowns=bool(trees) and all(o.get('nativeGeometry')=='authored-sunwen-crown' and o.data==prototypes[spec['planting']['species'][int(o['sunwenSpecies'])]].data and len(o.data.polygons)>1000 for o in trees)
else:
 native_crowns=bool(trees) and all(len(o.data.polygons)>100000 and o.get('nativeGeometry')=='full-source-crown' for o in trees)
assert native_crowns,'Every planted native crown must use its complete, editable prototype mesh'
report={'reopened':True,'placeIds':sorted(o['placeId'] for o in roots),'meshes':sum(o.type=='MESH' for o in bpy.data.objects),'missingImages':missing,'packedImages':sum(bool(im.packed_file) for im in bpy.data.images),'manualLayerPresent':'Manual_Adjustments' in bpy.data.collections}
report.update(nativeFullCrowns=native_crowns,nativeTreeInstances=len(trees),linkedCrownMeshes=len({o.data for o in trees}))
(R/'reports/acceptance/blender-validation.json').write_text(json.dumps(report,indent=2))
print('MASTER REOPEN VALIDATED',report)

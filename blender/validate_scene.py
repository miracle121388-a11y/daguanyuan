import bpy,json,sys
from pathlib import Path
R=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
roots=[o for o in bpy.data.objects if o.get('entityType')=='place']
missing=[im.filepath for im in bpy.data.images if im.source=='FILE' and not im.packed_file and not Path(bpy.path.abspath(im.filepath)).exists()]
assert len(roots)==12;assert not missing,missing
report={'reopened':True,'placeIds':sorted(o['placeId'] for o in roots),'meshes':sum(o.type=='MESH' for o in bpy.data.objects),'missingImages':missing,'packedImages':sum(bool(im.packed_file) for im in bpy.data.images),'manualLayerPresent':'Manual_Adjustments' in bpy.data.collections}
(R/'reports/acceptance/blender-validation.json').write_text(json.dumps(report,indent=2))
print('MASTER REOPEN VALIDATED',report)

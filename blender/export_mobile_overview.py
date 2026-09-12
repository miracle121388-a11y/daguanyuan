"""Re-export baked partitions and overview from the unchanged editable master."""
import bpy, sys,json
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
from baked_exports import export_baked
bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
objects=list({o for c in bpy.data.collections if c.name.startswith('Place_') or c.name in ['Garden_Landscape','Manual_Adjustments'] for o in c.all_objects})
export_baked(objects,json.loads((R/'config/garden.layout.json').read_text(encoding='utf8')))
print('BAKED PARTITIONS AND OVERVIEW REBUILT',flush=True)

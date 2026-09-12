"""Update only the generated ground plants after measuring actual land contact."""
import bpy,sys,json
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
bpy.ops.wm.open_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)
from r7_ground_cover import seat_plants
report=seat_plants()
bpy.ops.wm.save_as_mainfile(filepath=str(R/'blender/daguanyuan_master.blend'))
from publish_manifest import publish
publish(json.loads((R/'config/garden.layout.json').read_text(encoding='utf-8')))
(R/'reports/acceptance/r8-ground-contact-final.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(report,flush=True)

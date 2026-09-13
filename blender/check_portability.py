"""Read-only check that the editable master does not depend on the old machine."""
import bpy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'blender/daguanyuan_master.blend'), load_ui=False, use_scripts=False)
failures = []
images = 0
packed = 0
for image in bpy.data.images:
    if image.source not in {'FILE', 'TILED', 'MOVIE', 'SEQUENCE'}:
        continue
    images += 1
    if image.packed_file or len(image.packed_files):
        packed += 1
        continue
    if image.users == 0:
        continue
    path = Path(bpy.path.abspath(image.filepath, library=image.library)).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        failures.append({'type': 'image', 'name': image.name})
for library in bpy.data.libraries:
    path = Path(bpy.path.abspath(library.filepath)).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        failures.append({'type': 'library', 'name': library.name})
for font in bpy.data.fonts:
    if font.filepath in {'', '<builtin>'} or font.packed_file or font.users == 0:
        continue
    path = Path(bpy.path.abspath(font.filepath)).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        failures.append({'type': 'font', 'name': font.name})
manual = bpy.data.collections.get('Manual_Adjustments')
print('MODEL_PORTABILITY ' + json.dumps({'passed': not failures, 'master': 'blender/daguanyuan_master.blend', 'images': images, 'packedImages': packed, 'linkedLibraries': len(bpy.data.libraries), 'manualObjects': len(manual.all_objects) if manual else 0, 'failures': failures}, ensure_ascii=False), flush=True)
if failures:
    raise RuntimeError('Model resources are missing or outside the repository')

"""A small lighting-only HDR derivative; original CC0 panorama remains intact."""
import bpy,json,hashlib,os
from pathlib import Path
R=Path(__file__).resolve().parents[1]
source=R/'assets/source/forest_grove.hdr';target=R/'public/textures/forest_grove.hdr'
image=bpy.data.images.load(str(source),check_existing=False)
original=list(image.size);image.scale(256,128);image.file_format='HDR';image.filepath_raw=str(target.with_suffix('.next.hdr'));image.save();os.replace(target.with_suffix('.next.hdr'),target)
origin={'origin':'CC0 Poly Haven forest_grove HDR resized in Blender from '+str(original)+' to 256 × 128 for diffuse environment lighting. Source panorama retained locally.','source':'assets/source/forest_grove.hdr','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
origin['prompt']=origin['origin']
temp=Path(str(target)+'.json.next');temp.write_text(json.dumps(origin,indent=2),encoding='utf8');os.replace(temp,Path(str(target)+'.json'))
print('ENVIRONMENT LIGHT MAP',target.stat().st_size,flush=True)

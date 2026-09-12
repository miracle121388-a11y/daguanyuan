from pathlib import Path
import json,hashlib
from PIL import Image,ImageOps
R=Path(__file__).resolve().parents[1]
src=R/'assets/source/stone_wall_02.jpg';dst=R/'assets/processed/stone_wall_02.jpg'
if src.exists():
 image=Image.open(src).convert('RGB');gray=ImageOps.grayscale(image);out=ImageOps.colorize(gray,'#545a50','#c8cbbb');out.save(dst,quality=88)
 manifest=json.loads((R/'assets/manifest.json').read_text(encoding='utf8'))
 for a in manifest:
  if a['assetId']=='stone_wall_02':a['derivativeFiles']=['assets/processed/stone_wall_02.jpg'];a['derivativeSha256']=[hashlib.sha256(dst.read_bytes()).hexdigest()];a['modifications']='Desaturated and tinted grey green; original CC0 image retained. Generated deterministically by scripts/process_assets.py.'
 temp=R/'assets/manifest.json.next';temp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8');temp.replace(R/'assets/manifest.json')

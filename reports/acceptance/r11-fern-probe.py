import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'blender'))
import r9_understory
r9_understory.build_all()
print('FERN SOURCE RGBA EXPORT COMPLETE',flush=True)

import {useGLTF,useTexture} from '@react-three/drei';
import delivery from '../../config/runtime-delivery.json';
/** Clear only loader error/decoded caches; retain validated disk downloads and local saves. */
export function resetSceneLoads(){
 const base=import.meta.env.BASE_URL;
 for(const path of Object.keys(delivery.entries)){
  if(path.endsWith('.glb'))useGLTF.clear(base+path);
  else if(/\.(jpg|png|webp|hdr)$/.test(path))useTexture.clear(base+path);
 }
 useGLTF.clear(['iris','peony','lotus','chrysanthemum','orchid'].map(name=>base+`models/vegetation/${name}.glb`));
 useGLTF.clear([0,1].map(i=>base+`models/vegetation/fern-${i}.glb`));
 for(const suffix of ['', '-low'])useTexture.clear([base+`textures/landscape-light${suffix}.webp`,base+'textures/ground/garden-ground.webp',base+'textures/ground/garden-ground-zones.png']);
 useTexture.clear([base+'textures/ground/pond-normal.png',base+'textures/ground/surface-zones.png']);
}

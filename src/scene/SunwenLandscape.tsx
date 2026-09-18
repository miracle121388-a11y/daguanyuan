import {useEffect,useMemo} from 'react';
import {useGLTF,useTexture} from '@react-three/drei';
import * as THREE from 'three';
import {batchOverview} from './batchOverview';
import {useGarden} from '../state/store';
import {finishMaterials} from './materials';

/** Connected root gardens and flower layers exported from the native master. */
export default function SunwenLandscape(){
 const quality=useGarden(s=>s.qualityLevel);
 const gltf=useGLTF(import.meta.env.BASE_URL+`models/sunwen-landscape${quality==='low'?'-low':''}.glb`);
 const base=import.meta.env.BASE_URL;
 const [light,soil,zones]=useTexture([base+`textures/landscape-light${quality==='low'?'-low':''}.webp`,base+'textures/ground/garden-ground.webp',base+'textures/ground/garden-ground-zones.png']);
 const scene=useMemo(()=>{
  soil.colorSpace=THREE.SRGBColorSpace;
  const clone=gltf.scene.clone(true);finishMaterials(clone,light,soil,zones);
  const group=batchOverview(clone);
  group.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=false;o.receiveShadow=true}});
  return group;
 },[gltf,light,soil,zones]);
 useEffect(()=>()=>{scene.traverse(o=>{if(o instanceof THREE.BatchedMesh)o.dispose()})},[scene]);
 return <primitive object={scene}/>;
}

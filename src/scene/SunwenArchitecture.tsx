import {useEffect,useMemo,useRef} from 'react';
import {Html,useGLTF} from '@react-three/drei';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {batchOverview} from './batchOverview';
import {useGarden} from '../state/store';
import {useSimulation} from '../simulation/store';
import type {ArchitecturalScene} from '../data/types';

function SceneryLabel({place,chosen}:{place:ArchitecturalScene;chosen:boolean}){
 const button=useRef<HTMLButtonElement>(null),{camera,size}=useThree();
 const position=useMemo(()=>new THREE.Vector3(place.position[0],place.position[1]+place.height+1.6,place.position[2]),[place]);
 useFrame(()=>{if(!button.current)return;const p=position.clone().project(camera);button.current.style.visibility=p.z<1&&Math.abs(p.x)<(size.width<601?.74:.91)&&p.y<.70&&p.y>-.64?'visible':'hidden'});
 return <Html position={position.toArray()} center zIndexRange={[12,0]}><button ref={button} className={'place-label '+(chosen?'selected':'')} title={place.character} aria-label={'观赏'+place.name} onClick={()=>useGarden.getState().focusArchitecture(place.id)}><span>景</span>{place.name}</button></Html>;
}

/** Modeled windows, porticoes and supplementary scenery from the saved master. */
export default function SunwenArchitecture(){
 const quality=useGarden(s=>s.qualityLevel);
 const selected=useGarden(s=>s.selectedPlaceId),focus=useGarden(s=>s.architecturalFocusId),labels=useGarden(s=>s.labels),night=useGarden(s=>s.timeOfDay==='night');
 const inside=useGarden(s=>s.cutaway&&!!s.hotspotId?.endsWith('-study'));
 const scenes=useGarden(s=>s.data?.manifest.architecturalScenes),simulation=useSimulation(s=>s.open);
 const gltf=useGLTF(import.meta.env.BASE_URL+`models/sunwen-architecture${quality==='low'?'-low':''}.glb`);
 const scene=useMemo(()=>batchOverview(gltf.scene.clone(true)),[gltf]);
 useEffect(()=>()=>{scene.traverse(o=>{if(o instanceof THREE.BatchedMesh)o.dispose()})},[scene]);
 useEffect(()=>{scene.traverse(o=>{
  if(!(o instanceof THREE.BatchedMesh))return;
  const material=o.material as THREE.MeshStandardMaterial,role=material.userData.architecturalRole;
  const roof=['roof','tile','ridge'].includes(role);
  for(const [i,id] of (o.userData.batchPlaceIds as (string|null)[]).entries())o.setVisibleAt(i,!(inside&&roof&&id===selected));
  if(role==='paper'){material.emissive.set('#ffd4a0');material.emissiveIntensity=night?.25:0}
 })},[scene,selected,inside,night]);
 return <><primitive object={scene}/>{labels&&!selected&&!simulation&&scenes?.filter(p=>!focus||focus===p.id).map(place=><SceneryLabel key={place.id} place={place} chosen={focus===place.id}/>)}</>;
}

import {useEffect,useMemo,useRef} from 'react';
import {useGLTF} from '@react-three/drei';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import type {Manifest} from '../data/types';
import {useGarden} from '../state/store';
const kinds=['iris','peony','lotus','chrysanthemum','orchid'];

/** Local 3D perennial groups use the same transforms as the editable master. */
export default function SunwenPlanting({manifest}:{manifest:Manifest}){
 const quality=useGarden(s=>s.qualityLevel),selected=useGarden(s=>s.selectedPlaceId);
 const {invalidate}=useThree();
 const loaded=useGLTF(kinds.map(name=>import.meta.env.BASE_URL+`models/vegetation/${name}.glb`));
 const dummy=useMemo(()=>new THREE.Object3D(),[]),projected=useMemo(()=>new THREE.Vector3(),[]),last=useRef(new THREE.Matrix4());
 const meshes=useMemo(()=>loaded.flatMap((model,index)=>{
  model.scene.updateMatrixWorld(true);const result:THREE.InstancedMesh[]=[];
  model.scene.traverse(object=>{
   if(!(object instanceof THREE.Mesh))return;
   const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
   const source=Array.isArray(object.material)?object.material:[object.material];
   const materials=source.map(material=>{const m=material.clone();m.side=THREE.DoubleSide;return m});
   const mesh=new THREE.InstancedMesh(geometry,materials.length===1?materials[0]:materials,manifest.sunwenPlanting?.length??1);
   mesh.userData.kind=kinds[index];mesh.count=0;mesh.frustumCulled=false;mesh.receiveShadow=true;result.push(mesh);
  });return result;
 }),[loaded,manifest]);
 useEffect(()=>{last.current.elements.fill(0);invalidate()},[meshes,selected,quality,manifest,invalidate]);
 useEffect(()=>()=>{for(const mesh of meshes){mesh.geometry.dispose();for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])m.dispose();mesh.dispose()}},[meshes]);
 useFrame(({camera})=>{
  if(last.current.equals(camera.matrixWorld))return;last.current.copy(camera.matrixWorld);
  const plants=(manifest.sunwenPlanting??[]).map(p=>{
   dummy.position.fromArray(p.position);projected.copy(dummy.position).project(camera);
   return {p,d:camera.position.distanceTo(dummy.position),visible:projected.z>-1&&projected.z<1&&Math.abs(projected.x)<1.2&&Math.abs(projected.y)<1.2};
  }).filter(({d,visible})=>visible&&d<420).sort((a,b)=>Number(b.p.placeId===selected)-Number(a.p.placeId===selected)||a.d-b.d).slice(0,quality==='high'?380:180);
  for(const mesh of meshes){let count=0;for(const {p} of plants){if(p.kind!==mesh.userData.kind)continue;dummy.position.fromArray(p.position);dummy.rotation.set(0,p.rotation,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();mesh.setMatrixAt(count++,dummy.matrix)}mesh.count=count;mesh.instanceMatrix.needsUpdate=true}
 });
 return <group>{meshes.map(mesh=><primitive key={mesh.uuid} object={mesh}/>)}</group>;
}

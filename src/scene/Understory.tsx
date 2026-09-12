import {useEffect,useMemo,useRef} from 'react';
import {useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {Manifest} from '../data/types';
import {useGarden} from '../state/store';
import {finishLeafMaterial} from './leafMaterial';

/** Source plants share master positions and a bounded near-camera instance budget. */
export default function Understory({manifest}:{manifest:Manifest}){
 const sources=useGLTF([0,1].map(i=>import.meta.env.BASE_URL+`models/vegetation/fern-${i}.glb`));
 const selected=useGarden(s=>s.selectedPlaceId),quality=useGarden(s=>s.qualityLevel),last=useRef(new THREE.Vector3(Infinity,Infinity,Infinity));
 const dummy=useMemo(()=>new THREE.Object3D(),[]),lastDirection=useRef(new THREE.Quaternion());
 const projected=useMemo(()=>new THREE.Vector3(),[]);
 const meshes=useMemo(()=>sources.flatMap((g,species)=>{
  const result:THREE.InstancedMesh[]=[];g.scene.updateMatrixWorld(true);
  g.scene.traverse(ob=>{
   if(!(ob instanceof THREE.Mesh))return;
   const geometry=ob.geometry.clone().applyMatrix4(ob.matrixWorld),original=Array.isArray(ob.material)?ob.material[0]:ob.material;
   const material=original.clone() as THREE.MeshStandardMaterial;material.side=THREE.DoubleSide;material.alphaTest=.28;material.transparent=false;material.roughness=.83;material.color.set('#edf2d4');material.normalScale.set(.35,.35);
   finishLeafMaterial(material,.50);if(material.map)material.map.anisotropy=4;
   const mesh=new THREE.InstancedMesh(geometry,material,quality==='high'?512:320);mesh.userData.species=species;mesh.name='Source fern '+species;mesh.count=0;mesh.frustumCulled=false;mesh.receiveShadow=quality==='high';mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);result.push(mesh);
  });return result;
 }),[sources,quality]);
 useEffect(()=>{last.current.set(Infinity,Infinity,Infinity);return()=>{for(const m of meshes){m.geometry.dispose();(m.material as THREE.Material).dispose();m.dispose()}}},[meshes]);
 useEffect(()=>{last.current.set(Infinity,Infinity,Infinity)},[selected]);
 useFrame(({camera})=>{
  if(last.current.distanceToSquared(camera.position)<1&&lastDirection.current.angleTo(camera.quaternion)<.02)return;
  last.current.copy(camera.position);lastDirection.current.copy(camera.quaternion);const far=quality==='high'?46:29,budget=selected?(quality==='high'?512:320):(quality==='high'?64:28);
  const plants=(manifest.understory??[]).map(p=>{
   const d=camera.position.distanceTo(dummy.position.fromArray(p.position));projected.copy(dummy.position).project(camera);
   const visible=projected.z>-1&&projected.z<1&&Math.abs(projected.x)<1.12&&Math.abs(projected.y)<1.12;
   return {p,d,visible};
  }).filter(({p,d,visible})=>visible&&(d<far||(p.placeId===selected&&d<200))).sort((a,b)=>Number(b.p.placeId===selected)-Number(a.p.placeId===selected)||a.d-b.d).slice(0,budget);
  for(const mesh of meshes){let count=0;for(const {p,d} of plants){if(p.species!==mesh.userData.species)continue;dummy.position.fromArray(p.position);dummy.rotation.set(0,p.rotation,0);dummy.scale.setScalar(p.scale*(p.placeId===selected?1:THREE.MathUtils.smoothstep(far-d,0,8)));dummy.updateMatrix();mesh.setMatrixAt(count++,dummy.matrix)}mesh.count=count;mesh.instanceMatrix.needsUpdate=true}
 });
 return <group>{meshes.map(mesh=><primitive object={mesh} key={mesh.uuid}/>)}</group>;
}

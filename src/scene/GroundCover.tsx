import {useEffect,useMemo,useRef} from 'react';
import {useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {Manifest} from '../data/types';
import {useGarden} from '../state/store';

/** Placements come from the same linked plants saved in the Blender master. */
export default function GroundCover({manifest,onReady}:{manifest:Manifest;onReady:(ready:boolean)=>void}){
 const gltf=useGLTF(import.meta.env.BASE_URL+'models/vegetation/ground-cover.glb');
 const quality=useGarden(s=>s.qualityLevel);
 const previousEye=useRef(new THREE.Vector3(Infinity,Infinity,Infinity));
 const dummy=useMemo(()=>new THREE.Object3D(),[]);
 const meshes=useMemo(()=>{
  const result:THREE.InstancedMesh[]=[];gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(o=>{
   if(!(o instanceof THREE.Mesh))return;
   const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);
   const materials=(Array.isArray(o.material)?o.material:[o.material]).map(source=>{const m=source.clone();if(m instanceof THREE.MeshStandardMaterial){m.side=THREE.DoubleSide;m.roughness=.95;m.color.set('#c4e0cf');m.transparent=false;m.alphaTest=.25}return m});
   const mesh=new THREE.InstancedMesh(geometry,materials.length===1?materials[0]:materials,(manifest.groundCover??[]).length);mesh.name='Linked shoreline ground plants';mesh.receiveShadow=quality==='high';mesh.castShadow=false;mesh.count=0;mesh.frustumCulled=false;
   mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);result.push(mesh);
  });return result;
 },[gltf,manifest,quality]);
 useEffect(()=>{previousEye.current.set(Infinity,Infinity,Infinity)},[meshes]);
 // Fine blades matter only near the eye. Distant ground keeps its local terrain
 // material and scene-derived shadows; the shadow atlas is not grass albedo.
 // Keep planted roots in the master without drawing subpixel blades at distance.
 useFrame(({camera})=>{
  if(previousEye.current.distanceToSquared(camera.position)<4)return;
  previousEye.current.copy(camera.position);let count=0;
  const full=quality==='high'?35:24,far=quality==='high'?82:54;
  for(const [i,p] of (manifest.groundCover??[]).entries()){
   const distance=camera.position.distanceTo(dummy.position.fromArray(p.position));
   if(distance>far||(distance>full&&i%3!==0))continue;
   const fade=THREE.MathUtils.smoothstep(far-distance,0,12);
   dummy.rotation.set(0,p.rotation,0);dummy.scale.setScalar(p.scale*fade);dummy.updateMatrix();
   for(const mesh of meshes)mesh.setMatrixAt(count,dummy.matrix);count++;
  }
  for(const mesh of meshes){mesh.count=count;mesh.instanceMatrix.needsUpdate=true}
 });
 useEffect(()=>{onReady(true)},[meshes,onReady]);
 useEffect(()=>()=>{for(const mesh of meshes){mesh.geometry.dispose();for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])m.dispose();mesh.dispose()}},[meshes]);
 return <group>{meshes.map(m=><primitive key={m.uuid} object={m}/>)}</group>;
}

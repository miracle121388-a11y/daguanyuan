import {Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {useGLTF,useTexture} from '@react-three/drei';
import * as THREE from 'three';
import type {Manifest} from '../data/types';
import {useGarden} from '../state/store';
import {useThree,useFrame} from '@react-three/fiber';
import {finishMaterials} from './materials';
type Placement={position:[number,number,number];scale:[number,number,number];rotation:number;species?:number;placeId?:string|null};
/** Camera-facing tree impostors are an overview LOD of the actual CC0 mesh.
 * Architecture, terrain, foreground planting and nearby crowns remain 3D.
 */
function DistantGrove({points,onReady,variant=0,species=0}:{points:Placement[];onReady:(ready:boolean)=>void;variant?:number;species?:number}){
 const atlas=useTexture(import.meta.env.BASE_URL+'textures/vegetation/canopy-atlas.webp');
 const map=useMemo(()=>{const t=atlas.clone();t.colorSpace=THREE.SRGBColorSpace;t.repeat.set(1/5,1/4);t.offset.set(variant/5,(3-species)/4);t.needsUpdate=true;return t},[atlas,variant,species]);
 const night=useGarden(s=>s.timeOfDay==='night'),last=useRef(Number.NaN);
 const {camera,invalidate}=useThree();
 const dummy=useMemo(()=>new THREE.Object3D(),[]),previousRotation=useRef(new THREE.Quaternion()),direction=useMemo(()=>new THREE.Vector3(),[]),cameraUp=useMemo(()=>new THREE.Vector3(),[]);
 const mesh=useMemo(()=>{
  const material=new THREE.MeshBasicMaterial({map,alphaTest:.35,side:THREE.DoubleSide,fog:true,toneMapped:false});
  const m=new THREE.InstancedMesh(new THREE.PlaneGeometry(6.25,6.25),material,points.length);
  m.name='Tree silhouette LOD — rendered from the 3D source';m.frustumCulled=false;
  return m;
 },[map,points.length]);
 useEffect(()=>{last.current=Number.NaN;invalidate()},[points,invalidate]);
 useEffect(()=>{onReady(true)},[onReady,map]);
 useEffect(()=>{mesh.material.color.set(night?'#8097a7':'#ffffff');invalidate()},[mesh,night,invalidate]);
 useEffect(()=>()=>{mesh.geometry.dispose();mesh.material.dispose();mesh.dispose()},[mesh]);
 useEffect(()=>()=>map.dispose(),[map]);
 useFrame(()=>{
  if(Number.isFinite(last.current)&&Math.abs(previousRotation.current.dot(camera.quaternion))>.999995)return;
  camera.getWorldDirection(direction);const overhead=Math.abs(direction.y)>.78;
  const azimuth=((Math.round(Math.atan2(direction.x,direction.z)/(Math.PI/2))+variant)%4+4)%4;
  map.offset.x=(overhead?4:azimuth)/5;
  cameraUp.set(0,1,0).applyQuaternion(camera.quaternion);
  for(const [i,p]of points.entries()){
   dummy.position.fromArray(p.position);
   // The source camera targets z=2.5 from [0,-24,10] (or the top view).
   // Anchor its projected root to the planted point at every camera pitch.
   dummy.position.addScaledVector(cameraUp,(overhead?2.5*.01/26:2.5*24/26)*p.scale[1]);
   dummy.scale.set(p.scale[0],overhead?p.scale[2]:p.scale[1],1);dummy.quaternion.copy(camera.quaternion);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   mesh.setColorAt(i,new THREE.Color().setRGB(.86+(i%7)*.020,.90+(i%4)*.025,.80+(i%5)*.026));
  }
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;last.current=1;previousRotation.current.copy(camera.quaternion);
 });
 return <primitive object={mesh}/>;
}
function Grove({points,detail,species,lod='near'}:{points:Placement[];detail:boolean;species:number;lod?:'near'|'middle'}){
 const {gl,invalidate}=useThree();
 const gltf=useGLTF(import.meta.env.BASE_URL+'models/vegetation/'+(lod==='middle'?'broadleaf-low':['broadleaf','broadleaf-2','pine','shrub'][species])+'.glb');
 const meshes=useMemo(()=>{gltf.scene.updateMatrixWorld(true);const result:THREE.InstancedMesh[]=[];const dummy=new THREE.Object3D();gltf.scene.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const geometry=o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);const material=(Array.isArray(o.material)?o.material:[o.material]).map(source=>{const m=source.clone();if(m instanceof THREE.MeshStandardMaterial&&/leaves|twig/.test(m.name)){m.alphaTest=.35;m.transparent=false;m.side=THREE.DoubleSide}return m});const m=new THREE.InstancedMesh(geometry,material.length===1?material[0]:material,points.length);m.name=lod==='middle'?'Living tree middle LOD':'Living tree canopy';m.userData.lod=lod;m.userData.ownsMaterial=true;m.castShadow=detail;m.receiveShadow=true;for(const [i,p] of points.entries()){dummy.position.fromArray(p.position);dummy.scale.fromArray(p.scale);dummy.rotation.set(0,p.rotation,0);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix)}m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();result.push(m)});return result},[gltf,points,detail,lod]);
 useEffect(()=>()=>{for(const m of meshes){m.geometry.dispose();if(m.userData.ownsMaterial){for(const material of Array.isArray(m.material)?m.material:[m.material])material.dispose()}m.dispose()}},[meshes]);
 useEffect(()=>{for(const m of meshes)finishMaterials(m);gl.shadowMap.needsUpdate=true;invalidate()},[meshes,gl,invalidate]);
 return <group>{meshes.map(m=><primitive object={m} key={m.uuid}/>)}</group>;
}
export default function LivingTrees({manifest,onReady}:{manifest:Manifest;onReady:(ready:boolean)=>void}){
 const selected=useGarden(s=>s.selectedPlaceId),quality=useGarden(s=>s.qualityLevel),interior=useGarden(s=>!!s.hotspotId?.endsWith('-study')&&!s.cutaway),closeView=useGarden(s=>s.closeView),{camera,size}=useThree();
 const [eye,setEye]=useState(()=>camera.position.clone()),sampled=useRef(0);
 useFrame(({clock})=>{if(clock.elapsedTime-sampled.current>.3&&camera.position.distanceTo(eye)>(selected?2:12)){sampled.current=clock.elapsedTime;setEye(camera.position.clone())}});
 const groups=useMemo(()=>{
  const planted=(manifest.vegetation??[]) as Placement[],p=manifest.places.find(p=>p.id===selected);
  const aim=p?new THREE.Vector3(...p.cameraTarget).sub(eye):null,length=aim?.length()??0;aim?.normalize();
  let courtyardScreen:THREE.Box2|null=null;
  if(p&&size.width<601&&!closeView&&!interior){
   courtyardScreen=new THREE.Box2();
   for(const x of [p.boundingBox.min[0],p.boundingBox.max[0]])for(const y of [p.boundingBox.min[1],p.boundingBox.max[1]])for(const z of [p.boundingBox.min[2],p.boundingBox.max[2]]){
    const v=new THREE.Vector3(x,y,z).project(camera);courtyardScreen.expandByPoint(new THREE.Vector2(v.x,v.y));
   }
   courtyardScreen.expandByScalar(.025);
  }
  // During an architectural inspection, lift only crowns that cross the view
  // corridor. The planted master and all landscape coordinates stay intact.
  const points=planted.filter(tree=>{
   if(!aim)return true;
   if(interior&&p&&Math.hypot(tree.position[0]-p.position[0],tree.position[2]-p.position[2])<12)return false;
   const offset=new THREE.Vector3(...tree.position).add(new THREE.Vector3(0,2.7*tree.scale[1],0)).sub(eye),ahead=offset.dot(aim);
   if(courtyardScreen&&ahead>0&&ahead<length+2){
    const v=offset.clone().add(eye).project(camera),radius=3.2*Math.max(...tree.scale)*camera.projectionMatrix.elements[5]/Math.max(1,offset.length());
    if(v.x+radius>courtyardScreen.min.x&&v.x-radius<courtyardScreen.max.x&&v.y+radius>courtyardScreen.min.y&&v.y-radius<courtyardScreen.max.y)return false;
   }
   return ahead<0||ahead>length+2||offset.addScaledVector(aim,-ahead).length()>3.1*tree.scale[0]+2;
  });
  const distance=(x:Placement)=>Math.hypot(x.position[0]-eye.x,x.position[1]-eye.y,x.position[2]-eye.z)/x.scale[1];
  const close=(x:Placement)=>(quality==='high'||!!p)&&(distance(x)<38||(p&&Math.hypot(x.position[0]-p.position[0],x.position[2]-p.position[2])<21));
  const near=points.filter(close).sort((a,b)=>distance(a)-distance(b)).slice(0,quality==='high'?(p?16:6):(p?3:0)),chosen=new Set(near);
  const middle=quality==='high'?points.filter(x=>!chosen.has(x)&&(x.species??0)===0&&distance(x)<65).sort((a,b)=>distance(a)-distance(b)).slice(0,12):[];
  for(const point of middle)chosen.add(point);
  const far=points.filter(x=>!chosen.has(x));
  return {middle,near:Array.from({length:4},(_,s)=>near.filter(x=>(x.species??0)===s)),far:Array.from({length:8},(_,v)=>far.filter((x,i)=>(x.species??0)===Math.floor(v/2)&&i%2===v%2))};
 },[manifest,selected,quality,eye,interior,closeView,camera,size.width]);
 return <>{groups.middle.length>0&&<Suspense fallback={null}><Grove points={groups.middle} species={0} detail={false} lod="middle"/></Suspense>}{groups.far.map((points,v)=><DistantGrove key={v} variant={v%2} species={Math.floor(v/2)} points={points} onReady={onReady}/>)}{groups.near.map((points,s)=>points.length>0&&<Suspense key={s} fallback={null}><Grove species={s} points={points} detail={quality==='high'}/></Suspense>)}</>;
}

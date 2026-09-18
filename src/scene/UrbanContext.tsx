import {useEffect,useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import urban from '../../public/urban-context.json';

/** The same linked courtyard modules and transforms as the editable master. */
export default function UrbanContext(){
 const gltf=useGLTF(import.meta.env.BASE_URL+urban.model);
 const scene=useMemo(()=>{
 const group=new THREE.Group();group.name='宁荣府邸与京城街坊';
  const transforms=new Map<string,typeof urban.instances>();
  for(const row of urban.instances){const rows=transforms.get(row.kind)??[];rows.push(row);transforms.set(row.kind,rows)}
  gltf.scene.updateMatrixWorld(true);
  const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  gltf.scene.traverse(object=>{
   if(!(object instanceof THREE.Mesh)||Array.isArray(object.material))return;
   const rows=transforms.get(object.userData.urbanPrototype);if(!rows)return;
   const mesh=new THREE.InstancedMesh(object.geometry,object.material,rows.length);
   mesh.name=object.name;mesh.userData.urbanContext=true;mesh.userData.urbanRole=object.material.userData.urbanRole;
   mesh.userData.urbanPrototype=object.userData.urbanPrototype;
   rows.forEach((row,i)=>{
    position.fromArray(row.position);scale.fromArray(row.scale);rotation.setFromAxisAngle(up,row.rotation);
    matrix.compose(position,rotation,scale).multiply(object.matrixWorld);mesh.setMatrixAt(i,matrix);
   });
   mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=!['paving','courtstone','water'].includes(mesh.userData.urbanRole);mesh.receiveShadow=true;
   mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh);
  });
  return group;
 },[gltf]);
 useEffect(()=>()=>{scene.traverse(object=>{if(object instanceof THREE.InstancedMesh)object.dispose()})},[scene]);
 return <primitive object={scene}/>;
}

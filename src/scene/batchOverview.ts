import * as THREE from 'three';

// Keep each place independently visible/pickable while sharing draw submissions.
export function batchOverview(source:THREE.Object3D){
 source.updateMatrixWorld(true);
 const groups=new Map<string,THREE.Mesh[]>();
 source.traverse(o=>{if(!(o instanceof THREE.Mesh)||Array.isArray(o.material))return;
  const format=Object.keys(o.geometry.attributes).map(name=>{const a=o.geometry.getAttribute(name);return `${name}:${a.itemSize}:${a.normalized}`}).sort().join(',');
  const key=o.material.uuid+format;const list=groups.get(key)??[];list.push(o);groups.set(key,list);
 });
 const result=new THREE.Group();result.name='Batched garden overview';
 for(const objects of groups.values()){
  const vertices=objects.reduce((sum,o)=>sum+o.geometry.attributes.position.count,0),indices=objects.reduce((sum,o)=>sum+(o.geometry.index?.count??0),0);
  const batch=new THREE.BatchedMesh(objects.length,vertices,indices,objects[0].material as THREE.Material);
  batch.name='Overview '+(objects[0].material as THREE.Material).name;batch.perObjectFrustumCulled=true;batch.sortObjects=false;
  const ids:(string|null)[]=[];
  for(const object of objects){const geometryId=batch.addGeometry(object.geometry),id=batch.addInstance(geometryId);batch.setMatrixAt(id,object.matrixWorld);let node:THREE.Object3D|null=object;while(node&&!node.userData.placeId)node=node.parent;ids[id]=node?.userData.placeId??null}
  batch.userData.batchPlaceIds=ids;batch.castShadow=true;batch.receiveShadow=true;batch.computeBoundingBox();batch.computeBoundingSphere();result.add(batch);
 }
 return result;
}

export function eventPlaceId(event:{object:THREE.Object3D;batchId?:number}){
 if(event.batchId!==undefined)return event.object.userData.batchPlaceIds?.[event.batchId]??null;
 let object:THREE.Object3D|null=event.object;while(object){if(object.userData.placeId)return object.userData.placeId;object=object.parent}return null;
}

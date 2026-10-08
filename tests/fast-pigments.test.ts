import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {finishMaterials} from '../src/scene/materials';

describe('first-view garden pigments',()=>{
 it('keeps baked roof, wood and foliage colors when their texture-free delivery is finished',()=>{
  for(const name of ['roof','wood','plaster','botanical_bamboo']){
   const material=new THREE.MeshStandardMaterial({name,color:'#538778'});
   material.userData.deliveryPigment=true;
   const expected=material.color.clone(),scene=new THREE.Group();
   scene.add(new THREE.Mesh(new THREE.BoxGeometry(),material));
   finishMaterials(scene);
   expect(material.color.equals(expected)).toBe(true);
   expect(material.map).toBeNull();
  }
 });
 it('keeps the original detailed texture multiplication neutral',()=>{
  const material=new THREE.MeshStandardMaterial({name:'roof',color:'#538778',map:new THREE.Texture()});
  const scene=new THREE.Group();scene.add(new THREE.Mesh(new THREE.BoxGeometry(),material));
  finishMaterials(scene);
  expect(material.color.getHex()).toBe(0xffffff);
 });
});

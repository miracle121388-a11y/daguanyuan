import {describe, expect, it} from 'vitest';
import {Object3D, Mesh, Vector3} from 'three';
import {applyHandPose, handPose} from '../src/scene/characterHands';
const poses=['idle','observe','move','talk','rest','read','write','wait','visit'];
const makeRig=()=>Object.fromEntries(['leftArm','rightArm','leftForearm','rightForearm','leftHand','rightHand'].map(name=>{
  const object = name.endsWith('Hand') ? new Mesh() : new Object3D();
  if(object instanceof Mesh){object.morphTargetDictionary={grasp:0};object.morphTargetInfluences=[0];}
  return [name,object];
}));
describe('anatomical hand poses',()=>{
  it('keeps empty hands palm-in rather than exposing the spread construction pose',()=>{
    for(const pose of poses)for(const motion of [true,false]){
      const rig=makeRig();applyHandPose(rig,pose,1,motion,0,true);
      for(const side of ['left','right']){
        const normal=new Vector3(0,0,1).applyQuaternion(rig[`${side}Hand`].quaternion);
        expect(Math.abs(normal.x)).toBeGreaterThan(.85);
        expect(Math.abs(normal.z)).toBeLessThan(.51);
      }
    }
  });
  it('uses a relaxed fallback for unsupported prop actions, without empty grips',()=>{
    for(const pose of ['read','write','rest','wait','visit','talk']) {
      expect(handPose(pose,1,true)).toEqual(handPose('idle',1,true));
    }
  });
  it('never crosses through reversed wrists during any action transition, including reduced motion and a fresh paused LOD',()=>{
    for(const from of poses)for(const to of poses){
      const rig=makeRig();applyHandPose(rig,from,0,true,0,true);
      for(let frame=0;frame<120;frame++){
        applyHandPose(rig,to,frame/60,true,1/60);
        expect(rig.leftHand.rotation.y).toBeLessThan(-1);
        expect(rig.rightHand.rotation.y).toBeGreaterThan(1);
      }
      applyHandPose(rig,to,0,false,0,true);
      expect(rig.leftHand.rotation.y).toBe(handPose(to,0,false).leftHand.y);
    }
  });
});

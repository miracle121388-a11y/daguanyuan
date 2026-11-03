import {describe, expect, it} from 'vitest';
import {Object3D, Mesh, Vector3} from 'three';
import {applyHandPose, handPose} from '../src/scene/characterHands';
const poses=['idle','observe','move','talk','rest','read','write'];
const makeRig=()=>Object.fromEntries(['leftArm','rightArm','leftForearm','rightForearm','leftHand','rightHand'].map(name=>{
  const object = name.endsWith('Hand') ? new Mesh() : new Object3D();
  if(object instanceof Mesh){object.morphTargetDictionary={grasp:0};object.morphTargetInfluences=[0];}
  return [name,object];
}));
describe('anatomical hand poses',()=>{
  it('keeps empty hands palm-in rather than exposing the spread construction pose',()=>{
    for(const pose of poses)for(const tea of [true,false])for(const motion of [true,false]){
      const rig=makeRig();applyHandPose(rig,pose,1,motion,tea,0,true);
      for(const side of ['left','right']){
        const normal=new Vector3(0,0,1).applyQuaternion(rig[`${side}Hand`].quaternion);
        expect(Math.abs(normal.x)).toBeGreaterThan(.85);
        expect(Math.abs(normal.z)).toBeLessThan(.51);
      }
    }
  });
  it('relaxes both empty forearms and only grips the cup with its holding hand',()=>{
    expect(handPose('rest',0,true,false).leftForearm.x).toBeCloseTo(-.035);
    expect(handPose('rest',0,true,false).rightForearm.x).toBeCloseTo(-.035);
    const tea=handPose('rest',0,true,true);
    expect(tea.leftGrasp).toBe(.25);expect(tea.rightGrasp).toBe(.72);
    expect(tea.leftForearm.x).toBeCloseTo(-.035);
  });
  it('never crosses through reversed wrists during any action transition, including reduced motion and a fresh paused LOD',()=>{
    for(const from of poses)for(const to of poses){
      const rig=makeRig();applyHandPose(rig,from,0,true,true,0,true);
      for(let frame=0;frame<120;frame++){
        applyHandPose(rig,to,frame/60,true,false,1/60);
        expect(rig.leftHand.rotation.y).toBeLessThan(-1);
        expect(rig.rightHand.rotation.y).toBeGreaterThan(1);
      }
      applyHandPose(rig,to,0,false,false,0,true);
      expect(rig.leftHand.rotation.y).toBe(handPose(to,0,false,false).leftHand.y);
    }
  });
});

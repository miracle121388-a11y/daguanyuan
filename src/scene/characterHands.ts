import {MathUtils, type Object3D, type Mesh} from 'three';

/** Hands are authored palm-in at ±90°. Zero yaw is the asset's spread-hand
 * construction pose, not a suitable idle/talking/rest pose. */
export function handPose(pose: string, time: number, motion: boolean, tea: boolean) {
  const reading = pose === 'read' || pose === 'write';
  const speaking = pose === 'talk';
  const drinking = pose === 'rest' && tea;
  const stride = pose === 'move' && motion ? Math.sin(time * 8) : 0;
  return {
    leftArm: {x: reading ? -.48 : speaking ? -.16 : -stride * .24, z: reading ? .14 : -.075},
    rightArm: {x: reading ? -.48 : speaking ? -.38 + (motion ? Math.sin(time * 2) * .08 : 0) : drinking ? -.28 : stride * .24, z: reading ? -.14 : speaking ? .16 : .075},
    leftForearm: {x: reading ? -.7 : -.035},
    rightForearm: {x: reading ? -.7 + (pose === 'write' && motion ? Math.sin(time * 5) * .08 : 0) : drinking ? -.65 : speaking ? -.25 : -.035},
    leftHand: {y: reading ? -1.05 : -Math.PI / 2},
    rightHand: {y: reading ? 1.05 : drinking ? 1.2 : speaking ? 1.35 : Math.PI / 2},
    leftGrasp: reading ? .48 : .25,
    rightGrasp: reading ? .48 : drinking ? .72 : .25,
  };
}

export function applyHandPose(rig: Record<string, Object3D>, pose: string, time: number, motion: boolean, tea: boolean, delta: number, immediate = false) {
  const target = handPose(pose, time, motion, tea);
  for (const name of ['leftArm', 'rightArm', 'leftForearm', 'rightForearm', 'leftHand', 'rightHand'] as const) {
    const object = rig[name];
    for (const [axis, value] of Object.entries(target[name])) {
      const key = axis as 'x' | 'y' | 'z';
      object.rotation[key] = immediate || !motion ? value : MathUtils.damp(object.rotation[key], value, 10, delta);
    }
  }
  for (const side of ['left', 'right'] as const) {
    const mesh = rig[`${side}Hand`] as Mesh;
    const index = mesh.morphTargetDictionary?.grasp;
    if (index !== undefined && mesh.morphTargetInfluences) {
      const value = target[`${side}Grasp`];
      mesh.morphTargetInfluences[index] = immediate || !motion ? value : MathUtils.damp(mesh.morphTargetInfluences[index], value, 10, delta);
    }
  }
}

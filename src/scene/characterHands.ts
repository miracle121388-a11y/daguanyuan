import {MathUtils, type Object3D, type Mesh} from 'three';

/** Hands are authored palm-in at ±90°. Zero yaw is the asset's spread-hand
 * construction pose, not a suitable idle/talking/rest pose. */
export function handPose(pose: string, time: number, motion: boolean) {
  // Story actions stay intact; unsupported physical enactments fall back to
  // a relaxed stance until gaze, grip and environmental contact are authored.
  const stride = pose === 'move' && motion ? Math.sin(time * 8) : 0;
  return {
    leftArm: {x: -stride * .08, z: -.045},
    rightArm: {x: stride * .08, z: .045},
    leftForearm: {x: -.025},
    rightForearm: {x: -.025},
    leftHand: {y: -Math.PI / 2},
    rightHand: {y: Math.PI / 2},
    leftGrasp: .25,
    rightGrasp: .25,
  };
}

export function applyHandPose(rig: Record<string, Object3D>, pose: string, time: number, motion: boolean, delta: number, immediate = false) {
  const target = handPose(pose, time, motion);
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

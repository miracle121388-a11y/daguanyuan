import {Vector3, MathUtils} from 'three';
import type {Manifest, Vec3} from '../data/types';

/** Frame the garden walls, not the much larger city scenery outside them. */
export function overviewFrame(manifest: Manifest, width: number, height: number, fov: number, plan = false) {
  const boundary = manifest.boundary?.length ? manifest.boundary : [[-147,-137],[147,147]];
  const xs = boundary.map(p => p[0]), zs = boundary.map(p => p[1]);
  const min = [Math.min(...xs), 0, Math.min(...zs)], max = [Math.max(...xs), Math.max(18, ...manifest.places.map(p => p.boundingBox.max[1])), Math.max(...zs)];
  const center = new Vector3((min[0]+max[0])/2, (min[1]+max[1])/2, (min[2]+max[2])/2);
  const direction = new Vector3(plan ? 0 : .10, plan ? 1 : width < 601 ? 1.5 : .65, plan ? .12 : 1).normalize();
  const forward = direction.clone().negate(), right = forward.clone().cross(new Vector3(0,1,0)).normalize(), up = right.clone().cross(forward);
  const tangent = Math.tan(MathUtils.degToRad(fov/2));
  // Keep a small margin for labels and the bottom tour bar without shrinking the garden to a dot.
  const tx = tangent * width / Math.max(height,1) * .90, ty = tangent * .84;
  let distance = 0;
  for (const x of [min[0],max[0]]) for (const y of [min[1],max[1]]) for (const z of [min[2],max[2]]) {
    const delta = new Vector3(x,y,z).sub(center), depth = delta.dot(forward);
    distance = Math.max(distance, Math.abs(delta.dot(right))/tx-depth, Math.abs(delta.dot(up))/ty-depth);
  }
  return {target: center.toArray() as Vec3, position: center.clone().addScaledVector(direction,distance*1.015).toArray() as Vec3, distance};
}

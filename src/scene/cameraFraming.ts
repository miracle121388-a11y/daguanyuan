import {Box3, MathUtils, PerspectiveCamera, Vector3, type Object3D} from 'three';
import type {ScenePlace, Vec3} from '../data/types';

export type LensMode = 'garden' | 'interior' | 'character' | 'portrait';
const lenses = {garden:[38,58], interior:[36,54], character:[34,54], portrait:[30,42]} as const;
/** Cap BOTH axes: a fixed vertical FOV becomes an ultra-wide lens on a short canvas. */
export function lensFov(width:number,height:number,mode:LensMode='garden') {
  const [vertical,horizontal]=lenses[mode],aspect=Math.max(1,width)/Math.max(1,height);
  return Math.min(vertical,MathUtils.radToDeg(2*Math.atan(Math.tan(MathUtils.degToRad(horizontal/2))/aspect)));
}
export function applyLens(camera:PerspectiveCamera,width:number,height:number,mode:LensMode='garden') {
  camera.clearViewOffset(); camera.filmOffset=0; camera.zoom=1;
  camera.aspect=Math.max(1,width)/Math.max(1,height);camera.fov=lensFov(width,height,mode);
  camera.near=mode==='portrait'?.025:.08;camera.far=2400;camera.updateProjectionMatrix();
}
export type FrameInsets={top:number;bottom:number};
export function subjectBounds(object:Object3D) {
  // Refresh skin bind inverses before evaluating posed vertices in world space.
  object.updateMatrixWorld(true);return new Box3().setFromObject(object,true);
}
export function fitBox(box:Box3,direction:Vector3,width:number,height:number,fov:number,padding=0.13,insets?:FrameInsets) {
  const target=box.getCenter(new Vector3()),outward=direction.clone().normalize();
  const forward=outward.clone().negate(),right=forward.clone().cross(new Vector3(0,1,0)).normalize(),up=right.clone().cross(forward);
  const tangent=Math.tan(MathUtils.degToRad(fov/2));
  const tx=tangent*Math.max(width,1)/Math.max(height,1)*(1-padding);
  let top=Math.min(insets?.top??0,height*.30),bottom=Math.min(insets?.bottom??0,height*.75);
  if(top+bottom>height*.85){const scale=height*.85/(top+bottom);top*=scale;bottom*=scale;}
  const verticalPadding=Math.min(padding,(1-(top+bottom)/Math.max(height,1))*.35);
  const upper=1-2*top/Math.max(height,1)-verticalPadding;
  const lower=-1+2*bottom/Math.max(height,1)+verticalPadding;
  const center=(upper+lower)/2;
  let distance=.1;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]) {
    const delta=new Vector3(x,y,z).sub(target),depth=delta.dot(forward);
    const vertical=delta.dot(up);
    distance=Math.max(distance,Math.abs(delta.dot(right))/tx-depth,(vertical-upper*tangent*depth)/((upper-center)*tangent),(lower*tangent*depth-vertical)/((center-lower)*tangent));
  }
  distance*=1.025;
  // Move the camera and its aim together to compose above captions. Projection
  // stays centered, with square pixels and no shifted/off-axis lens.
  target.addScaledVector(up,-center*tangent*distance);
  return {target:target.toArray() as Vec3,position:target.clone().addScaledVector(outward,distance).toArray() as Vec3};
}
export function courtyardFrame(place:ScenePlace,width:number,height:number,fov:number,close:boolean) {
  // Keep the entire model, including eaves, walls and feet. Never crop the box to fake a closer view.
  const box=new Box3(new Vector3(...place.boundingBox.min),new Vector3(...place.boundingBox.max)).expandByScalar(.6);
  return fitBox(box,new Vector3(.32,close?.62:1.20,1),width,height,fov,.16);
}
export function characterFrame(box:Box3,direction:Vector3,width:number,height:number,fov:number,mode:'follow'|'close'|'portrait',portraitHeight:number,insets?:FrameInsets) {
  const subject=box.clone(),center=box.getCenter(new Vector3());
  if(mode==='portrait') {
    subject.min.set(center.x-.25,box.min.y+portraitHeight-.27,center.z-.24);
    subject.max.set(center.x+.25,Math.max(subject.min.y+.52,box.max.y+.025),center.z+.24);
  } else if(mode==='follow') subject.expandByVector(new Vector3(2.2,.3,2.2));
  // Symmetric breathing room keeps the subject on-axis and clear of the stage captions.
  const padding=insets ? .08 : Math.min(.60,Math.max(.22,150/Math.max(height,1)));
  return fitBox(subject,direction,width,height,fov,padding,insets);
}

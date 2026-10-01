import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {Bone,Box3,BufferGeometry,Float32BufferAttribute,Group,MathUtils,MeshBasicMaterial,PerspectiveCamera,Skeleton,SkinnedMesh,Uint16BufferAttribute,Vector3} from 'three';
import {applyLens,characterFrame,courtyardFrame,lensFov,subjectBounds,type LensMode} from '../src/scene/cameraFraming';
import type {Manifest,Vec3} from '../src/data/types';

const screens=[[1440,800],[1600,250],[390,240],[390,630],[844,210]];
const manifest=JSON.parse(readFileSync('public/scene-manifest.json','utf8')) as Manifest;
function cameraAt(width:number,height:number,fov:number,frame:{position:Vec3;target:Vec3}) {
 const camera=new PerspectiveCamera(fov,width/height,.025,2400);
 camera.position.fromArray(frame.position);camera.lookAt(...frame.target);camera.updateMatrixWorld();return camera;
}
function expectInFrame(box:Box3,camera:PerspectiveCamera,margin:number) {
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]) {
  const p=new Vector3(x,y,z).project(camera);
  expect(Math.abs(p.x)).toBeLessThan(margin);expect(Math.abs(p.y)).toBeLessThan(margin);
  expect(p.z).toBeGreaterThan(-1);expect(p.z).toBeLessThan(1);
 }
}
it.each(screens)('caps both lens axes and preserves pixel proportions at %sx%s',(width,height)=>{
 for(const mode of ['garden','interior','character','portrait'] as LensMode[]) {
  const camera=new PerspectiveCamera(65);camera.setViewOffset(1920,1080,360,0,1560,1080);camera.filmOffset=8;camera.zoom=2;
  applyLens(camera,width,height,mode);
  expect(camera.view?.enabled).toBe(false);expect(camera.filmOffset).toBe(0);expect(camera.zoom).toBe(1);
  const limits={garden:[38,58],interior:[36,54],character:[34,54],portrait:[30,42]}[mode];
  expect(camera.fov).toBeLessThanOrEqual(limits[0]);
  const horizontal=MathUtils.radToDeg(2*Math.atan(Math.tan(MathUtils.degToRad(camera.fov/2))*camera.aspect));
  expect(horizontal).toBeLessThanOrEqual(limits[1]+1e-9);
  const x=new Vector3(1,0,-10).project(camera).x*width/2,y=new Vector3(0,1,-10).project(camera).y*height/2;
  expect(x/y).toBeCloseTo(1,10);
 }
});
it.each(screens)('frames complete courtyard bounds in both views at %sx%s',(width,height)=>{
 const fov=lensFov(width,height);
 for(const place of manifest.places)for(const close of [false,true]) {
  const box=new Box3(new Vector3(...place.boundingBox.min),new Vector3(...place.boundingBox.max));
  expectInFrame(box,cameraAt(width,height,fov,courtyardFrame(place,width,height,fov,close)),.84);
 }
});
it.each(screens)('fits varied complete bodies and retains the moving actor offset at %sx%s',(width,height)=>{
 for(const heightOfActor of [1.55,1.72,1.90])for(const mode of ['close','follow'] as const) {
  const box=new Box3(new Vector3(-.65,0,-.42),new Vector3(.65,heightOfActor,.42)),direction=new Vector3(.42,.18,1);
  const fov=lensFov(width,height,'character'),frame=characterFrame(box,direction,width,height,fov,mode,heightOfActor-.17);
  expectInFrame(box,cameraAt(width,height,fov,frame),.78);
  const movement=new Vector3(10,2,-8),moved={position:new Vector3(...frame.position).add(movement).toArray() as Vec3,target:new Vector3(...frame.target).add(movement).toArray() as Vec3};
  expectInFrame(box.clone().translate(movement),cameraAt(width,height,fov,moved),.78);
 }
});
it.each(screens)('keeps facial and hair bounds inside a centered portrait at %sx%s',(width,height)=>{
 const box=new Box3(new Vector3(-.65,0,-.42),new Vector3(.65,1.9,.42)),fov=lensFov(width,height,'portrait');
 const frame=characterFrame(box,new Vector3(.1,.03,1),width,height,fov,'portrait',1.55);
 expectInFrame(new Box3(new Vector3(-.24,1.29,-.23),new Vector3(.24,1.92,.23)),cameraAt(width,height,fov,frame),.79);
 expect(box.max.y).toBe(1.9);
});
it('does not double-count the translation of a posed skin when finding subject bounds',()=>{
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute([-.3,0,0,.3,1.8,0],3));
 geometry.setAttribute('skinIndex',new Uint16BufferAttribute([0,0,0,0,0,0,0,0],4));geometry.setAttribute('skinWeight',new Float32BufferAttribute([1,0,0,0,1,0,0,0],4));
 const mesh=new SkinnedMesh(geometry,new MeshBasicMaterial()),bone=new Bone();mesh.add(bone);mesh.bind(new Skeleton([bone]));
 const root=new Group();root.add(mesh);root.position.set(104,0,99);
 const box=subjectBounds(root);expect(box.getCenter(new Vector3()).x).toBeCloseTo(104);expect(box.max.y).toBeCloseTo(1.8);
 root.position.set(-101,0,62);const moved=subjectBounds(root);expect(moved.getCenter(new Vector3()).x).toBeCloseTo(-101);expect(moved.getSize(new Vector3()).y).toBeCloseTo(1.8);
 geometry.dispose();mesh.material.dispose();
});
it.each(screens)('composes the complete body between the roster and captions at %sx%s',(width,height)=>{
 const box=new Box3(new Vector3(-.6,0,-.4),new Vector3(.6,1.9,.4)),safe={top:Math.min(80,height*.22),bottom:Math.min(210,height*.4)};
 const fov=lensFov(width,height,'character'),frame=characterFrame(box,new Vector3(.42,.18,1),width,height,fov,'close',1.55,safe),camera=cameraAt(width,height,fov,frame);
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
  const p=new Vector3(x,y,z).project(camera),screenY=(1-p.y)*height/2;
  expect(screenY).toBeGreaterThan(safe.top);expect(screenY).toBeLessThan(height-safe.bottom);expect(Math.abs(p.x)).toBeLessThan(1);
 }
});

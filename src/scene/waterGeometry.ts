import * as THREE from 'three';
import type {Manifest} from '../data/types';

/** Blender and WebGL consume the same authored shoreline, including dry islands. */
export function waterShape(lake:Manifest['lake']){
 const outline=lake.outline??Array.from({length:128},(_,i)=>{const a=i*Math.PI/64;return [lake.center[0]+lake.radius[0]*Math.cos(a),lake.center[1]+lake.radius[1]*Math.sin(a)]});
 const shape=new THREE.Shape(outline.map(p=>new THREE.Vector2(p[0],p[1])));
 for(const hole of lake.holes??[])shape.holes.push(new THREE.Path(hole.map(p=>new THREE.Vector2(p[0],p[1]))));
 return shape;
}
export {waterMapPath} from '../data/waterMapPath';

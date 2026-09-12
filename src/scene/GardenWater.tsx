import {useEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import {useTexture} from '@react-three/drei';
import * as THREE from 'three';
import {Water} from 'three/addons/objects/Water.js';
import {waterShape} from './waterGeometry';
import {useGarden} from '../state/store';
import type {Manifest} from '../data/types';

// Planar reflection is of this real scene. Shallow colour follows the same
// reviewed shore mask; small multi-scale slopes replace the former sine grid.
const fragment=`
uniform sampler2D mirrorSampler;
uniform sampler2D normalSampler;
uniform sampler2D surfaceZones;
uniform float time;
uniform float night;
uniform vec3 sunColor;
uniform vec3 sunDirection;
uniform vec3 eye;
uniform vec3 waterColor;
varying vec4 mirrorCoord;
varying vec4 worldPosition;
#include <common>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
void main(){
 #include <logdepthbuf_fragment>
 vec2 p=worldPosition.xz;
 mat2 turn=mat2(.7986,-.6018,.6018,.7986);
 vec2 flow=vec2(time*.0031,time*.0013);
 vec2 a=texture2D(normalSampler,p/24.0+flow).rg*2.0-1.0;
 vec2 b=texture2D(normalSampler,turn*p/7.83-flow*.72).rg*2.0-1.0;
 vec2 c=texture2D(normalSampler,turn*turn*p/2.17+flow*.23).rg*2.0-1.0;
 vec3 view=normalize(eye-worldPosition.xyz);
 float far=length(eye-worldPosition.xyz);
 vec2 slopes=(a*.31+b*.13+c*.057)*mix(.72,1.0,clamp(90.0/far,0.0,1.0));
 vec3 normal=normalize(vec3(slopes.x,1.0,slopes.y));
 vec2 uv=mirrorCoord.xy/mirrorCoord.w+slopes*(.032+1.25/far);
 // A tiny roughness footprint softens distant foliage reflections while the
 // irregular wave normal breaks up their silhouette. All samples are live 3D.
 vec2 blur=vec2(.00085,.0016);
 vec3 reflected=texture2D(mirrorSampler,uv).rgb*.5;
 reflected+=(texture2D(mirrorSampler,uv+blur).rgb+texture2D(mirrorSampler,uv-blur).rgb)*.25;
 float shore=texture2D(surfaceZones,vec2((p.x+384.0)/768.0,(384.0-p.y)/768.0)).g;
 float theta=clamp(dot(view,normal),0.0,1.0);
 float fresnel=.025+.975*pow(1.0-theta,5.0);
 float reflectionWeight=clamp(.052+night*.08+fresnel*.84,0.0,.94);
 vec3 depth=mix(waterColor*.74,waterColor*vec3(1.29,1.20,.93),shore*.72);
 vec3 halfVector=normalize(view+sunDirection);
 float glint=pow(max(dot(normal,halfVector),0.0),160.0)*.85;
 // Slope-dependent broad sky response remains visible over the open pond,
 // where a uniform scene background otherwise creates a featureless mirror.
 float skyResponse=clamp(dot(normal,normalize(vec3(-.4,1.,.65))),0.0,1.0);
 depth*=.78+.30*skyResponse+slopes.x*.55+slopes.y*.30;
 vec3 colour=mix(depth,reflected,reflectionWeight)+sunColor*glint*(1.0-night*.68);
 gl_FragColor=vec4(colour,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 #include <fog_fragment>
}`;

export default function GardenWater({manifest}:{manifest:Manifest}){
 const quality=useGarden(s=>s.qualityLevel),night=useGarden(s=>s.timeOfDay==='night'),motion=useGarden(s=>s.motion);
 const [source,zones]=useTexture([import.meta.env.BASE_URL+'textures/ground/pond-normal.png',import.meta.env.BASE_URL+'textures/ground/surface-zones.png']);
 const surface=useMemo(()=>{
  const normals=source.clone();normals.wrapS=normals.wrapT=THREE.RepeatWrapping;normals.colorSpace=THREE.NoColorSpace;normals.needsUpdate=true;
  const water=new Water(new THREE.ShapeGeometry(waterShape(manifest.lake)),{textureWidth:quality==='high'?768:320,textureHeight:quality==='high'?768:320,waterNormals:normals,sunDirection:new THREE.Vector3(-80,62,42).normalize(),sunColor:0xffe8c4,waterColor:0x244138,fog:true});
  water.material.fragmentShader=fragment;water.material.uniforms.surfaceZones={value:zones};water.material.uniforms.night={value:0};
  water.rotation.x=-Math.PI/2;water.position.y=-.12;
  const render=water.onBeforeRender,lastCamera=new THREE.Matrix4();let last=0,dirty=true;
  water.onBeforeRender=function(renderer,scene,camera,geometry,material,group){
   const now=performance.now(),changed=!lastCamera.equals(camera.matrixWorld);
   if(!dirty&&now-last<1500&&(!changed||now-last<(quality==='high'?75:130)))return;
   render.call(this,renderer,scene,camera,geometry,material,group);lastCamera.copy(camera.matrixWorld);last=now;dirty=false;
  };
  return {water,normals,refresh:()=>{dirty=true}};
 },[manifest,quality,source,zones]);
 useEffect(()=>{
  surface.water.material.uniforms.waterColor.value.set(night?'#2e4651':'#344d3d');
  surface.water.material.uniforms.sunColor.value.set(night?'#b2c7d2':'#ffe8c4');
  surface.water.material.uniforms.sunDirection.value.set(...(night?[-74,98,76]:[-80,62,42])).normalize();
  surface.water.material.uniforms.night.value=night?1:0;surface.refresh();
 },[surface,night]);
 useFrame((_,dt)=>{if(motion)surface.water.material.uniforms.time.value+=Math.min(dt,.05)});
 useEffect(()=>()=>{surface.water.geometry.dispose();surface.water.material.uniforms.mirrorSampler.value?.dispose();surface.water.material.dispose();surface.normals.dispose()},[surface]);
 return <primitive object={surface.water}/>;
}

import * as THREE from 'three';

/** Thin leaves scatter existing light through their reverse face; they do not emit light. */
export function finishLeafMaterial(material:THREE.MeshStandardMaterial,transmission=.36){
 material.side=THREE.DoubleSide;
 material.emissive.set(0);material.emissiveIntensity=0;material.emissiveMap=null;
 material.onBeforeCompile=shader=>{
  shader.uniforms.gardenLeafTransmission={value:transmission};
  shader.vertexShader='varying vec3 vGardenLeaf;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vec4 gardenLeafWorld=vec4(transformed,1.0);
#ifdef USE_BATCHING
gardenLeafWorld=batchingMatrix*gardenLeafWorld;
#endif
#ifdef USE_INSTANCING
gardenLeafWorld=instanceMatrix*gardenLeafWorld;
#endif
vGardenLeaf=(modelMatrix*gardenLeafWorld).xyz;
#include <project_vertex>`);
  shader.fragmentShader='varying vec3 vGardenLeaf;\nuniform float gardenLeafTransmission;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
float leafGrowth=.5+.28*sin(vGardenLeaf.x*1.17+vGardenLeaf.z*.83)+.22*sin(vGardenLeaf.y*2.8-vGardenLeaf.x*2.1+vGardenLeaf.z*1.7);
diffuseColor.rgb*=mix(vec3(.79,.85,.68),vec3(1.27,1.25,.96),leafGrowth);`);
  const direct='RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
  const scatter=`${direct}
{
 float leafIncidence=dot(geometryNormal,directLight.direction);
 float leafWrap=max(0.0,(leafIncidence+.35)/1.35)-max(0.0,leafIncidence);
 float leafBack=max(0.0,-leafIncidence);
 reflectedLight.directDiffuse+=directLight.color*BRDF_Lambert(material.diffuseColor)*gardenLeafTransmission*(leafBack+leafWrap);
}`;
  // The chunk has already applied visibility, attenuation and shadow maps.
  // Reuse that light for the reverse face, including local lamps at night.
  const lights=THREE.ShaderChunk.lights_fragment_begin.replaceAll(direct,scatter).replace(
   'getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal )',
   'mix(getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal ),getHemisphereLightIrradiance( hemisphereLights[ i ], -geometryNormal ),gardenLeafTransmission*.7)'
  );
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',lights);
 };
 material.customProgramCacheKey=()=>`garden-thin-leaf-r13-${transmission}`;
 material.needsUpdate=true;
}

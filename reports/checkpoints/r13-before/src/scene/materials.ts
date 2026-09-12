import * as THREE from 'three';
export function finishMaterials(scene:THREE.Object3D,landscapeLight?:THREE.Texture,soil?:THREE.Texture,zones?:THREE.Texture){
 scene.traverse(object=>{if(!(object instanceof THREE.Mesh))return;for(const m of Array.isArray(object.material)?object.material:[object.material]){
  if(!(m instanceof THREE.MeshStandardMaterial)||m.userData.referenceFinished)continue;m.userData.referenceFinished=true;
  if(m.name==='earth'){
   m.color.set('#e4e8d4');m.roughness=1;
   m.bumpMap=m.map;m.bumpScale=.055;
   m.onBeforeCompile=shader=>{
    shader.uniforms.gardenLight={value:landscapeLight};shader.uniforms.gardenSoil={value:soil};shader.uniforms.gardenZones={value:zones};
    shader.vertexShader='varying vec3 vGround;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','vec4 gardenWorld=vec4(transformed,1.0);\n#ifdef USE_BATCHING\ngardenWorld=batchingMatrix*gardenWorld;\n#endif\n#ifdef USE_INSTANCING\ngardenWorld=instanceMatrix*gardenWorld;\n#endif\nvGround=(modelMatrix*gardenWorld).xyz;\n#include <project_vertex>');
    shader.fragmentShader=`varying vec3 vGround;
uniform sampler2D gardenLight;
uniform sampler2D gardenSoil;
uniform sampler2D gardenZones;
float groundHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float groundNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(groundHash(i),groundHash(i+vec2(1.,0.)),f.x),mix(groundHash(i+vec2(0.,1.)),groundHash(i+vec2(1.,1.)),f.x),f.y);}
`+shader.fragmentShader;
    const shadow=landscapeLight?'float gardenShade=texture2D(gardenLight,vec2((vGround.x+360.0)/720.0,(330.0-vGround.z)/720.0)).r;':'float gardenShade=1.0;';
    const zonesCode=zones?'vec3 groundZones=texture2D(gardenZones,vec2((vGround.x+384.0)/768.0,(384.0-vGround.z)/768.0)).rgb;':'vec3 groundZones=vec3(0.0);';
    const blend=soil?'vec3 soilColor=texture2D(gardenSoil,vGround.xz/1.65).rgb;float exposed=max(groundZones.r,groundZones.g*.38)+groundZones.b*.75+smoothstep(0.59,0.80,groundMix)*.10;diffuseColor.rgb=mix(diffuseColor.rgb,soilColor*vec3(1.04,1.06,.94),clamp(exposed,0.0,0.91));':'';
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n'+shadow+'\n'+zonesCode+'\nfloat groundMix=groundNoise(vGround.xz*.065)*.55+groundNoise(vGround.xz*.43)*.30+groundNoise(vGround.xz*1.17)*.15;\n'+blend+'\ndiffuseColor.rgb*=mix(vec3(.81,.89,.76),vec3(1.18,1.15,1.06),groundMix);\ndiffuseColor.rgb*=mix(.51,1.0,pow(gardenShade,1.18));');
   };
   m.customProgramCacheKey=()=> 'garden-ground-r12-fix1-'+Boolean(landscapeLight)+Boolean(soil)+Boolean(zones);
  }
  if(m.name==='plaster'){m.color.set('#e8e5d8');m.roughness=.91;m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n#ifdef USE_MAP\ndiffuseColor.rgb = diffuse * mix(vec3(1.0), sampledDiffuseColor.rgb, 0.16);\n#endif')};m.customProgramCacheKey=()=> 'garden-plaster-r7'}
  if(['wood','darkwood','floorwood','latticewood','furniture','roof','tile','tilelight','tiledark','paving','courtbase','cutstone','bankstone','gardenstone','stone','litter'].includes(m.name)){m.color.set('#ffffff');if(m.map)m.map.anisotropy=4}

  
  
  
  if(m.name==='plaster'&&m.map){m.bumpMap=m.map;m.bumpScale=.004}
  if(m.name==='limestone'){m.color.set('#d4d8d0');m.roughness=.85}
  if(['bankstone','limestone'].includes(m.name)){
   m.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vBank;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','vec4 bankWorld=vec4(transformed,1.0);\n#ifdef USE_BATCHING\nbankWorld=batchingMatrix*bankWorld;\n#endif\n#ifdef USE_INSTANCING\nbankWorld=instanceMatrix*bankWorld;\n#endif\nvBank=(modelMatrix*bankWorld).xyz;\n#include <project_vertex>');
    shader.fragmentShader='varying vec3 vBank;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat dryBank=smoothstep(-.20,.68,vBank.y+.06*sin(vBank.x*5.7+vBank.z*3.9));\ndiffuseColor.rgb*=mix(vec3(.39,.49,.42),vec3(1.0),dryBank);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor*=mix(.38,1.0,dryBank);');
   };
   m.customProgramCacheKey=()=> 'garden-wet-stone-r12';
  }
   if(['leaf','lightleaf','leafdark','canopy_light','canopy_shadow','Living_Foliage'].includes(m.name)){m.side=THREE.DoubleSide;m.roughness=.94}
   if(m.name.startsWith('botanical_')){m.side=THREE.DoubleSide;m.color.set('#ffffff');m.roughness=m.name==='botanical_banana'?.78:.88;if(m.map)m.map.anisotropy=4}
  m.needsUpdate=true;
 }});
}

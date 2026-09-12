from pathlib import Path
R=Path(__file__).resolve().parents[1];p=R/'src/scene/GardenScene.tsx';s=p.read_text(encoding='utf8')
s=s.replace("import * as THREE from 'three';","import * as THREE from 'three';\nimport {Water} from 'three/addons/objects/Water.js';\nimport {Environment} from '@react-three/drei';")
start=s.index('function Lake(');end=s.index('function CameraManager(',start)
s=s[:start]+'''function Lake(){
 const quality=useGarden(s=>s.qualityLevel),night=useGarden(s=>s.timeOfDay==='night'),motion=useGarden(s=>s.motion);
 const surface=useMemo(()=>{
  const size=64,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;data[i]=128+Math.round(Math.sin(x*.39+y*.18)*17);data[i+1]=128+Math.round(Math.cos(y*.49-x*.13)*17);data[i+2]=253;data[i+3]=255}
  const normals=new THREE.DataTexture(data,size,size);normals.wrapS=normals.wrapT=THREE.RepeatWrapping;normals.needsUpdate=true;
  const water=new Water(new THREE.PlaneGeometry(410,380),{textureWidth:quality==='high'?768:256,textureHeight:quality==='high'?768:256,waterNormals:normals,sunDirection:new THREE.Vector3(-.6,.8,.4).normalize(),sunColor:0xffe7ba,waterColor:0x466e63,distortionScale:.7,fog:true});
  water.rotation.x=-Math.PI/2;water.position.y=-.16;return {water,normals};
 },[quality]);
 useEffect(()=>{surface.water.material.uniforms.waterColor.value.set(night?'#182f38':'#456c60');surface.water.material.uniforms.sunColor.value.set(night?'#91afc7':'#ffead0')},[surface,night]);
 useEffect(()=>()=>{surface.water.geometry.dispose();surface.water.material.uniforms.mirrorSampler.value?.dispose();surface.water.material.dispose();surface.normals.dispose()},[surface]);
 useFrame((_,dt)=>{if(motion)surface.water.material.uniforms.time.value+=Math.min(dt,.05)*.32});
 return <primitive object={surface.water}/>;
}
function Atmosphere(){
 const night=useGarden(s=>s.timeOfDay==='night'),{scene,invalidate,gl}=useThree(),selected=useGarden(s=>s.selectedPlaceId),loaded=useGarden(s=>s.loaded);
 useEffect(()=>{const mats=new Set<THREE.MeshStandardMaterial>();scene.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial)mats.add(m)});for(const m of mats){if(['lantern','screen','silk','paper'].includes(m.name)){m.emissive.set(night?'#ffc785':'#201a0e');m.emissiveIntensity=night?(m.name==='lantern'?2.7:.32):0}}gl.shadowMap.needsUpdate=true;invalidate()},[scene,night,selected,loaded,invalidate,gl]);
 return <><color attach="background" args={[night?'#192a3a':'#cbd3ce']}/><fog attach="fog" args={[night?'#192a3a':'#cbd3ce',190,510]}/><hemisphereLight args={[night?'#8eaac8':'#fff1d6',night?'#18271f':'#384d2c',night?.82:1.15]}/><ambientLight intensity={night?.16:.1}/><directionalLight position={[-90,115,65]} intensity={night?.75:3.6} color={night?'#a8c9ee':'#ffe2b7'} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-165} shadow-camera-right={165} shadow-camera-top={155} shadow-camera-bottom={-155} shadow-camera-far={430} shadow-normalBias={.1} shadow-bias={-.0004}/><Suspense fallback={null}><Environment files={base+'textures/forest_grove.hdr'} environmentIntensity={night?.12:.42}/></Suspense></>;
}
''' + s[end:]
old=s[s.index(' return <><color attach="background"',s.index('function World')):s.index(' <ModelBoundary',s.index('function World'))]
s=s.replace(old,' return <><Atmosphere/>\n')
s=s.replace('<Lake manifest={manifest}/>','<Lake/>')
s=s.replace('<mesh rotation={[-Math.PI/2,0,0]} position={[0,-3.1,0]} receiveShadow><planeGeometry args={[1800,1800]}/><meshStandardMaterial color="#e9eadf" roughness={1}/></mesh>','<mesh rotation={[-Math.PI/2,0,0]} position={[0,-.35,0]} receiveShadow><planeGeometry args={[1600,1600]}/><meshStandardMaterial color="#4f6343" roughness={1}/></mesh>')
s=s.replace('const position:Vec3=h?[target[0]+7,target[1]+6,target[2]+12]', 'const position:Vec3=h?[target[0]+8,target[1]+5,target[2]+13]')
s=s.replace('maxDistance={390}','maxDistance={330}')
s=s.replace('fov:39','fov:43')
# High detail becomes visible only when ready, avoiding duplicate buildings.
s=s.replace('const inside=useGarden(s=>s.hotspotId===place.id+\'-study\');','const inside=useGarden(s=>s.hotspotId===place.id+\'-study\');\n const time=useGarden(s=>s.timeOfDay);')
s=s.replace("},[scene,inside]);","scene.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial&&['lantern','screen','silk','paper'].includes(m.name)){m.emissive.set('#ffc785');m.emissiveIntensity=time==='night'?(m.name==='lantern'?2.7:.32):0}})},[scene,inside,time]);")
s=s.replace("useEffect(()=>{scene.traverse(o=>{if(o.userData.entityType==='place')", "const time=useGarden(s=>s.timeOfDay);\n useEffect(()=>{scene.traverse(o=>{if(o.userData.entityType==='place')")
s=s.replace("o.receiveShadow=true}});useGarden.setState({loaded:true})},[scene,detailId]);", "o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial&&['lantern','screen','silk','paper'].includes(m.name)){m.emissive.set('#ffc785');m.emissiveIntensity=time==='night'?(m.name==='lantern'?2.7:.32):0}}});useGarden.setState({loaded:true})},[scene,detailId,time]);")
p.write_text(s,encoding='utf8')
p=R/'scripts/optimize.mjs';s=p.read_text(encoding='utf8').replace("statSync,readFileSync}","statSync,readFileSync,renameSync}")
s=s.replace('await io.write(file,doc);const after=await io.read(file);','await io.write(file+\'.optimizing.glb\',doc);renameSync(file+\'.optimizing.glb\',file);const after=await io.read(file);')
p.write_text(s,encoding='utf8')
print('Reflective water and atmospheric lighting installed.')

from pathlib import Path
p=Path(__file__).resolve().parents[1]/'src/scene/GardenScene.tsx';s=p.read_text(encoding='utf8')
s=s.replace('}const water=new Water(new THREE.ShapeGeometry(shape),', '''}
  if(quality==='low'){
   const water=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:'#496e61',roughness:.21,metalness:.28,normalMap:normals,normalScale:new THREE.Vector2(.08,.08),envMapIntensity:.8}));
   water.rotation.x=-Math.PI/2;water.position.y=-.12;return {water,normals,isPlanar:false as const};
  }
  const water=new Water(new THREE.ShapeGeometry(shape),''')
s=s.replace('return {water,normals};','return {water,normals,isPlanar:true as const};')
start=s.index(' useEffect(()=>{surface.water.material.uniforms.waterColor')
end=s.index(' return <primitive object={surface.water}/>;',start)
s=s[:start]+''' useEffect(()=>{if(surface.isPlanar){surface.water.material.uniforms.waterColor.value.set(night?'#182f38':'#456c60');surface.water.material.uniforms.sunColor.value.set(night?'#91afc7':'#ffead0')}else surface.water.material.color.set(night?'#203b42':'#496e61')},[surface,night]);
 useEffect(()=>()=>{surface.water.geometry.dispose();if(surface.isPlanar)surface.water.material.uniforms.mirrorSampler.value?.dispose();surface.water.material.dispose();surface.normals.dispose()},[surface]);
 useFrame((_,dt)=>{if(motion&&surface.isPlanar)surface.water.material.uniforms.time.value+=Math.min(dt,.05)*.32});
''' + s[end:]
p.write_text(s,encoding='utf8')

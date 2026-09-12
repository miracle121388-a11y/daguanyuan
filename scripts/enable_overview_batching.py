from pathlib import Path
p=Path(__file__).resolve().parents[1]/'src/scene/GardenScene.tsx';s=p.read_text(encoding='utf8')
s=s.replace("import {finishMaterials} from './materials';", "import {finishMaterials} from './materials';\nimport {batchOverview,eventPlaceId} from './batchOverview';")
s=s.replace('const gltf=useGLTF(base+manifest.overview);const scene=useMemo(()=>{const clone=gltf.scene.clone(true);finishMaterials(clone);return clone},[gltf]);', "const gltf=useGLTF(base+manifest.overview);const scene=useMemo(()=>{const clone=gltf.scene.clone(true);finishMaterials(clone);return manifest.overview.endsWith('overview-low.glb')?clone:batchOverview(clone)},[gltf,manifest.overview]);\n useEffect(()=>()=>{scene.traverse(o=>{if(o instanceof THREE.BatchedMesh)o.dispose()})},[scene]);")
s=s.replace("scene.traverse(o=>{if(o.userData.entityType==='place')", "scene.traverse(o=>{if(o instanceof THREE.BatchedMesh){for(const [i,id] of (o.userData.batchPlaceIds as (string|null)[]).entries())o.setVisibleAt(i,!id||id!==detailId)}if(o.userData.entityType==='place')")
s=s.replace('const id=findPlaceId(e.object);if(id)', 'const id=eventPlaceId(e);if(id)')
s=s.replace('if(findPlaceId(e.object)){e.stopPropagation();document.body', 'if(eventPlaceId(e)){e.stopPropagation();document.body')
p.write_text(s,encoding='utf8')

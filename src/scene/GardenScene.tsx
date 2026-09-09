import {Suspense,useEffect,useMemo,useRef,Component,type ReactNode} from 'react';
import {Canvas,useFrame,useThree,type ThreeEvent} from '@react-three/fiber';
import {CameraControls,Html,Line,useGLTF,useProgress} from '@react-three/drei';
import * as THREE from 'three';
import {useGarden,relatedPlaces} from '../state/store';
import type {Manifest,ScenePlace,Vec3} from '../data/types';
import {GuidedTourController} from '../navigation/GuidedTourController';
const base=import.meta.env.BASE_URL;
useGLTF.setDecoderPath(base+'draco/');
const detailCache=new Map<string,THREE.Object3D>();
function rememberDetail(url:string,scene:THREE.Object3D,limit:number){
 detailCache.delete(url);detailCache.set(url,scene);
 while(detailCache.size>limit){const oldest=detailCache.keys().next().value!;const unused=detailCache.get(oldest)!;const resources=new Set<{dispose:()=>void}>();unused.traverse(o=>{if(o instanceof THREE.Mesh){resources.add(o.geometry);for(const mat of Array.isArray(o.material)?o.material:[o.material]){resources.add(mat);for(const value of Object.values(mat))if(value instanceof THREE.Texture)resources.add(value)}}});for(const value of resources)value.dispose();useGLTF.clear(oldest);detailCache.delete(oldest)}
}
export function findPlaceId(object:THREE.Object3D):string|null{let current:THREE.Object3D|null=object;while(current){if(current.userData.placeId)return current.userData.placeId;current=current.parent}return null}
class ModelBoundary extends Component<{children:ReactNode;onRetry:()=>void;label?:string},{error:boolean}>{
 state={error:false};static getDerivedStateFromError(){return {error:true}}
 render(){return this.state.error?<Html center><div className="scene-error" role="alert"><strong>{this.props.label??'园景'}暂未载入</strong><p>模型文件加载失败，请重试。</p><button onClick={()=>{this.props.onRetry();this.setState({error:false})}}>重新加载</button></div></Html>:this.props.children}
}
function Overview({manifest,detailId}:{manifest:Manifest;detailId:string|null}){
 const gltf=useGLTF(base+manifest.overview);const scene=useMemo(()=>gltf.scene.clone(true),[gltf]);
 useEffect(()=>{scene.traverse(o=>{if(o.userData.entityType==='place')o.visible=o.userData.placeId!==detailId;if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true}});useGarden.setState({loaded:true})},[scene,detailId]);
 const click=(e:ThreeEvent<MouseEvent>)=>{const id=findPlaceId(e.object);if(id){e.stopPropagation();useGarden.getState().choosePlace(id)}};
 return <primitive object={scene} onClick={click} onPointerOver={(e:ThreeEvent<PointerEvent>)=>{if(findPlaceId(e.object)){e.stopPropagation();document.body.style.cursor='pointer'}}} onPointerOut={()=>{document.body.style.cursor='auto'}}/>;
}
function Detail({place,onReady,low}:{place:ScenePlace;onReady:(id:string|null)=>void;low:boolean}){
 const inside=useGarden(s=>s.hotspotId===place.id+'-study');
 const url=base+(low&&place.mobileModel?place.mobileModel:place.model);const g=useGLTF(url);const scene=useMemo(()=>g.scene.clone(true),[g]);
 useEffect(()=>{rememberDetail(url,g.scene,low?2:4);scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=!low;o.receiveShadow=!low}});onReady(place.id);return()=>onReady(null)},[scene,g,url,low,place.id,onReady]);
 useEffect(()=>{scene.traverse(o=>{if(o instanceof THREE.Mesh){const materials=Array.isArray(o.material)?o.material:[o.material];if(materials.every(m=>['roof','tile','tilelight','tiledark'].includes(m.name)))o.visible=!inside}})},[scene,inside]);
 return <group position={place.position}><primitive object={scene} onClick={(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();const state=useGarden.getState();if(state.selectedPlaceId!==place.id)state.choosePlace(place.id)}}/></group>;
}
function Lake({manifest}:{manifest:Manifest}){
 const mesh=useRef<THREE.Mesh>(null);const motion=useGarden(s=>s.motion),quality=useGarden(s=>s.qualityLevel);const material=useMemo(()=>new THREE.ShaderMaterial({uniforms:{time:{value:0},baseColor:{value:new THREE.Color('#769b8b')}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform float time;uniform vec3 baseColor;varying vec2 vUv;void main(){float wave=sin(vUv.y*220.+sin(vUv.x*30.)*1.5+time*.6);float glint=pow(max(0.,wave),24.)*.022;gl_FragColor=vec4(baseColor+glint+sin(vUv.y*16.+vUv.x*9.)*.012,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',side:THREE.DoubleSide}),[]);
 useEffect(()=>()=>material.dispose(),[material]);useFrame(({clock})=>{if(motion&&quality==='high')material.uniforms.time.value=clock.elapsedTime});
 return <mesh ref={mesh} rotation={[-Math.PI/2,0,0]} position={[0,-.16,-manifest.lake.center[1]]} scale={[manifest.lake.radius[0],manifest.lake.radius[1],1]} material={material}><circleGeometry args={[1,100]}/></mesh>;
}
function CameraManager({manifest}:{manifest:Manifest}){
 const {camera,size}=useThree();const panelOpen=useGarden(s=>s.panelOpen);
 useEffect(()=>{if(!(camera instanceof THREE.PerspectiveCamera))return;if(panelOpen){const mobile=size.width<601;camera.setViewOffset(size.width,size.height,mobile?0:Math.min(360,size.width<1150?304:332)/2,mobile?size.height*.26:0,size.width,size.height)}else camera.clearViewOffset();camera.updateProjectionMatrix()},[camera,size.width,size.height,panelOpen]);
 const controls=useRef<CameraControls>(null);const selected=useGarden(s=>s.selectedPlaceId);const tour=useGarden(s=>s.tourState);const motion=useGarden(s=>s.motion);const controller=useRef<GuidedTourController|null>(null);const dwell=useRef(0);const started=useRef(false);
 const hotspot=useGarden(s=>s.hotspotId);
 useEffect(()=>{if(tour.status!=='idle')return;const p=manifest.places.find(p=>p.id===selected);const h=p?.hotspots.find(h=>h.id===hotspot);const target:Vec3=h&&p?h.position.map((v,i)=>v+p.position[i]) as Vec3:p?.cameraTarget??manifest.overviewCamera.target;const position:Vec3=h?[target[0]+7,target[1]+6,target[2]+12]:p?.cameraPosition??manifest.overviewCamera.position;controls.current?.setLookAt(...position,...target,motion)},[selected,manifest,tour.status,motion,hotspot]);
 useEffect(()=>{const state=useGarden.getState();const route=state.data?.routes.find(r=>r.id===tour.routeId);if(!route||tour.status==='idle'){controller.current=null;started.current=false;return}
  const place=manifest.places.find(p=>p.id===route.orderedStops[tour.index])!;
  controls.current?.setLookAt(...place.cameraPosition,...place.cameraTarget,false);dwell.current=0;controller.current=null;started.current=false;useGarden.setState({panelOpen:true,hotspotId:null});
 },[tour.routeId,tour.index,tour.revision,manifest]);
 useFrame((_,dt)=>{if(tour.status!=='playing'||!controls.current)return;const route=useGarden.getState().data?.routes.find(r=>r.id===tour.routeId);if(!route)return;
  if(!started.current){dwell.current+=Math.min(dt,.05);if(dwell.current<5)return;if(tour.index>=route.orderedStops.length-1){useGarden.setState({tourState:{...tour,status:'paused'}});return}controller.current=new GuidedTourController(manifest,route.orderedStops[tour.index],route.orderedStops[tour.index+1]);started.current=true;useGarden.setState({panelOpen:false})}
  const state=controller.current?.tick(Math.min(dt,.05));if(state){const {position,lookAhead,done}=state;const target:Vec3=[lookAhead[0],lookAhead[1]+2.4,lookAhead[2]];if(!done)controls.current.setLookAt(position[0],position[1]+8,position[2]+.15,...target,false);else useGarden.getState().tourStep(tour.index+1)}
 });
 return <CameraControls ref={controls} makeDefault minDistance={8} maxDistance={390} minPolarAngle={.12} maxPolarAngle={Math.PI/2.15} smoothTime={.65} draggingSmoothTime={.12} onControlStart={()=>{if(useGarden.getState().tourState.status==='playing')useGarden.setState({tourState:{...useGarden.getState().tourState,status:'paused'}})}}/>;
}
function Markers({manifest}:{manifest:Manifest}){
 const state=useGarden();const {camera}=useThree();const marks=useMemo(()=>state.data?relatedPlaces(state.data,state.selectedCharacterId,state.selectedChapter,state.spoilerLimit):[],[state.data,state.selectedCharacterId,state.selectedChapter,state.spoilerLimit]);const focused=!!(state.selectedCharacterId||state.selectedChapter);const lineRoute=state.data?.routes.find(r=>r.id===state.tourState.routeId);
 const routePoints=useMemo(()=>lineRoute?lineRoute.pathNodeIds.map(id=>{const n=manifest.pathNodes.find(n=>n.id===id)!;return [n.position[0],n.position[1]+.16,n.position[2]] as Vec3}):[],[lineRoute,manifest]);
 const bead=useRef<THREE.Mesh>(null);useFrame(({clock})=>{if(bead.current&&routePoints.length>1&&state.motion){const i=Math.floor(clock.elapsedTime*1.5)%(routePoints.length-1),t=(clock.elapsedTime*1.5)%1;bead.current.position.fromArray(routePoints[i]).lerp(new THREE.Vector3(...routePoints[i+1]),t);bead.current.position.y+=.4}});
 return <>
 {routePoints.length>1&&<><Line points={routePoints} color="#b67745" lineWidth={2}/><mesh ref={bead}><sphereGeometry args={[.65,10,8]}/><meshBasicMaterial color="#9c563e"/></mesh></>}
 {manifest.places.map((p,i)=>{const chosen=state.selectedPlaceId===p.id,related=focused&&marks.includes(p.id);return <group key={p.id} position={p.position}>
 {!chosen&&<mesh position={[0,3.6,0]} userData={{placeId:p.id}} onClick={e=>{e.stopPropagation();state.choosePlace(p.id)}}><boxGeometry args={[p.featured?32:22,7.2,p.featured?28:20]}/><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false}/></mesh>}
 {(chosen||related)&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.23,0]}><ringGeometry args={[17,17.35,64]}/><meshBasicMaterial color={chosen?'#9e573e':'#537e6d'} transparent opacity={.85} side={THREE.DoubleSide}/></mesh>}
 {state.labels&&(!state.selectedPlaceId||chosen)&&(related||chosen||!focused)&&<Html position={[0,p.featured?10:9,0]} center zIndexRange={[12,0]} occlude={false}><button className={'place-label '+(chosen?'selected':'')} onClick={()=>state.choosePlace(p.id)} aria-label={'定位'+p.name}><span>{String(i+1).padStart(2,'0')}</span>{p.name}</button></Html>}
 {chosen&&p.hotspots.map((h,j)=><Html key={h.id} position={h.position} center zIndexRange={[13,0]} occlude><button className="hotspot" aria-label={h.name} onClick={()=>useGarden.setState({hotspotId:h.id,panelOpen:true})}>{j+1}</button></Html>)}
 </group>})}
 <group visible={camera.position.y>0}/>
 </>;
}
function Metrics(){const {gl,scene,camera}=useThree();const samples=useRef<number[]>([]);useFrame((_,dt)=>{if(import.meta.env.MODE!=='test')return;samples.current.push(dt*1000);if(samples.current.length>360)samples.current.shift();(window as any).__gardenMetrics={frames:samples.current,drawCalls:gl.info.render.calls,triangles:gl.info.render.triangles,geometries:gl.info.memory.geometries,textures:gl.info.memory.textures,dpr:gl.getPixelRatio(),renderer:gl.getContext().getParameter(gl.getContext().RENDERER)};(window as any).__gardenTest={state:()=>useGarden.getState(),project:(id:string)=>{const p=useGarden.getState().data!.manifest.places.find(p=>p.id===id)!;const vec=new THREE.Vector3(...p.position);vec.y+=3;vec.project(camera);return {x:(vec.x+1)/2*gl.domElement.clientWidth,y:(1-vec.y)/2*gl.domElement.clientHeight}},scene}});return null}
function World({manifest}:{manifest:Manifest}){
 const {gl,invalidate}=useThree();const loaded=useGarden(s=>s.loaded);
 const hotspot=useGarden(s=>s.hotspotId);
 const selected=useGarden(s=>s.selectedPlaceId);const [detailId,setDetailId]=useStableState<string|null>(null);const quality=useGarden(s=>s.qualityLevel);const place=manifest.places.find(p=>p.id===selected);const modelManifest=useMemo(()=>quality==='low'?{...manifest,overview:'models/overview-low.glb'}:manifest,[quality,manifest]);
 useEffect(()=>{gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true;invalidate()},[gl,invalidate,selected,quality,detailId,loaded,hotspot]);
 return <><color attach="background" args={['#e9eadf']}/><fog attach="fog" args={['#e9eadf',230,650]}/><hemisphereLight args={['#fff8e5','#697c61',2.8]}/><directionalLight position={[-70,130,70]} intensity={3.2} color="#ffedcb" castShadow={quality==='high'} shadow-mapSize={[2048,2048]} shadow-camera-left={-140} shadow-camera-right={140} shadow-camera-top={130} shadow-camera-bottom={-130} shadow-camera-far={360} shadow-bias={-.001}/>
 <ModelBoundary key={modelManifest.overview} onRetry={()=>useGLTF.clear(base+modelManifest.overview)}><Suspense fallback={null}><Overview manifest={modelManifest} detailId={detailId}/></Suspense></ModelBoundary>
 {place&&<ModelBoundary key={place.id+quality} label={place.name} onRetry={()=>useGLTF.clear(base+(quality==='low'&&place.mobileModel?place.mobileModel:place.model))}><Suspense fallback={null}><Detail place={place} low={quality==='low'} onReady={setDetailId}/></Suspense></ModelBoundary>}
 <Lake manifest={manifest}/><Markers manifest={manifest}/><CameraManager manifest={manifest}/><Metrics/>
 <mesh rotation={[-Math.PI/2,0,0]} position={[0,-3.1,0]} receiveShadow><planeGeometry args={[1800,1800]}/><meshStandardMaterial color="#e9eadf" roughness={1}/></mesh>
 </>;
}
import {useState as useStableState} from 'react';
function Loading(){const {progress,active}=useProgress();const loaded=useGarden(s=>s.loaded);return active&&!loaded?<div className="loading" role="status"><div className="loading-seal">园</div><h2>山水渐入眼前</h2><p>正在展开园林 · {Math.round(progress)}%</p><progress max={100} value={progress}/></div>:null}
export default function GardenScene({manifest}:{manifest:Manifest}){const quality=useGarden(s=>s.qualityLevel);const motion=useGarden(s=>s.motion);const playing=useGarden(s=>s.tourState.status==='playing');const webgl=useMemo(()=>{try{return !!document.createElement('canvas').getContext('webgl2')}catch{return false}},[]);if(!webgl)return <div className="fallback"><h2>当前设备无法显示三维园景</h2><p>仍可通过地点、人物与回目索引阅读全部资料。</p></div>;
 return <div className="canvas-wrap" data-testid="garden-canvas"><Canvas frameloop={playing||(motion&&quality==='high')?'always':'demand'} camera={{position:manifest.overviewCamera.position,fov:39,near:.1,far:1600}} dpr={quality==='high'?[1,1.5]:1} shadows={quality==='high'} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}}><World manifest={manifest}/></Canvas><Loading/></div>;
}

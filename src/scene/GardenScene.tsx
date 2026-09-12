import {Suspense,useEffect,useMemo,useRef,Component,type ReactNode} from 'react';
import {Canvas,useFrame,useThree,type ThreeEvent} from '@react-three/fiber';
import {CameraControls,Html,Line,useGLTF,useProgress,useTexture} from '@react-three/drei';
import * as THREE from 'three';
import GardenWater from './GardenWater';
import {Environment} from '@react-three/drei';
import LivingTrees from './LivingTrees';
import GroundCover from './GroundCover';
import Understory from './Understory';
import {finishMaterials} from './materials';
import {batchOverview,eventPlaceId} from './batchOverview';
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
function Overview({manifest,detailId,onReady}:{manifest:Manifest;detailId:string|null;onReady:(ready:boolean)=>void}){
 const gltf=useGLTF(base+manifest.overview),[light,soil,zones]=useTexture([base+'textures/landscape-light.webp',base+'textures/ground/soil.jpg',base+'textures/ground/surface-zones.png']);const scene=useMemo(()=>{soil.wrapS=soil.wrapT=THREE.RepeatWrapping;soil.colorSpace=THREE.SRGBColorSpace;const clone=gltf.scene.clone(true);finishMaterials(clone,light,soil,zones);return batchOverview(clone)},[gltf,manifest.overview,light,soil,zones]);
 useEffect(()=>()=>{scene.traverse(o=>{if(o instanceof THREE.BatchedMesh)o.dispose()})},[scene]);
 const time=useGarden(s=>s.timeOfDay);
 useEffect(()=>{scene.traverse(o=>{if(o instanceof THREE.BatchedMesh){for(const [i,id] of (o.userData.batchPlaceIds as (string|null)[]).entries())o.setVisibleAt(i,!id||id!==detailId)}if(o.userData.entityType==='place')o.visible=o.userData.placeId!==detailId;if(o instanceof THREE.Mesh){o.castShadow=!(Array.isArray(o.material)?o.material:[o.material]).some(m=>m.name==='earth');o.receiveShadow=!(Array.isArray(o.material)?o.material:[o.material]).some(m=>m.name==='earth');for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial&&['lantern','screen','silk','paper'].includes(m.name)){m.emissive.set('#ffc785');m.emissiveIntensity=time==='night'?(m.name==='lantern'?2.7:.32):0}}});onReady(true)},[scene,detailId,time,onReady]);
 const click=(e:ThreeEvent<MouseEvent>)=>{const id=eventPlaceId(e);if(id){e.stopPropagation();useGarden.getState().choosePlace(id)}};
 return <primitive object={scene} onClick={click} onPointerOver={(e:ThreeEvent<PointerEvent>)=>{if(eventPlaceId(e)){e.stopPropagation();document.body.style.cursor='pointer'}}} onPointerOut={()=>{document.body.style.cursor='auto'}}/>;
}
function Detail({place,onReady,low}:{place:ScenePlace;onReady:(id:string|null)=>void;low:boolean}){
 const inside=useGarden(s=>s.hotspotId===place.id+'-study'&&s.cutaway);
 const time=useGarden(s=>s.timeOfDay);
 const url=base+(low&&place.mobileModel?place.mobileModel:place.model);const g=useGLTF(url),light=useTexture(base+'textures/landscape-light.webp');const scene=useMemo(()=>{const clone=g.scene.clone(true);finishMaterials(clone,light);return clone},[g,light]);
 useEffect(()=>{rememberDetail(url,g.scene,low?2:4);scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=!low;o.receiveShadow=!low}});onReady(place.id);return()=>onReady(null)},[scene,g,url,low,place.id,onReady]);
 useEffect(()=>{scene.traverse(o=>{if(o instanceof THREE.Mesh){const materials=Array.isArray(o.material)?o.material:[o.material];if(o.userData.roof||materials.every(m=>['roof','tile','tilelight','tiledark'].includes(m.name)))o.visible=!inside;for(const m of materials)if(m instanceof THREE.MeshStandardMaterial&&['lantern','screen','silk','paper'].includes(m.name)){m.emissive.set('#ffc785');m.emissiveIntensity=time==='night'?(m.name==='lantern'?2.7:.32):0}}})},[scene,inside,time]);
 return <group position={place.position}><primitive object={scene} onClick={(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();const state=useGarden.getState();if(state.selectedPlaceId!==place.id)state.choosePlace(place.id)}}/></group>;
}
function Atmosphere(){
 const night=useGarden(s=>s.timeOfDay==='night'),{scene,invalidate,gl}=useThree(),selected=useGarden(s=>s.selectedPlaceId),loaded=useGarden(s=>s.loaded);
 const place=useGarden(s=>s.data?.manifest.places.find(p=>p.id===s.selectedPlaceId));
 const lightAim=useMemo(()=>{const aim=new THREE.Object3D();if(place)aim.position.fromArray(place.position);return aim},[place]);
 const lightPosition:Vec3=place?[place.position[0]+(night?-74:-80),place.position[1]+(night?98:62),place.position[2]+(night?76:42)]:night?[-74,98,76]:[-80,62,42],shadowSpan=place?(place.id==='daguanlou'?90:40):165;
 useEffect(()=>{const mats=new Set<THREE.MeshStandardMaterial>();scene.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial)mats.add(m)});for(const m of mats){if(['lantern','screen','silk','paper'].includes(m.name)){m.emissive.set(night?'#ffc785':'#201a0e');m.emissiveIntensity=night?(m.name==='lantern'?2.7:.32):0}}gl.shadowMap.needsUpdate=true;invalidate()},[scene,night,selected,loaded,invalidate,gl]);
 return <><color attach="background" args={[night?'#253d4b':'#dce2d9']}/><fog attach="fog" args={[night?'#253d4b':'#dce2d9',310,670]}/><hemisphereLight args={[night?'#9cb9d5':'#e4edf0',night?'#304138':'#415136',night?.60:.85]}/><ambientLight intensity={night?.055:.075}/><primitive object={lightAim}/><directionalLight target={lightAim} position={lightPosition} intensity={night?1.45:3.4} color={night?'#b0ccec':'#ffe2b1'} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-shadowSpan} shadow-camera-right={shadowSpan} shadow-camera-top={shadowSpan} shadow-camera-bottom={-shadowSpan} shadow-camera-far={480} shadow-normalBias={place?.025:.08} shadow-bias={-.0002}/><directionalLight position={[90,64,-140]} intensity={night?.19:.26} color="#b9d3cf"/><Suspense fallback={null}><Environment files={base+'textures/forest_grove.hdr'} environmentIntensity={night?.30:.55}/></Suspense></>;
}
function GardenLights({manifest}:{manifest:Manifest}){
 const night=useGarden(s=>s.timeOfDay==='night'),selected=useGarden(s=>s.selectedPlaceId),quality=useGarden(s=>s.qualityLevel);
 const place=manifest.places.find(p=>p.id===selected),main=manifest.places.find(p=>p.id==='daguanlou');
 // These positions are the same lantern fixtures generated in spatial_world.py.
 const pathLamps=manifest.pathNodes.filter((node,i)=>i%5===0&&!node.id.startsWith('ou')&&!node.id.startsWith('moonsteps')).filter(node=>place||/arrival|ceremonial|westbridge|inner|eastshore/.test(node.id)).sort((a,b)=>place?Math.hypot(a.position[0]-place.position[0],a.position[2]-place.position[2])-Math.hypot(b.position[0]-place.position[0],b.position[2]-place.position[2]):0).slice(0,quality==='low'?4:6);
 return <>{night&&main&&[-10.1,-5.1,0,5.1,10.1].map(x=><pointLight key={x} color="#f2c68d" intensity={95} distance={24} decay={2} position={[main.position[0]+x,main.position[1]+13.1,main.position[2]+3.9]}/>)}
 {night&&manifest.places.filter(p=>['daguanlou','daguanyuan_gate','xiaoxiangguan','yihongyuan','ouxiangxie','dicuiting','tubishanzhuang','aojingxiguan'].includes(p.id)||p.id===selected).map(p=><pointLight key={p.id} color="#eabc83" intensity={p.id==='daguanlou'?260:100} distance={p.id==='daguanlou'?54:27} decay={2} position={[p.position[0],p.position[1]+4,p.position[2]+3]}/>)}
  {night&&pathLamps.map(node=><pointLight key={node.id} color="#eec58d" intensity={85} distance={19} decay={2} position={[node.position[0]+2,node.position[1]+2.4,node.position[2]]}/>)}
  {night&&<MoonlitBanks manifest={manifest} low={quality==='low'}/>}
 {place&&<pointLight color="#ffe6bc" intensity={night?32:18} distance={13} decay={2} position={[place.position[0]-3,place.position[1]+3.3,place.position[2]-7]}/>}
 </>;
}
function MoonlitBanks({manifest,low}:{manifest:Manifest;low:boolean}){
 const pools=useMemo(()=>['arrival-4','arrival-6','ceremonial-0'].map((id,i)=>{const point=manifest.pathNodes.find(n=>n.id===id)!.position;const aim=new THREE.Object3D();aim.position.set(point[0]+(i===1?12:-8),.1,point[2]);return {aim,position:[point[0]-24,30+i*3,point[2]+14] as Vec3}}),[manifest]);
 return <>{pools.slice(low?1:0).map(({aim,position},i)=><group key={i}><primitive object={aim}/><spotLight target={aim} position={position} color={i===1?'#c2d6da':'#a5c8e1'} intensity={2100} distance={105} angle={.66} penumbra={.88} decay={2}/></group>)}</>;
}

function GardenLabel({place,index,chosen,related}:{place:ScenePlace;index:number;chosen:boolean;related:boolean}){const button=useRef<HTMLButtonElement>(null);const {camera,size}=useThree();const position=useMemo(()=>new THREE.Vector3(place.position[0],place.boundingBox.max[1]+2.5,place.position[2]),[place]);useFrame(()=>{if(!button.current)return;const p=position.clone().project(camera);button.current.style.visibility=p.z<1&&Math.abs(p.x)<(size.width<601?.74:.91)&&p.y<.76&&p.y>-.69?'visible':'hidden'});if(chosen&&size.width<601)return null;return <Html position={[0,place.boundingBox.max[1]-place.position[1]+2.5,0]} center zIndexRange={[12,0]} occlude={false}><button ref={button} className={'place-label '+(chosen?'selected':'')+(related?' related':'')} onClick={()=>useGarden.getState().choosePlace(place.id)} aria-label={'定位'+place.name}><span>{String(index+1).padStart(2,'0')}</span>{place.name}</button></Html>}
function visibleSceneRegion(canvas:HTMLCanvasElement,panelOpen:boolean){
 const rect=canvas.getBoundingClientRect(),panel=panelOpen?document.querySelector('.detail-panel')?.getBoundingClientRect():null;
 return {left:14,right:Math.max(150,rect.width-64),top:64,bottom:Math.max(190,Math.min(rect.height-145,panel?panel.top-rect.top-12:rect.height-145))};
}
function CameraManager({manifest}:{manifest:Manifest}){
 const {camera,size,gl}=useThree();const panelOpen=useGarden(s=>s.panelOpen),indoor=useGarden(s=>!!s.hotspotId?.endsWith('-study')&&!s.cutaway);
 useEffect(()=>{if(!(camera instanceof THREE.PerspectiveCamera))return;if(panelOpen){const mobile=size.width<601,region=visibleSceneRegion(gl.domElement,panelOpen);camera.setViewOffset(size.width,size.height,mobile?size.width/2-(region.left+region.right)/2:Math.min(360,size.width<1150?304:332)/2,mobile?size.height/2-(region.top+region.bottom)/2:0,size.width,size.height)}else if(size.width<601)camera.setViewOffset(size.width,size.height,0,size.height*.04,size.width,size.height);else camera.clearViewOffset();camera.updateProjectionMatrix()},[camera,size.width,size.height,panelOpen,indoor,gl]);
 const controls=useRef<CameraControls>(null);const selected=useGarden(s=>s.selectedPlaceId);const tour=useGarden(s=>s.tourState);const motion=useGarden(s=>s.motion);const controller=useRef<GuidedTourController|null>(null);const dwell=useRef(0);const started=useRef(false);
 const planView=useGarden(s=>s.planView),closeView=useGarden(s=>s.closeView);
 const hotspot=useGarden(s=>s.hotspotId),cutaway=useGarden(s=>s.cutaway);
 useEffect(()=>{
  if(tour.status!=='idle')return;
  const p=manifest.places.find(p=>p.id===selected),h=p?.hotspots.find(h=>h.id===hotspot);
  const room=h?.id.endsWith('-study')&&!cutaway?p?.interiorCamera:undefined;
  const toWorld=(local:Vec3)=>local.map((v,i)=>v+(p?.position[i]??0)) as Vec3;
  let target:Vec3=planView&&!p?[0,0,0]:room?toWorld(room.target):h&&p?toWorld(h.position):p?.cameraTarget??manifest.overviewCamera.target;
  let position:Vec3=planView&&!p?[0,395,49]:room?toWorld(room.position):h?[target[0]+5,target[1]+13,target[2]+8]:p?.cameraPosition??(size.width<601?manifest.overviewCamera.mobilePosition??manifest.overviewCamera.position:manifest.overviewCamera.position);
  if(camera instanceof THREE.PerspectiveCamera){
   camera.near=room?.06:.65;camera.fov=room?.fov??(size.width<601?(planView&&!p?72:58):p?43:48);camera.updateProjectionMatrix();
   if(size.width<601&&p&&!h){
    const box=new THREE.Box3(new THREE.Vector3(...p.boundingBox.min),new THREE.Vector3(...p.boundingBox.max));
    if(closeView){
     const px=p.position[0],pz=p.position[2];
     const half=p.id==='daguanlou'?20:p.featured?8.8:7;
     box.min.x=Math.max(box.min.x,px-half);box.max.x=Math.min(box.max.x,px+half);
     box.min.z=Math.max(box.min.z,pz-(p.id==='daguanlou'?5:2));box.max.z=Math.min(box.max.z,pz+(p.id==='daguanlou'?23:12.6));
     box.min.y=Math.max(box.min.y,p.position[1]+.05);box.max.y=Math.min(box.max.y,p.position[1]+(p.id==='daguanlou'?16:6.5));
    }
    const center=box.getCenter(new THREE.Vector3()),direction=new THREE.Vector3(closeView?.38:.30,closeView?.62:1.32,1).normalize();
    const forward=direction.clone().negate(),right=forward.clone().cross(camera.up).normalize(),up=right.clone().cross(forward).normalize();
    const region=visibleSceneRegion(gl.domElement,panelOpen),tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov*.5));
    const tx=tangent*size.width/size.height*(region.right-region.left)/size.width,ty=tangent*(region.bottom-region.top)/size.height;
    let distance=0;
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
     const delta=new THREE.Vector3(x,y,z).sub(center),depth=delta.dot(forward);
     distance=Math.max(distance,Math.abs(delta.dot(right))/tx-depth,Math.abs(delta.dot(up))/ty-depth);
    }
    target=center.toArray() as Vec3;position=center.clone().addScaledVector(direction,distance*1.06).toArray() as Vec3;
   }
  }
  controls.current?.setLookAt(...position,...target,motion);
 },[selected,manifest,tour.status,motion,hotspot,cutaway,camera,size.width,size.height,planView,panelOpen,closeView,gl]);
 useEffect(()=>{const state=useGarden.getState();const route=state.data?.routes.find(r=>r.id===tour.routeId);if(!route||tour.status==='idle'){controller.current=null;started.current=false;return}
  const place=manifest.places.find(p=>p.id===route.orderedStops[tour.index])!;
  controls.current?.setLookAt(...place.cameraPosition,...place.cameraTarget,false);dwell.current=0;controller.current=null;started.current=false;useGarden.setState({panelOpen:true,hotspotId:null});
 },[tour.routeId,tour.index,tour.revision,manifest]);
 useFrame((_,dt)=>{if(tour.status!=='playing'||!controls.current)return;const route=useGarden.getState().data?.routes.find(r=>r.id===tour.routeId);if(!route)return;
  if(!started.current){dwell.current+=Math.min(dt,1);if(dwell.current<5)return;if(tour.index>=route.orderedStops.length-1){useGarden.setState({tourState:{...tour,status:'paused'}});return}controller.current=new GuidedTourController(manifest,route.orderedStops[tour.index],route.orderedStops[tour.index+1]);started.current=true;useGarden.setState({panelOpen:false})}
  const state=controller.current?.tick(Math.min(dt,.5));if(state){const {position,lookAhead,done}=state;const target:Vec3=[lookAhead[0],lookAhead[1]+2.4,lookAhead[2]];if(!done)controls.current.setLookAt(position[0],position[1]+8,position[2]+.15,...target,false);else useGarden.getState().tourStep(tour.index+1)}
 });
 return <CameraControls ref={controls} makeDefault minDistance={hotspot?.endsWith('-study')?2.5:8} maxDistance={540} minPolarAngle={.12} maxPolarAngle={Math.PI/2.15} smoothTime={.65} draggingSmoothTime={.12} onControlStart={()=>{if(useGarden.getState().tourState.status==='playing')useGarden.setState({tourState:{...useGarden.getState().tourState,status:'paused'}})}}/>;
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
 {state.labels&&(!state.selectedPlaceId||chosen)&&(related||chosen||(!focused&&(p.featured||['daguanyuan_gate','ouxiangxie'].includes(p.id))))&&<GardenLabel place={p} index={i} chosen={chosen} related={related}/>}
 {chosen&&p.hotspots.map((h,j)=><Html key={h.id} position={h.position} center zIndexRange={[13,0]} occlude={false}><button className="hotspot" aria-label={h.name} aria-pressed={state.hotspotId===h.id} onClick={()=>useGarden.setState({hotspotId:h.id,panelOpen:true,cutaway:false})}>{j+1}</button></Html>)}
 </group>})}
 <group visible={camera.position.y>0}/>
 </>;
}
function Metrics(){const {gl,scene,camera}=useThree();const samples=useRef<number[]>([]);useFrame((_,dt)=>{if(import.meta.env.MODE!=='test')return;samples.current.push(dt*1000);if(samples.current.length>360)samples.current.shift();(window as any).__gardenMetrics={frames:samples.current,drawCalls:gl.info.render.calls,triangles:gl.info.render.triangles,geometries:gl.info.memory.geometries,textures:gl.info.memory.textures,dpr:gl.getPixelRatio(),renderer:gl.getContext().getParameter(gl.getContext().RENDERER)};(window as any).__gardenTest={state:()=>useGarden.getState(),project:(id:string)=>{const p=useGarden.getState().data!.manifest.places.find(p=>p.id===id)!;const vec=new THREE.Vector3(...p.position);vec.y+=3;vec.project(camera);return {x:(vec.x+1)/2*gl.domElement.clientWidth,y:(1-vec.y)/2*gl.domElement.clientHeight}},scene}});return null}
function World({manifest}:{manifest:Manifest}){
 const {gl,invalidate}=useThree();const loaded=useGarden(s=>s.loaded);
 const [overviewReady,setOverviewReady]=useStableState(false),[treesReady,setTreesReady]=useStableState(false),[groundReady,setGroundReady]=useStableState(false);
 useEffect(()=>{if(overviewReady&&treesReady&&groundReady)useGarden.setState({loaded:true})},[overviewReady,treesReady,groundReady]);
 const hotspot=useGarden(s=>s.hotspotId);
 const selected=useGarden(s=>s.selectedPlaceId);const [detailId,setDetailId]=useStableState<string|null>(null);const quality=useGarden(s=>s.qualityLevel);const place=manifest.places.find(p=>p.id===selected);const modelManifest=useMemo(()=>quality==='low'?{...manifest,overview:'models/overview-low.glb'}:manifest,[quality,manifest]);
 useEffect(()=>{const canvas=gl.domElement.closest<HTMLElement>('.canvas-wrap');if(canvas)canvas.dataset.detailReady=detailId??''},[gl,detailId]);
 useEffect(()=>{gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true;invalidate()},[gl,invalidate,selected,quality,detailId,loaded,hotspot]);
 return <><Atmosphere/>
 <ModelBoundary key={modelManifest.overview} onRetry={()=>{useGLTF.clear(base+modelManifest.overview);useTexture.clear(base+'textures/landscape-light.webp');useTexture.clear(base+'textures/ground/soil.jpg');useTexture.clear(base+'textures/ground/surface-zones.png')}}><Suspense fallback={null}><Overview manifest={modelManifest} detailId={detailId} onReady={setOverviewReady}/></Suspense></ModelBoundary>
 {place&&<ModelBoundary key={place.id+quality} label={place.name} onRetry={()=>useGLTF.clear(base+(quality==='low'&&place.mobileModel?place.mobileModel:place.model))}><Suspense fallback={null}><Detail place={place} low={quality==='low'} onReady={setDetailId}/></Suspense></ModelBoundary>}
 <ModelBoundary label="树影" onRetry={()=>{useTexture.clear(base+'textures/vegetation/canopy-atlas.webp');for(const name of ['broadleaf','broadleaf-low','broadleaf-2','pine','shrub'])useGLTF.clear(base+'models/vegetation/'+name+'.glb')}}><Suspense fallback={null}><LivingTrees manifest={manifest} onReady={setTreesReady}/></Suspense></ModelBoundary><ModelBoundary label="岸边草木" onRetry={()=>useGLTF.clear(base+'models/vegetation/ground-cover.glb')}><Suspense fallback={null}><GroundCover manifest={manifest} onReady={setGroundReady}/></Suspense></ModelBoundary><ModelBoundary label="竹下草木" onRetry={()=>{for(const i of [0,1])useGLTF.clear(base+`models/vegetation/fern-${i}.glb`)}}><Suspense fallback={null}>{(quality==='high'||selected)&&<Understory manifest={manifest}/>}</Suspense></ModelBoundary><GardenWater manifest={manifest}/><GardenLights manifest={manifest}/><Markers manifest={manifest}/><CameraManager manifest={manifest}/><Metrics/>
 <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.35,0]} receiveShadow><planeGeometry args={[1600,1600]}/><meshStandardMaterial color="#4f6343" roughness={1}/></mesh>
 </>;
}
import {useState as useStableState} from 'react';
function Loading(){const {progress,active}=useProgress();const loaded=useGarden(s=>s.loaded);return active&&!loaded?<div className="loading" role="status"><div className="loading-seal">园</div><h2>山水渐入眼前</h2><p>正在展开园林 · {Math.round(progress)}%</p><progress max={100} value={progress}/></div>:null}
export default function GardenScene({manifest}:{manifest:Manifest}){const loaded=useGarden(s=>s.loaded);const quality=useGarden(s=>s.qualityLevel);const motion=useGarden(s=>s.motion);const selected=useGarden(s=>s.selectedPlaceId),closeView=useGarden(s=>s.closeView),hotspot=useGarden(s=>s.hotspotId);const playing=useGarden(s=>s.tourState.status==='playing');const webgl=useMemo(()=>{try{return !!document.createElement('canvas').getContext('webgl2')}catch{return false}},[]);if(!webgl)return <div className="fallback"><h2>当前设备无法显示三维园景</h2><p>仍可通过地点、人物与回目索引阅读全部资料。</p></div>;
 return <div className="canvas-wrap" data-testid="garden-canvas" data-scene-ready={loaded} aria-busy={!loaded}><Canvas frameloop={playing||(motion&&quality==='high')?'always':'demand'} camera={{position:manifest.overviewCamera.position,fov:43,near:.65,far:1600}} dpr={quality==='high'?[1,1.5]:1} shadows={quality==='high'} gl={{antialias:true,alpha:false,powerPreference:'high-performance',toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.0}}><World manifest={manifest}/></Canvas>{selected&&!hotspot&&<button className="court-framing" onClick={()=>useGarden.setState({closeView:!closeView})}>{closeView?'看全院':'拉近院景'}</button>}<Loading/></div>;
}

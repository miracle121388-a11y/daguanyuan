import {useEffect, useMemo, useRef, useState} from 'react';
import {Html, Line} from '@react-three/drei';
import {useFrame, useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {agentIds, type AgentId} from '../simulation/types';
import {displayedWorld, useSimulation} from '../simulation/store';
import {agentColors, currentWorld} from '../simulation/world';
import {commandDuration, prepareRoute, routePoint, turnToward} from '../simulation/presentation';
import {useGarden} from '../state/store';
import GardenCharacter from './GardenCharacter';

const actionLabels: Record<string, string> = {read: '读书', write: '写字', rest: '歇息', observe: '观望', wait: '等候', move: '行走', talk: '交谈'};

function Figure({id, motion}: {id: AgentId; motion: boolean}) {
  const group = useRef<THREE.Group>(null), label = useRef<HTMLButtonElement>(null);
  const state = useSimulation(), world = state.preview ?? (state.journal ? currentWorld(state.journal) : null);
  const actor = world?.agents[id];
  const active = state.playback?.command.action.agent === id ? state.playback : null;
  const route = useMemo(() => prepareRoute(active?.command.path ?? []), [active]);
  const elapsed = useRef(0), completed = useRef(false), lastProgress = useRef(-1);
  const attention = useRef(new THREE.Vector3());
  useEffect(() => {elapsed.current = 0; completed.current = false; lastProgress.current = -1;}, [active?.id]);
  useEffect(() => {if (actor && group.current) group.current.position.fromArray(actor.position);}, [actor?.position[0], actor?.position[1], actor?.position[2], state.sceneRevision]);
  const conversing = state.phase === 'conversing' && state.actor === id;
  const pose = conversing ? 'talk' : active?.command.action.action ?? (actor?.currentAction?.action === 'move' ? 'observe' : actor?.currentAction?.action ?? 'observe');
  useFrame(({camera}, delta) => {
    if (!group.current || !actor) return;
    if (label.current) label.current.style.visibility = state.focused === id || camera.position.distanceTo(group.current.position) < 30 ? 'visible' : 'hidden';
    if (state.paused || document.hidden) return;
    const g = group.current;
    const face = (point: THREE.Vector3 | number[]) => {
      const target = Array.isArray(point) ? new THREE.Vector3(...point) : point;
      const angle = Math.atan2(target.x - g.position.x, target.z - g.position.z);
      g.rotation.y = motion ? turnToward(g.rotation.y, angle, delta) : angle;
    };
    const talking = state.playback?.command;
    if (talking?.action.action === 'talk' && talking.action.target === id) {
      const speaker = displayedWorld()?.agents[talking.action.agent];
      if (speaker) face(speaker.position);
    }
    if (conversing) face(camera.position);
    if (!active || completed.current) return;
    elapsed.current += Math.min(delta, .1) * state.playbackRate;
    const progress = Math.min(1, elapsed.current / commandDuration(active.command, route.length));
    const step = Math.floor(progress * 10);
    if (step !== lastProgress.current) {lastProgress.current = step; useSimulation.setState({playbackProgress: progress});}
    if (route.length > .01) {
      const distance = route.length * (progress * progress * (3 - 2 * progress));
      const point = routePoint(route, distance), ahead = routePoint(route, Math.min(route.length, distance + .6));
      g.position.fromArray(point);
      if (distance < route.length - .01) face(ahead);
    } else if (active.command.face) face(active.command.face);
    else if (['read','write','rest'].includes(active.command.action.action)) {
      // Pick a presentation-facing direction once, then keep it while the
      // visitor orbits. Dialogue still faces its actual conversation partner.
      if (elapsed.current < .35 * state.playbackRate || attention.current.lengthSq() === 0) attention.current.copy(camera.position);
      face(attention.current);
    }
    if (progress >= 1) {completed.current = true; active.done();}
  });
  if (!actor || !actor.alive) return null;
  return <group ref={group} name={`simulation-${id}`} userData={{simulationAgent: id}}>
    <group onClick={e => {e.stopPropagation(); state.inspect(id);}}>
      <GardenCharacter id={id} pose={pose} paused={state.paused} motion={motion} rate={state.playbackRate} calm={actor.mood.calm} tea={world?.gathering?.kind==='tea' && world.gathering.participants.includes(id) && world.gathering.status!=='cancelled' && actor.location===world.gathering.place && actor.spot==='court'}/>
    </group>
    {state.focused === id && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0,.035,0]}><ringGeometry args={[.43,.455,48]}/><meshBasicMaterial color="#F2E9D8" transparent opacity={.65} side={THREE.DoubleSide} depthWrite={false}/></mesh>}
    <Html position={[0,2.16,0]} center zIndexRange={[15,1]}><button ref={label} className="sim-person-label" data-agent={id} data-nearby={agentIds.some(other => other !== id && world?.agents[other].location === actor.location)} aria-pressed={state.focused === id} onClick={() => state.inspect(id)}><i style={{background:agentColors[id]}}/>{actor.name}<small>{active ? actionLabels[active.command.action.action] : ''}</small></button></Html>
  </group>;
}

function FollowCamera({motion}: {motion: boolean}) {
  const {controls,camera,invalidate,size} = useThree(), state = useSimulation();
  const initialized = useRef(false), previous = useRef<THREE.Vector3 | null>(null), cancelled = useRef(false);
  const offset = useRef(new THREE.Vector3()), target = useRef(new THREE.Vector3());
  const framing = useRef(.75);
  useEffect(() => {initialized.current=false; cancelled.current=false; previous.current=null; invalidate();}, [state.focused,state.cameraMode,state.focusRevision,state.sceneRevision,size.width,size.height,invalidate]);
  useEffect(() => {
    const c=controls as unknown as {addEventListener?: (name:string,fn:()=>void)=>void;removeEventListener?: (name:string,fn:()=>void)=>void};
    const release=()=>{cancelled.current=true;};
    c?.addEventListener?.('controlstart',release);
    return()=>c?.removeEventListener?.('controlstart',release);
  },[controls]);
  useFrame(({scene})=>{
    if(!state.focused||!controls||cancelled.current)return;
    const object=scene.getObjectByName(`simulation-${state.focused}`);
    if(!object)return;
    const position=object.position;
    const c=controls as unknown as {setLookAt:(x:number,y:number,z:number,tx:number,ty:number,tz:number,smooth:boolean)=>void};
    if(!initialized.current){
      if(camera instanceof THREE.PerspectiveCamera){camera.fov=42;camera.updateProjectionMatrix();}
      if(state.cameraMode==='close')offset.current.set(2.35,2.0,4.2);else offset.current.set(6,6.5,9);
      const compact = size.width <= 600;
      framing.current = compact && size.height >= 530 ? .6 : size.height < 530 ? 1.05 : .75;
      if(compact && size.height >= 530 && state.cameraMode==='close')offset.current.multiplyScalar(1.18);
      if(size.width<=900&&size.height<530)offset.current.multiplyScalar(state.cameraMode==='close'?.9:Math.max(.45,size.height/650));
      target.current.copy(position).add(new THREE.Vector3(0,framing.current,0));
      const destination = position.clone().add(offset.current);
      // Distant courts use a cut: a long flight would pass through walls and
      // leave the next performer outside the frame for most of their action.
      c.setLookAt(destination.x,destination.y,destination.z,target.current.x,target.current.y,target.current.z,motion && camera.position.distanceTo(destination)<24);
      previous.current=position.clone();initialized.current=true;
    }else if(previous.current&&previous.current.distanceTo(position)>.005){
      c.setLookAt(position.x+offset.current.x,position.y+offset.current.y,position.z+offset.current.z,position.x,position.y+framing.current,position.z,false);
      previous.current.copy(position);
    }
  });
  return null;
}

export default function SimulationActors(){
  const state=useSimulation(),loaded=useGarden(s=>s.loaded),gardenMotion=useGarden(s=>s.motion),root=useThree(),{invalidate,gl}=root;
  const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const motion=gardenMotion&&!reduced;
  useEffect(()=>{const mq=window.matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(mq.matches);mq.addEventListener('change',change);return()=>mq.removeEventListener('change',change);},[]);
  useEffect(()=>{useSimulation.setState({sceneReady:loaded});return()=>{useSimulation.getState().cancel();useSimulation.setState({sceneReady:false});};},[loaded]);
  useEffect(()=>{invalidate();},[state.preview,state.playback,state.focusRevision,state.sceneRevision,state.paused,invalidate]);
  useEffect(()=>{
    if(!state.open||!motion)return;
    const timer=setInterval(()=>{if(!document.hidden&&!useSimulation.getState().paused)invalidate();},50);
    return()=>clearInterval(timer);
  },[state.open,motion,invalidate]);
  useFrame(({scene})=>{
    if(state.playback&&!state.paused&&!document.hidden){gl.shadowMap.needsUpdate=true;invalidate();}
    if(import.meta.env.MODE==='test')(window as any).__simulationTest={
      state:()=>useSimulation.getState(),world:displayedWorld,
      positions:()=>Object.fromEntries(agentIds.map(id=>[id,scene.getObjectByName(`simulation-${id}`)?.position.toArray()])),
      poses:()=>Object.fromEntries(agentIds.map(id=>[id,['head','leftArm','rightArm','leftLeg','rightLeg'].map(part=>scene.getObjectByName(`${id}_${part}`)?.rotation.toArray())])),
      renderState:()=>({frameloop:root.frameloop,active:root.internal.active,priority:root.internal.priority,frames:root.internal.frames,subscribers:root.internal.subscribers.length,lost:gl.getContext().isContextLost()}),
    };
  });
  const path=state.playback?.command.path;
  if(!state.open||!state.journal)return null;
  return <>{agentIds.map(id=><Figure key={id} id={id} motion={motion}/>)}{path&&path.length>1&&<Line points={path.map(p=>[p[0],p[1]+.04,p[2]])} lineWidth={1.3} color="#E3D5B6" transparent opacity={.42}/>}<FollowCamera motion={motion}/></>;
}

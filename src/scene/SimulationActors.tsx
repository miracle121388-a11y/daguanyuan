import {useEffect, useMemo, useRef} from 'react';
import {Html, Line} from '@react-three/drei';
import {useFrame, useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {agentIds, type AgentId} from '../simulation/types';
import {displayedWorld, useSimulation} from '../simulation/store';
import {agentColors, currentWorld} from '../simulation/world';
import {useGarden} from '../state/store';

const actionLabels: Record<string, string> = {read: '读书', write: '写字', rest: '歇息', observe: '观望', wait: '等候', move: '行走', talk: '交谈'};

/** One shared code-native figurine rig. The incumbent project has no character
 * meshes. These staged figures use its existing road graph, never new maps. */
function Figure({id}: {id: AgentId}) {
  const group = useRef<THREE.Group>(null), body = useRef<THREE.Group>(null), arm = useRef<THREE.Group>(null), book = useRef<THREE.Group>(null);
  const state = useSimulation(), world = state.preview ?? (state.journal ? currentWorld(state.journal) : null);
  const actor = world?.agents[id];
  const active = state.playback?.command.action.agent === id ? state.playback : null;
  const curve = useMemo(() => active && active.command.path.length > 1 ? new THREE.CurvePath<THREE.Vector3>() : null, [active]);
  const distance = useRef(0);
  useEffect(() => {
    distance.current = 0;
    if (curve && active) {
      const points = active.command.path.map(p => new THREE.Vector3(...p));
      for (let i = 1; i < points.length; i++) curve.add(new THREE.LineCurve3(points[i - 1], points[i]));
    }
  }, [curve, active]);
  useEffect(() => {
    if (actor && group.current) group.current.position.fromArray(actor.position);
  }, [actor?.position[0], actor?.position[1], actor?.position[2], state.sceneRevision]);
  useFrame(({camera}, delta) => {
    if (!group.current || !actor) return;
    if (state.paused || document.hidden) return;
    const talking = state.playback?.command;
    if (talking?.action.action === 'talk' && talking.action.target === id) {
      const speaker = displayedWorld()?.agents[talking.action.agent];
      if (speaker) group.current.rotation.y = Math.atan2(speaker.position[0] - group.current.position.x, speaker.position[2] - group.current.position.z);
    }
    const conversing = state.phase === 'conversing' && state.actor === id;
    if (conversing) group.current.rotation.y = Math.atan2(camera.position.x - group.current.position.x, camera.position.z - group.current.position.z);
    const pose = conversing ? 'talk' : active?.command.action.action ?? actor.currentAction?.action;
    if (body.current) { body.current.position.y = pose === 'rest' ? -.3 : 0; body.current.scale.y = pose === 'rest' ? .82 : 1; }
    if (arm.current) arm.current.rotation.x = pose === 'read' || pose === 'write' ? -.95 : pose === 'talk' ? -.5 : 0;
    if (book.current) book.current.visible = pose === 'read' || pose === 'write';
    if (!active) return;
    distance.current += Math.min(delta, .25) * state.playbackRate;
    if (curve && curve.curves.length) {
      const total = curve.getLength(), traveled = Math.min(total, distance.current * (total < 26 ? 4 : 28));
      const point = curve.getPoint(traveled / total), ahead = curve.getPoint(Math.min(1, (traveled + .8) / total));
      group.current.position.copy(point);
      if (point.distanceTo(ahead) > .01) group.current.rotation.y = Math.atan2(ahead.x - point.x, ahead.z - point.z);
      if (body.current && useGarden.getState().motion) body.current.position.y = Math.sin(distance.current * 12) * .08;
      if (arm.current) arm.current.rotation.x = Math.sin(distance.current * 9) * .22;
      if (traveled >= total) active.done();
    } else {
      if (active.command.face) {
        const face = active.command.face;
        group.current.rotation.y = Math.atan2(face[0] - group.current.position.x, face[2] - group.current.position.z);
      }
      if (arm.current && pose === 'write' && useGarden.getState().motion) arm.current.rotation.x += Math.sin(distance.current * 5) * .08;
      if (distance.current > (active.command.action.action === 'talk' ? 3 : 1.4)) active.done();
    }
  });
  if (!actor || !actor.alive) return null;
  return <group ref={group} name={`simulation-${id}`} userData={{simulationAgent: id}}>
    <group ref={body} onClick={e => { e.stopPropagation(); state.inspect(id); }}>
      <mesh position={[0, .65, 0]}><cylinderGeometry args={[.24, .43, 1.2, 10]}/><meshStandardMaterial color={agentColors[id]} roughness={.92}/></mesh>
      <mesh position={[0, 1.43, 0]}><sphereGeometry args={[.23, 12, 10]}/><meshStandardMaterial color="#d8b68d" roughness={.9}/></mesh>
      <mesh position={[0, 1.55, -.045]}><sphereGeometry args={[.23, 12, 8, 0, Math.PI * 2, 0, Math.PI * .62]}/><meshStandardMaterial color="#272822"/></mesh>
      <mesh position={[0, 1.8, -.08]}><sphereGeometry args={[id === 'baoyu' ? .12 : .15, 8, 8]}/><meshStandardMaterial color={id === 'baoyu' ? '#a07938' : '#272822'}/></mesh>
      <mesh position={[0, .96, 0]}><cylinderGeometry args={[.29, .29, .09, 10]}/><meshStandardMaterial color="#c4a167"/></mesh>
      <group ref={arm} position={[0, 1.08, 0]}>{[-1, 1].map(side => <mesh key={side} position={[side * .3, -.14, 0]} rotation={[0, 0, side * .22]}><capsuleGeometry args={[.11, .3, 4, 6]}/><meshStandardMaterial color={agentColors[id]}/></mesh>)}</group>
      <group ref={book} visible={false} position={[0, 1.05, .39]} rotation={[-.5, 0, 0]}><mesh><boxGeometry args={[.52, .045, .32]}/><meshStandardMaterial color="#ece0b9" roughness={1}/></mesh><mesh position={[0, .027, 0]}><boxGeometry args={[.018, .012, .3]}/><meshStandardMaterial color="#766743"/></mesh></group>
    </group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .06, 0]}><ringGeometry args={[.5, .61, 24]}/><meshBasicMaterial color={agentColors[id]} side={THREE.DoubleSide}/></mesh>
    <Html position={[0, 2.3, 0]} center zIndexRange={[15, 1]}><button className="sim-person-label" data-agent={id} data-nearby={agentIds.some(other => other !== id && world?.agents[other].location === actor.location)} aria-pressed={state.focused === id} onClick={() => state.inspect(id)}>{actor.name}<small>{active ? actionLabels[active.command.action.action] : ''}</small></button></Html>
    {active?.command.action.action === 'talk' && <Html position={[0, 4.2, 0]} center zIndexRange={[16, 2]}><div className="sim-speech" role="status">{active.command.action.content}</div></Html>}
  </group>;
}

function FollowCamera() {
  const {controls, camera, invalidate, size} = useThree(), state = useSimulation();
  const offset = useRef(new THREE.Vector3(15, 16, 22)), initialized = useRef(false);
  const previous = useRef<THREE.Vector3 | null>(null);
  const cancelled = useRef(false);
  useEffect(() => { initialized.current = false; cancelled.current = false; previous.current = null; invalidate(); }, [state.focused, state.cameraMode, state.focusRevision, state.sceneRevision, size.width, size.height, invalidate]);
  useEffect(() => {
    const c = controls as unknown as {addEventListener?: (name: string, fn: () => void) => void; removeEventListener?: (name: string, fn: () => void) => void};
    const release = () => { cancelled.current = true; };
    c?.addEventListener?.('controlstart', release);
    return () => c?.removeEventListener?.('controlstart', release);
  }, [controls]);
  useFrame(({scene}) => {
    if (!state.focused || !controls || cancelled.current) return;
    const object = scene.getObjectByName(`simulation-${state.focused}`);
    if (!object) return;
    const position = object.position.clone();
    const c = controls as unknown as {setLookAt: (x: number, y: number, z: number, tx: number, ty: number, tz: number, smooth: boolean) => void};
    if (!initialized.current) {
      if (camera instanceof THREE.PerspectiveCamera) { camera.fov = 48; camera.updateProjectionMatrix(); }
      if (state.cameraMode === 'close') offset.current.set(3.6, 3.5, 6.2); else offset.current.set(15, 16, 22);
      // Keep the figure readable when the mobile memory sheet reduces the
      // actual canvas height. Desktop composition retains its original offset.
      if (state.cameraMode === 'follow' && size.width <= 900 && size.height < 600) offset.current.multiplyScalar(Math.min(.8, Math.max(.36, size.height / 520)));
      initialized.current = true;
    }
    if (!previous.current || previous.current.distanceTo(position) > .005) {
      c.setLookAt(position.x + offset.current.x, position.y + offset.current.y, position.z + offset.current.z, position.x, position.y + 1, position.z, false);
      previous.current = position;
    }
  });
  return null;
}

export default function SimulationActors() {
  const state = useSimulation(), loaded = useGarden(s => s.loaded), root = useThree(), {invalidate, gl} = root;
  useEffect(() => {
    useSimulation.setState({sceneReady: loaded});
    return () => { useSimulation.getState().cancel(); useSimulation.setState({sceneReady: false}); };
  }, [loaded]);
  useEffect(() => { invalidate(); }, [state.preview, state.playback, state.focusRevision, state.sceneRevision, state.paused, invalidate]);
  useFrame(({scene}) => {
    if (state.playback && !state.paused && !document.hidden) { gl.shadowMap.needsUpdate = true; invalidate(); }
    if (import.meta.env.MODE === 'test') (window as any).__simulationTest = {
      state: () => useSimulation.getState(), world: displayedWorld,
      positions: () => Object.fromEntries(agentIds.map(id => [id, scene.getObjectByName(`simulation-${id}`)?.position.toArray()])),
      renderState: () => ({frameloop: root.frameloop, active: root.internal.active, priority: root.internal.priority, frames: root.internal.frames, subscribers: root.internal.subscribers.length, lost: gl.getContext().isContextLost()}),
    };
  });
  const path = state.playback?.command.path;
  if (!state.open || !state.journal) return null;
  return <>{agentIds.map(id => <Figure key={id} id={id}/>)}{path && path.length > 1 && <Line points={path.map(p => [p[0], p[1] + .13, p[2]])} lineWidth={2} color={agentColors[state.playback!.command.action.agent]} transparent opacity={.65}/>}<FollowCamera/></>;
}

import {Component, Suspense, useDeferredValue, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {Html, useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/examples/jsm/utils/SkeletonUtils.js';
import type {AgentId} from '../simulation/types';
import {agentColors} from '../simulation/world';
import {useGarden} from '../state/store';
import {useSimulation} from '../simulation/store';
import {characterAsset, characterDetail, facePerformance, type CharacterDetail} from './characterPresentation';

import {applyHandPose} from './characterHands';

type Props = {id: AgentId; pose: string; paused: boolean; motion: boolean; rate: number};

function PaintedFigure({id, pose, paused, motion, rate, detail,onLoaded}: Props & {detail: CharacterDetail;onLoaded:()=>void}) {
  const {scene} = useGLTF(characterAsset(id, detail, import.meta.env.BASE_URL), `${import.meta.env.BASE_URL}draco/`);
  const model = useMemo(() => cloneSkeleton(scene), [scene]);
  const clock = useRef(0);
  const rig = useMemo(() => {
    const parts = Object.fromEntries(['body','head','eyes','skirt','leftArm','rightArm','leftForearm','rightForearm','leftHand','rightHand','leftLeg','rightLeg','book','brush'].map(part => [part, model.getObjectByName(`${id}_${part}`)!]));
    // Retire unsupported prop poses before the first rendered frame.
    parts.book.visible = false;
    parts.brush.visible = false;
    return parts;
  }, [id, model]);
  const expressions = useMemo(() => ['face','lashes'].map(part => model.getObjectByName(`${id}_${part}`) as THREE.Mesh), [id, model]);
  const clothJoints = useMemo(() => ['leftArm','rightArm','leftForearm','rightForearm'].map(part => ({bone:model.getObjectByName(`${id}_cloth_${part}`),driver:rig[part]})), [id, model, rig]);
  const initialized = useRef<THREE.Object3D | null>(null);
  useEffect(() => {
    model.traverse(object => {if (object instanceof THREE.Mesh) {object.castShadow = true; object.receiveShadow = true; if (object instanceof THREE.SkinnedMesh || object.morphTargetInfluences) object.frustumCulled = false;}});
    onLoaded();
  }, [model, rig,onLoaded]);
  const updatePose = useCallback((delta: number, immediate = false) => {
    clock.current += Math.min(delta, .1) * rate;
    const t = motion ? clock.current : 0, walking = pose === 'move';
    const stride = walking && motion ? Math.sin(t * 8) : 0;
    const speaking = pose === 'talk';
    const acting = facePerformance(t, ['baoyu','daiyu','baochai','wangxifeng'].indexOf(id), pose, motion);
    for (const mesh of expressions) {
      if (!mesh?.morphTargetDictionary || !mesh.morphTargetInfluences) continue;
      for (const [name, value] of Object.entries(acting)) {
        const index = mesh.morphTargetDictionary[name];
        if (index !== undefined) mesh.morphTargetInfluences[index] = value;
      }
    }
    const blend = (object: THREE.Object3D, axis: 'x' | 'y' | 'z', value: number) => {object.rotation[axis] = motion && !immediate ? THREE.MathUtils.damp(object.rotation[axis], value, 10, delta) : value;};
    rig.body.position.y = 0;
    blend(rig.body, 'z', walking ? stride * .004 : 0);
    blend(rig.skirt, 'x', walking ? stride * .006 : 0);
    blend(rig.head, 'x', speaking ? Math.sin(t * 2.4) * .012 : 0);
    blend(rig.head, 'y', pose === 'observe' ? Math.sin(t * .35) * .08 : 0);
    const stepPitch = stride * .08;
    blend(rig.leftLeg, 'x', stepPitch);
    blend(rig.rightLeg, 'x', -stepPitch);
    applyHandPose(rig, pose, t, motion, delta, immediate);
    for (const {bone,driver} of clothJoints) bone?.quaternion.copy(driver.quaternion);
  }, [rig, expressions, clothJoints, rate, motion, pose, id]);
  useLayoutEffect(() => {
    // A newly loaded LOD (including a paused story) must never show its bind pose.
    if (initialized.current === model && !paused) return;
    updatePose(0, true);
    initialized.current = model;
  }, [model, paused, updatePose]);
  useFrame((_state, delta) => {
    if (!paused && !document.hidden) updatePose(delta);
  }, -3);
  return <primitive object={model} dispose={null}/>;
}

function Silhouette({id}: {id: AgentId}) {
  return <group><mesh position={[0,.65,0]}><capsuleGeometry args={[.22,.8,5,10]}/><meshStandardMaterial color={agentColors[id]}/></mesh><mesh position={[0,1.45,0]}><sphereGeometry args={[.17,12,8]}/><meshStandardMaterial color="#EDC4A7"/></mesh></group>;
}
class CharacterBoundary extends Component<{id: AgentId; detail: CharacterDetail; children: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() {return {failed: true};}
  render() {return this.state.failed ? <><Silhouette id={this.props.id}/><Html position={[0,1.05,0]} center><button className="sim-character-retry" onClick={() => {useGLTF.clear(characterAsset(this.props.id, this.props.detail, import.meta.env.BASE_URL));this.setState({failed:false});}}>人物暂未载入 · 重试</button></Html></> : this.props.children;}
}
export default function GardenCharacter(props: Props) {
  const quality = useGarden(s => s.qualityLevel), focused = useSimulation(s => s.focused === props.id), camera = useSimulation(s => s.cameraMode);
  const open=useSimulation(s=>s.open),[baseReady,setBaseReady]=useState(false);
  const ready=useMemo(()=>()=>setBaseReady(true),[]);
  const detail = useDeferredValue(baseReady&&open?characterDetail(focused, quality, camera):'low');
  // Keep the incumbent model rendered while the new LOD suspends. A boundary
  // keyed by detail discarded it immediately and flashed a loading silhouette.
  return <CharacterBoundary key={props.id} id={props.id} detail={detail}><Suspense fallback={<Silhouette id={props.id}/>}><PaintedFigure {...props} detail={detail} onLoaded={ready}/></Suspense></CharacterBoundary>;
}

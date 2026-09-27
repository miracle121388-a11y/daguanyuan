import {Component, Suspense, useEffect, useMemo, useRef, type ReactNode} from 'react';
import {Html, useGLTF} from '@react-three/drei';
import {createPortal, useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/examples/jsm/utils/SkeletonUtils.js';
import type {AgentId} from '../simulation/types';
import {agentColors} from '../simulation/world';
import {useGarden} from '../state/store';
import {useSimulation} from '../simulation/store';
import {characterAsset, characterDetail, facePerformance, type CharacterDetail} from './characterPresentation';

type Props = {id: AgentId; pose: string; paused: boolean; motion: boolean; rate: number; calm: number; tea: boolean};

function PaintedFigure({id, pose, paused, motion, rate, calm, tea, detail}: Props & {detail: CharacterDetail}) {
  const {scene} = useGLTF(characterAsset(id, detail, import.meta.env.BASE_URL), `${import.meta.env.BASE_URL}draco/`);
  const model = useMemo(() => cloneSkeleton(scene), [scene]);
  const clock = useRef(0);
  const rig = useMemo(() => Object.fromEntries(['body','head','eyes','skirt','leftArm','rightArm','leftForearm','rightForearm','leftLeg','rightLeg','book','brush'].map(part => [part, model.getObjectByName(`${id}_${part}`)!])), [id, model]);
  const expressions = useMemo(() => ['face','lashes','leftHand','rightHand'].map(part => model.getObjectByName(`${id}_${part}`) as THREE.Mesh), [id, model]);
  const clothJoints = useMemo(() => ['leftArm','rightArm','leftForearm','rightForearm'].map(part => ({bone:model.getObjectByName(`${id}_cloth_${part}`),driver:rig[part]})), [id, model, rig]);
  useEffect(() => {
    model.traverse(object => {if (object instanceof THREE.Mesh) {object.castShadow = true; object.receiveShadow = true;}});
    rig.book.visible = false; rig.brush.visible = false;
  }, [model, rig]);
  useFrame((_state, delta) => {
    if (paused || document.hidden) return;
    clock.current += Math.min(delta, .1) * rate;
    const t = motion ? clock.current : 0, walking = pose === 'move';
    const stride = walking && motion ? Math.sin(t * 8) : 0;
    const reading = pose === 'read' || pose === 'write', speaking = pose === 'talk';
    const acting = facePerformance(t, ['baoyu','daiyu','baochai','wangxifeng'].indexOf(id), pose, motion, tea);
    for (const mesh of expressions) {
      if (!mesh?.morphTargetDictionary || !mesh.morphTargetInfluences) continue;
      for (const [name, value] of Object.entries(acting)) {
        const index = mesh.morphTargetDictionary[name];
        if (index !== undefined) mesh.morphTargetInfluences[index] = value;
      }
    }
    const blend = (object: THREE.Object3D, axis: 'x' | 'y' | 'z', value: number) => {object.rotation[axis] = motion ? THREE.MathUtils.damp(object.rotation[axis], value, 10, delta) : value;};
    rig.body.position.y = walking ? Math.abs(stride) * .018 : Math.sin(t * 1.8) * .003;
    blend(rig.body, 'z', walking ? stride * .018 : 0);
    blend(rig.skirt, 'x', walking ? stride * .023 : 0);
    blend(rig.head, 'x', reading ? .19 : calm < 45 ? .09 : speaking ? Math.sin(t * 2.4) * .035 : 0);
    blend(rig.head, 'y', pose === 'observe' ? Math.sin(t * .6) * .25 : speaking ? Math.sin(t) * .065 : 0);
    blend(rig.leftLeg, 'x', stride * .34);
    blend(rig.rightLeg, 'x', -stride * .34);
    blend(rig.leftArm, 'x', reading ? -.48 : speaking ? -.22 : -stride * .24);
    blend(rig.rightArm, 'x', reading ? -.48 : speaking ? -.55 + Math.sin(t * 2) * .12 : stride * .24);
    blend(rig.leftArm, 'z', reading ? .14 : -.12);
    blend(rig.rightArm, 'z', reading ? -.14 : speaking ? .24 : .12);
    blend(rig.leftForearm, 'x', reading ? -.7 : pose === 'rest' ? -.5 : -.08);
    blend(rig.rightForearm, 'x', reading ? -.7 + (pose === 'write' ? Math.sin(t * 5) * .08 : 0) : speaking ? -.4 : pose === 'rest' ? -.5 : -.08);
    for (const {bone,driver} of clothJoints) bone?.quaternion.copy(driver.quaternion);
    rig.book.visible = reading;
    rig.brush.visible = pose === 'write';
    rig.brush.rotation.z = pose === 'write' ? Math.sin(t * 5) * .09 : 0;
    rig.brush.position.x = .01 + (pose === 'write' ? Math.sin(t * 3) * .005 : 0);
  });
  return <><primitive object={model} dispose={null}/>{tea && pose === 'rest' && createPortal(<TeaCup id={id} forearm={rig.rightForearm}/>, rig.rightForearm)}</>;
}

/** A porcelain cup belongs to the hand, and only appears during actual tea rest. */
function TeaCup({id, forearm}: {id: AgentId; forearm: THREE.Object3D}) {
  const cup = useRef<THREE.Group>(null);
  const orientation = useMemo(() => new THREE.Quaternion(), []);
  const contour = useMemo(() => [[.019,0],[.022,.01],[.033,.03],[.048,.07],[.048,.077],[.043,.077],[.041,.069],[.028,.031],[.019,.022]].map(([x,y])=>new THREE.Vector2(x,y)), []);
  useFrame(() => {
    if (!cup.current) return;
    forearm.getWorldQuaternion(orientation);
    cup.current.quaternion.copy(orientation).invert();
  });
  return <group ref={cup} name={`${id}_teaCup`} position={[0,Number(forearm.userData.handAnchorY??-.32),.07]}>
    <mesh castShadow><latheGeometry args={[contour,16]}/><meshStandardMaterial color="#E5E8D5" roughness={.34} side={THREE.DoubleSide}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.062,0]}><circleGeometry args={[.037,16]}/><meshStandardMaterial color="#795D35" roughness={.22}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.075,0]}><torusGeometry args={[.045,.0025,5,16]}/><meshStandardMaterial color="#588F91" roughness={.4}/></mesh>
  </group>;
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
  const detail = characterDetail(focused, quality, camera);
  return <CharacterBoundary key={props.id+detail} id={props.id} detail={detail}><Suspense fallback={<Silhouette id={props.id}/>}><PaintedFigure {...props} detail={detail}/></Suspense></CharacterBoundary>;
}

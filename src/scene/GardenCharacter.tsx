import {Component, Suspense, useEffect, useMemo, useRef, type ReactNode} from 'react';
import {Html, useGLTF} from '@react-three/drei';
import {createPortal, useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {AgentId} from '../simulation/types';
import {agentColors} from '../simulation/world';

type Props = {id: AgentId; pose: string; paused: boolean; motion: boolean; rate: number; calm: number; tea: boolean};

function PaintedFigure({id, pose, paused, motion, rate, calm, tea}: Props) {
  const {scene} = useGLTF(`${import.meta.env.BASE_URL}models/characters/${id}.glb`);
  const model = useMemo(() => scene.clone(true), [scene]);
  const clock = useRef(0);
  const rig = useMemo(() => Object.fromEntries(['body','head','eyes','skirt','leftArm','rightArm','leftForearm','rightForearm','leftLeg','rightLeg','book','brush'].map(part => [part, model.getObjectByName(`${id}_${part}`)!])), [id, model]);
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
    const blink = (t + ['baoyu','daiyu','baochai','wangxifeng'].indexOf(id) * 1.07) % 4.7;
    rig.eyes.scale.y = motion && blink < .16 ? Math.max(.08, Math.abs(blink - .08) / .08) : 1;
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
    rig.book.visible = reading;
    rig.brush.visible = pose === 'write';
    rig.brush.rotation.z = pose === 'write' ? Math.sin(t * 5) * .09 : 0;
    rig.brush.position.x = .15 + (pose === 'write' ? Math.sin(t * 3) * .025 : 0);
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
  return <group ref={cup} name={`${id}_teaCup`} position={[0,-.35,.07]}>
    <mesh castShadow><latheGeometry args={[contour,16]}/><meshStandardMaterial color="#E5E8D5" roughness={.34} side={THREE.DoubleSide}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.062,0]}><circleGeometry args={[.037,16]}/><meshStandardMaterial color="#795D35" roughness={.22}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.075,0]}><torusGeometry args={[.045,.0025,5,16]}/><meshStandardMaterial color="#588F91" roughness={.4}/></mesh>
  </group>;
}

function Silhouette({id}: {id: AgentId}) {
  return <group><mesh position={[0,.65,0]}><capsuleGeometry args={[.22,.8,5,10]}/><meshStandardMaterial color={agentColors[id]}/></mesh><mesh position={[0,1.45,0]}><sphereGeometry args={[.17,12,8]}/><meshStandardMaterial color="#EDC4A7"/></mesh></group>;
}
class CharacterBoundary extends Component<{id: AgentId; children: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() {return {failed: true};}
  render() {return this.state.failed ? <><Silhouette id={this.props.id}/><Html position={[0,1.05,0]} center><button className="sim-character-retry" onClick={() => {useGLTF.clear(`${import.meta.env.BASE_URL}models/characters/${this.props.id}.glb`);this.setState({failed:false});}}>人物暂未载入 · 重试</button></Html></> : this.props.children;}
}
export default function GardenCharacter(props: Props) {
  return <CharacterBoundary id={props.id}><Suspense fallback={<Silhouette id={props.id}/>}><PaintedFigure {...props}/></Suspense></CharacterBoundary>;
}

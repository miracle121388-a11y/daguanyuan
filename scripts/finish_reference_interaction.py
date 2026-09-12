"""One-time UI corrections from the final reference scene review."""
from pathlib import Path
R=Path(__file__).resolve().parents[1]
p=R/'src/scene/GardenScene.tsx';s=p.read_text(encoding='utf8')
s=s.replace('f=1+.17*Math.sin(3*a+.4)+.085*Math.sin(5*a-1.1),x=', 'f=1+.17*Math.sin(3*a+.4)+.085*Math.sin(5*a-1.1)+[[-1.12,.72,.29],[-2.57,.70,.25],[.12,.30,.32]].reduce((sum,[direction,depth,width])=>{const distance=Math.atan2(Math.sin(a-direction),Math.cos(a-direction));return sum+depth*Math.exp(-((distance/width)**2))},0),x=')
s=s.replace('const panelOpen=useGarden(s=>s.panelOpen);', "const panelOpen=useGarden(s=>s.panelOpen),indoor=useGarden(s=>!!s.hotspotId?.endsWith('-study')&&!s.cutaway);")
s=s.replace("mobile?size.height*.26:0", "mobile?size.height*(indoor?.18:.26):0")
s=s.replace('[camera,size.width,size.height,panelOpen]);', '[camera,size.width,size.height,panelOpen,indoor]);')
start=s.index(" useEffect(()=>{if(tour.status!=='idle')return;")
end=s.index('\n useEffect(()=>{const state=useGarden.getState();const route=',start)
s=s[:start]+''' useEffect(()=>{
  if(tour.status!=='idle')return;
  const p=manifest.places.find(p=>p.id===selected),h=p?.hotspots.find(h=>h.id===hotspot);
  const room=h?.id.endsWith('-study')&&!cutaway?p?.interiorCamera:undefined;
  const toWorld=(local:Vec3)=>local.map((v,i)=>v+(p?.position[i]??0)) as Vec3;
  const target:Vec3=room?toWorld(room.target):h&&p?toWorld(h.position):p?.cameraTarget??manifest.overviewCamera.target;
  const position:Vec3=room?toWorld(room.position):h?[target[0]+5,target[1]+13,target[2]+8]:p?.cameraPosition??manifest.overviewCamera.position;
  if(camera instanceof THREE.PerspectiveCamera){camera.fov=room?.fov??(size.width<601&&!p?72:43);camera.updateProjectionMatrix()}
  controls.current?.setLookAt(...position,...target,motion);
 },[selected,manifest,tour.status,motion,hotspot,cutaway,camera,size.width]);''' + s[end:]
s=s.replace('dwell.current+=Math.min(dt,.05)', 'dwell.current+=Math.min(dt,1)')
s=s.replace('controller.current?.tick(Math.min(dt,.05))','controller.current?.tick(Math.min(dt,.5))')
p.write_text(s,encoding='utf8')
p=R/'src/scene/LivingTrees.tsx';s=p.read_text(encoding='utf8')
s=s.replace('m.name=\'Living tree canopy\';', "m.name='Living tree canopy';m.userData.ownsMaterial=material!==o.material;")
s=s.replace('m.geometry.dispose();m.dispose()', 'm.geometry.dispose();if(m.userData.ownsMaterial){for(const material of Array.isArray(m.material)?m.material:[m.material])material.dispose()}m.dispose()')
p.write_text(s,encoding='utf8')
p=R/'src/panels/ReferenceExperience.tsx';s=p.read_text(encoding='utf8')
s=s.replace('<button aria-pressed={inside&&!s.cutaway}', '{p.interiorCamera&&<button aria-pressed={inside&&!s.cutaway}')
s=s.replace("'屋内陈设'}</button><button", "'屋内陈设'}</button>}<button")
# Large reference images get independent load/error recovery; thumbnail buttons
# remain a valid single interactive target and open this recoverable viewer.
start=s.index('export function ReferenceGallery')
s=s[:start]+'''function ReferenceImage({art}:{art:Art}){
 const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[attempt,setAttempt]=useState(0);
 return <div className="gallery-image" aria-busy={status==='loading'}>
  <img key={attempt} src={url(art.url)+(attempt?'?retry='+attempt:'')} alt={art.title} width="1440" height="960" onLoad={()=>setStatus('ready')} onError={()=>setStatus('error')} hidden={status==='error'}/>
  {status!=='ready'&&<div className="image-status" role="status">{status==='error'?<><p>这幅园景暂时未能载入。</p><button onClick={()=>{setStatus('loading');setAttempt(n=>n+1)}}>重新载入这幅图片</button></>:<p>正在展开园景图片…</p>}</div>}
 </div>
}
''' + s[start:]
s=s.replace('<img src={url(active.url)} alt={active.title} width="1440" height="960"/>','<ReferenceImage key={active.id} art={active}/>')
p.write_text(s,encoding='utf8')

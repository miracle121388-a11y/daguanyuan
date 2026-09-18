import {readFileSync,writeFileSync,existsSync,readdirSync,mkdirSync,statSync,renameSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {editionCatalogSchema, editionIds} from '../src/data/editions.ts';
const read=p=>JSON.parse(readFileSync(p,'utf8'));const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const write=(p,value)=>{writeFileSync(p+'.next',value);renameSync(p+'.next',p)};
const names=['places','characters','events','sources','relations','routes'];const d=Object.fromEntries(names.map(n=>[n,read(`data/canon/${n}.json`)]));
const refs=z.array(z.string()).min(1);const ids=z.string().min(1);const ch=z.number().int().min(1).max(120);
const schemas={places:z.object({id:ids,name:ids,aliases:z.array(z.string()),description:ids,sourceRefs:refs,spatialInterpretation:z.literal('interpretive')}),characters:z.object({id:ids,name:ids,shortBio:ids,sourceRefs:refs,introductionChapter:ch,residencies:z.array(z.object({placeId:ids,fromChapter:ch,toChapter:ch.nullable(),sourceRefs:refs}))}),events:z.object({id:ids,title:ids,chapter:ch,summary:ids,characterIds:z.array(ids).min(1),canonicalPlaceId:ids.nullable(),displayPlaceId:ids.nullable(),locationCertainty:z.enum(['explicit','display_only','residency_inference']),sourceRefs:refs,contentType:z.literal('canonical'),reviewStatus:z.literal('source_checked')}),sources:z.object({id:ids,title:ids,url:z.url(),rawSha256:z.string().length(64),normalizedTextSha256:z.string().length(64),paragraphIndex:z.number().int().min(0),evidenceExcerpt:ids,chapter:ch,reviewStatus:z.literal('source_checked')}),routes:z.object({id:ids,title:ids,orderedStops:z.array(ids).min(2),eventIds:refs,pathNodeIds:z.array(ids).min(2),routeType:z.literal('interpretive'),sourceRefs:refs}),relations:z.object({fromId:ids,toId:ids,relationType:ids,sourceRefs:refs})};
const checks=[];const assert=(value,message)=>{if(!value)throw Error(message);checks.push(message)};
const editions=editionCatalogSchema.parse(read('data/canon/editionCatalog.json'));
assert(new Set(editions.editions.map(e=>e.id)).size===3&&editionIds.every(id=>editions.editions.some(e=>e.id===id)),'three separate literary editions');
assert(new Set(editions.nodes.map(n=>n.id)).size===editions.nodes.length,'unique story nodes');
assert(new Set(editions.sources.map(s=>s.id)).size===editions.sources.length,'unique edition evidence');
for(const s of editions.sources){assert(s.rawPath.startsWith('data/raw/')&&s.textPath.startsWith('data/raw/'),'edition raw archive path '+s.id);assert(hash(s.rawPath)===s.rawSha256&&hash(s.textPath)===s.normalizedTextSha256,'edition source hashes '+s.id);assert(readFileSync(s.textPath,'utf8').includes(s.excerpt),'edition excerpt located '+s.id)}
const comicArt=read('data/canon/comicArt.json');
for(const a of comicArt){assert(hash(a.original)===a.sourceSha256&&a.prompt.length>100&&a.licenseNote.length>30,'comic original provenance '+a.id);for(const f of a.derivatives)assert(f.file.startsWith('public/comics/')&&hash(f.file)===f.sha256,'comic derivative hash '+f.file)}
const dreamRefs=read('data/canon/dreamReferences.json');
assert(dreamRefs.reviewStatus==='source_checked'&&dreamRefs.styleVersion==='honglou-silk-v1','reviewed dream style catalog');
assert(new Set(dreamRefs.refs.map(r=>r.id)).size===dreamRefs.refs.length,'unique dream references');
const referenceArt=read('public/art/manifest.json');
const archivedSceneCatalog='references/dream-scene-sources/manifest.json';
const archivedSceneArt=read(archivedSceneCatalog);
assert(archivedSceneArt.length===5&&archivedSceneArt.every(a=>a.kind==='archived-generated-art'&&a.originalCatalog==='public/art/manifest.json'&&a.originalPath==='public/'+a.url&&a.archivePath==='references/dream-scene-sources/'+path.basename(a.url)&&/^[a-f0-9]{40}$/.test(a.sourceCommit)&&/^[a-f0-9]{64}$/.test(a.originalCatalogSha256)),'retired scene sources retain explicit archive provenance');
for(const a of archivedSceneArt)assert(hash(a.archivePath)===a.sha256&&!existsSync(a.originalPath),'archived scene source preserved outside garden gallery '+a.id);
for(const ref of dreamRefs.refs){
 assert(/^dream-(style|characters|scenes)\/[a-z0-9-]+\.webp$/.test(ref.path)&&ref.reviewStatus==='source_checked','local reviewed dream reference '+ref.id);
 assert(hash('public/'+ref.path)===ref.sha256&&statSync('public/'+ref.path).size===ref.bytes,'dream reference hash '+ref.id);
 assert(ref.temporary===true&&ref.note.length>20&&ref.origin.length>40&&ref.sources.length>0,'temporary provenance explicit '+ref.id);
 for(const source of ref.sources){
  const approved=source.catalog==='data/canon/comicArt.json'?comicArt.find(a=>a.id===source.sourceId)?.derivatives.some(f=>f.file===source.path&&f.sha256===source.sha256):source.catalog===archivedSceneCatalog?archivedSceneArt.some(a=>a.id===source.sourceId&&a.archivePath===source.path&&a.sha256===source.sha256&&a.originalPath===source.originalPath&&a.originalCatalog===source.originalCatalog&&a.prompt===source.prompt&&a.provenance===source.licenseNote):source.catalog==='public/art/manifest.json'&&referenceArt.some(a=>a.id===source.sourceId&&'public/'+a.url===source.path&&a.sha256===source.sha256);
  assert(approved&&hash(source.path)===source.sha256&&source.prompt.length>100&&source.licenseNote.length>30,'dream source chain '+ref.id+' '+source.sourceId);
 }
}
assert(dreamRefs.refs.some(r=>r.id===dreamRefs.styleRef&&r.role==='style'),'dedicated style layer');
for(const id of ['daiyu','baoyu','baochai','wangxifeng'])assert(dreamRefs.refs.some(r=>r.id===dreamRefs.characterRefs[id]&&r.characterId===id&&r.role==='character'),'dedicated character layer '+id);
for(const [placeId,id] of Object.entries(dreamRefs.sceneRefs))assert(d.places.some(p=>p.id===placeId)&&dreamRefs.refs.some(r=>r.id===id&&r.placeId===placeId&&r.role==='scene'),'dedicated scene layer '+placeId);
for(const [cast,id] of Object.entries(dreamRefs.characterSheets))assert(dreamRefs.refs.some(r=>r.id===id&&(r.role==='character'?cast===r.characterId:r.role==='character-sheet'&&r.cast.join('+')===cast)),'exact cast reference sheet '+cast);
for(const n of editions.nodes){assert(n.editions.every(id=>n.chapter<=editions.editions.find(e=>e.id===id).chapters),'story chapter within edition '+n.id);assert(n.sourceRefs.every(id=>editions.sources.some(s=>s.id===id)),'story evidence keys '+n.id);assert(d.places.some(p=>p.id===n.place)&&d.characters.some(c=>c.id===n.focus),'story stage anchors '+n.id);assert(comicArt.some(a=>a.id===n.art),'story has authored art '+n.id);assert(!n.eventId||d.events.some(e=>e.id===n.eventId&&e.chapter===n.chapter),'story event trigger '+n.id)}
for(const n of names){z.array(schemas[n]).parse(d[n]);if(n!=='relations')assert(new Set(d[n].map(x=>x.id)).size===d[n].length,n+' unique IDs')}
const places=new Set(d.places.map(x=>x.id)),chars=new Set(d.characters.map(x=>x.id)),sources=new Set(d.sources.map(x=>x.id)),events=new Set(d.events.map(x=>x.id));
assert(places.size===15,'15 places including the three reference additions');assert(chars.size>=12,'at least 12 characters');assert(events.size>=16,'at least 16 events');assert(new Set(d.events.map(x=>x.chapter)).size>=8,'at least 8 chapters');assert(d.routes.length===3,'3 planned routes');
for(const name of names.filter(n=>n!=='sources'))for(const obj of d[name])for(const ref of obj.sourceRefs)assert(sources.has(ref),'source foreign key '+ref);
for(const e of d.events){assert(e.characterIds.every(id=>chars.has(id)),'event character keys '+e.id);assert([e.canonicalPlaceId,e.displayPlaceId].every(id=>id===null||places.has(id)),'event place keys '+e.id);assert(e.locationCertainty!=='display_only'||e.canonicalPlaceId===null,'display location honest '+e.id)}
for(const c of d.characters)for(const r of c.residencies){assert(places.has(r.placeId),'residency place '+c.id);assert(r.sourceRefs.every(id=>sources.has(id)),'residency sources '+c.id)}
for(const r of d.relations)assert(chars.has(r.fromId)&&chars.has(r.toId),'relation keys');
for(const s of d.sources){const prefix=`data/raw/chapter-${String(s.chapter).padStart(3,'0')}`,raw=read(prefix+'.json');assert(s.rawSha256===hash(prefix+'.html'),'raw SHA256 '+s.id);assert(s.normalizedTextSha256===hash(prefix+'.txt'),'normalized SHA256 '+s.id);assert(raw.paragraphs[s.paragraphIndex].includes(s.evidenceExcerpt),'evidence located '+s.id)}
const m=read('public/scene-manifest.json');assert(m.places.length===places.size&&m.places.every(p=>places.has(p.id)),'manifest matches canon places');
if(existsSync('config/sunwen.architecture.json')){
 const architecture=read('public/architecture-scenes.json'),design=read('config/sunwen.architecture.json');
 const scenery=z.array(z.object({id:ids,name:ids,position:z.tuple([z.number(),z.number(),z.number()]),cameraPosition:z.tuple([z.number(),z.number(),z.number()]),cameraTarget:z.tuple([z.number(),z.number(),z.number()]),height:z.number().positive(),character:ids,interpretation:ids})).parse(architecture.scenes);
 assert(architecture.revision===design.revision&&read('config/garden.sunwen.json').architectureRevision===design.revision,'architectural scene revision');
 assert(JSON.stringify(m.architecturalScenes)===JSON.stringify(architecture.scenes),'architectural camera metadata matches published manifest');
 assert(new Set(scenery.map(p=>p.id)).size===scenery.length&&scenery.length===3,'three unique supplementary scenery identities');
 for(const p of scenery){assert(!places.has(p.id),'supplementary scenery stays distinct from canon '+p.id);assert(design.additionalScenes.some(n=>n.id===p.id&&n.name===p.name),'scenery matches architectural design '+p.id)}
}
const pathIDs=new Set(m.pathNodes.map(n=>n.id)),edgeKeys=new Set(m.pathEdges.flatMap(e=>[e.from+'|'+e.to,e.to+'|'+e.from]));
if(existsSync('config/garden.urban.json')){
 const urban=read('public/urban-context.json'),design=read('config/garden.urban.json');
 const vector=z.tuple([z.number().finite(),z.number().finite(),z.number().finite()]);
 const kinds=['hall','house','annex','range','gallery','gate','shop','shop-upper','warehouse','temple','paifang','bell-pavilion','well','screen','stall','cart','hitching','lane-gate','drain','slab-bridge','wall','paving','court-paving','tree'];
 const rows=z.array(z.object({kind:z.enum(kinds),position:vector,scale:vector,rotation:z.number().finite(),district:ids})).parse(urban.instances);
 assert(urban.revision===design.revision&&(read('config/garden.sunwen.json').urbanRevision??m.assetRevision.split('-').at(-1))===design.revision,'urban component revision matches its authored configuration');
 assert(urban.model==='models/urban-context.glb'&&existsSync('public/'+urban.model),'local urban model');
 assert(urban.courts.length>=200&&rows.length>2000,'continuous mansion and capital setting');
 assert(new Set(urban.courts.map(c=>c.type)).size>=8,'distinct mansion, home, shop, temple and service compounds');
 assert(new Set(urban.courts.map(c=>Math.round(c.bounds[2]-c.bounds[0]))).size>=20,'unequal plot widths');
 assert(new Set(urban.courts.map(c=>Math.round(c.bounds[3]-c.bounds[1]))).size>=20,'unequal plot depths');
 for(const kind of kinds)assert(rows.some(row=>row.kind===kind),'urban prototype used: '+kind);
 assert(urban.streets.length>50&&new Set(urban.streets.map(s=>s.width)).size>3,'hierarchy of streets and offset hutongs');
 assert(urban.interpretation===design.basis,'urban layout remains identified as spatial interpretation');
 for(const row of rows)assert(row.scale.every(s=>s>0),'positive urban transform');
}
const gardenBounds=read('reports/acceptance/model-optimization.json').find(x=>x.file==='public/models/overview.glb').bounds;
assert(m.pathNodes.every(n=>n.position[0]>gardenBounds.min[0]+1.5&&n.position[0]<gardenBounds.max[0]-1.5&&n.position[2]>gardenBounds.min[2]+1.5&&n.position[2]<gardenBounds.max[2]-1.5),'all route nodes and road margins supported by garden base');
for(const r of d.routes){assert(r.orderedStops.every(id=>places.has(id))&&r.eventIds.every(id=>events.has(id)),'route foreign keys '+r.id);assert(r.pathNodeIds.every(id=>pathIDs.has(id)),'route path nodes '+r.id);assert(r.pathNodeIds.slice(1).every((id,i)=>edgeKeys.has(r.pathNodeIds[i]+'|'+id)),'route uses connected edges '+r.id)}
function glbJSON(file){const b=readFileSync(file);assert(b.subarray(0,4).toString()==='glTF','GLB magic '+file);assert(b.readUInt32LE(8)===b.length,'GLB size '+file);const length=b.readUInt32LE(12);return JSON.parse(b.subarray(20,20+length).toString())}
const overview=glbJSON('public/models/overview.glb');
const low=glbJSON('public/models/overview-low.glb');
for(const p of m.places)assert(low.nodes.some(n=>n.extras?.placeId===p.id),'low overview place '+p.id);
for(const p of m.places){const mobile=glbJSON('public/'+p.mobileModel);assert(mobile.nodes.some(n=>n.extras?.placeId===p.id),'mobile partition place '+p.id);assert(p.hotspots.every(h=>mobile.nodes.some(n=>n.extras?.hotspotId===h.id)),'mobile partition hotspots '+p.id);assert(mobile.extensionsUsed?.includes('KHR_draco_mesh_compression'),'mobile partition compressed '+p.id)}
for(const p of d.places)for(const f of p.features??[])assert(f.sourceRefs.every(id=>sources.has(id)),'architectural feature sources '+p.id);
for(const p of m.places){assert(overview.nodes.some(n=>n.extras?.placeId===p.id),'overview extras '+p.id);const part=glbJSON('public/'+p.model);assert(part.nodes.some(n=>n.extras?.placeId===p.id),'partition extras '+p.id);for(const h of p.hotspots){const node=part.nodes.find(n=>n.extras?.hotspotId===h.id);assert(!!node,'hotspot exported '+h.id);assert(h.position.every((v,i)=>Math.abs(v-(node.translation?.[i]??0))<.001),'hotspot coordinate conversion '+h.id)}const root=part.nodes.find(n=>n.extras?.entityType==='place');assert(!root.translation||root.translation.every(v=>v===0),'partition origin identity '+p.id)}
const assets=read('assets/manifest.json');for(const a of assets.filter(a=>a.status==='approved')){assert(existsSync(a.licenseEvidencePath),'license '+a.assetId);assert(hash(a.sourceFile)===a.sourceSha256,'asset hash '+a.assetId);for(const dep of a.dependencies??[])assert(hash(dep.file)===dep.sha256,'asset dependency '+dep.file)}
for(const a of assets.filter(a=>a.status==='approved'))for(const [i,file]of (a.derivativeFiles??[]).entries())assert(hash(file)===a.derivativeSha256[i],'derivative hash '+file);
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]);
assert(walk('public').every(f=>/^(public\/models\/.*\.glb|public\/data\/(places|characters|events|sources|routes|relations|editionCatalog|comicArt|dreamReferences)\.json|public\/(scene-manifest|architecture-scenes|urban-context)\.json|public\/textures\/.*\.(jpg|png|webp|hdr|json)|public\/comics\/[a-z0-9-]+\.webp(?:\.json)?|public\/dream-(style|characters|scenes)\/[a-z0-9-]+\.webp(?:\.json)?|public\/art\/[a-z0-9-]+\.(webp|json|webp\.json)|public\/draco\/(draco_decoder.js|draco_decoder.wasm|draco_wasm_wrapper.js|LICENSE|AUTHORS))$/.test(f)),'public file allowlist');
for(const f of walk('public').filter(f=>/^public\/dream-/.test(f)))assert(dreamRefs.refs.some(r=>'public/'+r.path===f.replace(/\.json$/,'')),'no unreviewed dream reference '+f);
for(const result of read('reports/acceptance/model-optimization.json')){
 assert(hash(result.file)===result.sha256,'optimized model hash '+result.file);
 for(const img of glbJSON(result.file).images??[]){if(img.bufferView!==undefined)continue;assert(!!img.uri&&!/^(https?:|data:|\/)/.test(img.uri),'local model texture '+result.file);const target=path.resolve(path.dirname(result.file),img.uri);assert(target.startsWith(path.resolve('public/textures/shared')+path.sep)&&existsSync(target),'shared texture exists '+img.uri);assert(hash(target)===path.basename(target).split('.')[0],'shared texture content hash '+img.uri)}
}
const art=read('public/art/manifest.json');assert(art.length===15,'15 approved visual references');for(const image of art){assert(image.placeId===null||places.has(image.placeId),'image links to a real destination '+image.id);assert(hash('public/'+image.url)===image.sha256,'published reference hash '+image.id);assert(image.kind==='historical-painting'&&image.artist==='孙温'&&image.repositoryCommit==='9e9352d51a5f4a7006f77946ee8ace29d427a937','Sun Wen source provenance '+image.id);assert(hash(image.sourceFile)===image.sourceSha256,'original plate hash '+image.id);assert(hash('public/'+image.thumbnail)===image.thumbnailSha256,'reference thumbnail hash '+image.id)}
assert(!existsSync('public/data/raw')&&!existsSync('public/data/pending'),'private raw and pending excluded');
if(process.argv.includes('--publish')){for(const a of comicArt)for(const f of a.derivatives)write(f.file+'.json',JSON.stringify({prompt:a.prompt,origin:a.generator,sha256:f.sha256}));for(const ref of dreamRefs.refs)write('public/'+ref.path+'.json',JSON.stringify(ref));for(const name of ['editionCatalog','comicArt','dreamReferences'])write(`public/data/${name}.json`,JSON.stringify(read(`data/canon/${name}.json`)));mkdirSync('public/data',{recursive:true});for(const n of names)write(`public/data/${n}.json`,JSON.stringify(d[n]));}
const allGLB=walk('public/models').filter(f=>f.endsWith('.glb'));const report={timestamp:new Date().toISOString(),passed:checks.length,checks,modelBytes:allGLB.reduce((sum,f)=>sum+statSync(f).size,0),overviewBytes:statSync('public/models/overview.glb').size,counts:Object.fromEntries(names.map(n=>[n,d[n].length]))};write('reports/acceptance/integrity.json',JSON.stringify(report,null,2));console.log('PASS',checks.length,'integrity checks.',report.counts);

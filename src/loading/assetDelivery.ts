import delivery from '../../config/runtime-delivery.json';

type Entry = {bytes:number;sha256:string};
export const assetRevision=delivery.revision;
const entries:Record<string,Entry>=delivery.entries;
const priorities=new Map<string,number>();
export function prioritizeAsset(...paths:string[]){priorities.clear();for(const path of paths)priorities.set(path.split('?')[0].replace(/^\.\//,''),0);}
export function versionAsset(url:string){
 if(typeof location==='undefined')return url;
 const base=new URL(import.meta.env.BASE_URL,location.href),u=new URL(url,base);
 if(u.origin!==base.origin||!u.pathname.startsWith(base.pathname))return url;
 const entry=entries[u.pathname.slice(base.pathname.length)];
 if(entry)u.searchParams.set('v',entry.sha256.slice(0,20));
 return u.href;
}
type Job={path:string;run:()=>Promise<Response>;resolve:(r:Response)=>void;reject:(e:unknown)=>void;signal?:AbortSignal;order:number};
/** Prioritize the current view, with bounded network/body downloads. API calls are excluded. */
export class DownloadQueue{
 private jobs:Job[]=[];private active=0;private order=0;
 private running=new Set<string>();
 constructor(private limit=3){}
 snapshot(){return {active:this.active,running:[...this.running],pending:this.jobs.map(j=>j.path)};}
 enqueue(path:string,run:()=>Promise<Response>,signal?:AbortSignal){return new Promise<Response>((resolve,reject)=>{this.jobs.push({path,run,resolve,reject,signal,order:++this.order});this.pump();});}
 private rank(path:string){return path.includes('-fast.glb')?0:priorities.has(path)?1:path.startsWith('data/')||path==='scene-manifest.json'||path.startsWith('draco/')||path.startsWith('textures/characters-shared/')||path.startsWith('models/characters-stream/')&&path.endsWith('-low.glb')?2:path.startsWith('textures/')?3:4;}
 private pump(){
  this.jobs.sort((a,b)=>this.rank(a.path)-this.rank(b.path)||b.order-a.order);
  while(this.active<this.limit&&this.jobs.length){const job=this.jobs.shift()!;if(job.signal?.aborted){job.reject(job.signal.reason);continue;}this.active++;this.running.add(job.path);void job.run().then(job.resolve,job.reject).finally(()=>{this.active--;this.running.delete(job.path);this.pump();});}
 }
}
const prefix='daguanyuan.assets.';
/** A bounded cache of reviewed public resources. Never stores prompts, keys, API responses or saves. */
export class PublicAssetCache{
 private cache:Promise<Cache|null>|null=null;
 private metadata=new Map<string,{bytes:number;used:number}>();private writes=Promise.resolve();
 constructor(private budget=80*1048576,private storage:CacheStorage|undefined=typeof caches==='undefined'?undefined:caches){}
 private open(){return this.cache??= (async()=>{
  if(!this.storage)return null;
  try{
   const name=prefix+'v1',cache=await this.storage.open(name);
   for(const key of await cache.keys()){const item=await cache.match(key);this.metadata.set(key.url,{bytes:Number(item?.headers.get('x-garden-bytes')??0),used:0});}
   // Only this application's obsolete public-asset caches are removed.
   for(const old of await this.storage.keys())if(old.startsWith(prefix)&&old!==name)await this.storage.delete(old);
   return cache;
  }catch{return null;}
 })();}
 async get(url:string){const cache=await this.open();try{const hit=await cache?.match(url);if(hit){const meta=this.metadata.get(url);if(meta)meta.used=Date.now();return hit;} }catch{/* Private mode falls back to the network. */}return null;}
 async put(url:string,response:Response,bytes:number){
  const cache=await this.open();if(!cache||bytes>this.budget)return;
  this.writes=this.writes.then(async()=>{
   try{
    this.metadata.delete(url);let total=[...this.metadata.values()].reduce((n,m)=>n+m.bytes,0);
    for(const [old,meta] of [...this.metadata].sort((a,b)=>a[1].used-b[1].used)){if(total+bytes<=this.budget)break;await cache.delete(old);this.metadata.delete(old);total-=meta.bytes;}
    const headers=new Headers(response.headers);headers.set('x-garden-bytes',String(bytes));
    await cache.put(url,new Response(response.body,{status:response.status,headers}));this.metadata.set(url,{bytes,used:Date.now()});
   }catch{/* Quota/storage failures must never prevent rendering. */}
  });await this.writes;
 }
 async remove(url:string){try{await (await this.open())?.delete(url);this.metadata.delete(url);}catch{/* Best effort. */}}
}
export async function readAsset(request:Request,entry:Entry,fetcher:typeof fetch,cache:PublicAssetCache,timeoutMs=90000):Promise<Response>{
 const mark=(phase:string)=>{if(import.meta.env.MODE==='test'&&typeof window!=='undefined'){const w=window as any;w.__gardenFetchPhases??={};w.__gardenFetchPhases[new URL(request.url).pathname]={phase,at:performance.now()};}};
 mark('cache');
 const cached=await cache.get(request.url);
 if(cached){mark('cached');return cached;}
 for(let attempt=0;attempt<3;attempt++){
  request.signal.throwIfAborted();const controller=new AbortController(),abort=()=>controller.abort(request.signal.reason);
  request.signal.addEventListener('abort',abort,{once:true});const deadline=setTimeout(()=>controller.abort(new DOMException('资源下载超时','TimeoutError')),timeoutMs);
  try{
   mark('headers');const response=await fetcher(new Request(request,{signal:controller.signal}));
   if(!response.ok){if(![408,429,500,502,503,504].includes(response.status))return response;throw Error('Temporary asset response '+response.status);}
   mark('body');const body=await response.arrayBuffer();controller.signal.throwIfAborted();mark('hash');
   // Detect stale CDN bodies or HTML fallbacks before they poison the decoder/cache.
   if(body.byteLength!==entry.bytes)throw Error('Asset version/length mismatch');
   if(globalThis.crypto?.subtle){const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',body))].map(b=>b.toString(16).padStart(2,'0')).join('');if(hash!==entry.sha256)throw Error('Asset integrity mismatch');}
   const headers=new Headers(response.headers);headers.delete('Content-Encoding');headers.set('Content-Length',String(body.byteLength));
   const result=new Response(body,{status:200,headers});
   void cache.put(request.url,result.clone(),body.byteLength);
   mark('done');
   return result;
  }catch(error){if(import.meta.env.MODE==='test')console.warn('Asset retry',new URL(request.url).pathname,attempt,String(error));if(request.signal.aborted)throw request.signal.reason;if(attempt===2)throw error;}
  finally{clearTimeout(deadline);request.signal.removeEventListener('abort',abort);}
  await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));
 }
 throw Error('资源未载入');
}
let installed=false;
export function installAssetDelivery(){
 if(installed||typeof window==='undefined')return;installed=true;
 const raw=window.fetch.bind(window),base=new URL(import.meta.env.BASE_URL,location.href),cache=new PublicAssetCache();
 const connection=(navigator as Navigator & {connection?:{saveData?:boolean;effectiveType?:string}}).connection;
 const queue=new DownloadQueue(connection?.saveData||/2g|3g/.test(connection?.effectiveType??'')?2:3);
 const inFlight=new Map<string,Promise<Response>>();
 if(import.meta.env.MODE==='test')(window as any).__gardenDownloads=()=>queue.snapshot();
 window.fetch=(input,init)=>{
  const request=new Request(typeof input==='string'?new URL(input,location.href):input,init),url=new URL(request.url);
  const path=url.pathname.startsWith(base.pathname)?url.pathname.slice(base.pathname.length):'';
  if(request.method!=='GET'||url.origin!==base.origin||!entries[path]||request.headers.has('authorization'))return raw(request);
  const versioned=new Request(versionAsset(request.url),request);
  // Several GLTF parsers ask for the same shared image at once. Return an
  // independent response stream to each, while downloading it only once.
  const share=!init?.signal&&!path.startsWith('data/')&&path!=='scene-manifest.json';
  if(share){
   let work=inFlight.get(versioned.url);
   if(!work){work=queue.enqueue(path,()=>readAsset(versioned,entries[path],raw,cache),request.signal);inFlight.set(versioned.url,work);void work.finally(()=>inFlight.delete(versioned.url)).catch(()=>{});}
   return work.then(response=>response.clone());
  }
  return queue.enqueue(path,()=>readAsset(versioned,entries[path],raw,cache),request.signal);
 };
}

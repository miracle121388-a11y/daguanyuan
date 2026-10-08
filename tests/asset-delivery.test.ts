import {describe,it,expect,vi,afterEach} from 'vitest';
import {createHash} from 'node:crypto';
import {DownloadQueue,PublicAssetCache,readAsset} from '../src/loading/assetDelivery';
const fixture={bytes:4,sha256:createHash('sha256').update('1234').digest('hex')};

function storage(){
 const items=new Map<string,Response>();
 const cache={keys:async()=>[...items.keys()].map(url=>new Request(url)),match:async(key:string|Request)=>items.get(typeof key==='string'?key:key.url)?.clone(),delete:async(key:string)=>items.delete(key),put:async(key:string,value:Response)=>{items.set(key,value.clone());}};
 return {items,cache,storage:{open:async()=>cache,keys:async()=>['another-application.cache'],delete:vi.fn()} as unknown as CacheStorage};
}
afterEach(()=>vi.unstubAllGlobals());
describe('public asset delivery',()=>{
 it('bounds simultaneous downloads and prioritizes the first-view model',async()=>{
  const queue=new DownloadQueue(1),order:string[]=[];let release!:(r:Response)=>void;
  const first=queue.enqueue('models/places/one.glb',()=>new Promise<Response>(r=>{release=r;}));
  const far=queue.enqueue('models/places/two.glb',async()=>{order.push('far');return new Response();});
  const boot=queue.enqueue('models/overview-fast.glb',async()=>{order.push('boot');return new Response();});
  release(new Response());await Promise.all([first,far,boot]);expect(order).toEqual(['boot','far']);
 });
 it('reuses downloads across navigation and refresh, evicting older resources within its byte budget',async()=>{
  const db=storage(),cache=new PublicAssetCache(8,db.storage);
  await cache.put('https://garden.test/models/a.glb?v=a',new Response('1234'),4);
  await cache.put('https://garden.test/models/b.glb?v=b',new Response('1234'),4);
  expect(await (await cache.get('https://garden.test/models/b.glb?v=b'))!.text()).toBe('1234');
  await cache.put('https://garden.test/models/c.glb?v=c',new Response('1234'),4);
  expect(await cache.get('https://garden.test/models/a.glb?v=a')).toBeNull();
  expect(await new PublicAssetCache(8,db.storage).get('https://garden.test/models/c.glb?v=c')).not.toBeNull();
  expect(db.storage.delete).not.toHaveBeenCalled();
 });
 it('does not fail a successful asset read when browser storage is unavailable',async()=>{
  const cache=new PublicAssetCache(8,{open:async()=>{throw Error('quota');}} as unknown as CacheStorage);
  const response=await readAsset(new Request('https://garden.test/a'),fixture,vi.fn(async()=>new Response('1234')),cache);
  expect(await response.text()).toBe('1234');
 });
 it('retries a transient response and caches only a complete verified body',async()=>{
  const db=storage(),cache=new PublicAssetCache(8,db.storage),fetcher=vi.fn(async()=>fetcher.mock.calls.length===1?new Response('',{status:503}):new Response('1234'));
  const request=new Request('https://garden.test/a');
  const result=await readAsset(request,fixture,fetcher,cache);expect(await result.text()).toBe('1234');expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it('never retries an explicit cancellation',async()=>{
  const controller=new AbortController();controller.abort();const fetcher=vi.fn();
  await expect(readAsset(new Request('https://garden.test/a',{signal:controller.signal}),{bytes:4,sha256:''},fetcher,new PublicAssetCache())).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
 });
});

/** Retry only safe reads; the deadline includes downloading the response body. */
export async function fetchJson<T>(url:string, signal?:AbortSignal, timeoutMs=15000):Promise<T>{
 for(let attempt=0;attempt<3;attempt++){
  signal?.throwIfAborted();
  const controller=new AbortController();
  const abort=()=>controller.abort(signal?.reason);
  signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  let retryable=true;
  try{
   const response=await fetch(url,{signal:controller.signal});
   if(!response.ok){retryable=response.status===408||response.status===429||response.status>=500;throw Error(`资料暂未载入（${response.status}）`)}
   return await response.json() as T;
  }catch(error){
   if(signal?.aborted)throw signal.reason;
   if(!retryable||attempt===2)throw new Error('资料暂未载入，请重试，或先打开轻量阅读。',{cause:error});
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
  await new Promise<void>((resolve,reject)=>{
   const stop=()=>{clearTimeout(delay);reject(signal?.reason)};
   const delay=setTimeout(()=>{signal?.removeEventListener('abort',stop);resolve()},500*(attempt+1));
   signal?.addEventListener('abort',stop,{once:true});
   if(signal?.aborted)stop();
  });
 }
 throw Error('资料暂未载入');
}

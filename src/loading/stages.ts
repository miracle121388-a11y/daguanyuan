import {useEffect,useState} from 'react';
/** First view is independent of ornamental assets; later work is spread over frames. */
export function useLoadingStages(ready:boolean){
 const [stage,setStage]=useState(0);
 useEffect(()=>{
  if(!ready){setStage(0);return;}
  const timers=[setTimeout(()=>setStage(1),900),setTimeout(()=>setStage(2),2500),setTimeout(()=>setStage(3),5000)];
  return()=>timers.forEach(clearTimeout);
 },[ready]);
 return stage;
}

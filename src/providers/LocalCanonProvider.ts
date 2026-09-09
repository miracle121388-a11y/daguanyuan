import { eventSchema, type CanonData, type CanonEvent } from '../data/types';
export class LocalCanonProvider {
 async load():Promise<CanonData>{
  const files=['places','characters','events','sources','routes','relations'];
  const values=await Promise.all([...files.map(n=>`data/${n}.json`),'scene-manifest.json'].map(async p=>{const r=await fetch(import.meta.env.BASE_URL+p);if(!r.ok)throw new Error(`资料加载失败：${p} (${r.status})`);return r.json()}));
  const data=Object.fromEntries([...files,'manifest'].map((n,i)=>[n,values[i]])) as unknown as CanonData;
  data.events=data.events.map(e=>eventSchema.parse(e));return data;
 }
 static visibleEvents(events:CanonEvent[],limit:number|null){return events.filter(e=>e.reviewStatus==='source_checked'&&(limit===null||e.chapter<=limit))}
}
/** A future provider must return separately labelled generated records, never overwrite canon. */
export interface SimulationProvider { readonly contentType:'generated'; connect():Promise<void>; disconnect():void }

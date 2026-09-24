import { eventSchema, type CanonData, type CanonEvent } from '../data/types';
import {editionCatalogSchema} from '../data/editions';
import {fetchJson} from './fetchJson';
export class LocalCanonProvider {
 async load(signal?:AbortSignal):Promise<CanonData>{
  const files=['places','characters','events','sources','routes','relations','editionCatalog'];
  const values=await Promise.all([...files.map(n=>`data/${n}.json`),'scene-manifest.json'].map(p=>fetchJson(import.meta.env.BASE_URL+p,signal)));
  const data=Object.fromEntries([...files,'manifest'].map((n,i)=>[n,values[i]])) as unknown as CanonData;
  data.events=data.events.map(e=>eventSchema.parse(e));data.editionCatalog=editionCatalogSchema.parse(data.editionCatalog);return data;
 }
 static visibleEvents(events:CanonEvent[],limit:number|null){return events.filter(e=>e.reviewStatus==='source_checked'&&(limit===null||e.chapter<=limit))}
}
/** A future provider must return separately labelled generated records, never overwrite canon. */
export interface SimulationProvider { readonly contentType:'generated'; connect():Promise<void>; disconnect():void }

import { create } from 'zustand';
import type { CanonData,CanonEvent } from '../data/types';
import {LocalCanonProvider} from '../providers/LocalCanonProvider';
export type Tab='places'|'characters'|'chapters';
export type TourState={routeId:string|null;index:number;status:'idle'|'playing'|'paused';revision:number};
interface State {
 architecturalFocusId:string|null;focusArchitecture:(id:string)=>void;
 closeView:boolean;planView:boolean;cutaway:boolean;timeOfDay:'day'|'night';galleryOpen:boolean;activeImageId:string|null;data:CanonData|null;selectedPlaceId:string|null;selectedCharacterId:string|null;selectedEventId:string|null;selectedChapter:number|null;spoilerLimit:number|null;readingProgress:number;qualityLevel:'high'|'low';tourState:TourState;tab:Tab;panelOpen:boolean;indexOpen:boolean;sourcesOpen:boolean;settingsOpen:boolean;labels:boolean;motion:boolean;loaded:boolean;hotspotId:string|null;
 setData:(data:CanonData)=>void;choosePlace:(id:string|null)=>void;chooseCharacter:(id:string)=>void;chooseChapter:(chapter:number)=>void;chooseEvent:(event:CanonEvent)=>void;setSpoiler:(enabled:boolean,limit?:number)=>void;startTour:(id:string)=>void;tourStep:(index:number)=>void;toggleTour:()=>void;exitTour:()=>void;home:()=>void;
}
const mobile=typeof window!=='undefined'&&(window.matchMedia('(max-width: 600px)').matches||window.matchMedia('(pointer: coarse)').matches);
export const useGarden=create<State>((set,get)=>({architecturalFocusId:null,
 focusArchitecture:id=>{if(!get().data?.manifest.architecturalScenes?.some(p=>p.id===id))return;set({architecturalFocusId:id,selectedPlaceId:null,selectedCharacterId:null,selectedEventId:null,selectedChapter:null,hotspotId:null,panelOpen:false,indexOpen:false,planView:false,tourState:{...get().tourState,status:'idle',routeId:null}})},
 closeView:false,planView:false,cutaway:false,timeOfDay:'day',galleryOpen:false,activeImageId:null,data:null,selectedPlaceId:null,selectedCharacterId:null,selectedEventId:null,selectedChapter:null,spoilerLimit:null,readingProgress:40,qualityLevel:mobile?'low':'high',tourState:{routeId:null,index:0,status:'idle',revision:0},tab:'places',panelOpen:false,indexOpen:false,sourcesOpen:false,settingsOpen:false,labels:true,motion:typeof window==='undefined'||!window.matchMedia('(prefers-reduced-motion: reduce)').matches,loaded:false,hotspotId:null,
 setData:data=>set({data}),
 choosePlace:id=>set({architecturalFocusId:null,closeView:true,planView:false,cutaway:false,selectedPlaceId:id,selectedCharacterId:null,selectedEventId:null,selectedChapter:null,panelOpen:!!id,indexOpen:mobile?false:get().indexOpen,hotspotId:null,tourState:{...get().tourState,status:'idle',routeId:null}}),
 chooseCharacter:id=>set({architecturalFocusId:null,selectedCharacterId:id,selectedEventId:null,selectedChapter:null,selectedPlaceId:null,panelOpen:true,indexOpen:mobile?false:get().indexOpen,tab:'characters',tourState:{...get().tourState,status:'idle',routeId:null}}),
 chooseChapter:chapter=>{const next=get().spoilerLimit===null?chapter:Math.min(chapter,get().spoilerLimit!);set({selectedChapter:next,architecturalFocusId:null,selectedCharacterId:null,selectedEventId:null,selectedPlaceId:null,panelOpen:true,tab:'chapters',tourState:{...get().tourState,status:'idle',routeId:null}})},
 chooseEvent:event=>{if(get().spoilerLimit!==null&&event.chapter>get().spoilerLimit!)return;set({selectedEventId:event.id,architecturalFocusId:null,selectedChapter:event.chapter,selectedCharacterId:null,selectedPlaceId:event.displayPlaceId,panelOpen:true,tourState:{...get().tourState,status:'idle',routeId:null}})},
 setSpoiler:(enabled,limit)=>{const s=get(),progress=limit??s.readingProgress;set({readingProgress:progress,spoilerLimit:enabled?progress:null,selectedEventId:null,selectedChapter:enabled&&s.selectedChapter!==null&&s.selectedChapter>progress?null:s.selectedChapter})},
 startTour:id=>{const route=get().data?.routes.find(r=>r.id===id);if(route)set({architecturalFocusId:null,tourState:{routeId:id,index:0,status:'playing',revision:get().tourState.revision+1},selectedPlaceId:route.orderedStops[0],selectedCharacterId:null,selectedChapter:null,selectedEventId:null,panelOpen:false})},
 tourStep:index=>{const s=get(),route=s.data?.routes.find(r=>r.id===s.tourState.routeId);if(!route)return;const i=Math.max(0,Math.min(index,route.orderedStops.length-1));set({tourState:{...s.tourState,index:i,revision:s.tourState.revision+1},selectedPlaceId:route.orderedStops[i]})},
 toggleTour:()=>set({tourState:{...get().tourState,status:get().tourState.status==='playing'?'paused':'playing'}}),
 exitTour:()=>set({tourState:{routeId:null,index:0,status:'idle',revision:get().tourState.revision+1}}),
 home:()=>set({architecturalFocusId:null,planView:false,selectedPlaceId:null,selectedCharacterId:null,selectedEventId:null,selectedChapter:null,panelOpen:false,hotspotId:null,tourState:{routeId:null,index:0,status:'idle',revision:get().tourState.revision+1}})
}));
export function visibleEvents(){const s=useGarden.getState();return LocalCanonProvider.visibleEvents(s.data?.events??[],s.spoilerLimit)}
export function relatedPlaces(data:CanonData,characterId:string|null,chapter:number|null,limit:number|null):string[]{
 const es=LocalCanonProvider.visibleEvents(data.events,limit).filter(e=>(!characterId||e.characterIds.includes(characterId))&&(chapter===null||e.chapter===chapter));
 const homes=characterId?data.characters.find(c=>c.id===characterId)?.residencies.filter(r=>limit===null||r.fromChapter<=limit).map(r=>r.placeId)??[]:[];
 return [...new Set([...homes,...es.map(e=>e.displayPlaceId).filter((x):x is string=>!!x)])];
}

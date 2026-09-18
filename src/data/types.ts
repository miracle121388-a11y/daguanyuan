import { z } from 'zod';
import type {EditionCatalog} from './editions';
export type Vec3=[number,number,number];
const refs=z.array(z.string()).min(1);
export const eventSchema=z.object({id:z.string(),title:z.string(),chapter:z.number().int().min(1).max(120),summary:z.string(),characterIds:z.array(z.string()),canonicalPlaceId:z.string().nullable(),displayPlaceId:z.string().nullable(),locationCertainty:z.enum(['explicit','display_only','residency_inference']),sourceRefs:refs,contentType:z.literal('canonical'),reviewStatus:z.literal('source_checked')});
export type CanonEvent=z.infer<typeof eventSchema>;
export interface Place {id:string;name:string;aliases:string[];description:string;sourceRefs:string[];theme:string;spatialInterpretation:string;features?:{text:string;sourceRefs:string[]}[]}
export interface Character {id:string;name:string;aliases:string[];shortBio:string;introductionChapter:number;sourceRefs:string[];residencies:{placeId:string;fromChapter:number;toChapter:number|null;validity:string;sourceRefs:string[]}[]}
export interface Source {id:string;title:string;editionDescription:string;url:string;retrievedAt:string;revisionId:string|null;paragraphLocator:string;evidenceExcerpt:string;chapter:number;reviewStatus:string;licenseNote:string}
export interface Route {id:string;title:string;description:string;orderedStops:string[];eventIds:string[];pathNodeIds:string[];routeType:string;sourceRefs:string[]}
export interface Relation {fromId:string;toId:string;relationType:string;label:string;validity:{fromChapter:number;toChapter:number|null};sourceRefs:string[]}
export interface ScenePlace {id:string;name:string;position:Vec3;cameraPosition:Vec3;cameraTarget:Vec3;interiorCamera?:{position:Vec3;target:Vec3;fov:number};model:string;mobileModel?:string;featured:boolean;hotspots:{id:string;name:string;position:Vec3}[];boundingBox:{min:Vec3;max:Vec3}}
export interface ArchitecturalScene {id:string;name:string;position:Vec3;cameraPosition:Vec3;cameraTarget:Vec3;height:number;character:string;interpretation:string}
export interface Manifest {architecturalScenes?:ArchitecturalScene[];sunwenPlanting?:{position:Vec3;scale:number;rotation:number;kind:string;placeId?:string}[];understory?:{position:Vec3;scale:number;rotation:number;species:number;placeId?:string}[];groundCover?:{position:Vec3;scale:number;rotation:number}[];vegetation?:{position:Vec3;scale:Vec3;rotation:number;species?:number;placeId?:string|null}[];overview:string;overviewCamera:{position:Vec3;mobilePosition?:Vec3;target:Vec3};places:ScenePlace[];pathNodes:{id:string;position:Vec3}[];pathEdges:{from:string;to:string;kind:string}[];lake:{center:number[];radius:number[];outline?:number[][];holes?:number[][][]};boundary?:number[][];spatialBasis?:{note:string;url:string;plan:string}}
export interface CanonData {places:Place[];characters:Character[];events:CanonEvent[];sources:Source[];routes:Route[];relations:Relation[];manifest:Manifest; editionCatalog?:EditionCatalog}

export function narrativeText(text:string):string;
export function defaultGuiyouRoot():string;
export function loadGuiyou(root?:string):any;
export function playbackSource(editionId:string,chapter:number,corpusRoot?:string,guiyouRoot?:string):{chapter:number;title:string;sourceEdition:string;sha256:string;text:string;notesExcluded:boolean;scope:string};
export function guiyouReferences(payload:any,guiyouRoot?:string):any;

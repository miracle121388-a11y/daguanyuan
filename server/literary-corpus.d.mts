export interface CorpusExcerpt {editionId:string;sourceEdition:string;chapter:number;paragraphId:string;text:string;path:string;sha256:string;url:string|null;startOffset:number;endOffset:number;truncated:boolean}
export interface LiteratureReferences {status:string;excerpts:CorpusExcerpt[];endpoint?:CorpusExcerpt[];verificationExcerpts?:CorpusExcerpt[];note:string}
export function loadCorpus(root?:string):unknown;
export function searchCorpus(manifest:unknown,options:{editionId:string;maxChapter:number;query:string;limit?:number}):CorpusExcerpt[];
export function draftReferences(manifest:unknown,payload:unknown):CorpusExcerpt[];
export function continuationReferences(payload:unknown,root?:string):LiteratureReferences;
export function literaryReferences(payload:unknown,root?:string):LiteratureReferences;

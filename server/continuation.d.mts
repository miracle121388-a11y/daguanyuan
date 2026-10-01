export const continuationInstructions: Record<string,string>;
export const playbackInstructions:string;
export const reviewCategories:readonly string[];
export function validStoryReview(review:unknown):boolean;
export function validContinuationInput(operation:string,payload:unknown):boolean;
export function validContinuationResult(operation:string,result:unknown,payload:unknown):boolean;

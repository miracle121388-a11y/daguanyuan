import {z} from 'zod';
const id=z.enum(['baoyu','daiyu','baochai','wangxifeng']);
export const sourceSchema=z.object({label:z.string().min(1).max(160),through:z.number().int().min(1).max(120),summary:z.string().min(1).max(16000),tail:z.string().max(6000),characters:z.number().int().nonnegative(),sha256:z.string(),imported:z.boolean()});
export const chapterSourceSchema=z.object({chapter:z.number().int().min(81).max(120),title:z.string().max(200),sourceEdition:z.string().max(80),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const continuationResultSchema=z.object({title:z.string().min(1).max(100),narrative:z.string().min(200).max(3000),memory:z.string().min(1).max(10000),threads:z.array(z.string().min(1).max(200)).max(8),causality:z.string().min(1).max(500),characterStates:z.array(z.object({agent:id,alive:z.boolean()}).strict()).length(4),consequences:z.array(z.object({agent:id,fact:z.string().min(1).max(500)}).strict()).max(4),staging:z.array(z.object({agent:id,place:z.string(),action:z.enum(['read','write','rest','observe']),caption:z.string().min(1).max(120)}).strict()).max(2),sourceChapter:chapterSourceSchema.optional()}).strict();
export const episodeSchema=z.object({number:z.number().int().positive(),title:z.string().max(100),narrative:z.string().max(3000),causality:z.string().max(500),sourceChapter:chapterSourceSchema.optional()});
export const continuationSchema=z.object({source:sourceSchema,sequence:z.number().int().nonnegative(),playbackChapter:z.number().int().min(80).max(120).optional(),direction:z.string().max(800),memory:z.string().max(10000),threads:z.array(z.string().max(200)).max(8),episodes:z.array(episodeSchema).max(3)});
export type StorySource=z.infer<typeof sourceSchema>;
export type Continuation=z.infer<typeof continuationSchema>;
export interface NarrativeProvider {narrative(operation:'story-read'|'story-continue'|'story-review',payload:unknown,signal:AbortSignal):Promise<unknown>}

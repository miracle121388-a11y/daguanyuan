import {z} from 'zod';
const id=z.enum(['baoyu','daiyu','baochai','wangxifeng']);
export const storyStepSchema=z.object({intent:z.string().min(1).max(80),place:z.string(),target:id.optional(),activity:z.enum(['investigate','persuade','confide','reconcile','organize','manage','read','write','rest']),importance:z.number().int().min(1).max(10)}).strict();
export const storyPlanSchema=z.object({goal:z.string().min(1).max(120),steps:z.array(storyStepSchema).min(1).max(6),reflection:z.string().max(160)}).strict();
export const storyAgentSchema=z.object({goal:z.string().max(120),steps:z.array(storyStepSchema).max(6),reflection:z.string().max(160),completed:z.boolean().optional(),plannedTick:z.number().int(),memoryStamp:z.string(),task:z.string().max(400).default(''),taskRevision:z.number().int().default(0),plannedRevision:z.number().int().default(-1)});
const delta=z.number().int().min(-5).max(5);
export const storyOutcomeSchema=z.object({narrative:z.string().min(1).max(1200),fact:z.string().min(1).max(240),status:z.enum(['progress','completed','blocked']),thread:z.string().max(160),reflection:z.string().max(160),stability:z.union([z.literal(-10),z.literal(0),z.literal(10)]),finance:delta,reason:z.string().max(120),relations:z.array(z.object({from:id,to:id,trust:delta,affection:delta,resentment:delta}).strict()).max(2)}).strict();
export const storyRecordSchema=z.object({id:z.string(),tick:z.number().int(),actor:id,title:z.string(),narrative:z.string().max(1200),fact:z.string().max(240),thread:z.string().max(160),status:z.enum(['progress','completed','blocked']),participants:z.array(id).max(2),dialogue:z.array(z.object({speaker:id,text:z.string().max(400)})).max(4),stability:z.number(),finance:z.number(),reason:z.string().max(120)});
export type StoryStep=z.infer<typeof storyStepSchema>;
export type StoryOutcome=z.infer<typeof storyOutcomeSchema>;
export interface StoryRequest {perception: import('./types').Perception; scene?: StoryStep; participants?: import('./types').AgentId[]; dialogue?: {speaker:import('./types').AgentId;text:string}[]; task?:string; previous?:z.infer<typeof storyAgentSchema>}

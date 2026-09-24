import {z} from 'zod';
import type {Vec3} from '../data/types';
import {editionIdSchema, type LiteraryContext} from '../data/editions';

// IDs deliberately match reviewed canon. Simulation records never enter canon.
export const agentIds = ['baoyu', 'daiyu', 'baochai', 'wangxifeng'] as const;
export const agentIdSchema = z.enum(agentIds);
export type AgentId = z.infer<typeof agentIdSchema>;
export const actionNames = ['move', 'talk', 'observe', 'rest', 'read', 'write', 'visit', 'wait'] as const;
export const actionSchema = z.object({
  agent: agentIdSchema,
  action: z.enum(actionNames),
  target: z.string().max(80).optional(),
  reason: z.string().max(240).default(''),
  content: z.string().max(600).optional(),
  knowledgeId: z.string().max(100).optional(),
  spot: z.enum(['gate', 'court']).optional(),
  evidenceIds: z.array(z.string().max(300)).max(6).optional(),
}).strict();
export type SemanticAction = z.infer<typeof actionSchema>;
const score = z.number().finite().min(0).max(100);
export const relationshipSchema = z.object({affection: score, trust: score, jealousy: score, resentment: score});
export type Relationship = z.infer<typeof relationshipSchema>;
export const memorySchema = z.object({
  id: z.string(), tick: z.number().int().nonnegative(),
  type: z.enum(['knowledge', 'interaction', 'observation', 'activity', 'reflection']),
  content: z.string().max(800), participants: z.array(agentIdSchema),
  // A knowledge ID remains stable when a fact is shared; a memory ID is local.
  knowledgeId: z.string().optional(), origin: z.enum(['initial', 'intervention', 'generated', 'player']),
  sourceAgent: agentIdSchema.optional(), sourceEventId: z.string().optional(),
  evidenceIds: z.array(z.string()).max(8).optional(), importance: score.optional(),
});
export type Memory = z.infer<typeof memorySchema>;
export const planSchema = z.object({
  goal: z.string().max(180), trigger: z.enum(['routine', 'knowledge', 'needs', 'player', 'social']),
  createdTick: z.number().int().nonnegative(), steps: z.array(actionSchema).max(4),
  evidenceIds: z.array(z.string()).max(8),
});
export type AgentPlan = z.infer<typeof planSchema>;
export const directiveSchema = z.object({
  id: z.string(), agent: agentIdSchema, kind: z.enum(['move', 'visit', 'read', 'write', 'rest', 'observe', 'tell']),
  target: z.string().max(80).optional(), content: z.string().trim().max(400).optional(),
  spot: z.enum(['gate', 'court']).optional(), tick: z.number().int().nonnegative(),
}).strict();
export type PlayerDirective = z.infer<typeof directiveSchema>;
export const conversationReplySchema = z.object({reply: z.string().trim().min(1).max(600), evidenceIds: z.array(z.string().max(300)).max(6)}).strict();
export const conversationTurnSchema = z.object({
  id: z.string(), agent: agentIdSchema, tick: z.number().int().nonnegative(),
  message: z.string().trim().min(1).max(400), tone: z.enum(['chat', 'comfort', 'challenge']),
  reply: z.string().min(1).max(600), provider: z.string().max(80),
  evidence: z.array(z.object({id: z.string(), text: z.string().max(800)})).max(6),
  outcome: z.string().max(240),
});
export type ConversationTurn = z.infer<typeof conversationTurnSchema>;
export interface ConversationContext {
  literary?: LiteraryContext;
  agent: AgentId; name: string; personality: string[]; place: string; mood: {calm: number; energy: number};
  intention: string; memories: {id: string; content: string}[];
  history: {message: string; reply: string}[]; message: string; tone: ConversationTurn['tone'];
}
export const gatheringSchema = z.object({
  id: z.string(), place: z.string(), kind: z.enum(['poetry', 'tea']),
  participants: z.array(agentIdSchema).min(2).max(4).refine(ids => new Set(ids).size === ids.length),
  createdTick: z.number().int().nonnegative(), status: z.enum(['pending', 'completed', 'cancelled']),
  finishedTick: z.number().int().nonnegative().optional(),
});
export type Gathering = z.infer<typeof gatheringSchema>;
const vector = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
export const agentSchema = z.object({
  id: agentIdSchema, name: z.string(), alive: z.boolean(), location: z.string(), position: vector,
  personality: z.array(z.string()), goals: z.array(z.string()),
  mood: z.object({calm: score, energy: score}),
  relationships: z.record(agentIdSchema, relationshipSchema), memories: z.array(memorySchema).max(48),
  knownLocations: z.record(agentIdSchema, z.string()), currentAction: actionSchema.nullable(),
  spot: z.enum(['gate', 'court']).optional(), plan: planSchema.nullable().optional(),
  knowledgeLedger: z.record(z.string(), z.object({source: agentIdSchema.optional(), sharedWith: z.array(agentIdSchema).max(4), learnedTick: z.number().int().nonnegative()})).refine(value => Object.keys(value).length <= 48).optional(),
  reflection: z.object({tick: z.number().int().nonnegative(), text: z.string(), evidenceIds: z.array(z.string())}).optional(),
  playerBond: score.optional(), playerEffectTick: z.number().int().nonnegative().optional(),
});
export type Agent = z.infer<typeof agentSchema>;
export const eventSchema = z.object({
  id: z.string(), tick: z.number().int().nonnegative(), time: z.string(),
  agent: agentIdSchema.optional(), kind: z.enum(['action', 'dialogue', 'rule', 'relationship', 'intervention', 'player', 'reflection', 'conversation', 'choice', 'gathering']),
  text: z.string(), contentType: z.literal('generated'),
  target: agentIdSchema.optional(), location: z.string().optional(), knowledgeId: z.string().optional(),
  evidenceIds: z.array(z.string()).max(8).optional(), reason: z.string().max(240).optional(),
});
export type SimulationEvent = z.infer<typeof eventSchema>;
export const worldSchema = z.object({
  editionId: editionIdSchema.optional(), storyNodeId: z.string().optional(), storyChapter: z.number().int().min(1).max(120).optional(),
  tick: z.number().int().nonnegative(), minutes: z.number().int().nonnegative(), branchId: z.enum(['main', 'if']),
  world: z.object({jia_family_stability: score, jia_family_finance: score}),
  agents: z.record(agentIdSchema, agentSchema), events: z.array(eventSchema),
  contentType: z.literal('generated'),
  worldId: z.string().optional(), directives: z.array(directiveSchema).max(4).default([]),
  interactionSerial: z.number().int().nonnegative().optional(),
  conversations: z.array(conversationTurnSchema).max(20).optional(),
  resolvedEncounters: z.array(z.object({id: z.string(), choice: z.string(), outcome: z.string().max(400), tick: z.number().int().nonnegative()})).max(32).optional(),
  gathering: gatheringSchema.nullable().optional(),
});
export type WorldState = z.infer<typeof worldSchema>;
export const interventionSchema = z.discriminatedUnion('type', [
  z.object({type: z.literal('knowledge'), target: agentIdSchema, content: z.string().trim().min(1).max(400)}).strict(),
  z.object({type: z.literal('mood'), target: agentIdSchema, field: z.enum(['calm', 'energy']), value: score}).strict(),
  z.object({type: z.literal('world'), field: z.enum(['jia_family_stability', 'jia_family_finance']), value: score}).strict(),
]);
export type Intervention = z.infer<typeof interventionSchema>;
export const snapshotSchema = z.object({
  worldState: worldSchema, actions: z.array(actionSchema), summary: z.string(), provider: z.string(),
  label: z.string().max(100).optional(),
});
export type Snapshot = z.infer<typeof snapshotSchema>;
const branchSchema = z.object({
  id: z.enum(['main', 'if']), forkTick: z.number().int().nonnegative(),
  uid: z.string().optional(),
  intervention: interventionSchema.nullable(), prompt: z.string(),
  snapshots: z.array(snapshotSchema).min(1).max(30), cursor: z.number().int().nonnegative(),
});
export type Branch = z.infer<typeof branchSchema>;
export const journalSchema = z.object({
  editionId: editionIdSchema.optional(),
  version: z.literal(1), layoutRevision: z.string(), active: z.enum(['main', 'if']),
  interventionSerial: z.number().int().nonnegative().default(0),
  main: branchSchema, if: branchSchema.nullable(),
  archives: z.array(z.object({id: z.string(), name: z.string(), branch: branchSchema})).max(3).default([]),
  directiveSerial: z.number().int().nonnegative().default(0),
});
export type Journal = z.infer<typeof journalSchema>;

export interface Perception {
  literary?: LiteraryContext;
  tick: number; time: string; self: Agent;
  household: {stability: number; finance?: number};
  nearby: {id: AgentId; name: string; location: string; spot?: 'gate' | 'court'}[];
  places: {id: string; name: string; atmosphere?: string; activities?: string[]; spots?: string[]}[];
  memories: Memory[];
  dialogueOptions: {target: AgentId; content: string; knowledgeId?: string}[];
  hour: number; context: {place: string; setting: string; night: boolean};
  directive?: PlayerDirective;
  gathering?: {place: string; name: string; activity: 'write' | 'rest'; ready: boolean};
}
export interface LLMProvider {
  readonly name: string;
  generateAgentAction(perception: Perception, signal: AbortSignal): Promise<unknown>;
  parseIntervention(input: string, signal: AbortSignal): Promise<unknown>;
  summarizeTick(events: SimulationEvent[], signal: AbortSignal): Promise<string>;
  converse?(context: ConversationContext, signal: AbortSignal): Promise<unknown>;
}
export interface SceneCommand {
  action: SemanticAction; path: Vec3[]; destination?: string; destinationSpot?: 'gate' | 'court'; face?: Vec3;
}
export type SceneExecutor = (command: SceneCommand, signal: AbortSignal) => Promise<void>;

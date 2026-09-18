import {z} from 'zod';
import {editionIdSchema} from '../data/editions';
import {agentIdSchema} from '../simulation/types';

export const momentSchema = z.object({
  editionId: editionIdSchema, chapter: z.number().int().min(1).max(120), tick: z.number().int().nonnegative(),
  worldId: z.string().max(160), snapshotId: z.string().max(300), branch: z.enum(['main', 'if']),
  trigger: z.enum(['story', 'choice', 'gathering', 'conversation', 'manual']), title: z.string().max(80), text: z.string().max(1600),
  time: z.string().max(40), placeId: z.string(), cast: z.array(agentIdSchema).min(1).max(4), nodeId: z.string().optional(),
  mood: z.enum(['poetic', 'warm', 'dramatic']), framing: z.enum(['scene', 'portrait']), note: z.string().max(180),
});
export type ArtMoment = z.infer<typeof momentSchema>;
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const referenceSchema = z.object({
  id: z.string(), role: z.enum(['style', 'character', 'character-sheet', 'scene']), title: z.string(), path: z.string(), sha256: hashSchema,
  temporary: z.boolean(), note: z.string(), origin: z.string(), characterId: agentIdSchema.optional(), cast: z.array(agentIdSchema).optional(), placeId: z.string().optional(),
  sources: z.array(z.object({path: z.string(), sha256: hashSchema, catalog: z.string(), sourceId: z.string()})),
});
const referenceInputSchema = z.object({role: z.enum(['style', 'character', 'scene']), refId: z.string(), index: z.number().int().min(1).max(3)});
export const referenceSetSchema = z.object({
  revision: z.string(), styleRef: referenceSchema.nullable(), characterRefs: z.array(referenceSchema), characterSheet: referenceSchema.nullable(), sceneRef: referenceSchema.nullable(),
  inputs: z.array(referenceInputSchema).max(3), fallbacks: z.array(z.string()), planned: z.array(referenceInputSchema.extend({sha256: hashSchema.optional()})).optional(),
});
const providerSettingsSchema = z.object({
  protocol: z.enum(['dashscope', 'images']), size: z.string(), promptExtend: z.boolean(), enableThinking: z.boolean(), thinkingEffective: z.boolean().nullable(),
  nativeParameters: z.boolean(), negativePromptTransport: z.enum(['parameters.negative_prompt', 'prompt-only']), referencesEnabled: z.boolean(),
  configuredSeed: z.number().int().min(0).max(2147483647).nullable(), quality: z.string().nullable(), outputFormat: z.string().nullable(),
});
export const dreamJobSchema = z.object({
  id: z.string().uuid(), key: z.string(), moment: momentSchema, status: z.enum(['queued', 'painting', 'ready', 'failed']),
  createdAt: z.string(), startedAt: z.string().optional(), finishedAt: z.string().optional(), attempts: z.array(z.string()),
  model: z.string(), providerOrigin: z.string(), promptRevision: z.string(), prompt: z.string(), promptSha256: z.string(),
  contentType: z.literal('generated-art'), error: z.string().optional(), mime: z.string().optional(), bytes: z.number().optional(), imageSha256: z.string().optional(),
  referenceArt: z.string().optional(), referenceSha256: z.string().optional(),
  resumeAvailable: z.boolean().optional(), providerTaskId: z.string().optional(), providerRequestId: z.string().optional(),
  // Defaults preserve v5 browser archives without pretending they used the new style.
  cardNo: z.string().regex(/^(NO\.\d{3,}|IF\.\d{4,})$/).nullable().default(null), cardKind: z.enum(['story-node', 'personal']).nullable().default(null),
  styleVersion: z.string().default('legacy'), styleName: z.string().default('旧藏'),
  negativePrompt: z.string().default(''), negativePromptSha256: hashSchema.optional(),
  seed: z.number().int().min(0).max(2147483647).nullable().default(null), seedSource: z.enum(['configured', 'derived', 'unsupported', 'unrecorded']).default('unrecorded'),
  promptSections: z.array(z.object({id: z.string(), heading: z.string(), text: z.string()})).default([]),
  referenceSet: referenceSetSchema.nullable().default(null), referenceFallback: z.string().optional(), providerSettings: providerSettingsSchema.nullable().default(null),
  providerPayloadSha256: hashSchema.optional(), submittedParameters: z.record(z.string(), z.unknown()).optional(),
  scenePlanSettings: z.object({revision: z.string(), enabled: z.boolean(), model: z.string().nullable(), providerOrigin: z.string().nullable()}).optional(),
  scenePlan: z.object({revision: z.string(), sourceSha256: hashSchema, model: z.string().nullable(), status: z.enum(['ready', 'direct', 'fallback']), reason: z.string().optional(), cast: z.array(agentIdSchema).optional(), setting: z.string().optional(), action: z.string().optional(), contentSha256: hashSchema.optional(), requestSha256: hashSchema.optional()}).optional(),
});
export type DreamJob = z.infer<typeof dreamJobSchema>;
export interface DreamEntry {job: DreamJob; image?: Blob; favorite: boolean; savedAt?: string; url?: string}
export interface DreamConfig {configured: boolean; needsToken: boolean; dailyLimit: number; remaining: number; model: string; styleVersion?: string; styleName?: string; promptRevision?: string; referenceRevision?: string; error?: string}

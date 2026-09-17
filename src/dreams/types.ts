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
export const dreamJobSchema = z.object({
  id: z.string().uuid(), key: z.string(), moment: momentSchema, status: z.enum(['queued', 'painting', 'ready', 'failed']),
  createdAt: z.string(), startedAt: z.string().optional(), finishedAt: z.string().optional(), attempts: z.array(z.string()),
  model: z.string(), providerOrigin: z.string(), promptRevision: z.string(), prompt: z.string(), promptSha256: z.string(),
  contentType: z.literal('generated-art'), error: z.string().optional(), mime: z.string().optional(), bytes: z.number().optional(), imageSha256: z.string().optional(),
  referenceArt: z.string().optional(), referenceSha256: z.string().optional(),
  resumeAvailable: z.boolean().optional(), providerTaskId: z.string().optional(), providerRequestId: z.string().optional(),
});
export type DreamJob = z.infer<typeof dreamJobSchema>;
export interface DreamEntry {job: DreamJob; image?: Blob; favorite: boolean; savedAt?: string; url?: string}
export interface DreamConfig {configured: boolean; needsToken: boolean; dailyLimit: number; remaining: number; model: string; error?: string}

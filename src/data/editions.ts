import {z} from 'zod';

export const editionIds = ['original80', 'cheng120', 'guiyou108'] as const;
export const editionIdSchema = z.enum(editionIds);
export type EditionId = z.infer<typeof editionIdSchema>;
export const editionSchema = z.object({
  id: editionIdSchema, title: z.string(), shortTitle: z.string(), chapters: z.number().int().positive(),
  description: z.string(), boundary: z.string(), coverage: z.string(),
});
export type Edition = z.infer<typeof editionSchema>;
export const editionSourceSchema = z.object({
  id: z.string(), title: z.string(), url: z.url(), retrievedAt: z.string(), rawPath: z.string(), textPath: z.string(),
  rawSha256: z.string().regex(/^[a-f0-9]{64}$/), normalizedTextSha256: z.string().regex(/^[a-f0-9]{64}$/),
  excerpt: z.string().min(1), locator: z.string(), licenseNote: z.string(), reviewStatus: z.literal('source_checked'),
});
export const storyNodeSchema = z.object({
  id: z.string(), editions: z.array(editionIdSchema).min(1), chapter: z.number().int().min(1).max(120),
  title: z.string(), summary: z.string(), evidenceKind: z.enum(['chapter_excerpt', 'chapter_heading']),
  sourceRefs: z.array(z.string()).min(1), eventId: z.string().optional(), art: z.string(),
  place: z.string(), staging: z.string(), focus: z.enum(['baoyu', 'daiyu', 'baochai', 'wangxifeng']),
  atmosphere: z.enum(['petals', 'light', 'embers', 'rain']),
  frames: z.array(z.object({title: z.string(), text: z.string(), position: z.string(), scale: z.number().min(1).max(1.6)})).length(3),
  seed: z.object({stability: z.number().min(0).max(100), finance: z.number().min(0).max(100),
    inactiveAgents: z.array(z.enum(['baoyu', 'daiyu', 'baochai', 'wangxifeng'])).optional(),
    agents: z.array(z.object({id: z.enum(['baoyu', 'daiyu', 'baochai', 'wangxifeng']), memory: z.string().max(400), goal: z.string(), calm: z.number().min(0).max(100)}))}),
});
export type StoryNode = z.infer<typeof storyNodeSchema>;
export const editionCatalogSchema = z.object({editions: z.array(editionSchema).length(3), sources: z.array(editionSourceSchema), nodes: z.array(storyNodeSchema)});
export type EditionCatalog = z.infer<typeof editionCatalogSchema>;
export interface LiteraryContext {id: EditionId; title: string; chapter: number; maxChapter: number}
export const fallbackEditions: Edition[] = [
  {id: 'original80', title: '前八十回', shortTitle: '八十回本', chapters: 80, description: '以曹雪芹前八十回为依据。', boundary: '第八十回之后保持开放，不预设续本结局。', coverage: '沿用已核对的共同前八十回节点。'},
  {id: 'cheng120', title: '程高本 · 一百二十回', shortTitle: '程高本', chapters: 120, description: '含程伟元、高鹗整理刊行的后四十回。', boundary: '后四十回单独标为程高续本依据；不混入癸酉本。', coverage: '共同前八十回与已核对的后四十回关键节点。'},
  {id: 'guiyou108', title: '癸酉本 · 一百零八回', shortTitle: '癸酉本', chapters: 108, description: '又称《吴氏石头记》，采用独立的后续走向。', boundary: '来源与真伪有争议，不作为曹雪芹原稿定论。', coverage: '前八十回借用共同节点，未作异文校勘；后续按2014年版公开回目设定起点，未收录全文。'},
];
export function editionFor(id: EditionId, catalog?: EditionCatalog) { return (catalog?.editions ?? fallbackEditions).find(e => e.id === id)!; }
export function storyNodes(catalog: EditionCatalog | undefined, id: EditionId, limit: number | null) {
  return (catalog?.nodes ?? []).filter(n => n.editions.includes(id) && (limit === null || n.chapter <= limit));
}

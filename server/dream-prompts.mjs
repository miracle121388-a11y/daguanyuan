import {createHash} from 'node:crypto';
import {negativePrompt} from './dream-style.mjs';
import {describeReferences} from './dream-references.mjs';

export const promptRevision = 'dream-silk-4';
const limits = {original80: 80, cheng120: 120, guiyou108: 108};
const ids = ['baoyu', 'daiyu', 'baochai', 'wangxifeng'];
const text = (s, max) => typeof s === 'string' && s.length > 0 && s.length <= max;
export function validMoment(m, catalog, places) {
  return m && Object.hasOwn(limits, m.editionId) && Number.isInteger(m.chapter) && m.chapter > 0 && m.chapter <= limits[m.editionId]
    && Number.isInteger(m.tick) && m.tick >= 0 && text(m.worldId, 160) && text(m.snapshotId, 300)
    && ['main', 'if'].includes(m.branch) && ['story', 'choice', 'gathering', 'conversation', 'manual'].includes(m.trigger)
    && text(m.title, 80) && text(m.text, 1600) && text(m.time, 40) && places.some(p => p.id === m.placeId)
    && Array.isArray(m.cast) && m.cast.length > 0 && m.cast.length <= 4 && new Set(m.cast).size === m.cast.length && m.cast.every(id => ids.includes(id))
    && (!m.nodeId || catalog.nodes.some(n => n.id === m.nodeId && n.chapter === m.chapter && n.editions.includes(m.editionId)))
    && ['poetic', 'warm', 'dramatic'].includes(m.mood) && ['scene', 'portrait'].includes(m.framing)
    && typeof m.note === 'string' && m.note.length <= 180;
}
export function cleanMoment(m) {
  return Object.fromEntries(['editionId', 'chapter', 'tick', 'worldId', 'snapshotId', 'branch', 'trigger', 'title', 'text', 'time', 'placeId', 'cast', 'nodeId', 'mood', 'framing', 'note'].filter(k => m[k] !== undefined).map(k => [k, m[k]]));
}
const portraits = {
  daiyu: 'Lin Daiyu, a slender young woman with fine brows, small restrained eyes, a traditional black updo, pale celadon robes and a muted rose sash.',
  baoyu: 'Jia Baoyu, a gentle young man with traditionally bound hair, a muted crimson robe and plain ivory inner collar.',
  baochai: 'Xue Baochai, a composed young woman with a neat updo, soft rounded features and warm ivory robes with fine ochre ornament.',
  wangxifeng: 'Wang Xifeng, a decisive young noblewoman with clear brows, a restrained pinned updo and deep carmine robes.',
};
export function visibleSceneText(m) {
  const lines = m.text.split('\n');
  // Bibliography stays exact in moment; it is not picture copy.
  const staged = lines.find(line => line.startsWith('舞台演绎：'));
  if (staged) return staged.slice('舞台演绎：'.length);
  const visible = lines.filter(line => !/公开目录|公开回目|只据回目|回目列|画面属于本幕|作者真伪|出版信息/.test(line));
  return visible.join('\n') || '在当前地点表现人物含蓄的心绪，不画未发生的行动。';
}
export function makeDreamPromptSections(m, catalog, places, referenceSet, exclusions = negativePrompt, plan) {
  const node = catalog.nodes.find(n => n.id === m.nodeId), place = places.find(p => p.id === m.placeId);
  return [
    {id: 'style', heading: '一、总风格说明', text: `A late-Qing gongbi narrative painting on matte silk, interpreted for a contemporary literary game. Fine steady ink contours, flat mineral-pigment glazes, thin washes and subtle ivory silk grain. Azurite, malachite, carmine and ochre; fully colored but restrained. Small natural eyes and pale ink-wash faces, handmade linework in garments and plants. Silk is the painting support, not shiny clothing. <reference-roles>${describeReferences(referenceSet)}</reference-roles>`},
    {id: 'literature', heading: '二、文学与版本边界说明', text: `Depict only this present moment, no endings from other editions and no future events. ${node?.evidenceKind === 'chapter_heading' ? 'The source is a chapter heading; the visible action is an artistic staging only.' : 'The painting is an artistic interpretation, not literary evidence.'}`},
    {id: 'scene', heading: '三、地点与场景说明', text: `${plan?.status === 'ready' ? plan.setting : `${place.name}, ${m.time}. ${place.description}`} Garden space is staged interpretation. Draw architectural lines and foliage in painted layers. Weather and the indoor/outdoor setting follow the current action, never an unrelated reference pose.`},
    {id: 'characters', heading: '四、人物造型与在场角色说明', text: `Exactly ${m.cast.length} people, only ${m.cast.map(id => portraits[id]).join(' ')} No absent characters, maids or bystanders. Fully clothed, natural hands and clear contact with objects. Keep hair and clothing identity, redraw the bodies for the current action.`},
    {id: 'composition', heading: '五、构图要求', text: `${m.framing === 'portrait' ? 'An intimate view of the current gesture, hands and nearby objects, with a recognizable garden detail.' : 'An asymmetrical medium-wide narrative scene, with the complete action visible and layered plants or architecture.'} Keep the face within the central sixty percent for mobile viewing. Painted open air, no blank sidebars. One continuous landscape image from edge to edge.`},
    {id: 'mood', heading: '六、光色与情绪要求', text: {poetic: 'Quiet poetry through restrained gestures, muted malachite, pale ink and ivory air. Soft flat color, no specular highlights.', warm: 'Tender connection through gaze and small gestures, warm ochre, pale gamboge and muted rose. Soft flat color, no halos.', dramatic: 'Restrained tension through dense ink lines, deep carmine and azurite shapes. Matte color, no cinematic glow.'}[m.mood]},
    {id: 'snapshot', heading: '七、剧情快照说明', text: `${plan?.status === 'ready' ? plan.action : `${visibleSceneText(m)} ${m.note}`} Depict the action, never transcribe the prose. Speech becomes expression, poems remain unlettered paper. Wishes and plans are not completed actions.`},
    {id: 'exclusions', heading: '八、禁止项说明', text: `Exclude ${exclusions}. No calligraphy, Chinese characters, letters, subtitles, captions, title, annotation, watermark, border, panels or explanatory page. Return only the uninterrupted painted scene.`},
  ];
}
// Headings belong to the audit record, not to the image composition. Qwen can
// otherwise reproduce the eight headings as an illustrated instruction sheet.
export const joinPromptSections = sections => 'Create a NEW full-bleed painting of this action, with NO text anywhere: ' + sections.find(s => s.id === 'snapshot').text + '\n' + sections.filter(s => s.id !== 'snapshot').map(section => section.text.replace(/<\/?reference-roles>/g, '')).join(' ');
export const makeDreamPrompt = (m, catalog, places, referenceSet, exclusions) => joinPromptSections(makeDreamPromptSections(m, catalog, places, referenceSet, exclusions));
export const digest = s => createHash('sha256').update(s).digest('hex');


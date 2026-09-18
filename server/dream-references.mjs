import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const pathPattern = /^dream-(?:style|characters|scenes)\/[a-z0-9-]+\.webp$/;
const names = {daiyu: 'Lin Daiyu', baoyu: 'Jia Baoyu', baochai: 'Xue Baochai', wangxifeng: 'Wang Xifeng'};
export const emptyReferenceSet = (reason = '未启用图像参考，按梦绢文字规范作画。') => ({revision: 'text-only', styleRef: null, characterRefs: [], characterSheet: null, sceneRef: null, inputs: [], fallbacks: [reason]});

/** Optional assets never take down the private album. Only hash-verified local
 * resources enter the provider message; source metadata is safe to export. */
export async function loadDreamReferences(publicRoot) {
  const registry = {manifest: null, assets: new Map()};
  try {
    const manifest = JSON.parse(await readFile(resolve(publicRoot, 'data/dreamReferences.json'), 'utf8'));
    if (manifest.reviewStatus !== 'source_checked' || !Array.isArray(manifest.refs)) return registry;
    registry.manifest = manifest;
    for (const ref of manifest.refs) {
      try {
        if (!pathPattern.test(ref.path) || ref.reviewStatus !== 'source_checked' || !/^[a-f0-9]{64}$/.test(ref.sha256)) continue;
        const bytes = await readFile(resolve(publicRoot, ref.path));
        if (bytes.length > 10 * 1048576 || digest(bytes) !== ref.sha256 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') continue;
        const {id, role, title, path, sha256, temporary, note, characterId, cast, placeId, origin} = ref;
        const metadata = {id, role, title, path, sha256, temporary, note, ...(characterId ? {characterId} : {}), ...(cast ? {cast} : {}), ...(placeId ? {placeId} : {}), origin,
          sources: (ref.sources ?? []).map(({path, sha256, catalog, sourceId}) => ({path, sha256, catalog, sourceId}))};
        registry.assets.set(id, {metadata, bytes});
      } catch { /* Missing/corrupt optional reference falls back to text. */ }
    }
  } catch { /* Older published trees have no reference catalog. */ }
  return registry;
}
function inputsFor(set) {
  return [set.styleRef && {role: 'style', refId: set.styleRef.id}, (set.characterSheet ?? set.characterRefs[0]) && {role: 'character', refId: (set.characterSheet ?? set.characterRefs[0]).id}, set.sceneRef && {role: 'scene', refId: set.sceneRef.id}].filter(Boolean).map((input, i) => ({...input, index: i + 1}));
}
export function chooseReferences(moment, registry, enabled = true) {
  if (!enabled) return emptyReferenceSet();
  const {manifest, assets} = registry, ref = id => assets.get(id)?.metadata ?? null;
  if (!manifest) return emptyReferenceSet('参考目录暂不可用；使用完整的文字造型、地点与梦绢规范。');
  const cast = (manifest.characterOrder ?? []).filter(id => moment.cast.includes(id));
  const characterRefs = cast.map(id => ref(manifest.characterRefs?.[id])).filter(Boolean);
  const exactSheet = characterRefs.length === cast.length && ref(manifest.characterSheets?.[cast.join('+')]);
  const set = {revision: manifest.revision, styleRef: ref(manifest.styleRef), characterRefs, characterSheet: exactSheet || null, sceneRef: ref(manifest.sceneRefs?.[moment.placeId]), inputs: [], fallbacks: []};
  if (!set.styleRef) set.fallbacks.push('风格图缺失或未通过校验，以梦绢文字规范为准。');
  if (characterRefs.length !== moment.cast.length) set.fallbacks.push('部分人物没有可用造型图，缺少部分按文字造型绘制。');
  if (characterRefs.length > 1 && !exactSheet) set.fallbacks.push('多人造型页不可用，仅送第一位人物参考，其余人物按文字造型绘制。');
  if (!set.sceneRef) set.fallbacks.push('当前地点没有可用空间参考，不借用其他院落；按本次地点文字绘制。');
  set.inputs = inputsFor(set); return set;
}
export function describeReferences(set) {
  if (!set?.inputs?.length) return 'Use the written style, character and scene directions; no reference images are attached.';
  const descriptions = set.inputs.map(input => {
    if (input.role === 'style') return `Image ${input.index} supplies only silk ground and fine ink lines, not its bamboo pattern or layout.`;
    if (input.role === 'scene') return `Image ${input.index} supplies only garden architecture and planting relationships. Redraw as flat gongbi, without copying its viewpoint, weather or photographic lighting.`;
    const cast = set.characterSheet?.cast ?? [set.characterRefs[0]?.characterId].filter(Boolean);
    return `Image ${input.index} supplies only hair, age and clothing identity for ${cast.map(id => names[id]).join(', ')}${cast.length > 1 ? ', ordered left to right then top to bottom' : ''}. Do not copy its pose, hands, props, composition, glossy face or eye size.`;
  });
  return descriptions.join(' ') + ' The current action and matte gongbi style override all reference poses and surfaces.';
}
export function materializeReferences(set, registry) {
  if (!set?.inputs?.length) return {set: set || emptyReferenceSet(), images: []};
  const byId = new Map([set.styleRef, set.characterSheet, set.sceneRef, ...set.characterRefs].filter(Boolean).map(ref => [ref.id, ref]));
  const matches = set.inputs.every(i => registry.assets.get(i.refId)?.metadata.sha256 === byId.get(i.refId)?.sha256);
  // Never silently swap a new reference into a queued, versioned job.
  if (!matches) return {set: {...emptyReferenceSet('原任务引用的参考文件已缺失或改变；本次仅按已保存的文字作画。'), planned: set.inputs.map(i => ({...i, sha256: byId.get(i.refId)?.sha256}))}, images: []};
  return {set, images: set.inputs.map(i => `data:image/webp;base64,${registry.assets.get(i.refId).bytes.toString('base64')}`)};
}

// Deterministic crops/composites explicitly requested for the first-stage reference set.
// No new generative calls; sources, original prompts and crop coordinates stay traceable.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const config = read('config/dream.references.json'), comics = read('data/canon/comicArt.json');
// Retired AI garden art stays in a source archive; the visitor gallery uses Sun Wen plates.
const sceneSourceCatalog = config.sceneSourceCatalog || 'public/art/manifest.json';
const art = read(sceneSourceCatalog);
const paper = '#f3f0e6', refs = [], portraits = new Map();
for (const group of ['style', 'characters', 'scenes']) mkdirSync(`public/dream-${group}`, {recursive: true});
function comicSource(id) {
  const item = comics.find(a => a.id === id), file = item?.derivatives.find(d => d.file === `public/comics/${id}.webp`);
  if (!file || hash(readFileSync(file.file)) !== file.sha256) throw Error('Unreviewed comic source: ' + id);
  return {path: file.file, sha256: file.sha256, catalog: 'data/canon/comicArt.json', sourceId: id, prompt: item.prompt, licenseNote: item.licenseNote};
}
async function save(spec, image, sources, transform) {
  const origin = `Existing project AI artwork, deterministically cropped/resized/composited for ${spec.role} reference. ${spec.note} Sources: ${sources.map(s => `${s.path} SHA256 ${s.sha256}`).join('; ')}. Not historical evidence.`;
  const bytes = await image.webp({quality: 84}).withExif({IFD0: {ImageDescription: origin, Copyright: 'Project AI artwork; temporary reference, not literary evidence'}}).toBuffer();
  const metadata = await sharp(bytes).metadata();
  const ref = {...spec, temporary: true, reviewStatus: 'source_checked', mime: 'image/webp', width: metadata.width, height: metadata.height, bytes: bytes.length, sha256: hash(bytes), origin, prompt: origin, promptKind: 'source-origin', sources, transform};
  writeFileSync(`public/${spec.path}`, bytes);
  writeFileSync(`public/${spec.path}.json`, JSON.stringify(ref, null, 2));
  refs.push(ref); return ref;
}
const styleSource = comicSource(config.style.source);
await save({id: config.style.id, role: 'style', title: '梦绢 · 绢屏局部习作', path: 'dream-style/silk-study-1.webp', note: config.style.note}, sharp(styleSource.path).extract(config.style.crop).resize(384, 512, {fit: 'contain', background: paper}), [styleSource], {crop: config.style.crop, resize: [384, 512], fit: 'contain'});
for (const character of config.characters) {
  const source = comicSource(character.source);
  const pixels = await sharp(source.path).extract(character.crop).resize(384, 512, {fit: 'contain', background: paper}).png().toBuffer();
  const ref = await save({id: `character-${character.id}-1`, role: 'character', characterId: character.id, title: `${character.name} · 临时造型参考`, path: `dream-characters/${character.id}.webp`, note: character.note || '既有项目漫画局部，暂取发髻、衣着与年龄感；不继承大眼、磨皮、光泽与原情节。'}, sharp(pixels), [source], {crop: character.crop, resize: [384, 512], fit: 'contain'});
  portraits.set(character.id, {pixels, ref});
}
const sheets = {};
for (let mask = 1; mask < 2 ** config.characters.length; mask++) {
  const cast = config.characters.filter((_, i) => mask & 1 << i).map(c => c.id), key = cast.join('+');
  if (cast.length === 1) {sheets[key] = portraits.get(cast[0]).ref.id; continue;}
  const cols = 2, rows = Math.ceil(cast.length / 2), path = `dream-characters/sheet-${cast.join('-')}.webp`;
  const ref = await save({id: `sheet-${cast.join('-')}-1`, role: 'character-sheet', cast, title: '在场人物 · 临时造型页', path, note: '仅含选定人物，按先左后右、先上后下排列；最后的空格不代表人物。只参考造型，不沿用原图剧情与画风。'}, sharp({create: {width: cols * 384, height: rows * 512, channels: 3, background: paper}}).composite(cast.map((id, i) => ({input: portraits.get(id).pixels, left: i % cols * 384, top: Math.floor(i / cols) * 512}))), cast.flatMap(id => portraits.get(id).ref.sources), {layout: [cols, rows], cells: cast.map((id, i) => ({characterId: id, sourceRef: portraits.get(id).ref.id, left: i % cols * 384, top: Math.floor(i / cols) * 512}))});
  sheets[key] = ref.id;
}
for (const scene of config.scenes) {
  const item = art.find(a => a.id === scene.source);
  const sourcePath = item?.archivePath || 'public/' + item?.url;
  if (!item || item.placeId !== scene.placeId || hash(readFileSync(sourcePath)) !== item.sha256) throw Error('Unreviewed place source: ' + scene.placeId);
  const source = {path: sourcePath, sha256: item.sha256, catalog: sceneSourceCatalog, sourceId: item.id, prompt: item.prompt, licenseNote: item.provenance,
    ...(item.archivePath ? {originalPath: item.originalPath, originalCatalog: item.originalCatalog} : {})};
  await save({id: `scene-${scene.placeId}-1`, role: 'scene', placeId: scene.placeId, title: item.title + ' · 空间参考', path: `dream-scenes/${scene.placeId}.webp`, note: '已审阅园景美术的临时空间参考，只取厅堂、路径与花木关系；忽略摄影表面、天气、镜头光效与画面文字。不是原著考据复原。'}, sharp(source.path).resize(768, 512, {fit: 'contain', background: paper}), [source], {resize: [768, 512], fit: 'contain'});
}
const manifest = {revision: config.revision, styleVersion: 'honglou-silk-v1', styleName: '梦绢', reviewStatus: 'source_checked', temporary: true, styleRef: config.style.id, characterOrder: config.characters.map(c => c.id), characterRefs: Object.fromEntries(config.characters.map(c => [c.id, `character-${c.id}-1`])), characterSheets: sheets, sceneRefs: Object.fromEntries(config.scenes.map(s => [s.placeId, `scene-${s.placeId}-1`])), refs};
writeFileSync('data/canon/dreamReferences.json', JSON.stringify(manifest, null, 2));
console.log(`Prepared ${refs.length} reviewed temporary references, ${Object.keys(sheets).length} cast combinations; ${refs.reduce((sum, ref) => sum + ref.bytes, 0)} image bytes. Publish with npm run data:build.`);

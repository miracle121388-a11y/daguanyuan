import {readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const dir = 'output/imagegen/story-comics';
mkdirSync('public/comics', {recursive: true});
const assets = [];
for (const item of JSON.parse(readFileSync(`${dir}/prompts.json`, 'utf8'))) {
  const original = `${dir}/${item.id}.png`;
  if (!existsSync(original)) copyFileSync(item.sourcePath, original);
  const files = [];
  for (const width of [1536, 768]) {
    const file = `public/comics/${item.id}${width === 768 ? '-mobile' : ''}.webp`;
    await sharp(original).resize({width, withoutEnlargement: true}).webp({quality: 86}).withExif({IFD0: {ImageDescription: item.prompt, Copyright: 'AI-generated for Daguanyuan; not historical evidence'}}).toFile(file);
    files.push({file, sha256: hash(file), bytes: readFileSync(file).length});
  }
  assets.push({id: item.id, generator: 'built-in image_gen', generatedAt: '2026-09-16', original, sourceSha256: hash(original),
    prompt: item.prompt, licenseNote: 'Original AI-generated project artwork; no third-party image or actor likeness supplied. Literary interpretation, not documentary evidence.', derivatives: files});
}
writeFileSync('data/canon/comicArt.json', JSON.stringify(assets, null, 2));
console.log('Prepared', assets.length, 'original illustrations and responsive local WebP assets.');

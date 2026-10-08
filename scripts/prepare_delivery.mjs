import {readdirSync,readFileSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
const entries={};
function walk(dir){for(const name of readdirSync(dir).sort()){const p=dir+'/'+name;if(statSync(p).isDirectory())walk(p);else if(/\.(glb|webp|png|jpg|hdr|wasm|js|json)$/.test(p)&&!/(sample|pipeline-probe)\.glb$/.test(p)){const b=readFileSync(p);entries[p.slice(7)]={bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};}}}
for(const dir of ['public/models','public/textures','public/draco','public/data'])walk(dir);
for(const name of ['scene-manifest.json']){const b=readFileSync('public/'+name);entries[name]={bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};}
const revision=createHash('sha256').update(JSON.stringify(entries)).digest('hex').slice(0,20);
const content=JSON.stringify({revision,entries});
writeFileSync('config/runtime-delivery.json',content+'\n');
writeFileSync('public/asset-index.json',content+'\n');
console.log('Versioned runtime delivery:',revision,Object.keys(entries).length,'assets');

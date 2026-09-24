import {createServer} from 'node:http';
import {createReadStream,statSync,existsSync,readFileSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {gzipSync,brotliDecompressSync} from 'node:zlib';
import {createSimulationApi} from './server/simulation-api.mjs';
import {createDreamApi} from './server/dream-api.mjs';
if(existsSync('.env')&&process.loadEnvFile)process.loadEnvFile('.env');
const simulationApi=createSimulationApi();
const root=resolve(process.env.STATIC_ROOT||'dist');
const dreamApi=createDreamApi(process.env,fetch,{publicRoot:root});
const aliasFile=resolve(root,'asset-aliases.json');
const assetAliases=existsSync(aliasFile)?JSON.parse(readFileSync(aliasFile,'utf8')):{};
const compressible=new Set(['.html','.js','.css','.json','.wasm','.glb']);
const gzipCache=new Map();let gzipCacheBytes=0;
function gzipPayload(file,stat,decoded){
 const key=file+':'+stat.size+':'+stat.mtimeMs;
 if(gzipCache.has(key))return gzipCache.get(key);
 const body=gzipSync(decoded??readFileSync(file),{level:6});
 if(gzipCacheBytes+body.length>8*1048576){gzipCache.clear();gzipCacheBytes=0}
 if(body.length<=8*1048576){gzipCache.set(key,body);gzipCacheBytes+=body.length}
 return body;
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.glb':'model/gltf-binary','.wasm':'application/wasm','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.hdr':'application/octet-stream','.svg':'image/svg+xml'};
const revision=()=>{try{return JSON.parse(readFileSync(resolve(root,'scene-manifest.json'),'utf8')).assetRevision??'2'}catch{return '2'}};
const httpServer=createServer(async(req,res)=>{
 if(await dreamApi(req,res))return;
 if(await simulationApi(req,res))return;
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end()}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end()}
 if(pathname==='/healthz'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({status:'ok',application:'daguanyuan-rumeng',revision:revision(),featureRevision:'honglou-silk-20260917-v6',simulationRevision:'personal-reasoning-20260924-v1'}))}
 let file=resolve(root,'.'+pathname);if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);return res.end()}
 if(pathname==='/'||pathname.endsWith('/'))file=resolve(file,'index.html');
 const alias=Object.hasOwn(assetAliases,pathname.slice(1))?assetAliases[pathname.slice(1)]:null;
 if(alias){file=resolve(root,alias);if(!file.startsWith(root+sep)){res.writeHead(500);return res.end()}}
 const packedOnly=!existsSync(file)&&['.glb','.js','.wasm'].includes(extname(file))&&existsSync(file+'.br');
 if((!existsSync(file)&&!packedOnly)||!statSync(packedOnly?file+'.br':file).isFile()){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('未找到此资源')}
 const ext=extname(file),accept=req.headers['accept-encoding']??'';let encoding,dynamicGzip=false;
 const accepted=new Map(accept.split(',').map(part=>{const [name,...params]=part.trim().toLowerCase().split(';');const q=params.find(p=>p.trim().startsWith('q='));return [name,q?Number(q.trim().slice(2)):1]}));
 const allows=name=>(accepted.get(name)??accepted.get('*')??0)>0;
 if(allows('br')&&existsSync(file+'.br')){file+='.br';encoding='br'}else if(allows('gzip')){
  if(existsSync(file+'.gz')){file+='.gz';encoding='gzip'}else if(compressible.has(ext)){encoding='gzip';dynamicGzip=true}
 }
 const stored=packedOnly&&encoding!=='br'?file+'.br':file;
 const stat=statSync(stored),etag='"'+stat.size.toString(16)+'-'+Math.round(stat.mtimeMs).toString(16)+'-'+(encoding??'identity')+'"';
 const headers={'Content-Type':types[ext]??'application/octet-stream','ETag':etag,'Vary':'Accept-Encoding','Cache-Control':pathname.startsWith('/assets/')||pathname.startsWith('/draco/')||/^\/textures\/shared\/[a-f0-9]{64}\.(jpg|png)$/.test(pathname)?'public, max-age=31536000, immutable':'public, max-age=0, must-revalidate','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"};
 if(encoding)headers['Content-Encoding']=encoding;
 if(req.headers['if-none-match']===etag){res.writeHead(304,headers);return res.end()}
 const decoded=packedOnly&&encoding!=='br'?brotliDecompressSync(readFileSync(stored)):null;
 const body=dynamicGzip?gzipPayload(stored,stat,decoded):decoded;
 res.writeHead(200,{...headers,'Content-Length':body?body.length:stat.size});if(req.method==='HEAD')return res.end();if(body)return res.end(body);createReadStream(file).pipe(res);
}).listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Daguanyuan static server ready'));

process.once("SIGTERM", async () => {
  const deadline = setTimeout(() => process.exit(0), 10000); deadline.unref();
  await dreamApi.close(); httpServer.close(() => process.exit(0));
});

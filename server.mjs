import {createServer} from 'node:http';
import {createReadStream,statSync,existsSync,readFileSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.env.STATIC_ROOT||'dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.glb':'model/gltf-binary','.wasm':'application/wasm','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const revision=()=>{try{return JSON.parse(readFileSync(resolve(root,'scene-manifest.json'),'utf8')).assetRevision??'2'}catch{return '2'}};
createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end()}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end()}
 if(pathname==='/healthz'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({status:'ok',application:'daguanyuan-rumeng',revision:revision()}))}
 let file=resolve(root,'.'+pathname);if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);return res.end()}
 if(pathname==='/'||pathname.endsWith('/'))file=resolve(file,'index.html');
 if(!existsSync(file)||!statSync(file).isFile()){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('未找到此资源')}
 const ext=extname(file),accept=req.headers['accept-encoding']??'';let encoding;
 if(accept.includes('br')&&existsSync(file+'.br')){file+='.br';encoding='br'}else if(accept.includes('gzip')&&existsSync(file+'.gz')){file+='.gz';encoding='gzip'}
 const stat=statSync(file),etag='"'+stat.size.toString(16)+'-'+Math.round(stat.mtimeMs).toString(16)+'"';
 const headers={'Content-Type':types[ext]??'application/octet-stream','ETag':etag,'Vary':'Accept-Encoding','Cache-Control':pathname.startsWith('/assets/')||pathname.startsWith('/draco/')?'public, max-age=31536000, immutable':'public, max-age=0, must-revalidate','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"};
 if(encoding)headers['Content-Encoding']=encoding;
 if(req.headers['if-none-match']===etag){res.writeHead(304,headers);return res.end()}
 res.writeHead(200,{...headers,'Content-Length':stat.size});if(req.method==='HEAD')return res.end();createReadStream(file).pipe(res);
}).listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Daguanyuan static server ready'));

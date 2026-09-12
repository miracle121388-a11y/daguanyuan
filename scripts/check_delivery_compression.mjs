// Exercise the exact packaged HTTP server, including the on-demand gzip path.
import {request} from 'node:http';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync,brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const url=process.env.APP_URL||'http://127.0.0.1:4283/';
const sha=b=>createHash('sha256').update(b).digest('hex');
function fetchRaw(file,encoding,method='GET',etag){return new Promise((resolve,reject)=>{
 const req=request(new URL(file,url),{method,headers:{'Accept-Encoding':encoding,...(etag?{'If-None-Match':etag}:{})}},res=>{
  const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
 });req.on('error',reject);req.end();
})}
const results=[];
const entry=JSON.parse(readFileSync('dist/.vite/manifest.json','utf8'))['index.html'].file;
for(const file of ['scene-manifest.json','models/overview-low.glb','models/places/daguanlou.glb',entry,'draco/draco_decoder.wasm']){
const expected=readFileSync((file.startsWith('assets/')?'dist/':'public/')+file),variants=[];
for(const [accept,wanted] of [['br','br'],['gzip','gzip'],['identity',undefined],['gzip;q=0, br;q=0',undefined]]){
 const r=await fetchRaw(file,accept);if(r.status!==200||r.headers['content-encoding']!==wanted)throw Error('Encoding negotiation failed: '+file+' '+accept);
 const body=wanted==='br'?brotliDecompressSync(r.body):wanted==='gzip'?gunzipSync(r.body):r.body;
 if(sha(body)!==sha(expected)||Number(r.headers['content-length'])!==r.body.length)throw Error('Transferred bytes differ: '+accept);
 const head=await fetchRaw(file,accept,'HEAD');if(head.body.length||Number(head.headers['content-length'])!==r.body.length||head.headers.etag!==r.headers.etag)throw Error('HEAD differs: '+accept);
 const cached=await fetchRaw(file,accept,'GET',r.headers.etag);if(cached.status!==304||cached.body.length)throw Error('Conditional request failed: '+accept);
 variants.push({accept,encoding:wanted??'identity',bytes:r.body.length,decodedSha256:sha(body),etag:r.headers.etag,headMatches:true,conditional304:true});
}
if(new Set(variants.slice(0,3).map(r=>r.etag)).size!==3)throw Error('Strong ETags must distinguish encoded representations');
results.push({file,sourceBytes:expected.length,variants});
}
writeFileSync(process.env.GARDEN_COMPRESSION_REPORT||'reports/acceptance/r12-delivery-compression.json',JSON.stringify({at:new Date().toISOString(),url,passed:true,results},null,2));
console.log('Exact package: Brotli, gzip fallback, identity, q=0, HEAD and conditional requests passed.');

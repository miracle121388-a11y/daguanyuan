// Temporary old-origin entry: preserve access to local browser saves while all
// application requests go to the new host. Remove when Zeabur is retired.
import {createServer} from 'node:http';
import {request} from 'node:https';
import {readFileSync} from 'node:fs';
const target='daguanyuan.inspiralai.com';
const oldOrigin='https://daguanyuan-rumeng.zeabur.app';
const page=readFileSync(new URL('./migrate.html',import.meta.url));
const script=readFileSync(new URL('./migration.js',import.meta.url));
const server=createServer((req,res)=>{
  let path;try{path=new URL(req.url,'https://'+target).pathname}catch{res.writeHead(400);res.end();return}
  if(path==='/'||path==='/migrate.html'||path==='/migration.js'){
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
    const body=path==='/migration.js'?script:page;
    res.writeHead(200,{'Content-Type':path==='/migration.js'?'text/javascript; charset=utf-8':'text/html; charset=utf-8','Content-Length':body.length,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:body);return;
  }
  if(req.headers.origin && req.headers.origin!==oldOrigin){res.writeHead(403);res.end();return}
  const headers={...req.headers,host:target};
  if(headers.origin)headers.origin='https://'+target;
  for(const name of ['connection','proxy-authorization','proxy-connection','forwarded','x-forwarded-host','x-forwarded-proto'])delete headers[name];
  const upstream=request({hostname:target,path:req.url,method:req.method,headers,timeout:900000},reply=>{
    const out={...reply.headers};delete out.connection;
    res.writeHead(reply.statusCode||502,out);reply.pipe(res);
  });
  upstream.on('timeout',()=>upstream.destroy());
  upstream.on('error',()=>{if(res.headersSent){res.destroy();return}res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:'新园连接暂时中断，请前往 https://daguanyuan.inspiralai.com/。'}))});
  req.on('aborted',()=>upstream.destroy());res.on('close',()=>{if(!res.writableFinished)upstream.destroy()});req.pipe(upstream);
});
server.listen(Number(process.env.PORT)||3000,'0.0.0.0');
process.on('SIGTERM',()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),10000).unref()});

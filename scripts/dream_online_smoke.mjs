// One deliberate production generation; rerun with --resume to query the same ID.
import {request} from 'node:https';
import {randomBytes,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const host='daguanyuan-rumeng.zeabur.app';
const dns=await(await fetch(`https://dns.google/resolve?name=${host}&type=A`)).json();
const ip=dns.Answer.find(a=>a.type===1).data;
const token=JSON.parse(readFileSync('.local/dream-online-access.json')).token;
if(!token)throw Error('Existing production access token unavailable');
const resume=process.argv.includes('--resume');if(!resume&&!process.argv.includes('--generate'))throw Error('Choose --generate or --resume');
const archive=resume?JSON.parse(readFileSync('.local/dream-online-album.json')):{owner:randomBytes(32).toString('hex')};
const report={at:new Date().toISOString(),url:`https://${host}/`,live:true,model:'qwen-image-3.0-pro',checks:[],dns:{ip,osChanged:false,tlsVerified:true}};
const get=(path,body)=>new Promise((resolve,reject)=>{
 const raw=body===undefined?undefined:Buffer.from(JSON.stringify(body));
 const req=request(`https://${host}${path}`,{method:raw?'POST':'GET',headers:{'X-Dream-Album':archive.owner,...(raw?{'Content-Type':'application/json','Content-Length':raw.length,Authorization:'Bearer '+token}:{})},lookup:(_host,options,cb)=>options.all?cb(null,[{address:ip,family:4}]):cb(null,ip,4)},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,bytes:Buffer.concat(chunks)}));res.on('error',reject);});
 req.on('error',reject);req.setTimeout(45000,()=>req.destroy(Error('HTTPS request timeout')));req.end(raw);
});
try{
 const config=JSON.parse((await get('/api/dreams/config')).bytes);if(!config.configured||config.model!==report.model)throw Error('Production image model is not ready');report.checks.push('production reports configured Qwen 3.0 Pro');
 let job;
 if(resume){job=JSON.parse((await get('/api/dreams/jobs/'+archive.jobId)).bytes).job;if(job.status==='failed'&&job.resumeAvailable)job=JSON.parse((await get('/api/dreams/jobs/'+job.id+'/retry',{})).bytes).job;}
 else{
  const sample=JSON.parse(readFileSync('reports/acceptance/dream-live.json')).job.moment;
  const moment={...sample,worldId:'production-acceptance-'+Date.now()};
  const response=await get('/api/dreams/jobs',{moment});if(response.status!==202)throw Error('Production did not accept the job');job=JSON.parse(response.bytes).job;
  archive.jobId=job.id;writeFileSync('.local/dream-online-album.json',JSON.stringify(archive));report.checks.push('one actual generation submitted in production');
 }
 const end=Date.now()+680000;
 while(['queued','painting'].includes(job.status)&&Date.now()<end){await new Promise(r=>setTimeout(r,8000));job=JSON.parse((await get('/api/dreams/jobs/'+job.id)).bytes).job;}
 report.job=job;if(job.status!=='ready')throw Error(job.error||'Image is not ready');
 const original=await get('/api/dreams/jobs/'+job.id+'/image');if(original.status!==200||createHash('sha256').update(original.bytes).digest('hex')!==job.imageSha256)throw Error('Production image hash mismatch');
 mkdirSync('output/imagegen/dream-live',{recursive:true});writeFileSync('output/imagegen/dream-live/qwen-online.png',original.bytes);
 const duplicate=JSON.parse((await get('/api/dreams/jobs',{moment:job.moment})).bytes);if(!duplicate.reused||duplicate.job.id!==job.id)throw Error('Production deduplication failed');
 report.checks.push('production downloaded and persisted actual Qwen image','private image API returned the original verified bytes','duplicate request reused existing image');report.passed=true;console.log('PASS real production Qwen image, hash and deduplication:',original.bytes.length,'bytes');
}catch(error){report.passed=false;report.error=String(error);process.exitCode=1;console.log(report.error);}
finally{writeFileSync('reports/acceptance/dream-live-online.json',JSON.stringify(report,null,2));}

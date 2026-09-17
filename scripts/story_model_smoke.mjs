// Explicit live integration check: three short conversations, one per edition.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
process.loadEnvFile('.env');
if(!process.env.LLM_ACCESS_TOKEN)throw new Error('Local access token is not configured.');
const catalog=JSON.parse(readFileSync('data/canon/editionCatalog.json','utf8'));
const report={at:new Date().toISOString(),url:process.env.APP_URL||'http://127.0.0.1:4291/',liveModel:true,results:[]};
for(const [id,nodeId] of [['original80','flowers-27'],['cheng120','manuscript-97'],['guiyou108','hope-90']]){
 const node=catalog.nodes.find(n=>n.id===nodeId),edition=catalog.editions.find(e=>e.id===id),seed=node.seed.agents[0];
 const literary={id,title:edition.title,chapter:node.chapter,maxChapter:edition.chapters};
 const payload={literary,agent:'daiyu',name:'林黛玉',personality:['敏感','才思敏捷'],place:'潇湘馆',mood:{calm:seed.calm,energy:78},intention:seed.goal,memories:[{id:'own-literary-memory',content:seed.memory}],history:[],message:'此刻你在牵挂什么？只说你自己眼前知道的事。',tone:'chat'};
 const started=Date.now();
 const response=await fetch(new URL('/api/simulation',report.url),{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.LLM_ACCESS_TOKEN}`},body:JSON.stringify({operation:'conversation',payload}),signal:AbortSignal.timeout(35000)});
 const body=await response.json();
 const valid=response.ok&&typeof body.result?.reply==='string'&&Array.isArray(body.result.evidenceIds)&&body.result.evidenceIds.every(id=>id==='own-literary-memory');
 report.results.push({edition:id,nodeId,literary,status:response.status,durationMs:Date.now()-started,valid,response:body});
 console.log(id,response.status,valid?'validated personal response':'failed');
}
report.passed=report.results.every(r=>r.valid);
mkdirSync('reports/acceptance',{recursive:true});
writeFileSync('reports/acceptance/story-model.json',JSON.stringify(report,null,2));
if(!report.passed)process.exitCode=1;

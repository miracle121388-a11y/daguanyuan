import {describe, expect, it, vi} from 'vitest';
import {createServer} from 'node:http';
import {approvedReview} from './review-fixture';
import {createSimulationApi} from '../server/simulation-api.mjs';
import {continuationIssues, parseModelObject} from '../server/story-format.mjs';
import {validContinuationResult} from '../server/continuation.mjs';

const draft = {title:'园中读信',narrative:'宝玉在屋中读罢来信，将信妥善收藏，没有把消息告诉旁人。'.repeat(12),memory:'宝玉读罢信后独自收存。',threads:['来信之事如何处理'],causality:'来信尚待核实，宝玉选择暂缓外传。',characterStates:['baoyu','daiyu','baochai','wangxifeng'].map(agent=>({agent,alive:true})),consequences:[{agent:'baoyu',fact:'读罢来信，选择暂缓外传。'}],staging:[{agent:'baoyu',place:'yihongyuan',action:'read',caption:'读信后暂缓外传'}]};
const payload = {edition:{id:'original80'},source:{label:'测试前情',through:80,summary:'宝玉刚收到来信',tail:'',imported:true},direction:'',memory:'',branchCondition:'',threads:[],history:[],stageActors:draft.characterStates.map(a=>({id:a.agent,alive:a.alive})),places:[{id:'yihongyuan',name:'怡红院'}]};
const settings={LLM_BASE_URL:'https://model.example/v1',LLM_MODEL:'fixture',LLM_API_KEY:'secret-fixture',LLM_ACCESS_TOKEN:'pass-fixture'};
const response = (content: unknown, finish_reason = 'stop') => new Response(JSON.stringify({choices:[{finish_reason,message:{content:typeof content==='string'?content:JSON.stringify(content)}}]}));
async function run(sequence: Response[], operation='story-continue') {
  const requests: any[] = [];
  const upstream = vi.fn(async (_url:any, options:any) => {requests.push(JSON.parse(options.body));return sequence.shift()??response('');});
  const server=createServer((req,res)=>void api(req,res));
  const api=createSimulationApi(settings,upstream as typeof fetch);
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const port=(server.address() as {port:number}).port;
    const result=await fetch(`http://127.0.0.1:${port}/api/simulation`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer pass-fixture'},body:JSON.stringify({operation,payload:{...payload,...(operation==='story-review'?{draft}:{})}})});
    return {status:result.status,body:await result.json(),requests};
  } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
describe('story format contract and automatic recovery',()=>{
  it('accepts a whole JSON fence without changing story data and rejects ambiguous/incomplete output',()=>{
    expect(parseModelObject('```json\n'+JSON.stringify(draft)+'\n```')).toEqual(draft);
    for(const content of ['',JSON.stringify(draft)+' extra','Explanation '+JSON.stringify(draft),'{"title":"unfinished"','[]','null']) expect(()=>parseModelObject(content)).toThrow();
  });
  it('uses the same field diagnostics as final validation, with no private text or model property names in logs',()=>{
    const invalid={...draft,causality:'私人剧情'.repeat(200),staging:[{...draft.staging[0],place:'unknown'}],['私有输入'+settings.LLM_API_KEY]:'x'};
    expect(validContinuationResult('story-continue',draft,payload)).toBe(true);
    expect(validContinuationResult('story-continue',invalid,payload)).toBe(false);
    const issues=continuationIssues('story-continue',invalid,payload).join('\n');
    expect(issues).toContain('$.causality: maximum 500');expect(issues).toContain('$.staging[0].place');
    expect(issues).not.toContain('私人剧情');expect(issues).not.toContain(settings.LLM_API_KEY);
  });
  it.each(['empty','truncated','envelope','syntax','schema','transient'] as const)('recovers %s output in one user request and preserves complete final data',async cause=>{
    const first={empty:()=>response(''),truncated:()=>response(JSON.stringify(draft).slice(0,100),'length'),envelope:()=>new Response('invalid upstream envelope'),syntax:()=>response(JSON.stringify(draft).replace('"threads":','threads:')),schema:()=>response({...draft,causality:'因果'.repeat(300)}),transient:()=>new Response('',{status:503})}[cause]();
    const result=await run([first,response(draft)]);
    expect(result.status).toBe(200);expect(result.body).toEqual({result:draft});expect(result.requests).toHaveLength(2);
    expect(JSON.stringify(result.body)).not.toContain(settings.LLM_API_KEY);
    if(cause==='schema')expect(JSON.parse(result.requests[1].messages[1].content).correction.issues[0]).toContain('$.causality');
  });
  it('recovers schema then syntax then schema across the entire pipeline, including missing editorial evidence',async()=>{
    const reviewed={...draft,review:approvedReview()};
    const malformed=JSON.stringify(reviewed).replace('"threads":','threads:');
    const invalid={...reviewed,review:{...reviewed.review,checks:reviewed.review.checks.slice(0,6)}};
    const result=await run([response(draft),response(malformed),response(invalid),response(reviewed)],'story-review');
    expect(result.status).toBe(200);expect(result.requests).toHaveLength(4);expect(result.body.result).toEqual(reviewed);
  });
  it('does not resurrect a dead character or create a local approval to recover a response',async()=>{
    const review=approvedReview();review.approved=false;review.checks[0].status='blocked';review.issues=['人物知情来源无法确认'];
    const result=await run([response({...draft,review})],'story-review');
    expect(result.status).toBe(422);expect(result.requests).toHaveLength(1);expect(result.body.result).toBeUndefined();
    expect(continuationIssues('story-continue',draft,{...payload,stageActors:payload.stageActors.map(a=>({...a,alive:a.id!=='daiyu'}))}).join()).toContain('cannot be resurrected');
  });
  it('preserves the latest edited draft when a report is missing instead of reverting to the earlier writer draft',async()=>{
    const edited={...draft,title:'编辑已修正的标题',memory:'编辑修正后的事实档案。'};
    const result=await run([response(edited),response({...edited,review:approvedReview()})],'story-review');
    expect(result.status).toBe(200);
    expect(JSON.parse(result.requests[1].messages[1].content).draft).toEqual(edited);
    expect(result.body.result.title).toBe(edited.title);
  });
  it('does not replace the real draft with an error envelope or turn a failed editorial conclusion into approval',async()=>{
    const review=approvedReview();review.approved=false;review.checks[0].status='blocked';review.issues=['时间顺序无法确认'];
    const result=await run([response({status:'blocked',reason:'需要核查前情'}),response({...draft,review})],'story-review');
    expect(JSON.parse(result.requests[1].messages[1].content).draft).toEqual(draft);
    expect(result.status).toBe(422);expect(result.body.result).toBeUndefined();
  });
  it('fails closed on permanent upstream errors without retries or a preset story',async()=>{
    const result=await run([new Response('',{status:401})]);
    expect(result.status).toBe(502);expect(result.requests).toHaveLength(1);expect(result.body.result).toBeUndefined();
  });
  it('never accepts a parseable but token-truncated final answer',async()=>{
    const result=await run(Array.from({length:4},()=>response(draft,'length')));
    expect(result.status).toBe(502);expect(result.requests).toHaveLength(4);expect(result.body.result).toBeUndefined();
  });
  it('edits overlong prose separately, recovers another malformed/overlong compact answer and preserves every other field',async()=>{
    const long={...draft,narrative:'长篇剧情。'.repeat(650)};
    const compact=JSON.stringify({narrative:draft.narrative});
    const result=await run([response(long),response(compact.replace('"narrative":','narrative:')),response({narrative:'长篇剧情。'.repeat(650)}),response({narrative:draft.narrative})]);
    expect(result.status).toBe(200);expect(result.requests).toHaveLength(4);expect(result.body.result).toEqual(draft);
    expect(JSON.parse(result.requests[1].messages[1].content)).toEqual({narrative:long.narrative});
    expect(result.requests[3].messages[0].content).toContain('400—700字');
  });
  it('also repairs TXT summary structure without silently truncating the imported text or summary',async()=>{
    const requests:any[]=[];
    const upstream=vi.fn(async(_url:any,options:any)=>{requests.push(JSON.parse(options.body));return response({summary:requests.length===1?'字'.repeat(10001):'全片已读，人物关系与末尾事件已保留。'});});
    const api=createSimulationApi(settings,upstream as typeof fetch);
    const server=createServer((req,res)=>void api(req,res));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    try{
      const port=(server.address() as {port:number}).port;
      const res=await fetch(`http://127.0.0.1:${port}/api/simulation`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer pass-fixture'},body:JSON.stringify({operation:'story-read',payload:{edition:{id:'original80'},text:'原文',previous:'',part:1}})});
      expect(res.status).toBe(200);expect(requests).toHaveLength(2);expect(JSON.parse(requests[1].messages[1].content).text).toBe('原文');
    }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
  });
});

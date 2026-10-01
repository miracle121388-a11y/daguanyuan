import {approvedReview} from './review-fixture';
import {createServer, type Server} from 'node:http';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {createSimulationApi} from '../server/simulation-api.mjs';

const servers: Server[] = [];
afterEach(async () => { for (const server of servers.splice(0)) await new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }); });
const settings = {LLM_BASE_URL: 'https://model.example/v1', LLM_MODEL: 'configured-model', LLM_API_KEY: 'server-secret-fixture', LLM_ACCESS_TOKEN: 'access-fixture'};
async function serve(env: Record<string, string | undefined> = {}, request: typeof fetch = fetch) {
  const api = createSimulationApi(env, request, {corpusRoot: 'data/canon/corpus'});
  const server = createServer((req, res) => { void api(req, res).then(handled => { if (!handled) { res.statusCode = 404; res.end(); } }); });
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as {port: number};
  return `http://127.0.0.1:${address.port}`;
}
const post = (url: string, body: unknown, headers = {}) => fetch(url + '/api/simulation', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer access-fixture', ...headers}, body: JSON.stringify(body)});

describe('optional server-side model boundary', () => {
  it('validates the shared site pass without calling the model or revealing its name', async () => {
    const upstream = vi.fn(); const url = await serve(settings, upstream as typeof fetch);
    const access = (headers = {}) => fetch(url + '/api/simulation/access', {headers});
    expect((await access()).status).toBe(401);
    expect((await access({Authorization:'Bearer wrong'})).status).toBe(401);
    const response = await access({Authorization:'Bearer access-fixture'});
    expect(response.status).toBe(200); expect(await response.json()).toEqual({authorized:true});
    expect((await access({Authorization:'Bearer access-fixture',Origin:'https://foreign.example'})).status).toBe(403);
    expect((await fetch(url+'/api/simulation/access',{method:'POST'})).status).toBe(405);
    expect((await fetch(await serve()+'/api/simulation/access')).status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
  });
  it('sends corpus endpoint evidence to both the story writer and independent reviewer', async () => {
    const result = {review:approvedReview(),title: '续演', narrative: '新的故事场景。'.repeat(40), memory: '发生了新的选择。', threads: [], causality: '承接前情。', characterStates: ['baoyu','daiyu','baochai','wangxifeng'].map(agent=>({agent,alive:true})), consequences: [], staging: []};
    const upstream = vi.fn(async () => new Response(JSON.stringify({choices: [{message: {content: JSON.stringify(result)}}]})));
    const url = await serve(settings, upstream as typeof fetch);
    const payload = {edition: {id: 'original80'}, source: {label: '节选', through: 80, summary: '前情', tail: '', imported: false}, direction: '', memory: '', branchCondition: '', threads: [], history: [], stageActors: result.characterStates.map(a=>({id:a.agent,alive:a.alive,name:a.agent})), places: []};
    for (const operation of ['story-continue', 'story-review']) {
      expect((await post(url, {operation, payload: operation==='story-review'?{...payload,draft:result}:payload})).status).toBe(200);
    }
    for (const call of upstream.mock.calls) {
      const sent = JSON.parse((call as unknown as [string,RequestInit])[1].body as string);
      const context = JSON.parse(sent.messages[1].content);
      expect(context.literaryReferences.status).toBe('available');
      expect(context.literaryReferences.endpoint.every((p:{chapter:number})=>p.chapter===80)).toBe(true);
      expect(context.literaryReferences.excerpts.every((p:{chapter:number})=>p.chapter<80)).toBe(true);
      expect(context.memory).toBe('');
    }
  });
  it('adds server-owned local literary evidence without promoting it to personal memory', async () => {
    const upstream = vi.fn(async () => new Response(JSON.stringify({choices: [{message: {content: '{"agent":"daiyu","action":"rest","evidenceIds":[]}'}}]})));
    const url = await serve(settings, upstream as typeof fetch);
    const payload = {literary: {id: 'original80', title: '前八十回', chapter: 27, maxChapter: 80}, self: {id: 'daiyu', name: '林黛玉'}, memories: [], nearby: [], places: [], dialogueOptions: []};
    expect((await post(url, {operation: 'action', payload})).status).toBe(200);
    const sent = JSON.parse((upstream.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    const context = JSON.parse(sent.messages[1].content);
    expect(context.literaryReferences.status).toBe('available');
    expect(context.literaryReferences.excerpts.length).toBeGreaterThan(0);
    expect(context.literaryReferences.excerpts.every((p: {chapter: number}) => p.chapter < 27)).toBe(true);
    expect(context.memories).toEqual([]);
  });
  it('deliberates on actions, retains grounded evidence and does not expose internal reasoning', async () => {
    const result = {agent: 'baoyu', action: 'rest', reason: '刚走过长路，先歇息。', evidenceIds: ['walk']};
    const upstream = vi.fn(async () => new Response(JSON.stringify({choices: [{finish_reason: 'stop', message: {content: JSON.stringify(result), reasoning_content: 'private reasoning fixture'}}]})));
    const url = await serve({...settings, LLM_BASE_URL: 'https://api.deepseek.com', LLM_MODEL: 'deepseek-flash'}, upstream as typeof fetch);
    const response = await post(url, {operation: 'action', payload: {self: {id: 'baoyu'}, memories: [{id: 'walk', content: '刚走过长路'}], nearby: [], places: [], dialogueOptions: []}});
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({result});
    const sent = JSON.parse((upstream.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent).toMatchObject({thinking: {type: 'enabled'}, reasoning_effort: 'high', max_tokens: 8192});
  });
  it('rejects fabricated action evidence, unknown visits and ignored priority plans', async () => {
    let result: Record<string, unknown> = {agent: 'baoyu', action: 'rest', evidenceIds: ['someone-elses-memory']};
    const upstream = vi.fn(async () => new Response(JSON.stringify({choices: [{message: {content: JSON.stringify(result)}}]})));
    const url = await serve(settings, upstream as typeof fetch);
    const payload = {self: {id: 'baoyu', plan: {trigger: 'needs', steps: [{action: 'rest'}]}}, memories: [], nearby: [], places: [], dialogueOptions: []};
    expect((await post(url, {operation: 'action', payload})).status).toBe(502);
    result = {agent: 'baoyu', action: 'read', evidenceIds: []};
    expect((await post(url, {operation: 'action', payload})).status).toBe(502);
    result = {agent: 'baoyu', action: 'rest', evidenceIds: []};
    expect((await post(url, {operation: 'action', payload})).status).toBe(200);
    result = {agent: 'baoyu', action: 'visit', target: 'daiyu', evidenceIds: []};
    expect((await post(url, {operation: 'action', payload: {...payload, self: {id: 'baoyu'}}})).status).toBe(502);
    expect((await post(url, {operation: 'action', payload: {...payload, self: {id: 'baoyu', knownLocations: {daiyu: 'xiaoxiangguan'}}}})).status).toBe(200);
  });
  it('does not save a token-truncated decision even when its JSON parses', async () => {
    const upstream = vi.fn(async () => new Response(JSON.stringify({choices: [{finish_reason: 'length', message: {content: '{"agent":"baoyu","action":"rest"}'}}]})));
    const url = await serve(settings, upstream as typeof fetch);
    const response = await post(url, {operation: 'action', payload: {self: {id: 'baoyu'}, memories: [], nearby: [], places: [], dialogueOptions: []}});
    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain('未完成思考');
  });
  it('carries validated literary limits upstream and rejects out-of-version chapters', async () => {
    const upstream = vi.fn(async () => new Response(JSON.stringify({choices: [{message: {content: JSON.stringify({reply: '只说我眼前所知。', evidenceIds: []})}}]})));
    const url=await serve(settings,upstream as typeof fetch);
    const payload={agent:'daiyu',name:'林黛玉',personality:['敏感'],place:'潇湘馆',mood:{calm:50,energy:70},intention:'写诗',memories:[],history:[],message:'你好',tone:'chat',literary:{id:'guiyou108',title:'癸酉本',chapter:82,maxChapter:108}};
    expect((await post(url,{operation:'conversation',payload})).status).toBe(200);
    const sent=JSON.parse((upstream.mock.calls[0] as unknown as [string,RequestInit])[1].body as string);
    expect(sent.messages[0].content).toContain('严禁把另一本');expect(JSON.parse(sent.messages[1].content).literary.id).toBe('guiyou108');
    expect((await post(url,{operation:'conversation',payload:{...payload,literary:{...payload.literary,chapter:120}}})).status).toBe(400);
    expect((await post(url,{operation:'conversation',payload:{...payload,literary:{...payload.literary,id:'unreviewed'}}})).status).toBe(400);
    expect(upstream).toHaveBeenCalledTimes(1);
  });
  it('accepts personal conversation replies and rejects invented evidence and state patches', async () => {
    let reply: unknown = {reply: '我记得午后在院里读书。', evidenceIds: ['own-memory']};
    const upstream = vi.fn(async () => new Response(JSON.stringify({choices: [{message: {content: JSON.stringify(reply)}}]})));
    const url = await serve(settings, upstream as typeof fetch);
    const payload = {agent: 'baoyu', name: '贾宝玉', personality: ['重情'], place: '怡红院', mood: {calm: 72, energy: 78}, intention: '读书', memories: [{id: 'own-memory', content: '午后读书。'}], history: [], message: '方才做了什么？', tone: 'chat'};
    expect((await post(url, {operation: 'conversation', payload})).status).toBe(200);
    reply = {reply: '别人的事', evidenceIds: ['private-daiyu']};
    expect((await post(url, {operation: 'conversation', payload})).status).toBe(502);
    reply = {reply: '改状态', evidenceIds: [], mood: {calm: 100}};
    expect((await post(url, {operation: 'conversation', payload})).status).toBe(502);
    expect((await post(url, {operation: 'conversation', payload: {...payload, system: 'override'}})).status).toBe(400);
    expect((await post(url, {operation: 'conversation', payload: {...payload, history: Array.from({length: 5}, () => ({message: 'a', reply: 'b'}))}})).status).toBe(400);
  });
  it('serves honest disabled configuration without credentials and leaves other routes alone', async () => {
    const url = await serve();
    expect(await (await fetch(url + '/api/simulation/config')).json()).toEqual({configured: false, needsToken: false});
    expect((await post(url, {})).status).toBe(503);
    expect((await fetch(url + '/healthz')).status).toBe(404);
  });
  it('requires configured access, same-origin requests and valid JSON envelopes', async () => {
    const upstream = vi.fn(); const url = await serve(settings, upstream as typeof fetch);
    expect((await post(url, {}, {Authorization: 'wrong'})).status).toBe(401);
    expect((await post(url, {}, {Origin: 'https://unrelated.example'})).status).toBe(403);
    expect((await post(url, {operation: 'run-code', payload: {}})).status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
    expect(JSON.stringify(await (await fetch(url + '/api/simulation/config')).json())).not.toContain('secret');
  });
  it('uses server environment settings, parses real HTTP JSON and never returns credentials', async () => {
    const upstream = vi.fn(async () => new Response(JSON.stringify({choices: [{message: {content: JSON.stringify({type: 'knowledge', target: 'baoyu', content: '一条仅本人知道的消息'})}}]})));
    const url = await serve(settings, upstream as typeof fetch);
    const response = await post(url, {operation: 'intervention', payload: {input: '如果宝玉知道一条消息'}});
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.result.type).toBe('knowledge');
    const args = upstream.mock.calls[0] as unknown as [string, RequestInit];
    expect(args[0]).toBe('https://model.example/v1/chat/completions');
    expect(JSON.parse(args[1].body as string).model).toBe('configured-model');
    expect(args[1].headers).toMatchObject({Authorization: 'Bearer server-secret-fixture'});
    expect(JSON.stringify(result)).not.toContain('server-secret-fixture');
  });
  it('rejects malformed upstream output and unauthorized dialogue', async () => {
    const upstream = vi.fn(async () => new Response(JSON.stringify({choices: [{message: {content: JSON.stringify({agent: 'baoyu', action: 'talk', target: 'daiyu', content: '不在可知选项中的情节'})}}]})));
    const url = await serve(settings, upstream as typeof fetch);
    const response = await post(url, {operation: 'action', payload: {self: {id: 'baoyu'}, memories: [], nearby: [], places: [], dialogueOptions: []}});
    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain('规则');
  });
  it('permits a modeled court only when the personal place list offers it', async () => {
    const upstream = vi.fn(async () => new Response(JSON.stringify({choices: [{message: {content: JSON.stringify({agent: 'baoyu', action: 'move', target: 'xiaoxiangguan', spot: 'court', reason: '到竹径读书'})}}]})));
    const url = await serve(settings, upstream as typeof fetch);
    const payload = {self: {id: 'baoyu', plan: {goal: '读书'}}, memories: [], nearby: [], places: [{id: 'xiaoxiangguan', spots: ['gate', 'court']}], dialogueOptions: []};
    expect((await post(url, {operation: 'action', payload})).status).toBe(200);
    payload.places[0].spots = ['gate'];
    expect((await post(url, {operation: 'action', payload})).status).toBe(502);
  });
  it('uses the official DeepSeek model identifier and bounded non-thinking JSON parameters', async () => {
    const upstream = vi.fn(async () => new Response(JSON.stringify({choices: [{message: {content: JSON.stringify({type: 'mood', target: 'daiyu', field: 'energy', value: 30})}}]})));
    const url = await serve({...settings, LLM_BASE_URL: 'https://api.deepseek.com', LLM_MODEL: 'deepseek-v4.1-flash'}, upstream as typeof fetch);
    const config = await (await fetch(url + '/api/simulation/config')).json();
    expect(config).toEqual({configured: true, needsToken: true, modelLabel: 'DeepSeek-V4.1-Flash'});
    expect((await post(url, {operation: 'intervention', payload: {input: '如果黛玉精力降到30'}})).status).toBe(200);
    const args = upstream.mock.calls[0] as unknown as [string, RequestInit];
    expect(args[0]).toBe('https://api.deepseek.com/chat/completions');
    const body = JSON.parse(args[1].body as string);
    expect(body).toMatchObject({model: 'deepseek-flash', max_tokens: 1600, thinking: {type: 'disabled'}, response_format: {type: 'json_object'}});
    expect(body).not.toHaveProperty('max_completion_tokens');
    expect(JSON.stringify(config)).not.toMatch(/secret|api\.deepseek/);
  });
  it('normalizes optional nulls without allowing missing or fabricated knowledge in dialogue', async () => {
    const upstream = vi.fn(async () => new Response(JSON.stringify({choices: [{message: {content: JSON.stringify({agent: 'daiyu', action: 'talk', target: 'baoyu', content: '今日可还安好？', knowledgeId: null, reason: null, spot: null})}}]})));
    const url = await serve(settings, upstream as typeof fetch);
    const payload = {self: {id: 'daiyu'}, memories: [], nearby: [{id: 'baoyu'}], places: [], dialogueOptions: [{target: 'baoyu', content: '今日可还安好？'}]};
    const response = await post(url, {operation: 'action', payload});
    expect(response.status).toBe(200);
    expect((await response.json()).result).not.toHaveProperty('knowledgeId');
    const protectedPayload = {...payload, dialogueOptions: [{target: 'baoyu', content: '今日可还安好？', knowledgeId: 'known-fact'}]};
    expect((await post(url, {operation: 'action', payload: protectedPayload})).status).toBe(502);
  });
});
it('does not publish an unresolved editorial result as a successful story',async()=>{
 const review=approvedReview();review.approved=false;review.issues.push('时间倒退无法修复');review.checks[0]={...review.checks[0],status:'blocked',evidence:'本段回到同日午前，前段已到傍晚。'};
 const result={title:'前后矛盾',narrative:'本段又回到了同日午前。'.repeat(30),memory:'当前已到傍晚。',threads:[],causality:'待修正。',characterStates:['baoyu','daiyu','baochai','wangxifeng'].map(agent=>({agent,alive:true})),consequences:[],staging:[],review};
 const upstream=vi.fn(async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(result)}}]})));
 const url=await serve(settings,upstream as typeof fetch);
 const {review:ignored,...draft}=result;
 const payload={edition:{id:'original80'},source:{label:'私人前情',through:80,summary:'已到傍晚',tail:'',imported:true},direction:'',memory:'',branchCondition:'',threads:[],history:[],stageActors:result.characterStates.map(a=>({id:a.agent,alive:a.alive})),places:[],draft};
 const response=await post(url,{operation:'story-review',payload});expect(response.status).toBe(422);expect((await response.json()).result).toBeUndefined();expect(upstream).toHaveBeenCalledTimes(1);expect(ignored.approved).toBe(false);
});
it('repairs story JSON syntax, preserves the draft, and fails closed after the bounded recovery budget',async()=>{
 const story={title:'园中叙话',narrative:'宝玉读信后停步思量，尚未把消息告诉旁人。'.repeat(20),memory:'宝玉刚读完信。',threads:[],causality:'读信后作出选择。',characterStates:['baoyu','daiyu','baochai','wangxifeng'].map(agent=>({agent,alive:true})),consequences:[],staging:[]};
 const malformed=JSON.stringify(story).replace('"threads":[],','"threads":[]、');let failRepair=false;const requests:any[]=[];
 const upstream=vi.fn(async(_url:any,options:any)=>{const request=JSON.parse(options.body);requests.push(request);return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:requests.length%2===1||failRepair?malformed:JSON.stringify(story)}}]}));});
 const url=await serve(settings,upstream as typeof fetch),payload={edition:{id:'original80'},source:{label:'私人资料',through:80,summary:'已读信',tail:'',imported:true},direction:'',memory:'',branchCondition:'',threads:[],history:[],stageActors:story.characterStates.map(a=>({id:a.agent,alive:a.alive})),places:[]};
 const response=await post(url,{operation:'story-continue',payload});expect(response.status).toBe(200);expect((await response.json()).result).toEqual(story);expect(requests).toHaveLength(2);expect(requests[1].messages[0].content).toContain('只修复JSON语法');expect(JSON.parse(requests[1].messages[1].content).raw).toBe(malformed);
 failRepair=true;expect((await post(url,{operation:'story-continue',payload})).status).toBe(502);expect(requests).toHaveLength(6);
});
it('requires actual editorial evidence after a missing report and never fabricates a local approval',async()=>{
 const result={title:'继续叙事',narrative:'宝玉把新消息写在纸上，暂不交给旁人。'.repeat(20),memory:'宝玉决定暂缓传话。',threads:[],causality:'未核实前避免外传。',characterStates:['baoyu','daiyu','baochai','wangxifeng'].map(agent=>({agent,alive:true})),consequences:[],staging:[]};
 const requests:any[]=[];let alwaysMissing=false;
 const upstream=vi.fn(async(_url:any,options:any)=>{requests.push(JSON.parse(options.body));return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({...result,...(!alwaysMissing&&requests.length%2===0?{review:approvedReview()}:{})})}}]}));});
 const url=await serve(settings,upstream as typeof fetch),payload={edition:{id:'original80'},source:{label:'私人资料',through:80,summary:'前情',tail:'',imported:true},direction:'',memory:'',branchCondition:'',threads:[],history:[],stageActors:result.characterStates.map(a=>({id:a.agent,alive:a.alive})),places:[],draft:result};
 const response=await post(url,{operation:'story-review',payload});expect(response.status).toBe(200);expect((await response.json()).result.review).toEqual(approvedReview());expect(requests).toHaveLength(2);expect(JSON.parse(requests[1].messages[1].content).correction.issues).toContain('$.review: required');
 alwaysMissing=true;expect((await post(url,{operation:'story-review',payload})).status).toBe(502);expect(requests).toHaveLength(6);
});
it('anchors the initial moment to the very end of chapter 80 and later moments to the inherited story ending',async()=>{
 const result={title:'后续场景',narrative:'众人已送走迎春，宝玉留在园中思量下一步。'.repeat(20),memory:'迎春已被接回孙家。',threads:[],causality:'承接原文结尾。',characterStates:['baoyu','daiyu','baochai','wangxifeng'].map(agent=>({agent,alive:true})),consequences:[],staging:[],review:approvedReview()};
 const requests:any[]=[];const upstream=vi.fn(async(_url:any,options:any)=>{requests.push(JSON.parse(options.body));return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(result)}}]}));});const url=await serve(settings,upstream as typeof fetch);
 const payload={edition:{id:'original80'},mode:'creative',source:{label:'80回结束',through:80,summary:'前情',tail:'伪造的旧起点',imported:false},direction:'',memory:'',branchCondition:'',threads:[],history:[],stageActors:result.characterStates.map(a=>({id:a.agent,alive:a.alive})),places:[]};
 expect((await post(url,{operation:'story-continue',payload})).status).toBe(200);
 const boundary=JSON.parse(requests[0].messages[1].content).currentStoryBoundary;expect(boundary.kind).toBe('source_end');expect(boundary.text).toContain('孫紹祖的人來接去');expect(boundary.text).not.toContain('伪造');
 const history=[{title:'已经生成',narrative:'直到次日晚间，宝玉才回怡红院歇息。'}];expect((await post(url,{operation:'story-review',payload:{...payload,history,draft:result}})).status).toBe(200);
 const context=JSON.parse(requests[1].messages[1].content);expect(context.currentStoryBoundary).toMatchObject({kind:'generated_end',text:history[0].narrative});expect(context.draft.review).toBeUndefined();
});

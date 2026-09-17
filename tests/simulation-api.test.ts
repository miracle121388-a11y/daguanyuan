import {createServer, type Server} from 'node:http';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {createSimulationApi} from '../server/simulation-api.mjs';

const servers: Server[] = [];
afterEach(async () => { for (const server of servers.splice(0)) await new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }); });
const settings = {LLM_BASE_URL: 'https://model.example/v1', LLM_MODEL: 'configured-model', LLM_API_KEY: 'server-secret-fixture', LLM_ACCESS_TOKEN: 'access-fixture'};
async function serve(env: Record<string, string | undefined> = {}, request: typeof fetch = fetch) {
  const api = createSimulationApi(env, request);
  const server = createServer((req, res) => { void api(req, res).then(handled => { if (!handled) { res.statusCode = 404; res.end(); } }); });
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as {port: number};
  return `http://127.0.0.1:${address.port}`;
}
const post = (url: string, body: unknown, headers = {}) => fetch(url + '/api/simulation', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer access-fixture', ...headers}, body: JSON.stringify(body)});

describe('optional server-side model boundary', () => {
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

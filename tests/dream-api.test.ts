import {createServer, type Server} from 'node:http';
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import {resolve, sep} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {createDreamApi, checkedImageUrl} from '../server/dream-api.mjs';

vi.mock('node:dns/promises', () => ({lookup: vi.fn(async () => [{address:'93.184.216.34', family:4}])}));
const roots: string[] = [], servers: {server:Server; api:ReturnType<typeof createDreamApi>}[] = [];
afterEach(async () => {
  for (const {server,api} of servers.splice(0)) {await api.close(); server.closeAllConnections(); await new Promise<void>(r => server.close(() => r()));}
  for (const root of roots.splice(0)) {if (!root.startsWith(resolve(tmpdir()) + sep + 'garden-dream-test-')) throw Error('unsafe fixture path'); await rm(root, {recursive:true, force:true});}
});
const settings = {IMAGE_BASE_URL:'https://image.example/v1', IMAGE_MODEL:'test-model', IMAGE_API_KEY:'secret-only-on-server', LLM_ACCESS_TOKEN:'access-fixture'};
const owner = 'a'.repeat(64), other = 'b'.repeat(64);
const headers = {'Content-Type':'application/json', 'X-Dream-Album':owner, Authorization:'Bearer access-fixture'};
const moment = {editionId:'original80',chapter:27,tick:3,worldId:'test-world',snapshotId:'3:1',branch:'if',trigger:'choice',title:'黛玉的一念',text:'黛玉选择暂留花径，尚未赴约。',time:'午后',placeId:'xiaoxiangguan',cast:['daiyu'],nodeId:'flowers-27',mood:'poetic',framing:'scene',note:''};
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1fkAAAAASUVORK5CYII=','base64');
const json = (body:unknown, status=200) => new Response(JSON.stringify(body),{status});
async function serve(env:Record<string,string|undefined>, request:typeof fetch, root?:string, pollMs=10) {
  if (!root) {root=await mkdtemp(resolve(tmpdir(),'garden-dream-test-'));roots.push(root);}
  const api=createDreamApi({...env,DREAM_STORAGE_DIR:root},request,{publicRoot:'public',pollMs});
  const server=createServer((req,res)=>{void api(req,res).then(handled=>{if(!handled){res.writeHead(404);res.end();}});});
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r)); servers.push({server,api});
  const url=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/dreams`;
  return {url,api,root};
}
const post=(url:string, body:unknown={moment}, extra={})=>fetch(url,{method:'POST',headers:{...headers,...extra},body:JSON.stringify(body)});
async function waitJob(url:string,id:string,status='ready') {let job: {id:string;imageSha256:string;attempts:string[];resumeAvailable:boolean;status:string}|undefined;await vi.waitFor(async()=>{job=(await(await fetch(url+'/jobs/'+id,{headers})).json()).job;expect(job?.status).toBe(status);},{timeout:4000,interval:20});return job as {id:string;imageSha256:string;attempts:string[];resumeAvailable:boolean;status:string};}

describe('private generated-story album',()=>{
  it('protects credentials, literary boundaries and origin before making any paid request',async()=>{
    const request=vi.fn();const {url}=await serve(settings,request as typeof fetch);
    const config=JSON.stringify(await(await fetch(url+'/config')).json());expect(config).not.toContain(settings.IMAGE_API_KEY);
    expect((await post(url+'/jobs',undefined,{Authorization:'wrong'})).status).toBe(401);
    expect((await post(url+'/jobs',undefined,{Origin:'https://foreign.example'})).status).toBe(403);
    expect((await post(url+'/jobs',{moment:{...moment,chapter:97}})).status).toBe(400);
    expect((await post(url+'/jobs',{moment:{...moment,cast:['unreviewed-person']}})).status).toBe(400);
    expect(request).not.toHaveBeenCalled();
    const disabled=await serve({},request as typeof fetch);expect((await(await fetch(disabled.url+'/config')).json()).configured).toBe(false);
  });
  it('deduplicates concurrent submissions, isolates albums and saves hashed original bytes',async()=>{
    const request=vi.fn(async()=>json({data:[{b64_json:png.toString('base64')}]}));const {url,root}=await serve(settings,request as typeof fetch);
    const replies=await Promise.all([post(url+'/jobs'),post(url+'/jobs')]);const [a,b]=await Promise.all(replies.map(r=>r.json()));expect(a.job.id).toBe(b.job.id);
    const job=await waitJob(url,a.job.id);expect(request).toHaveBeenCalledTimes(1);
    expect(job.imageSha256).toBe(createHash('sha256').update(png).digest('hex'));
    expect(await readFile(resolve(root,job.id+'.image'))).toEqual(png);
    expect((await fetch(url+'/jobs/'+job.id+'/image',{headers:{'X-Dream-Album':other}})).status).toBe(404);
    expect((await(await fetch(url+'/jobs',{headers:{'X-Dream-Album':other}})).json()).jobs).toHaveLength(0);
    expect(JSON.stringify(job)).not.toContain('providerResult');expect(JSON.stringify(job)).not.toContain('owner');
    const payload=JSON.parse((request.mock.calls[0] as unknown as [string,RequestInit])[1].body as string);expect(payload.prompt).toContain('尚未赴约');expect(payload.prompt).toContain('no endings from other editions');
  });
  it('recovers an accepted Qwen task after restart without another generation or quota charge',async()=>{
    let finished=false, submissions=0;
    const request=vi.fn(async(input:unknown, init?:RequestInit)=>{
      if(init?.method==='POST'){submissions++;expect((init.headers as Record<string,string>)['X-DashScope-Async']).toBe('enable');return json({output:{task_id:'fixture-task-001',task_status:'PENDING'}});}
      if(String(input).includes('/tasks/'))return json({output:finished?{task_status:'SUCCEEDED',choices:[{message:{content:[{image:'https://image.example/test.png'}]}}]}:{task_status:'PENDING'}});
      return new Response(png);
    });
    const env={...settings,IMAGE_PROTOCOL:'dashscope',IMAGE_DAILY_LIMIT:'1'};
    const first=await serve(env,request as typeof fetch,undefined,10000);const {job}=await(await post(first.url+'/jobs')).json();
    // Observe through HTTP while the worker atomically replaces its file.
    // Repeated Windows readFile calls can deny the concurrent rename.
    await vi.waitFor(async()=>expect((await(await fetch(first.url+'/jobs/'+job.id,{headers})).json()).job.providerTaskId).toBe('fixture-task-001'),{timeout:4000,interval:20});
    await first.api.close();finished=true;
    expect(JSON.parse(await readFile(resolve(first.root,job.id+'.json'),'utf8')).providerTaskId).toBe('fixture-task-001');
    const next=await serve(env,request as typeof fetch,first.root);const done=await waitJob(next.url,job.id);
    expect(done.attempts).toHaveLength(1);expect(submissions).toBe(1);
    expect((await(await fetch(next.url+'/config')).json()).remaining).toBe(0);
  });
  it('keeps retry explicit and enforces the persisted daily limit',async()=>{
    const request=vi.fn(async()=>json({code:'InsufficientBalance'},402));const env={...settings,IMAGE_DAILY_LIMIT:'1'};
    const {url,root,api}=await serve(env,request as typeof fetch);const {job}=await(await post(url+'/jobs')).json();await waitJob(url,job.id,'failed');
    expect((await post(url+'/jobs')).status).toBe(200);expect((await post(url+'/jobs/'+job.id+'/retry',{})).status).toBe(429);expect(request).toHaveBeenCalledTimes(1);
    await api.close();const next=await serve(env,request as typeof fetch,root);expect((await(await fetch(next.url+'/config')).json()).remaining).toBe(0);
  });
  it('allows a deliberate retry of a failed generation and rejects corrupt image data',async()=>{
    let valid=false;const request=vi.fn(async()=>json({data:[{b64_json:valid?png.toString('base64'):Buffer.from('not an image').toString('base64')}]}));
    const {url}=await serve(settings,request as typeof fetch);const {job}=await(await post(url+'/jobs')).json();await waitJob(url,job.id,'failed');
    valid=true;expect((await post(url+'/jobs/'+job.id+'/retry',{})).status).toBe(202);expect((await waitJob(url,job.id)).attempts).toHaveLength(2);expect(request).toHaveBeenCalledTimes(2);
  });
  it('rejects capacity overbooking and never allows arbitrary result destinations',async()=>{
    const request=vi.fn();const {url,root}=await serve({...settings,IMAGE_STORAGE_MB:'1'},request as typeof fetch);
    expect((await post(url+'/jobs')).status).toBe(507);expect(await readdir(root)).toHaveLength(0);expect(request).not.toHaveBeenCalled();
    for(const address of ['http://image.example/a.png','https://localhost/a.png','https://image.example.evil.test/a.png','https://user:password@image.example/a.png'])await expect(checkedImageUrl(address,['image.example'])).rejects.toThrow();
  });
});

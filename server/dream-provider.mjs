import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {digest} from './dream-prompts.mjs';
import {resolveImage, downloadPinned} from './dream-download.mjs';

export const maximumImageBytes = 18 * 1024 * 1024;
export async function bounded(response, maximum) {
  if (Number(response.headers.get('content-length')) > maximum) throw new Error('图像数据超过本站容量限制。');
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {size += chunk.length; if (size > maximum) throw new Error('图像数据超过本站容量限制。'); chunks.push(chunk);}
  return Buffer.concat(chunks);
}
async function jsonResponse(response) {
  const data = JSON.parse((await bounded(response, maximumImageBytes * 1.5)).toString('utf8'));
  if (!response.ok) {
    const code = String(data.code || data.error?.code || '').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 70);
    throw new Error(`生图服务未完成请求（${response.status}${code ? ' / ' + code : ''}）。请检查服务额度与模型配置。`);
  }
  return data;
}

/** Persist the provider task before polling. Resuming it never sends another paid POST. */
export async function renderDream(job, {env, endpoint, dashscope, publicRoot, catalog, request, signal, save, checkedImageUrl, pollMs = 8000}) {
  const authorization = {Authorization: `Bearer ${env.IMAGE_API_KEY}`};
  if (!job.providerResult && !job.providerTaskId) {
    let payload = {model: job.model, prompt: job.prompt, n: 1, size: env.IMAGE_SIZE || '1536x1024'};
    if (env.IMAGE_QUALITY) payload.quality = env.IMAGE_QUALITY;
    if (env.IMAGE_OUTPUT_FORMAT) payload.output_format = env.IMAGE_OUTPUT_FORMAT;
    if (dashscope) {
      const content = [{text: job.prompt}];
      if (env.IMAGE_REFERENCE === 'true') {
        const art = catalog.nodes.find(n => n.id === job.moment.nodeId)?.art || (job.moment.cast[0] === 'daiyu' ? 'bamboo' : 'poetry');
        if (!/^[a-z-]+$/.test(art)) throw new Error('参考画作标识无效。');
        const reference = await readFile(resolve(publicRoot, `comics/${art}.webp`));
        content.unshift({image: `data:image/webp;base64,${reference.toString('base64')}`});
        job.referenceArt = art; job.referenceSha256 = digest(reference); await save(job);
      }
      payload = {model: job.model, input: {messages: [{role: 'user', content}]}, parameters: {n: 1, size: (env.IMAGE_SIZE || '1536x1024').replace('x', '*'), prompt_extend: true, enable_thinking: true}};
    }
    const response = await request(endpoint, {method: 'POST', headers: {...authorization, 'Content-Type': 'application/json', ...(dashscope ? {'X-DashScope-Async': 'enable'} : {})}, body: JSON.stringify(payload), signal});
    const result = await jsonResponse(response);
    job.providerRequestId = result.request_id || response.headers.get('x-request-id') || undefined;
    if (dashscope) {
      if (!/^[a-zA-Z0-9-]{10,100}$/.test(result.output?.task_id || '')) throw new Error('生图服务未返回任务编号，请核对服务记录后再试。');
      job.providerTaskId = result.output.task_id;
      job.providerEndpoint = endpoint.replace('/services/aigc/image-generation/generation', '/tasks/') + encodeURIComponent(job.providerTaskId);
      job.resumeAvailable = true;
    } else {
      job.providerResult = result.data?.[0];
      job.resumeAvailable = !!job.providerResult;
    }
    await save(job);
  }
  while (!job.providerResult && job.providerTaskId) {
    const response = await request(job.providerEndpoint, {headers: authorization, signal: AbortSignal.any([signal, AbortSignal.timeout(45000)])});
    const result = await jsonResponse(response), status = result.output?.task_status;
    if (status === 'SUCCEEDED') {
      job.providerResult = {url: result.output?.choices?.[0]?.message?.content?.find(c => c.image)?.image};
      job.usage = result.usage; await save(job); break;
    }
    if (['FAILED', 'CANCELED', 'UNKNOWN'].includes(status)) {
      job.resumeAvailable = false;
      const code = String(result.output?.code || status).replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 70);
      throw new Error(`这次画作未能完成（${code}）。可以手动重新作画。`);
    }
    if (!['PENDING', 'RUNNING'].includes(status)) throw new Error('暂未读到画作状态，可以继续查询原任务。');
    await delay(pollMs, undefined, {signal});
  }
  const item = job.providerResult; let bytes;
  if (typeof item?.b64_json === 'string') bytes = Buffer.from(item.b64_json, 'base64');
  else if (typeof item?.url === 'string') {
    const hosts = [new URL(endpoint).hostname, 'blob.core.windows.net', 'aliyuncs.com', ...(env.IMAGE_RESULT_HOSTS || '').split(',').map(s => s.trim()).filter(Boolean)];
    if (request === fetch) bytes = await downloadPinned(await resolveImage(item.url, hosts), signal, maximumImageBytes);
    else {
      const url = await checkedImageUrl(item.url, hosts), image = await request(url, {redirect: 'error', signal});
      if (!image.ok) throw new Error('画作已返回，原图暂未下载完成。可以继续获取原图，无需重新生图。');
      bytes = await bounded(image, maximumImageBytes);
    }
  } else throw new Error('生图服务没有返回图像，请检查模型接口格式。');
  if (bytes.length > maximumImageBytes) throw new Error('生成图像超过18MiB，未收入画册。');
  return bytes;
}

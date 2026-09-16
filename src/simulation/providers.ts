import {planAgent} from './planning';
import {type ConversationContext, type LLMProvider, type Perception, type SimulationEvent} from './types';
import {localConversation} from './participation';

export class MockProvider implements LLMProvider {
  readonly name = '本地规则';
  async converse(context: ConversationContext) { return localConversation(context); }
  async generateAgentAction(p: Perception) {
    return p.self.plan?.steps[0] ?? planAgent(p).steps[0];
  }
  async parseIntervention(input: string) {
    const text = input.trim().replace(/^如果\s*/, '').replace(/[，,]?\s*(会发生什么|会怎么样|会怎样|将会如何|会如何)[？?。]*$/, '').replace(/[？?。]+$/, '');
    const people: Record<string, string> = {'贾宝玉': 'baoyu', '宝玉': 'baoyu', '林黛玉': 'daiyu', '黛玉': 'daiyu', '薛宝钗': 'baochai', '宝钗': 'baochai', '王熙凤': 'wangxifeng', '熙凤': 'wangxifeng', '凤姐': 'wangxifeng'};
    const knowledge = text.match(/^(贾宝玉|宝玉|林黛玉|黛玉|薛宝钗|宝钗|王熙凤|熙凤|凤姐)(?:提前)?(?:知道|得知|获悉)(.+)$/);
    if (knowledge) return {type: 'knowledge', target: people[knowledge[1]], content: knowledge[2].trim()};
    const mood = text.match(/^(贾宝玉|宝玉|林黛玉|黛玉|薛宝钗|宝钗|王熙凤|熙凤|凤姐)的?(平静|精力)(?:变为|设为|降到|升到|为)\s*(\d+)$/);
    if (mood) return {type: 'mood', target: people[mood[1]], field: mood[2] === '平静' ? 'calm' : 'energy', value: Number(mood[3])};
    const world = text.match(/^贾府的?(财力|安定)(?:变为|设为|降到|升到|为)\s*(\d+)$/);
    if (world) return {type: 'world', field: world[1] === '财力' ? 'jia_family_finance' : 'jia_family_stability', value: Number(world[2])};
    throw new Error('本地模式支持“如果宝玉知道…”、“如果黛玉的平静降到30”或“如果贾府财力降到30”。更自由的表达可使用已配置的服务器模型。');
  }
  async summarizeTick(events: SimulationEvent[]) { return events.filter(e => e.kind === 'action' || e.kind === 'dialogue').map(e => e.text).join(' '); }
}

// Only same-origin requests; credentials and provider URLs stay on the server.
export class RemoteProvider implements LLMProvider {
  constructor(private accessToken = '', readonly name = '服务器模型') {}
  private async request(operation: string, payload: unknown, signal: AbortSignal): Promise<any> {
    const timeout = new AbortController();
    const abort = () => timeout.abort();
    signal.addEventListener('abort', abort, {once: true});
    if (signal.aborted) timeout.abort();
    const timer = setTimeout(() => timeout.abort(), 30000);
    try {
      const response = await fetch('/api/simulation', {method: 'POST', headers: {'Content-Type': 'application/json', ...(this.accessToken ? {Authorization: `Bearer ${this.accessToken}`} : {})}, body: JSON.stringify({operation, payload}), signal: timeout.signal});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `模型请求失败（${response.status}）。`);
      return result.result;
    } catch (error) {
      if (timeout.signal.aborted && !signal.aborted) throw new Error('模型响应超过30秒，本步未保存。请重试或切换本地规则。');
      throw error;
    } finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
  }
  generateAgentAction(perception: Perception, signal: AbortSignal) { return this.request('action', perception, signal); }
  converse(context: ConversationContext, signal: AbortSignal) { return this.request('conversation', context, signal); }
  parseIntervention(input: string, signal: AbortSignal) { return this.request('intervention', {input}, signal); }
  async summarizeTick(events: SimulationEvent[], signal: AbortSignal) {
    const result = await this.request('summary', {events}, signal);
    if (typeof result?.summary !== 'string' || result.summary.length > 1200) throw new Error('模型摘要格式无效。');
    return result.summary;
  }
}

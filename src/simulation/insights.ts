import type {CanonData} from '../data/types';
import {agentIds, type AgentId, type Branch, type Journal, type SimulationEvent, type WorldState} from './types';
import {currentBranch, currentWorld} from './world';
import {spotName} from './space';

/** Reports are computed from completed snapshots. No retrospective event writing. */
export function branchEvents(branch: Branch): SimulationEvent[] {
  const seen = new Set<string>();
  return branch.snapshots.slice(0, branch.cursor + 1).flatMap(s => s.worldState.events).filter(e => {
    if (seen.has(e.id)) return false; seen.add(e.id); return true;
  });
}
export function knowledgeTrail(journal: Journal) {
  const events = branchEvents(currentBranch(journal));
  return events.filter(e => e.kind === 'dialogue' && e.knowledgeId && e.agent && e.target);
}
export function compareBranches(journal: Journal) {
  if (!journal.if) return null;
  const alternate = journal.if.snapshots[journal.if.cursor].worldState;
  const main = journal.main.snapshots.slice(0, journal.main.cursor + 1).reverse().find(s => s.worldState.tick === alternate.tick)?.worldState;
  return {alternate, main: main ?? null, changes: main ? agentIds.map(id => ({id, before: main.agents[id], after: alternate.agents[id],
    learned: alternate.agents[id].memories.filter(m => m.type === 'knowledge' && !main.agents[id].memories.some(old => old.knowledgeId === m.knowledgeId)),
    calmDelta: alternate.agents[id].mood.calm - main.agents[id].mood.calm})) : []};
}
export type InterviewTopic = 'intention' | 'knowledge' | 'relationship';
export function interviewAgent(world: WorldState, id: AgentId, topic: InterviewTopic, data: CanonData) {
  const actor = world.agents[id];
  const memories = actor.memories.filter(m => topic === 'knowledge' ? m.type === 'knowledge' : m.type === 'interaction').slice(-3);
  const evidence = memories.map(m => ({id: m.id, tick: m.tick, text: m.content}));
  if (topic === 'knowledge') return {answer: memories.length ? `我目前知道的是：${memories.map(m => m.content).join('；')}。至于未亲闻的事情，我不敢断言。` : '此刻我没有新的知情消息。旁人未曾告诉我的事，我还不知道。', evidence};
  if (topic === 'relationship') {
    const close = agentIds.filter(other => other !== id).sort((a, b) => actor.relationships[b].trust - actor.relationships[a].trust)[0];
    return {answer: `此刻我较愿意信任${world.agents[close].name}。${memories.length ? `最近记得：${memories.at(-1)!.content}` : '眼下尚无新的相处经历，仍循原来的交情。'}`, evidence};
  }
  return {answer: `我在${spotName(data, actor.location, actor.spot)}。${actor.plan?.goal ? `心里想着：${actor.plan.goal}` : '接下来先看看此地的情形。'}${actor.mood.energy < 35 ? '不过此时乏了，要先歇一歇。' : ''}`, evidence: (actor.plan?.evidenceIds ?? []).map(memoryId => actor.memories.find(m => m.id === memoryId)).filter(m => !!m).map(m => ({id: m!.id, tick: m!.tick, text: m!.content}))};
}
export function evidenceReport(journal: Journal, data: CanonData): string {
  const branch = currentBranch(journal), world = currentWorld(journal), events = branchEvents(branch);
  const comparison = compareBranches(journal);
  const lines = ['# 大观园推演纪要', '', '本报告依据已完成的虚构推演快照，不是原著事实或现实预测。', '', `世界：${branch.prompt || '主世界'}；当前 Tick ${world.tick}；决策来源：${branch.snapshots[branch.cursor].provider}。`, '', '## 人物当前状态', ''];
  for (const id of agentIds) lines.push(`- ${world.agents[id].name}：${spotName(data, world.agents[id].location, world.agents[id].spot)}；平静 ${world.agents[id].mood.calm}，精力 ${world.agents[id].mood.energy}。`);
  lines.push('', '## 实际发生的消息传播', '');
  const transmissions = knowledgeTrail(journal);
  if (!transmissions.length) lines.push('当前保留的快照中尚无知情消息转述记录。');
  for (const event of transmissions) lines.push(`- Tick ${event.tick}，${event.text} [事件 ${event.id}]`);
  lines.push('', '## 世界线对照', '');
  if (!comparison?.main) lines.push('尚无同 Tick 的主世界记录，不能进行同刻差异比较。');
  else for (const change of comparison.changes) lines.push(`- ${world.agents[change.id].name}：同 Tick 的平静差值 ${change.calmDelta > 0 ? '+' : ''}${change.calmDelta}；IF 额外知情 ${change.learned.length} 条。差异是本次模拟观察，不代表唯一因果。`);
  lines.push('', '## 可核对的经历', '');
  for (const event of events.filter(e => ['action', 'dialogue', 'player', 'conversation', 'choice', 'gathering'].includes(e.kind)).slice(-40)) lines.push(`- Tick ${event.tick}，${event.text} [${event.id}]${event.reason ? ` 行动缘由：${event.reason}` : ''}`);
  return lines.join('\n');
}

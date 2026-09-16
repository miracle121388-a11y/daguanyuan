import {agentIds, type AgentPlan, type Perception, type SemanticAction} from './types';
import {homes} from './world';
import {courtRoutes} from './space';

const make = (p: Perception, action: SemanticAction['action'], target?: string, reason = ''): SemanticAction => ({agent: p.self.id, action, ...(target ? {target} : {}), reason});
const at = (p: Perception, place: string, activity: SemanticAction['action'], reason: string): SemanticAction[] => {
  const spot = courtRoutes[place] ? 'court' : 'gate';
  const move = p.self.location !== place || (p.self.spot ?? 'gate') !== spot;
  return [...(move ? [{...make(p, 'move', place, reason), spot} as SemanticAction] : []), make(p, activity, undefined, reason)];
};

/** Long-lived intentions are interrupted by needs, a new fact or a player request.
 * All proposals use only this person's perception, including the personal ledger
 * of people they themselves informed. Scores are priorities, not probabilities. */
export function planAgent(p: Perception): AgentPlan {
  const {self} = p;
  const plan = (goal: string, trigger: AgentPlan['trigger'], steps: SemanticAction[], evidenceIds: string[] = []): AgentPlan => ({goal, trigger, steps, evidenceIds, createdTick: p.tick});
  if (self.mood.energy < 25) return plan('先恢复体力，再处理牵挂', 'needs', [make(p, 'rest', undefined, '精力不足，需要停下来歇息。')]);
  const directive = p.directive;
  if (directive && directive.kind !== 'tell') {
    if (['read', 'write', 'rest', 'observe'].includes(directive.kind)) return plan('回应玩家的托付', 'player', at(p, self.location, directive.kind as SemanticAction['action'], '依照已收到的托付安排此刻。'));
    return plan('回应玩家的托付', 'player', [{...make(p, directive.kind, directive.target, '依照玩家托付，沿现有通行路线前往。'), spot: directive.spot}]);
  }
  if (self.mood.energy < 35) return plan('歇息片刻', 'needs', [make(p, 'rest', undefined, '精力不足，先歇息。')]);
  if (p.gathering) {
    const gathering = p.gathering, arrived = self.location === gathering.place && self.spot === 'court';
    return plan(`应邀到${gathering.name}${gathering.activity === 'write' ? '联句' : '品茗'}`, 'player', arrived
      ? [make(p, gathering.ready ? gathering.activity : 'wait', undefined, gathering.ready ? '众人已在院中，开始这场小聚。' : '已到约定的庭院，等候其他赴约的人。')]
      : at(p, gathering.place, gathering.activity, '应邀沿已验证的道路与院内路线赴约。'));
  }
  if (self.id === 'wangxifeng' && (p.household.finance ?? 100) < 40) return plan('先稳住府中收支', 'needs', [make(p, 'write', undefined, '府中财力偏低，核算收支、节制用度。')]);
  const known = p.memories.filter(m => m.type === 'knowledge' && m.knowledgeId);
  const newlyHeard = known.find(m => m.tick === p.tick && m.sourceAgent && m.sourceAgent !== self.id);
  const reply = newlyHeard && p.dialogueOptions.find(o => o.target === newlyHeard.sourceAgent && o.content === '此事来得突然，容我静一静。');
  if (reply) return plan('先回应刚听到的消息', 'social', [{...make(p, 'talk', reply.target, '消息刚刚传来，先向说话的人回应自己的心绪。'), ...reply}], [newlyHeard!.id]);
  if (self.mood.calm < 40) return plan('暂避纷扰，静一静', 'needs', [make(p, 'rest', undefined, '心绪未平，先缓一缓，再与人商议。')], self.reflection?.evidenceIds.slice(0, 4) ?? []);
  for (const memory of known) {
    const ledger = self.knowledgeLedger?.[memory.knowledgeId!];
    const informed = new Set([...(ledger?.sharedWith ?? []), ...(ledger?.source ? [ledger.source] : []),
      ...self.memories.filter(m => m.type === 'interaction' && m.knowledgeId === memory.knowledgeId).flatMap(m => m.participants)]);
    const candidates = agentIds.filter(id => id !== self.id && !informed.has(id) && self.relationships[id].trust >= 60)
      .sort((a, b) => (self.relationships[b].affection + self.relationships[b].trust) - (self.relationships[a].affection + self.relationships[a].trust));
    const target = candidates[0];
    if (!target) continue;
    const option = p.dialogueOptions.find(o => o.target === target && o.knowledgeId === memory.knowledgeId);
    const action = option ? {...make(p, 'talk', target, '将自己知道的消息告诉信任的人。'), ...option} : {...make(p, 'visit', target, '新消息打断了原来的安排，前去与信任的人商量。'), knowledgeId: memory.knowledgeId};
    return plan(`找${p.nearby.find(a => a.id === target)?.name ?? ({baoyu: '宝玉', daiyu: '黛玉', baochai: '宝钗', wangxifeng: '熙凤'})[target]}商议知情消息`, 'knowledge', [action], [memory.id]);
  }
  const friend = p.nearby.find(other => self.relationships[other.id].trust >= 50);
  if (friend && !self.memories.some(m => m.type === 'interaction' && m.tick >= p.tick - 1 && m.participants.includes(friend.id))) {
    const option = p.dialogueOptions.find(o => o.target === friend.id && !o.knowledgeId);
    if (option) return plan('与眼前的人相问近况', 'social', [{...make(p, 'talk', friend.id, '相遇时先问安，再继续自己的安排。'), ...option}]);
  }
  if (p.context.night) return plan('夜深归院，整理心绪', 'routine', at(p, homes[self.id], 'rest', '天色已晚，回到熟悉的居所休息。'));
  if (p.household.stability < 30) return plan('情势不安，留意园中变化', 'needs', [make(p, 'observe', undefined, '府中情势不安，留心附近的动静。')]);
  // Resume an unfinished routine before replacing it with another hourly task.
  if (self.plan?.trigger === 'routine' && self.plan.steps.length && p.tick - self.plan.createdTick < 5) return structuredClone(self.plan);
  const hour = p.hour, late = hour >= 16, morning = hour < 12;
  const routine: Record<string, [string, SemanticAction['action'], string]> = {
    baoyu: late ? ['qiushuangzhai', 'write', '去诗席前庭提笔，与相遇的人谈诗。'] : morning ? ['ouxiangxie', 'observe', '沿水边走走，留意园中景物。'] : ['yihongyuan', 'read', '在红香院庭读书，留出与故人相见的闲暇。'],
    daiyu: late ? ['ouxiangxie', 'observe', '去水榭散心，稍后归院。'] : ['xiaoxiangguan', 'write', '到竹径静处理清诗思。'],
    baochai: late ? ['qiushuangzhai', 'read', '到秋爽斋读书，遇人时从容相叙。'] : ['hengwuyuan', 'read', '在蘅芷步道停留读书。'],
    wangxifeng: late ? ['qiushuangzhai', 'observe', '走到诗席前庭看看园中安排。'] : ['daguanyuan_gate', 'write', '在府门附近核理日常事务。'],
  };
  const [destination, activity, reason] = routine[self.id];
  return plan(reason, 'routine', at(p, destination, activity, reason));
}

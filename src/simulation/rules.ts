import type {CanonData, Vec3} from '../data/types';
import {shortestPath} from '../navigation/GuidedTourController';
import {actionSchema, agentIds, type AgentId, type Perception, type SceneCommand, type SemanticAction, type WorldState} from './types';
import {placePosition} from './world';
import {courtPath, courtRoutes, slotOffset} from './space';

export function validateAction(raw: unknown, id: AgentId, world: WorldState, perception: Perception, data: CanonData): {command: SceneCommand; notes: string[]} {
  const notes: string[] = [];
  const wait = (note: string) => ({command: {action: {agent: id, action: 'wait', reason: note} as SemanticAction, path: []}, notes: [note]});
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) return wait('行动结构不合法，已改为等待。');
  let action = parsed.data;
  if (action.agent !== id) return wait('不能替其他人物作决定。');
  if (action.evidenceIds?.some(memoryId => !perception.memories.some(m => m.id === memoryId))) return wait('行动引用了本人当前不可知的记忆，已拒绝使用。');
  const plan = perception.self.plan;
  if (plan && ['player', 'needs'].includes(plan.trigger)) {
    const next = plan.steps[0];
    if (!next || action.action !== next.action || action.target !== next.target || action.spot !== next.spot) return wait('本步须先处理身体需要或当前托付，已拒绝偏离计划。');
  }
  const actor = world.agents[id];
  if (!actor.alive) return wait('人物已不在世，停止行动。');
  if (action.knowledgeId && !actor.memories.some(m => m.knowledgeId === action.knowledgeId)) return wait('人物尚不知道这条信息，已拒绝使用。');
  if (action.action === 'talk' || action.action === 'visit') {
    const otherId = action.target as AgentId;
    if (!agentIds.includes(otherId) || otherId === id || !world.agents[otherId].alive) return wait('目标人物不存在、已不在世或与自身相同。');
    const other = world.agents[otherId];
    const observed = perception.nearby.find(person => person.id === otherId);
    const distance = Math.hypot(...actor.position.map((v, i) => v - other.position[i]));
    if (action.action === 'visit' && observed && distance <= 4) return {command: {action: {agent: id, action: 'observe', reason: '已来到约见之人身边，停下相候。'}, path: [], face: [...other.position]}, notes};
    if (action.action === 'visit' || actor.location !== other.location || observed && distance > 4) {
      const known = actor.knownLocations[otherId];
      if (!known) return wait('尚不知道对方所在的地点。');
      if (action.action === 'talk') notes.push('两人尚未同处，先沿道路前往已知的地点。');
      if (observed && distance > 4) notes.push('先沿院内步道走到对方身边。');
      action = {agent: id, action: 'move', target: observed ? actor.location : known, spot: observed?.spot ?? 'gate', reason: action.reason, knowledgeId: action.knowledgeId, evidenceIds: action.evidenceIds};
    } else {
      if (distance > 4) return wait('对话距离过远，暂不能交谈。');
      const offered = perception.dialogueOptions.find(option => option.target === otherId && option.content === action.content && option.knowledgeId === action.knowledgeId);
      if (!offered) return wait('话语超出当前可感知或已知的内容，已拒绝传播。');
      return {command: {action, path: [], face: [...other.position]}, notes};
    }
  }
  if (action.action === 'move') {
    if (!data.places.some(p => p.id === action.target)) return wait('目的地不存在，不能创建新建筑。');
    const spot = action.spot ?? 'gate';
    if (spot === 'court' && !courtRoutes[action.target!]) return wait('此景没有已验证的院内步道。');
    if (actor.location === action.target && (actor.spot ?? 'gate') === spot) return wait('已经在此处，停留观察。');
    try {
      const nodes = shortestPath(data.manifest, actor.location, action.target!);
      const offset = slotOffset(id), road = nodes.map(nodeId => data.manifest.pathNodes.find(n => n.id === nodeId)!.position.map((v, i) => v + offset[i]) as Vec3);
      const approach = actor.spot === 'court' ? [...courtPath(data.manifest, actor.location, id)].reverse().concat([placePosition(data.manifest, actor.location, id)]) : [];
      const points: Vec3[] = [[...actor.position], ...approach, ...road, ...(spot === 'court' ? courtPath(data.manifest, action.target!, id) : [])];
      const path = points.filter((p, index) => index === 0 || Math.hypot(...p.map((v, axis) => v - points[index - 1][axis])) > .001);
      path[path.length - 1] = placePosition(data.manifest, action.target!, id, spot);
      return {command: {action, path, destination: action.target, destinationSpot: spot}, notes};
    } catch { return wait('现有道路无法到达目的地，已停止行走。'); }
  }
  return {command: {action, path: []}, notes};
}

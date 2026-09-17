import type {CanonData, Manifest, Vec3} from '../data/types';
import {editionFor, type EditionId} from '../data/editions';
import {agentIds, directiveSchema, journalSchema, type Agent, type AgentId, type Branch, type Intervention, type Journal, type Memory, type PlayerDirective, type WorldState} from './types';
import {courtPath, courtRoutes, slotOffset} from './space';

export const homes: Record<AgentId, string> = {baoyu: 'yihongyuan', daiyu: 'xiaoxiangguan', baochai: 'hengwuyuan', wangxifeng: 'daguanyuan_gate'};
export const agentColors: Record<AgentId, string> = {baoyu: '#9c493b', daiyu: '#416b67', baochai: '#9a7435', wangxifeng: '#77506c'};
const traits: Record<AgentId, [string[], string[]]> = {
  baoyu: [['重情', '不喜拘束'], ['珍惜与黛玉的情谊', '读书写诗']],
  daiyu: [['敏感', '才思敏捷'], ['寻求真诚与理解', '静养写作']],
  baochai: [['周全', '克制'], ['维持和睦', '读书自持']],
  wangxifeng: [['果断', '善于筹划'], ['照料家务', '维持收支']],
};
export const clone = <T,>(value: T): T => structuredClone(value);
export const clamp = (n: number) => Math.max(0, Math.min(100, n));
export function clockLabel(minutes: number) {
  const day = Math.floor(minutes / 1440) + 1, local = minutes % 1440;
  return `第${day}日 ${String(Math.floor(local / 60)).padStart(2, '0')}:${String(local % 60).padStart(2, '0')}`;
}
// Characters occupy small, distinct slots on the existing walkable road node.
// The Jia residence is off-map: Xifeng uses the gate as its explicitly staged anchor.
export function placePosition(manifest: Manifest, place: string, agent: AgentId, spot: 'gate' | 'court' = 'gate'): Vec3 {
  const node = manifest.pathNodes.find(n => n.id === place);
  if (!node || !manifest.places.some(p => p.id === place)) throw new Error(`地点未连接道路：${place}`);
  if (spot === 'court') {
    const route = courtPath(manifest, place, agent);
    if (!route.length) throw new Error('此景尚未设置可验证的院内路线。');
    return [...route.at(-1)!];
  }
  const offset = slotOffset(agent);
  return node.position.map((v, i) => v + offset[i]) as Vec3;
}
export function addMemory(agent: Agent, memory: Omit<Memory, 'id'>) {
  const id = memory.sourceEventId ? `${agent.id}:${memory.type}:${memory.sourceEventId}` : `${agent.id}:${memory.tick}:${agent.memories.filter(m => m.tick === memory.tick).length}:${memory.type}:${memory.knowledgeId ?? ''}`;
  agent.memories.push({...memory, id});
  if (memory.type === 'knowledge' && memory.knowledgeId) {
    agent.knowledgeLedger ??= {};
    agent.knowledgeLedger[memory.knowledgeId] ??= {source: memory.sourceAgent, sharedWith: [], learnedTick: memory.tick};
  }
  if (agent.memories.length > 48) {
    // Preserve intervention knowledge while evicting the oldest routine memory.
    const discard = agent.memories.findIndex(m => m.type !== 'knowledge');
    agent.memories.splice(discard < 0 ? 0 : discard, 1);
  }
  for (const key of Object.keys(agent.knowledgeLedger ?? {})) if (!agent.memories.some(m => m.type === 'knowledge' && m.knowledgeId === key)) delete agent.knowledgeLedger![key];
}
export function createWorld(data: CanonData, editionId: EditionId = 'original80'): WorldState {
  const agents = Object.fromEntries(agentIds.map(id => {
    const person = data.characters.find(c => c.id === id);
    if (!person) throw new Error(`已核对人物资料中缺少 ${id}`);
    const agent: Agent = {
      id, name: person.name, alive: true, location: homes[id], position: placePosition(data.manifest, homes[id], id),
      personality: traits[id][0], goals: traits[id][1], mood: {calm: id === 'daiyu' ? 58 : 72, energy: 78},
      relationships: Object.fromEntries(agentIds.map(other => [other, {affection: other === id ? 0 : (id === 'baoyu' && other === 'daiyu') || (id === 'daiyu' && other === 'baoyu') ? 85 : 55, trust: other === id ? 0 : 68, jealousy: 10, resentment: 5}])) as Agent['relationships'],
      memories: [], knownLocations: {...homes}, currentAction: null, spot: 'gate', plan: null,
    };
    addMemory(agent, {tick: 0, type: 'activity', content: `午后在${data.places.find(p => p.id === homes[id])!.name}歇息。`, participants: [id], origin: 'initial'});
    return [id, agent];
  })) as WorldState['agents'];
  return {editionId, storyChapter: 23, tick: 0, minutes: 14 * 60, branchId: 'main', worldId: 'main', directives: [], world: {jia_family_stability: 80, jia_family_finance: 70}, agents, events: [], contentType: 'generated'};
}
export function layoutRevision(data: CanonData) {
  return JSON.stringify({nodes: data.manifest.pathNodes, edges: data.manifest.pathEdges});
}
export function createJournal(data: CanonData, editionId: EditionId = 'original80'): Journal {
  const world = createWorld(data, editionId);
  return {editionId, version: 1, layoutRevision: layoutRevision(data), active: 'main', interventionSerial: 0, directiveSerial: 0, archives: [], if: null, main: {id: 'main', uid: 'main', forkTick: 0, intervention: null, prompt: '', cursor: 0, snapshots: [{worldState: world, actions: [], summary: '午后，四人在各自的起始地点。', provider: '初始设定'}]}};
}
export function currentBranch(journal: Journal): Branch { return journal[journal.active]!; }
export function currentWorld(journal: Journal): WorldState {
  const branch = currentBranch(journal);
  return branch.snapshots[branch.cursor].worldState;
}
export function forkWorld(journal: Journal, intervention: Intervention, prompt: string): Journal {
  const result = clone(journal), world = clone(currentWorld(journal));
  if (result.if) {
    if (result.archives.length >= 3) throw new Error('已保留三条历史世界线。请先导出存档，再删除一条不再需要的历史线。');
    result.archives.push({id: result.if.uid ?? 'legacy-if', name: result.if.prompt.slice(0, 24), branch: clone(result.if)});
  }
  result.interventionSerial += 1;
  world.branchId = 'if';
  world.worldId = `if:${result.interventionSerial}`;
  world.resolvedEncounters = (world.resolvedEncounters ?? []).map(e => ({...e, id: e.id.replace(/^(main|if:\d+):encounter:/, `${world.worldId}:encounter:`)}));
  for (const id of agentIds) world.agents[id].plan = null;
  if (intervention.type === 'knowledge') {
    addMemory(world.agents[intervention.target], {tick: world.tick, type: 'knowledge', content: intervention.content, participants: [intervention.target], knowledgeId: `if:${result.interventionSerial}:${world.tick}:${intervention.target}`, origin: 'intervention'});
  } else if (intervention.type === 'mood') world.agents[intervention.target].mood[intervention.field] = intervention.value;
  else world.world[intervention.field] = intervention.value;
  world.events = [{id: `${world.worldId}:${world.tick}:intervention`, tick: world.tick, time: clockLabel(world.minutes), kind: 'intervention', text: interventionDescription(world, intervention), contentType: 'generated'}];
  result.if = {id: 'if', uid: world.worldId, forkTick: world.tick, intervention, prompt, cursor: 0, snapshots: [{worldState: world, actions: [], summary: '只改变起始条件；后续行为等待下一步推演。', provider: '用户设定'}]};
  result.active = 'if';
  return result;
}
export function interventionDescription(world: WorldState, intervention: Intervention) {
  if (intervention.type === 'knowledge') return `${world.agents[intervention.target].name}得知：${intervention.content}`;
  if (intervention.type === 'mood') return `${world.agents[intervention.target].name}的${intervention.field === 'calm' ? '平静' : '精力'}设为 ${intervention.value}。`;
  return `${intervention.field === 'jia_family_finance' ? '贾府财力' : '贾府安定'}设为 ${intervention.value}。`;
}
export function restoreTick(journal: Journal, index: number): Journal {
  const next = clone(journal), branch = currentBranch(next);
  if (!Number.isInteger(index) || !branch.snapshots[index]) throw new Error('此快照不存在。');
  branch.cursor = index;
  return next;
}
export function resumeArchive(journal: Journal, archiveId: string): Journal {
  const next = clone(journal), index = next.archives.findIndex(a => a.id === archiveId);
  if (index < 0) throw new Error('此历史世界线不存在。');
  const archived = next.archives.splice(index, 1)[0];
  if (next.if) next.archives.push({id: next.if.uid ?? 'legacy-if', name: next.if.prompt.slice(0, 24), branch: next.if});
  next.if = archived.branch; next.active = 'if';
  return next;
}
/** A player's request is saved pending. Only an executed Tick consumes it. */
export function queueDirective(journal: Journal, data: CanonData, input: Omit<PlayerDirective, 'id' | 'tick'>): Journal {
  const next = clone(journal), branch = currentBranch(next), world = currentWorld(next);
  const directive = directiveSchema.parse({...input, id: `player:${++next.directiveSerial}`, tick: world.tick});
  if (!world.agents[directive.agent].alive) throw new Error('这位人物当前无法接受托付。');
  if (directive.kind === 'move' && (!data.places.some(p => p.id === directive.target) || directive.spot === 'court' && !courtRoutes[directive.target!])) throw new Error('请选择现有地点和已验证的院内路线。');
  if (directive.kind === 'visit' && (!agentIds.includes(directive.target as AgentId) || directive.target === directive.agent)) throw new Error('请选择另一位人物。');
  if (directive.kind === 'tell' && !directive.content?.trim()) throw new Error('请写下要告诉此人的消息。');
  world.directives = world.directives.filter(d => d.agent !== directive.agent).concat(directive);
  branch.snapshots = branch.snapshots.slice(0, branch.cursor + 1);
  return next;
}
// Only validated completed snapshots may be restored from browser storage.
export function readJournal(raw: string, data: CanonData): Journal {
  const parsed = journalSchema.parse(JSON.parse(raw));
  if (parsed.layoutRevision !== layoutRevision(data)) throw new Error('园林道路已更新，旧存档不能直接恢复。');
  if (!parsed[parsed.active] || parsed.main.id !== 'main' || (parsed.if && parsed.if.id !== 'if')) throw new Error('存档分支不完整。');
  if (new Set(parsed.archives.map(a => a.id)).size !== parsed.archives.length || parsed.archives.some(a => a.branch.id !== 'if' || a.id === parsed.if?.uid)) throw new Error('历史世界线标识不一致。');
  for (const branch of [parsed.main, parsed.if, ...parsed.archives.map(a => a.branch)].filter((b): b is Branch => !!b)) {
    if (!branch.snapshots[branch.cursor]) throw new Error('存档快照索引无效。');
    for (const snapshot of branch.snapshots) {
      const edition = parsed.editionId ?? 'original80', world = snapshot.worldState;
      if ((world.editionId ?? 'original80') !== edition || (world.storyChapter ?? 23) > editionFor(edition, data.editionCatalog).chapters) throw new Error('存档文学版本或回目不一致。');
      if (world.storyNodeId && !data.editionCatalog?.nodes.some(n => n.id === world.storyNodeId && n.editions.includes(edition) && n.chapter === world.storyChapter)) throw new Error('存档剧情起点不属于当前版本。');
      if (snapshot.worldState.branchId !== branch.id) throw new Error('存档分支不一致。');
      const gathering = snapshot.worldState.gathering;
      if (gathering && (!courtRoutes[gathering.place] || gathering.createdTick > snapshot.worldState.tick)) throw new Error('存档小聚地点或时间无效。');
      if ((snapshot.worldState.conversations ?? []).some(t => t.tick > snapshot.worldState.tick) || (snapshot.worldState.resolvedEncounters ?? []).some(e => e.tick > snapshot.worldState.tick)) throw new Error('存档互动时间无效。');
      for (const id of agentIds) {
        const agent = snapshot.worldState.agents[id];
        const expected = placePosition(data.manifest, agent.location, id, agent.spot ?? 'gate');
        if (agent.id !== id || agent.position.some((v, i) => Math.abs(v - expected[i]) > .001)) throw new Error('存档人物不在有效道路节点。');
        if (Object.values(agent.knownLocations).some(place => !data.places.some(p => p.id === place))) throw new Error('存档含未知地点。');
      }
      for (const directive of snapshot.worldState.directives) {
        if (directive.kind === 'move' && (!data.places.some(p => p.id === directive.target) || directive.spot === 'court' && !courtRoutes[directive.target!])) throw new Error('存档托付含未知地点或路线。');
        if (directive.kind === 'visit' && (!agentIds.includes(directive.target as AgentId) || directive.target === directive.agent)) throw new Error('存档托付含未知人物。');
        if (directive.kind === 'tell' && !directive.content?.trim()) throw new Error('存档托付缺少消息。');
      }
      if (new Set(snapshot.worldState.directives.map(d => d.agent)).size !== snapshot.worldState.directives.length) throw new Error('同一人物有重复待办。');
    }
  }
  return parsed;
}

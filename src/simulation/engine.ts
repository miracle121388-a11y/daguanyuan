import type {CanonData} from '../data/types';
import {agentIds, type AgentId, type Journal, type LLMProvider, type SceneCommand, type SceneExecutor, type SemanticAction, type SimulationEvent, type WorldState} from './types';
import {addMemory, clamp, clockLabel, clone, currentBranch, currentWorld} from './world';
import {perceive} from './perception';
import {validateAction} from './rules';
import {planAgent} from './planning';
import {spotName} from './space';

const verbs: Record<string, string> = {observe: '环顾四周', rest: '静坐休息', read: '读书', write: '提笔写字', wait: '暂且等候'};
const abortIfNeeded = (signal: AbortSignal) => { if (signal.aborted) throw new DOMException('本步已取消', 'AbortError'); };

/** Atomic tick: execute validated scene actions in order, then save one snapshot.
 * A failure never commits a partial tick. The view restores the last snapshot. */
export async function runTick(journal: Journal, data: CanonData, provider: LLMProvider, execute: SceneExecutor, signal: AbortSignal, progress: (world: WorldState, phase: 'deciding' | 'executing', actor: AgentId) => void): Promise<Journal> {
  const world = clone(currentWorld(journal)), actions: SemanticAction[] = [];
  const baseline = clone(world);
  world.tick += 1;
  world.events = [];
  let turnMinutes = world.minutes;
  const log: Logger = (kind, text, agent, details = {}) => {
    const event: SimulationEvent = {id: `${world.worldId ?? world.branchId}:${world.tick}:${world.events.length}`, tick: world.tick, time: clockLabel(turnMinutes), kind, text, agent, contentType: 'generated', ...details};
    world.events.push(event); return event;
  };
  for (const id of agentIds) {
    turnMinutes = world.minutes + agentIds.indexOf(id) * 15;
    abortIfNeeded(signal);
    const actor = world.agents[id];
    if (!actor.alive) { log('rule', `${actor.name}已不在世，跳过行动。`, id); continue; }
    // Only witnessed co-location updates whereabouts. No omniscient tracking.
    for (const other of agentIds) if (world.agents[other].alive && world.agents[other].location === actor.location) actor.knownLocations[other] = actor.location;
    const directive = world.directives.find(d => d.agent === id);
    if (directive?.kind === 'tell') {
      const event = log('player', `玩家托人告诉${actor.name}：“${directive.content}”`, id, {location: actor.location, knowledgeId: directive.id});
      addMemory(actor, {tick: world.tick, type: 'knowledge', content: directive.content!, participants: [id], origin: 'player', knowledgeId: directive.id, sourceEventId: event.id, importance: 90});
      actor.plan = null;
      world.directives = world.directives.filter(d => d.id !== directive.id);
    }
    progress(clone(world), 'deciding', id);
    const perception = perceive(world, id, data);
    actor.plan = planAgent(perception);
    perception.self.plan = clone(actor.plan);
    const raw = await provider.generateAgentAction(perception, signal);
    abortIfNeeded(signal);
    const {command, notes} = validateAction(raw, id, world, perception, data);
    for (const note of notes) log('rule', `${actor.name}：${note}`, id);
    actor.currentAction = command.action;
    progress(clone(world), 'executing', id);
    await execute(command, signal);
    abortIfNeeded(signal);
    applyAction(world, baseline, command, log, data);
    actions.push(command.action);
    if (actor.plan.steps[0]?.action === command.action.action && actor.plan.steps[0]?.target === command.action.target) actor.plan.steps.shift();
    if (directive && directive.kind !== 'tell') {
      const completed = directive.kind === 'move' ? actor.location === directive.target && (actor.spot ?? 'gate') === (directive.spot ?? 'gate') : directive.kind === 'visit' ? actor.location === world.agents[directive.target as AgentId]?.location && Math.hypot(...actor.position.map((v, i) => v - world.agents[directive.target as AgentId].position[i])) <= 4 : command.action.action === directive.kind;
      if (completed) { world.directives = world.directives.filter(d => d.id !== directive.id); log('player', `${actor.name}已完成这次托付。`, id, {location: actor.location}); }
    }
  }
  const gathering = world.gathering;
  if (gathering?.status === 'pending') {
    const activity = gathering.kind === 'poetry' ? 'write' : 'rest';
    const complete = gathering.participants.every(id => world.agents[id].location === gathering.place && world.agents[id].spot === 'court' && actions.some(a => a.agent === id && a.action === activity));
    if (complete) {
      gathering.status = 'completed'; gathering.finishedTick = world.tick;
      const text = `${gathering.participants.map(id => world.agents[id].name).join('、')}在${spotName(data, gathering.place, 'court')}完成了${gathering.kind === 'poetry' ? '一次联句' : '一席茶叙'}。每人平静增加3点，彼此信任增加至多2点。`;
      const event = log('gathering', text, undefined, {location: gathering.place});
      for (const id of gathering.participants) {
        const actor = world.agents[id]; actor.mood.calm = clamp(actor.mood.calm + 3); actor.plan = null;
        for (const other of gathering.participants.filter(other => other !== id)) actor.relationships[other].trust = clamp(Math.min(baseline.agents[id].relationships[other].trust + 5, actor.relationships[other].trust + 2));
        addMemory(actor, {tick: world.tick, type: 'interaction', content: text, participants: gathering.participants, origin: 'generated', sourceEventId: event.id, importance: 65});
      }
    } else if (world.tick - gathering.createdTick >= 6) {
      gathering.status = 'cancelled'; gathering.finishedTick = world.tick;
      for (const id of gathering.participants) world.agents[id].plan = null;
      log('gathering', '等候已久，众人未能完成这次小聚，约定暂且作罢。可重新择地邀请。', undefined, {location: gathering.place});
    }
  }
  for (const id of agentIds) {
    const actor = world.agents[id];
    const memories = actor.memories.filter(m => m.type !== 'reflection' && (m.tick === world.tick || actor.plan?.evidenceIds.includes(m.id))).slice(-2);
    if (!actor.alive || !memories.length || world.tick % 3 !== 0 && !memories.some(m => m.type === 'knowledge')) continue;
    const text = `记下这番经历：${memories.map(m => m.content).join(' ')}${actor.mood.calm < 50 ? '此刻心绪未平，接下来想先缓一缓。' : '接下来仍要顾及自己的安排与相处之情。'}`;
    actor.reflection = {tick: world.tick, text, evidenceIds: memories.map(m => m.id)};
    addMemory(actor, {tick: world.tick, type: 'reflection', content: text.slice(0, 800), participants: [id], origin: 'generated', evidenceIds: actor.reflection.evidenceIds, importance: 45});
    log('reflection', `${actor.name}回想刚才的经历。`, id, {evidenceIds: actor.reflection.evidenceIds, location: actor.location});
  }
  world.minutes += 60;
  // Summary is optional editorial help; it cannot change state or observations.
  let summary = world.events.filter(e => e.kind === 'action' || e.kind === 'dialogue').map(e => e.text).join(' ');
  try { summary = await provider.summarizeTick(world.events, signal); }
  catch { abortIfNeeded(signal); log('rule', '模型摘要暂不可用，已保留本步逐项记录。'); }
  abortIfNeeded(signal);
  const result = clone(journal), branch = currentBranch(result);
  branch.snapshots = branch.snapshots.slice(0, branch.cursor + 1);
  branch.snapshots.push({worldState: world, actions, summary, provider: provider.name});
  if (branch.snapshots.length > 30) branch.snapshots.shift();
  branch.cursor = branch.snapshots.length - 1;
  return result;
}

type Logger = (kind: SimulationEvent['kind'], text: string, agent?: AgentId, details?: Partial<Pick<SimulationEvent, 'target' | 'location' | 'knowledgeId' | 'evidenceIds' | 'reason'>>) => SimulationEvent;
function applyAction(world: WorldState, baseline: WorldState, command: SceneCommand, log: Logger, data: CanonData) {
  const {action} = command, id = action.agent, actor = world.agents[id];
  if (action.action === 'move') {
    const from = spotName(data, actor.location, actor.spot);
    actor.location = command.destination!;
    actor.spot = command.destinationSpot ?? 'gate';
    actor.position = [...command.path.at(-1)!];
    actor.knownLocations[id] = actor.location;
    const text = `${actor.name}从${from}沿步道来到${spotName(data, actor.location, actor.spot)}。`;
    const event = log('action', text, id, {location: actor.location, knowledgeId: action.knowledgeId, evidenceIds: action.evidenceIds ?? actor.plan?.evidenceIds, reason: action.reason});
    addMemory(actor, {tick: world.tick, type: 'activity', content: text, participants: [id], origin: 'generated', sourceEventId: event.id});
    actor.mood.energy = clamp(actor.mood.energy - 5);
  } else if (action.action === 'talk') {
    const other = world.agents[action.target as AgentId];
    const knowledge = action.knowledgeId && actor.memories.find(m => m.type === 'knowledge' && m.knowledgeId === action.knowledgeId);
    const event = log('dialogue', `${actor.name}对${other.name}说：“${action.content}”`, id, {target: other.id, location: actor.location, knowledgeId: action.knowledgeId, evidenceIds: knowledge ? [knowledge.id] : action.evidenceIds ?? actor.plan?.evidenceIds, reason: action.reason});
    for (const person of [actor, other]) {
      if (knowledge && !person.memories.some(m => m.type === 'knowledge' && m.knowledgeId === knowledge.knowledgeId)) {
        addMemory(person, {tick: world.tick, type: 'knowledge', content: knowledge.content, participants: [id, other.id], knowledgeId: knowledge.knowledgeId, origin: 'generated', sourceAgent: id, sourceEventId: event.id, importance: 85});
        person.plan = null;
        // Explicit fictional reaction rules; the model cannot change these scores.
        if (/迎娶|婚事|成亲/.test(knowledge.content) && ['daiyu', 'baochai'].includes(person.id)) {
          person.mood.calm = clamp(person.mood.calm - 10);
          const rival: AgentId = person.id === 'daiyu' ? 'baochai' : 'daiyu';
          person.relationships[rival].jealousy = clamp(Math.min(baseline.agents[person.id].relationships[rival].jealousy + 5, person.relationships[rival].jealousy + 3));
          log('relationship', `${person.name}听到婚事消息，平静 -10，对${world.agents[rival].name}的妒意有所增加。`, person.id, {target: rival, knowledgeId: knowledge.knowledgeId, evidenceIds: [event.id], location: actor.location});
        }
      }
      addMemory(person, {tick: world.tick, type: 'interaction', content: event.text, participants: [id, other.id], knowledgeId: action.knowledgeId, origin: 'generated', sourceEventId: event.id, importance: knowledge ? 65 : 30});
      const target = person.id === id ? other.id : id, relation = person.relationships[target], start = baseline.agents[person.id].relationships[target];
      const before = relation.trust;
      relation.trust = clamp(Math.min(start.trust + 5, relation.trust + 2));
      relation.affection = clamp(Math.min(start.affection + 5, relation.affection + 1));
      person.mood.calm = clamp(person.mood.calm + 2);
      person.knownLocations[target] = actor.location;
      log('relationship', `${person.name} → ${world.agents[target].name}：信任 +${relation.trust - before}，当前 ${relation.trust}。`, person.id);
    }
    if (knowledge) {
      actor.knowledgeLedger ??= {};
      const entry = actor.knowledgeLedger[knowledge.knowledgeId!] ?? {sharedWith: [], learnedTick: knowledge.tick};
      entry.sharedWith = [...new Set([...entry.sharedWith, other.id])];
      actor.knowledgeLedger[knowledge.knowledgeId!] = entry;
    }
  } else {
    const text = `${actor.name}在${spotName(data, actor.location, actor.spot)}${verbs[action.action] ?? '停留'}。`;
    actor.mood.energy = clamp(actor.mood.energy + (action.action === 'rest' ? 10 : -1));
    if (action.action === 'rest') actor.mood.calm = clamp(actor.mood.calm + 4);
    if (id === 'wangxifeng' && action.action === 'write') world.world.jia_family_finance = clamp(world.world.jia_family_finance + 1);
    if (action.action === 'observe') {
      const nearby = agentIds.filter(other => other !== id && world.agents[other].alive && world.agents[other].location === actor.location);
      addMemory(actor, {tick: world.tick, type: 'observation', content: nearby.length ? `在此看见${nearby.map(other => world.agents[other].name).join('、')}。` : '此处暂未遇见其他人。', participants: [id, ...nearby], origin: 'generated'});
    } else addMemory(actor, {tick: world.tick, type: 'activity', content: text, participants: [id], origin: 'generated'});
    log('action', text, id, {location: actor.location, evidenceIds: action.evidenceIds ?? actor.plan?.evidenceIds, reason: action.reason});
  }
}

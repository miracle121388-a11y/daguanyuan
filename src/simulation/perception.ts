import type {CanonData} from '../data/types';
import {agentIds, type Agent, type AgentId, type Memory, type Perception, type WorldState} from './types';
import {clockLabel, clone} from './world';
import {placeSetting, spotName} from './space';

export function retrieveMemories(agent: Agent, nearby: AgentId[]): Memory[] {
  return agent.memories.map((m, index) => ({m, score: index / Math.max(1, agent.memories.length) * 3 + (m.importance ?? (m.type === 'knowledge' ? 80 : 20)) / 10 + (m.participants.some(id => id !== agent.id && nearby.includes(id)) ? 4 : 0)}))
    .sort((a, b) => b.score - a.score).slice(0, 6).map(({m}) => clone(m));
}
export function perceive(world: WorldState, id: AgentId, data: CanonData): Perception {
  const agent = world.agents[id];
  const nearby = agentIds.filter(other => other !== id && world.agents[other].alive && world.agents[other].location === agent.location && Math.hypot(...agent.position.map((v, i) => v - world.agents[other].position[i])) < 35)
    .map(other => ({id: other, name: world.agents[other].name, location: agent.location, spot: world.agents[other].spot ?? 'gate'}));
  const memories = retrieveMemories(agent, nearby.map(a => a.id));
  const dialogueOptions: Perception['dialogueOptions'] = nearby.flatMap(other => [
    {target: other.id, content: '今日可还安好？'},
    {target: other.id, content: agent.mood.calm < 55 ? '我心中有些不安，想与你说说话。' : `此处${data.places.find(p => p.id === agent.location)?.theme ?? '清静'}，不妨一同坐坐。`},
    {target: other.id, content: '此事来得突然，容我静一静。'},
    ...memories.filter(m => m.type === 'knowledge' && m.knowledgeId).map(m => ({target: other.id, content: `我得知：${m.content}`, knowledgeId: m.knowledgeId})),
  ]);
  // Never serialize other agents' private memories, plans, moods, or locations.
  const hour = Math.floor(world.minutes / 60) % 24;
  const gathering = world.gathering?.status === 'pending' && world.gathering.participants.includes(id) ? world.gathering : null;
  return {tick: world.tick, time: clockLabel(world.minutes), hour, context: {place: spotName(data, agent.location, agent.spot), setting: data.places.find(p => p.id === agent.location)?.theme ?? '', night: hour >= 19 || hour < 6},
    household: {stability: world.world.jia_family_stability, ...(id === 'wangxifeng' ? {finance: world.world.jia_family_finance} : {})}, self: {...clone(agent), memories}, nearby,
    places: data.places.map(place => placeSetting(data, place.id)), memories, dialogueOptions, directive: clone(world.directives.find(d => d.agent === id)),
    ...(gathering ? {gathering: {place: gathering.place, name: spotName(data, gathering.place, 'court'), activity: gathering.kind === 'poetry' ? 'write' as const : 'rest' as const,
      ready: gathering.participants.every(other => world.agents[other].location === gathering.place && world.agents[other].spot === 'court')}} : {})};
}

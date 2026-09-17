import type {CanonData} from '../data/types';
import type {StoryNode, EditionId} from '../data/editions';
import type {AgentId, Journal} from '../simulation/types';
import {currentBranch, currentWorld} from '../simulation/world';
import type {ArtMoment} from './types';

export function captureMoment(journal: Journal, data: CanonData, trigger: ArtMoment['trigger'] = 'manual', focus?: AgentId): ArtMoment {
  const world = currentWorld(journal), branch = currentBranch(journal), agent = world.agents[focus ?? 'daiyu'];
  const active = agent.alive ? agent : Object.values(world.agents).find(a => a.alive)!;
  const node = data.editionCatalog?.nodes.find(n => n.id === world.storyNodeId);
  const events = world.events.filter(e => e.agent === active.id || e.target === active.id || e.kind === 'gathering').slice(-3);
  const personal = (world.conversations ?? []).filter(t => t.agent === active.id).slice(-1)[0];
  const placeId = active.location, together = Object.values(world.agents).filter(a => a.alive && a.location === placeId && a.spot === active.spot).map(a => a.id);
  const text = [...events.map(e => e.text), ...(['conversation', 'manual'].includes(trigger) && personal?.tick === world.tick ? [`玩家说：${personal.message}；${active.name}回应：${personal.reply}`] : []), `此刻${active.name}在${data.places.find(p => p.id === placeId)?.name ?? placeId}。当下打算（未必已执行）：${active.plan?.goal ?? active.goals.join('；')}`].join('\n').slice(0, 1600);
  return {editionId: world.editionId ?? 'original80', chapter: world.storyChapter ?? 23, tick: world.tick, worldId: world.worldId ?? branch.uid ?? 'legacy-world', snapshotId: `${world.tick}:${world.interactionSerial ?? 0}:${events.map(e => e.id).join(',')}`.slice(0, 300), branch: world.branchId, trigger,
    title: trigger === 'choice' ? `${active.name} · 一念之后` : trigger === 'conversation' ? `${active.name} · 此刻心声` : trigger === 'gathering' ? '庭院小聚 · 这一席相逢' : `${active.name} · 园中一刻`,
    text, time: `${Math.floor(world.minutes / 60) % 24}时`, placeId, cast: together.length ? together : [active.id], ...(node ? {nodeId: node.id} : {}), mood: 'poetic', framing: 'scene', note: ''};
}
export function storyMoment(node: StoryNode, editionId: EditionId): ArtMoment {
  return {editionId, chapter: node.chapter, tick: 0, worldId: `story:${editionId}:${node.id}`, snapshotId: `opening:${node.id}`, branch: 'main', trigger: 'story', title: node.title, text: `${node.summary}\n画面属于本幕的艺术演绎。`, time: node.atmosphere === 'embers' || node.atmosphere === 'rain' ? '夜色中' : '日光中', placeId: node.place, cast: [node.focus], nodeId: node.id, mood: node.atmosphere === 'rain' || node.atmosphere === 'embers' ? 'dramatic' : 'poetic', framing: 'scene', note: ''};
}

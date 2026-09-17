import type {CanonData} from '../data/types';
import {editionFor, type LiteraryContext} from '../data/editions';
import type {Journal, WorldState} from './types';
import {addMemory, clone, clockLabel, createWorld, placePosition} from './world';

export function literaryContext(world: WorldState, data: CanonData): LiteraryContext {
  const id = world.editionId ?? 'original80', edition = editionFor(id, data.editionCatalog);
  return {id, title: edition.title, chapter: world.storyChapter ?? 23, maxChapter: edition.chapters};
}
/** An authored starting condition creates its own IF branch; it never rewrites canon or the main world. */
export function forkStory(journal: Journal, data: CanonData, nodeId: string): Journal {
  const editionId = journal.editionId ?? 'original80';
  const node = data.editionCatalog?.nodes.find(n => n.id === nodeId && n.editions.includes(editionId));
  if (!node) throw new Error('这个剧情起点不属于当前版本。');
  const next = clone(journal);
  if (next.if) {
    if (next.archives.length >= 3) throw new Error('已保留三条历史线，请先导出并整理世界线，再进入新剧情。');
    next.archives.push({id: next.if.uid ?? 'legacy-if', name: next.if.prompt.slice(0, 24), branch: next.if});
  }
  // Fresh perception is essential: opening an earlier chapter cannot inherit future memories.
  const world = createWorld(data, editionId);
  world.storyNodeId = node.id; world.storyChapter = node.chapter;
  world.branchId = 'if'; world.worldId = `if:${++next.interventionSerial}`;
  world.world = {jia_family_stability: node.seed.stability, jia_family_finance: node.seed.finance};
  for (const id of node.seed.inactiveAgents ?? []) world.agents[id].alive = false;
  world.minutes = ['rain', 'embers'].includes(node.atmosphere) ? 19 * 60 : 14 * 60;
  for (const seed of node.seed.agents) {
    const actor = world.agents[seed.id];
    actor.location = node.place; actor.position = placePosition(data.manifest, node.place, seed.id);
    actor.memories = []; actor.mood.calm = seed.calm; actor.goals = [seed.goal];
    addMemory(actor, {tick: 0, type: 'knowledge', content: seed.memory, origin: 'initial', participants: [seed.id], knowledgeId: `literary:${editionId}:${node.id}:${seed.id}`, importance: 90});
  }
  world.events = [{id: `${world.worldId}:opening`, tick: 0, time: clockLabel(world.minutes), kind: 'intervention', agent: node.focus, location: node.place,
    text: `从《${editionFor(editionId, data.editionCatalog).shortTitle}》第${node.chapter}回「${node.title}」的改编起点入局。后续为自由推演，不预设书中结果。`, contentType: 'generated'}];
  next.if = {id: 'if', uid: world.worldId, forkTick: 0, prompt: `${node.title} · 第${node.chapter}回`, intervention: null, cursor: 0,
    snapshots: [{worldState: world, actions: [], summary: world.events[0].text, label: '剧情入局', provider: '改编起点'}]};
  next.active = 'if';
  return next;
}

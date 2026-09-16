import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import type {CanonData} from '../src/data/types';
import {agentIds, type AgentId, type SceneCommand} from '../src/simulation/types';
import {addMemory, clone, createJournal, currentBranch, currentWorld, forkWorld, placePosition, queueDirective, readJournal, restoreTick, resumeArchive} from '../src/simulation/world';
import {MockProvider} from '../src/simulation/providers';
import {planAgent} from '../src/simulation/planning';
import {perceive} from '../src/simulation/perception';
import {validateAction} from '../src/simulation/rules';
import {courtPath} from '../src/simulation/space';
import {runTick} from '../src/simulation/engine';
import {branchEvents, compareBranches, evidenceReport, interviewAgent, knowledgeTrail} from '../src/simulation/insights';

const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const data = Object.fromEntries([...['places', 'characters', 'events', 'sources', 'routes', 'relations'].map(key => [key, read(`data/canon/${key}.json`)]), ['manifest', read('public/scene-manifest.json')]]) as unknown as CanonData;
const provider = new MockProvider();
const tick = (journal = createJournal(data), execute = async (_command: SceneCommand) => {}) => runTick(journal, data, provider, execute, new AbortController().signal, () => {});
const knowledge = (journal = createJournal(data), content = '贾府准备让宝玉迎娶薛宝钗') => forkWorld(journal, {type: 'knowledge', target: 'baoyu', content}, `如果宝玉知道${content}`);

describe('plans enter the modeled courts and respond to lived events', () => {
  it('enters every verified court through its gate and retraces it when leaving', () => {
    for (const location of ['xiaoxiangguan', 'yihongyuan', 'hengwuyuan', 'qiushuangzhai']) for (const id of agentIds) {
      const world = currentWorld(createJournal(data)), actor = world.agents[id];
      actor.location = location; actor.position = placePosition(data.manifest, location, id);
      const entrance = validateAction({agent: id, action: 'move', target: location, spot: 'court'}, id, world, perceive(world, id, data), data).command;
      expect(entrance.path[0]).toEqual(actor.position);
      expect(entrance.path.slice(-courtPath(data.manifest, location, id).length)).toEqual(courtPath(data.manifest, location, id));
      actor.spot = 'court'; actor.position = placePosition(data.manifest, location, id, 'court');
      const exit = validateAction({agent: id, action: 'move', target: 'daguanyuan_gate'}, id, world, perceive(world, id, data), data).command;
      expect(exit.path.slice(0, courtPath(data.manifest, location, id).length)).toEqual(courtPath(data.manifest, location, id).reverse());
      expect(exit.path).toContainEqual(placePosition(data.manifest, location, id));
    }
  });
  it('continues a routine into a real activity, and a new fact replaces that intention', async () => {
    const first = await tick();
    const baoyu = currentWorld(first).agents.baoyu;
    expect(baoyu.spot).toBe('court'); expect(baoyu.plan?.steps[0].action).toBe('read');
    const second = await tick(first);
    expect(currentBranch(second).snapshots.at(-1)!.actions[0].action).toBe('read');
    const interrupted = knowledge(first);
    const next = planAgent(perceive(currentWorld(interrupted), 'baoyu', data));
    expect(next.trigger).toBe('knowledge'); expect(next.steps[0]).toMatchObject({action: 'visit', target: 'daiyu'});
  });
  it('lets the same knowledge lead to a different decision under distress', () => {
    const world = currentWorld(knowledge());
    expect(planAgent(perceive(world, 'baoyu', data)).steps[0].action).toBe('visit');
    world.agents.baoyu.mood.calm = 30;
    expect(planAgent(perceive(world, 'baoyu', data)).steps[0].action).toBe('rest');
  });
  it('traces multi-hop knowledge to actual dialogue, without preloading recipients', async () => {
    let journal = knowledge();
    const initial = currentWorld(journal).agents.baoyu.memories.find(m => m.type === 'knowledge')!;
    expect(JSON.stringify(perceive(currentWorld(journal), 'baochai', data))).not.toContain('迎娶');
    for (let step = 0; step < 12; step++) journal = await tick(journal);
    const events = branchEvents(currentBranch(journal)), world = currentWorld(journal);
    expect(agentIds.filter(id => world.agents[id].memories.some(m => m.knowledgeId === initial.knowledgeId)).length).toBeGreaterThanOrEqual(3);
    expect(knowledgeTrail(journal).length).toBeGreaterThanOrEqual(2);
    for (const id of agentIds.filter(id => id !== 'baoyu')) {
      const learned = world.agents[id].memories.find(m => m.type === 'knowledge' && m.knowledgeId === initial.knowledgeId);
      if (learned) expect(events.find(e => e.id === learned.sourceEventId)).toMatchObject({kind: 'dialogue', target: id, agent: learned.sourceAgent, knowledgeId: initial.knowledgeId});
    }
    const directPairs = knowledgeTrail(journal).map(e => `${e.agent}:${e.target}:${e.knowledgeId}`);
    expect(new Set(directPairs).size).toBe(directPairs.length);
    expect(world.agents.daiyu.relationships.baochai.jealousy).toBeGreaterThan(10);
  });
});

describe('player requests are pending, private and transactional', () => {
  it('does not move on request, consumes arrival once, and preserves it on cancellation', async () => {
    const queued = queueDirective(createJournal(data), data, {agent: 'baoyu', kind: 'move', target: 'qiushuangzhai', spot: 'court'});
    expect(currentWorld(queued).tick).toBe(0); expect(currentWorld(queued).agents.baoyu.location).toBe('yihongyuan');
    expect(perceive(currentWorld(queued), 'daiyu', data).directive).toBeUndefined();
    const original = clone(queued);
    await expect(tick(queued, async () => { throw new DOMException('cancelled', 'AbortError'); })).rejects.toThrow();
    expect(queued).toEqual(original);
    const arrived = await tick(queued);
    expect(currentWorld(arrived).agents.baoyu).toMatchObject({location: 'qiushuangzhai', spot: 'court'});
    expect(currentWorld(arrived).directives).toEqual([]);
    const later = await tick(arrived);
    expect(branchEvents(currentBranch(later)).filter(e => e.kind === 'player' && e.agent === 'baoyu')).toHaveLength(1);
  });
  it('lets exhaustion postpone the request and a read request finish only after reading', async () => {
    let journal = queueDirective(createJournal(data), data, {agent: 'baoyu', kind: 'read'});
    currentWorld(journal).agents.baoyu.mood.energy = 15;
    journal = await tick(journal);
    expect(currentWorld(journal).agents.baoyu.currentAction?.action).toBe('rest'); expect(currentWorld(journal).directives).toHaveLength(1);
    journal = await tick(journal);
    expect(currentWorld(journal).agents.baoyu.currentAction?.action).toBe('move'); expect(currentWorld(journal).directives).toHaveLength(1);
    journal = await tick(journal);
    expect(currentWorld(journal).agents.baoyu.currentAction?.action).toBe('rest'); // Travel used the remaining energy.
    journal = await tick(journal);
    expect(currentWorld(journal).agents.baoyu.currentAction?.action).toBe('read'); expect(currentWorld(journal).directives).toEqual([]);
  });
  it('delivers a player message only inside a completed Tick with provenance', async () => {
    const queued = queueDirective(createJournal(data), data, {agent: 'baochai', kind: 'tell', content: '今夜竹径有一封信'});
    expect(JSON.stringify(currentWorld(queued).agents.baochai.memories)).not.toContain('一封信');
    const result = await tick(queued), world = currentWorld(result);
    const memory = world.agents.baochai.memories.find(m => m.origin === 'player')!;
    expect(memory).toMatchObject({type: 'knowledge', content: '今夜竹径有一封信'});
    expect(world.events.find(e => e.id === memory.sourceEventId)).toMatchObject({kind: 'player', agent: 'baochai'});
    expect(JSON.stringify(world.agents.daiyu.memories)).not.toContain('一封信');
  });
});

describe('worldline continuity and evidence reporting', () => {
  it('archives old worlds, swaps them without losing progress, and refuses silent eviction', async () => {
    const first = await tick(knowledge()), firstUid = first.if!.uid;
    let next = knowledge(first, '第二个消息');
    expect(next.archives[0].branch).toEqual(first.if);
    const activeUid = next.if!.uid;
    next = resumeArchive(next, firstUid!);
    expect(next.if).toEqual(first.if); expect(next.archives[0].branch.uid).toBe(activeUid);
    next = knowledge(knowledge(next, '第三个消息'), '第四个消息');
    expect(next.archives).toHaveLength(3);
    expect(() => knowledge(next, '不能静默覆盖')).toThrow('三条历史');
    expect(readJournal(JSON.stringify(next), data)).toEqual(next);
  });
  it('migrates old v1 storage defaults and rejects an unverified court directive', () => {
    const old = createJournal(data) as any;
    delete old.archives; delete old.directiveSerial; delete old.main.uid;
    delete old.main.snapshots[0].worldState.directives;
    for (const actor of Object.values(old.main.snapshots[0].worldState.agents) as any[]) { delete actor.spot; delete actor.plan; }
    const loaded = readJournal(JSON.stringify(old), data);
    expect(loaded.archives).toEqual([]); expect(currentWorld(loaded).directives).toEqual([]);
    currentWorld(loaded).directives.push({id: 'test', agent: 'baoyu', kind: 'move', target: 'daoxiangcun', spot: 'court', tick: 0});
    expect(() => readJournal(JSON.stringify(loaded), data)).toThrow('路线');
  });
  it('compares matching ticks only and reports completed evidence rather than future snapshots', async () => {
    let journal = await tick(knowledge());
    expect(compareBranches(journal)?.main).toBeNull();
    expect(evidenceReport(journal, data)).toContain('尚无同 Tick');
    journal.active = 'main'; journal = await tick(journal); journal.active = 'if';
    const comparison = compareBranches(journal)!;
    expect(comparison.main?.tick).toBe(comparison.alternate.tick);
    expect(comparison.changes.find(c => c.id === 'baoyu')?.learned).toHaveLength(1);
    const third = await tick(await tick(journal)), restored = restoreTick(third, 1);
    expect(branchEvents(currentBranch(restored)).every(e => e.tick <= 1)).toBe(true);
    const report = evidenceReport(journal, data);
    expect(report).toContain(currentWorld(journal).events.find(e => e.kind === 'action')!.id);
    expect(report).not.toContain('尚无同 Tick');
  });
  it('interviews draw only from the selected person’s own state and memories', () => {
    const world = currentWorld(knowledge());
    expect(interviewAgent(world, 'daiyu', 'knowledge', data).answer).not.toContain('迎娶');
    expect(interviewAgent(world, 'baoyu', 'knowledge', data).evidence).toHaveLength(1);
    for (const id of agentIds) { addMemory(world.agents[id], {tick: 0, type: 'activity', content: '自己的经历', participants: [id as AgentId], origin: 'generated'}); }
    expect(interviewAgent(world, 'daiyu', 'knowledge', data).evidence).toEqual([]);
  });
});

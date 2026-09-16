import {readFileSync} from 'node:fs';
import {describe, expect, it, vi} from 'vitest';
import type {CanonData} from '../src/data/types';
import {agentIds, interventionSchema, type LLMProvider, type SceneCommand} from '../src/simulation/types';
import {addMemory, clone, createJournal, currentBranch, currentWorld, forkWorld, placePosition, readJournal, restoreTick} from '../src/simulation/world';
import {perceive, retrieveMemories} from '../src/simulation/perception';
import {MockProvider} from '../src/simulation/providers';
import {validateAction} from '../src/simulation/rules';
import {runTick} from '../src/simulation/engine';

const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const data = Object.fromEntries([...['places', 'characters', 'events', 'sources', 'routes', 'relations'].map(key => [key, read(`data/canon/${key}.json`)]), ['manifest', read('public/scene-manifest.json')]]) as unknown as CanonData;
const provider = new MockProvider();
const signal = () => new AbortController().signal;
const tick = (journal = createJournal(data), p: LLMProvider = provider, execute = async (_command: SceneCommand) => {}) => runTick(journal, data, p, execute, signal(), () => {});
const input = '如果宝玉提前知道贾府准备让他迎娶薛宝钗，会发生什么？';
async function fork() { return forkWorld(createJournal(data), interventionSchema.parse(await provider.parseIntervention(input)), input); }

describe('world and counterfactual interventions', () => {
  it('reuses four canon identities and existing navigable positions', () => {
    const world = currentWorld(createJournal(data));
    expect(Object.keys(world.agents)).toEqual(agentIds);
    expect(world.agents.wangxifeng.name).toBe('王熙凤');
    expect(world.agents.wangxifeng.location).toBe('daguanyuan_gate');
    for (const id of agentIds) expect(world.agents[id].position).toEqual(placePosition(data.manifest, world.agents[id].location, id));
  });
  it('parses the requested marriage IF without generating its outcome', async () => {
    const result = await fork(), before = createJournal(data);
    expect(result.main).toEqual(before.main);
    expect(currentWorld(result).tick).toBe(0);
    expect(currentWorld(result).agents.baoyu.location).toBe('yihongyuan');
    expect(currentWorld(result).agents.baoyu.memories.at(-1)).toMatchObject({type: 'knowledge', origin: 'intervention', content: '贾府准备让他迎娶薛宝钗'});
    expect(currentWorld(result).agents.daiyu.memories).toEqual(currentWorld(before).agents.daiyu.memories);
    expect(result.if?.snapshots[0].actions).toEqual([]);
  });
  it('supports mood and finance conditions and rejects unknown/out-of-range conditions', async () => {
    expect(await provider.parseIntervention('如果黛玉的精力降到30')).toEqual({type: 'mood', target: 'daiyu', field: 'energy', value: 30});
    expect(await provider.parseIntervention('如果贾府财力降到30')).toEqual({type: 'world', field: 'jia_family_finance', value: 30});
    await expect(provider.parseIntervention('让故事大团圆')).rejects.toThrow();
    expect(interventionSchema.safeParse({type: 'world', field: 'jia_family_finance', value: 200}).success).toBe(false);
  });
  it('keeps knowledge identities distinct when replacing IF at the same tick', async () => {
    const first = await fork();
    const second = forkWorld(first, {type: 'knowledge', target: 'baoyu', content: '另一条不同的消息'}, '如果宝玉知道另一条不同的消息');
    const knowledge = currentWorld(second).agents.baoyu.memories.filter(m => m.type === 'knowledge');
    expect(new Set(knowledge.map(m => m.knowledgeId)).size).toBe(2);
    const next = await tick(await tick(second));
    expect(currentWorld(next).agents.daiyu.memories.some(m => m.type === 'knowledge' && m.content === '另一条不同的消息')).toBe(true);
  });
  it('lets low finance affect the steward decision without leaking accounts to others', async () => {
    const journal = forkWorld(createJournal(data), {type: 'world', field: 'jia_family_finance', value: 30}, '如果贾府财力降到30');
    const world = currentWorld(journal);
    expect(perceive(world, 'baoyu', data).household.finance).toBeUndefined();
    expect((await provider.generateAgentAction(perceive(world, 'wangxifeng', data))).action).toBe('write');
    expect(currentWorld(await tick(journal)).world.jia_family_finance).toBe(31);
  });
});

describe('perception and rule boundary', () => {
  it('does not leak another agent’s private knowledge or actual distant whereabouts', async () => {
    const world = currentWorld(await fork());
    world.agents.baoyu.location = 'daoxiangcun';
    const p = perceive(world, 'daiyu', data);
    expect(JSON.stringify(p)).not.toContain('迎娶');
    expect(p.nearby).toEqual([]);
    expect(p.self.knownLocations.baoyu).toBe('yihongyuan');
    expect(Object.keys(p)).not.toContain('agents');
  });
  it('retrieves at most six relevant memories and preserves intervention knowledge', async () => {
    const actor = currentWorld(await fork()).agents.baoyu;
    for (let i = 1; i < 100; i++) addMemory(actor, {tick: i, type: 'activity', content: `读书${i}`, participants: ['baoyu'], origin: 'generated'});
    const memories = retrieveMemories(actor, ['daiyu']);
    expect(actor.memories.length).toBe(48);
    expect(memories.length).toBe(6);
    expect(memories.some(m => m.origin === 'intervention')).toBe(true);
  });
  it.each([
    {agent: 'baoyu', action: 'teleport', target: 'xiaoxiangguan'},
    {agent: 'daiyu', action: 'read'},
    {agent: 'baoyu', action: 'move', target: 'moon_palace'},
    {agent: 'baoyu', action: 'move', target: 'xiaoxiangguan', position: [1, 2, 3]},
    {agent: 'baoyu', action: 'talk', target: 'daiyu', knowledgeId: 'unseen', content: '假消息'},
  ])('rejects invalid action %#', raw => {
    const world = currentWorld(createJournal(data));
    expect(validateAction(raw, 'baoyu', world, perceive(world, 'baoyu', data), data).command.action.action).toBe('wait');
  });
  it('turns remote talk into road travel to the last known place, never omniscient pursuit', () => {
    const world = currentWorld(createJournal(data));
    world.agents.daiyu.location = 'daoxiangcun';
    const {command, notes} = validateAction({agent: 'baoyu', action: 'talk', target: 'daiyu', content: '今日可还安好？'}, 'baoyu', world, perceive(world, 'baoyu', data), data);
    expect(command.destination).toBe('xiaoxiangguan');
    expect(command.path.length).toBeGreaterThan(3);
    expect(notes).toHaveLength(1);
  });
  it('rejects same-place dialogue beyond physical reach and unauthorized free text', () => {
    const world = currentWorld(createJournal(data));
    world.agents.daiyu.location = world.agents.baoyu.location;
    let p = perceive(world, 'baoyu', data);
    const raw = {agent: 'baoyu', action: 'talk', target: 'daiyu', content: '今日可还安好？'};
    expect(validateAction(raw, 'baoyu', world, p, data).notes[0]).toContain('距离');
    world.agents.daiyu.position = placePosition(data.manifest, 'yihongyuan', 'daiyu');
    p = perceive(world, 'baoyu', data);
    expect(validateAction({...raw, content: '明日贾府将被抄家'}, 'baoyu', world, p, data).command.action.action).toBe('wait');
  });
  it('does not execute dead actors or visit dead targets', async () => {
    const journal = createJournal(data), world = currentWorld(journal);
    world.agents.daiyu.alive = false;
    const execute = vi.fn(async () => {});
    await tick(journal, provider, execute);
    expect(execute).toHaveBeenCalledTimes(3);
    expect(validateAction({agent: 'baoyu', action: 'visit', target: 'daiyu'}, 'baoyu', world, perceive(world, 'baoyu', data), data).command.action.action).toBe('wait');
  });
});

describe('full tick / scene / memory chain', () => {
  it('executes actual navigation before changing location, then shares knowledge into both memories', async () => {
    const journal = await fork(), before = JSON.stringify(journal), commands: SceneCommand[] = [];
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const running = tick(journal, provider, async command => { commands.push(command); if (commands.length === 1) await gate; });
    await vi.waitFor(() => expect(commands.length).toBe(1));
    expect(commands[0].action).toMatchObject({agent: 'baoyu', action: 'move', target: 'xiaoxiangguan'});
    expect(JSON.stringify(journal)).toBe(before);
    release();
    const first = await running, second = await tick(first);
    const world = currentWorld(second);
    expect(world.agents.baoyu.location).toBe('xiaoxiangguan');
    expect(world.tick).toBe(2);
    for (const id of ['baoyu', 'daiyu'] as const) {
      expect(world.agents[id].memories.some(m => m.type === 'interaction' && m.content.includes('迎娶'))).toBe(true);
      expect(world.agents[id].memories.some(m => m.type === 'knowledge' && m.content.includes('迎娶'))).toBe(true);
    }
    expect(JSON.stringify(world.agents.baochai.memories)).not.toContain('迎娶');
    expect(second.main).toEqual(journal.main);
    expect(currentWorld(await tick(createJournal(data))).agents.baoyu.location).toBe('yihongyuan');
  });
  it('rolls back all changes after a later provider or scene failure', async () => {
    const journal = await fork(), original = clone(journal);
    const broken: LLMProvider = {name: 'failing', parseIntervention: provider.parseIntervention, summarizeTick: provider.summarizeTick, generateAgentAction: async p => { if (p.self.id === 'daiyu') throw new Error('offline'); return provider.generateAgentAction(p); }};
    await expect(tick(journal, broken)).rejects.toThrow('offline');
    expect(journal).toEqual(original);
    await expect(tick(journal, provider, async () => { throw new Error('scene failed'); })).rejects.toThrow('scene failed');
    expect(journal).toEqual(original);
  });
  it('aborts without saving and clamps cumulative per-tick relationship deltas', async () => {
    const journal = createJournal(data), world = currentWorld(journal);
    for (const id of agentIds) { world.agents[id].location = 'yihongyuan'; world.agents[id].position = placePosition(data.manifest, 'yihongyuan', id); }
    const talking: LLMProvider = {...provider, name: 'talking', parseIntervention: provider.parseIntervention, summarizeTick: provider.summarizeTick, generateAgentAction: async p => ({agent: p.self.id, action: 'talk', ...p.dialogueOptions[0]})};
    const result = currentWorld(await tick(journal, talking));
    for (const id of agentIds) for (const other of agentIds) for (const key of ['trust', 'affection', 'jealousy', 'resentment'] as const) expect(Math.abs(result.agents[id].relationships[other][key] - world.agents[id].relationships[other][key])).toBeLessThanOrEqual(5);
    const abort = new AbortController(); abort.abort();
    await expect(runTick(journal, data, provider, async () => {}, abort.signal, () => {})).rejects.toThrow();
    expect(world.tick).toBe(0);
  });
  it('restores, replays deterministically, trims future snapshots and keeps branch isolation', async () => {
    const initial = await fork(), once = await tick(initial), twice = await tick(once);
    const restored = restoreTick(twice, 0), replayed = await tick(restored);
    expect(currentWorld(replayed)).toEqual(currentWorld(once));
    expect(currentBranch(replayed).snapshots).toHaveLength(2);
    expect(replayed.main).toEqual(initial.main);
    expect(readJournal(JSON.stringify(replayed), data)).toEqual(replayed);
  });
  it('rejects corrupt / off-road saved coordinates', () => {
    const journal = createJournal(data);
    currentWorld(journal).agents.baoyu.position[0] += 100;
    expect(() => readJournal(JSON.stringify(journal), data)).toThrow('道路');
    expect(() => readJournal('{broken', data)).toThrow();
  });
});

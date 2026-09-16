import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import type {CanonData} from '../src/data/types';
import {agentIds, type AgentId, type SceneCommand} from '../src/simulation/types';
import {createJournal, currentBranch, currentWorld, forkWorld, readJournal, restoreTick, queueDirective, placePosition} from '../src/simulation/world';
import {cancelGathering, chooseEncounter, conversationContext, encounterFor, forkMoment, inviteGathering, localConversation, recordConversation} from '../src/simulation/participation';
import {compareBranches, evidenceReport, knowledgeTrail} from '../src/simulation/insights';
import {runTick} from '../src/simulation/engine';
import {MockProvider} from '../src/simulation/providers';
import {perceive} from '../src/simulation/perception';
import {planAgent} from '../src/simulation/planning';
import {useSimulation} from '../src/simulation/store';
import {useGarden} from '../src/state/store';

const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const data = Object.fromEntries([...['places', 'characters', 'events', 'sources', 'routes', 'relations'].map(key => [key, read(`data/canon/${key}.json`)]), ['manifest', read('public/scene-manifest.json')]]) as unknown as CanonData;
const tick = (journal = createJournal(data), execute = async (_command: SceneCommand) => {}) => runTick(journal, data, new MockProvider(), execute, new AbortController().signal, () => {});
const chat = (journal = createJournal(data), id: AgentId = 'baoyu', tone: 'chat' | 'comfort' | 'challenge' = 'chat', message = '你有什么牵挂？') => {
  const context = conversationContext(currentWorld(journal), id, message, tone, data);
  return recordConversation(journal, context, localConversation(context), '本地规则');
};
describe('participation is personal, durable and reversible', () => {
  it('keeps private facts and other player conversations out of personal model inputs', () => {
    let journal = forkWorld(createJournal(data), {type: 'knowledge', target: 'baoyu', content: '只有宝玉知道的密信'}, '秘密');
    journal = chat(journal, 'baoyu', 'chat', '只有我们谈过的暗号');
    const context = conversationContext(currentWorld(journal), 'daiyu', '你好', 'chat', data);
    expect(JSON.stringify(context)).not.toMatch(/密信|暗号/);
    expect(conversationContext(currentWorld(journal), 'baoyu', '接着说', 'chat', data).history).toHaveLength(1);
    expect(knowledgeTrail(journal)).toHaveLength(0);
    expect(currentWorld(journal).agents.baoyu.memories.filter(m => m.type === 'knowledge')).toHaveLength(1);
  });
  it('rejects invented evidence and arbitrary model state patches without writing', () => {
    const journal = createJournal(data), before = JSON.stringify(journal), context = conversationContext(currentWorld(journal), 'baoyu', '你好', 'chat', data);
    expect(() => recordConversation(journal, context, {reply: '伪造', evidenceIds: ['daiyu-private']}, '模型')).toThrow('依据');
    expect(() => recordConversation(journal, context, {reply: '伪造', evidenceIds: [], world: {finance: 99}}, '模型')).toThrow();
    expect(JSON.stringify(journal)).toBe(before);
  });
  it('saves an instant snapshot, changes bounded effects once and supports exact restore', () => {
    const initial = createJournal(data), first = chat(initial, 'daiyu', 'comfort'), second = chat(first, 'daiyu', 'comfort');
    expect(currentWorld(first).tick).toBe(0); expect(currentWorld(first).minutes).toBe(840);
    expect(currentWorld(first).agents.daiyu.mood.calm).toBe(61);
    expect(currentWorld(second).agents.daiyu.mood.calm).toBe(61);
    expect(currentWorld(second).agents.daiyu.playerBond).toBe(52);
    expect(currentWorld(second).conversations).toHaveLength(2);
    expect(currentWorld(restoreTick(second, 0))).toEqual(currentWorld(initial));
    expect(readJournal(JSON.stringify(second), data)).toEqual(second);
  });
  it('bounds long conversations, keeps unique memory IDs and only sends four previous turns', () => {
    let journal = createJournal(data);
    for (let i = 0; i < 55; i++) journal = chat(journal, 'baoyu', 'chat', `第${i}问`);
    const world = currentWorld(journal), memories = world.agents.baoyu.memories;
    expect(world.conversations).toHaveLength(20); expect(currentBranch(journal).snapshots).toHaveLength(30);
    expect(memories.length).toBeLessThanOrEqual(48); expect(new Set(memories.map(m => m.id)).size).toBe(memories.length);
    expect(conversationContext(world, 'baoyu', '继续', 'chat', data).history).toHaveLength(4);
    expect(() => readJournal(JSON.stringify(journal), data)).not.toThrow();
  });
  it('forks exact state before choosing, creates a genuine directive and keeps main untouched', async () => {
    const main = chat(), fork = forkMoment(main), e = encounterFor(currentWorld(fork), 'baoyu', data)!;
    const selected = chooseEncounter(fork, data, 'baoyu', e.id, 'quiet');
    expect(selected.main).toEqual(main.main); expect(currentWorld(selected).directives[0].kind).toBe('write');
    expect(() => chooseEncounter(selected, data, 'baoyu', e.id, 'quiet')).toThrow('已作出');
    const arrived = await tick(selected);
    expect(currentWorld(arrived).agents.baoyu.spot).toBe('court');
    expect(currentWorld(arrived).directives.some(d => d.agent === 'baoyu')).toBe(true);
    const written = await tick(arrived);
    expect(currentWorld(written).agents.baoyu.currentAction?.action).toBe('write');
    expect(currentWorld(written).directives.some(d => d.agent === 'baoyu')).toBe(false);
    expect(evidenceReport(selected, data)).toContain('作出选择：请他在此提笔');
  });
  it('retains consumed choices through a fork and compares the latest same-tick snapshot', () => {
    const main = chat(), e = encounterFor(currentWorld(main), 'baoyu', data)!;
    const selected = chooseEncounter(main, data, 'baoyu', e.id, 'press'), fork = forkMoment(selected);
    expect(encounterFor(currentWorld(fork), 'baoyu', data)?.resolved?.choice).toBe('press');
    expect(compareBranches(fork)?.main).toEqual(currentWorld(selected));
    const restored = restoreTick(selected, 1), alternate = forkMoment(restored);
    expect(encounterFor(currentWorld(alternate), 'baoyu', data)?.resolved).toBeUndefined();
  });
  it('cancels an in-flight conversation without persisting a late response', async () => {
    const originalFetch = globalThis.fetch;
    let release: ((value: Response) => void) | undefined;
    globalThis.fetch = () => new Promise(resolve => { release = resolve; });
    const journal = createJournal(data);
    useGarden.setState({data}); useSimulation.setState({journal, phase: 'ready', provider: 'remote'});
    try {
      const work = useSimulation.getState().converse('baoyu', '你好', 'chat');
      expect(useSimulation.getState().phase).toBe('conversing');
      useSimulation.getState().cancel();
      release!(new Response(JSON.stringify({result: {reply: '迟到的回应', evidenceIds: []}})));
      expect(await work).toBe(false); expect(useSimulation.getState().journal).toBe(journal);
      expect(useSimulation.getState().phase).toBe('ready');
    } finally { globalThis.fetch = originalFetch; useSimulation.setState({provider: 'mock'}); }
  });
});
describe('gatherings use actual scene execution and completed shared activity', () => {
  it('moves all invitees through validated court paths before granting shared results', async () => {
    const invited = inviteGathering(createJournal(data), data, {place: 'qiushuangzhai', kind: 'poetry', participants: [...agentIds]});
    const commands: SceneCommand[] = [], first = await tick(invited, async c => { commands.push(c); });
    expect(commands.filter(c => c.action.action === 'move')).toHaveLength(4);
    for (const id of agentIds) expect(currentWorld(first).agents[id].position).toEqual(placePosition(data.manifest, 'qiushuangzhai', id, 'court'));
    expect(currentWorld(first).gathering?.status).toBe('pending');
    expect(currentWorld(first).agents.baoyu.relationships.daiyu.trust).toBe(68);
    const second = await tick(first), world = currentWorld(second);
    expect(world.gathering?.status).toBe('completed');
    expect(world.agents.baoyu.relationships.daiyu.trust).toBe(70);
    for (const id of agentIds) expect(world.agents[id].memories.some(m => m.type === 'interaction' && m.participants.length === 4)).toBe(true);
    expect(world.events.filter(e => e.kind === 'gathering')).toHaveLength(1);
    expect(readJournal(JSON.stringify(second), data)).toEqual(second);
  });
  it('preserves urgent body needs and existing player requests before gathering', () => {
    let journal = inviteGathering(createJournal(data), data, {place: 'qiushuangzhai', kind: 'tea', participants: ['baoyu', 'daiyu']});
    currentWorld(journal).agents.baoyu.mood.energy = 10;
    expect(planAgent(perceive(currentWorld(journal), 'baoyu', data)).trigger).toBe('needs');
    journal = queueDirective(journal, data, {agent: 'daiyu', kind: 'move', target: 'hengwuyuan', spot: 'court'});
    expect(planAgent(perceive(currentWorld(journal), 'daiyu', data)).steps[0].target).toBe('hengwuyuan');
  });
  it('rejects invalid and overlapping invitations; cancellation clears meeting plans', () => {
    const initial = createJournal(data);
    expect(() => inviteGathering(initial, data, {place: 'absent', kind: 'tea', participants: ['baoyu', 'daiyu']})).toThrow();
    expect(() => inviteGathering(initial, data, {place: 'qiushuangzhai', kind: 'tea', participants: ['baoyu', 'baoyu']})).toThrow();
    const invited = inviteGathering(initial, data, {place: 'qiushuangzhai', kind: 'tea', participants: ['baoyu', 'daiyu']});
    expect(() => inviteGathering(invited, data, {place: 'yihongyuan', kind: 'poetry', participants: ['baoyu', 'daiyu']})).toThrow('已有');
    const cancelled = cancelGathering(invited);
    expect(currentWorld(cancelled).gathering?.status).toBe('cancelled');
    expect(perceive(currentWorld(cancelled), 'baoyu', data).gathering).toBeUndefined();
    expect(currentWorld(cancelled).agents.baoyu.relationships.daiyu.trust).toBe(68);
  });
  it('expires a gathering when participants cannot arrive within six steps', async () => {
    let journal = inviteGathering(createJournal(data), data, {place: 'qiushuangzhai', kind: 'tea', participants: ['baoyu', 'daiyu']});
    for (let i = 0; i < 6; i++) { currentWorld(journal).agents.baoyu.mood.energy = 1; journal = await tick(journal); }
    expect(currentWorld(journal).gathering?.status).toBe('cancelled');
    expect(currentWorld(journal).events.some(e => e.text.includes('暂且作罢'))).toBe(true);
  });
  it('rolls back invitations and arrivals together when scene execution fails', async () => {
    const journal = inviteGathering(createJournal(data), data, {place: 'qiushuangzhai', kind: 'tea', participants: ['baoyu', 'daiyu']}), before = JSON.stringify(journal);
    let count = 0;
    await expect(tick(journal, async () => { if (++count === 2) throw new Error('scene stopped'); })).rejects.toThrow('scene stopped');
    expect(JSON.stringify(journal)).toBe(before);
  });
});

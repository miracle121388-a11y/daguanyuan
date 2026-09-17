import type {CanonData} from '../data/types';
import {agentIds, conversationReplySchema, gatheringSchema, type AgentId, type ConversationContext, type ConversationTurn, type Gathering, type Journal, type PlayerDirective, type WorldState} from './types';
import {addMemory, clamp, clockLabel, clone, currentBranch, currentWorld, queueDirective} from './world';
import {perceive} from './perception';
import {courtRoutes, spotName} from './space';

/** Conversations and choices are complete moments, without advancing the hourly clock. */
function moment(journal: Journal) {
  const next = clone(journal), world = clone(currentWorld(next));
  world.interactionSerial = (world.interactionSerial ?? 0) + 1;
  world.events = [];
  return {next, world, id: `${world.worldId ?? world.branchId}:moment:${world.interactionSerial}`};
}
function saveMoment(journal: Journal, world: WorldState, label: string, provider = '本地规则') {
  const branch = currentBranch(journal);
  branch.snapshots = branch.snapshots.slice(0, branch.cursor + 1);
  branch.snapshots.push({worldState: world, actions: [], summary: world.events.map(e => e.text).join(' '), provider, label});
  if (branch.snapshots.length > 30) branch.snapshots.shift();
  branch.cursor = branch.snapshots.length - 1;
  return journal;
}
function effect(world: WorldState, id: AgentId, tone: ConversationTurn['tone']) {
  const actor = world.agents[id];
  if (actor.playerEffectTick === world.tick) return '已记住这次相处；此刻的心绪与熟悉度不再重复加减。';
  const oldCalm = actor.mood.calm, oldBond = actor.playerBond ?? 50;
  actor.mood.calm = clamp(oldCalm + (tone === 'comfort' ? 3 : tone === 'challenge' ? -2 : 1));
  actor.playerBond = clamp(oldBond + (tone === 'challenge' ? -1 : 2));
  actor.playerEffectTick = world.tick;
  actor.plan = null;
  const signed = (n: number) => `${n >= 0 ? '+' : ''}${n}`;
  return `平静 ${signed(actor.mood.calm - oldCalm)}，与你的熟悉度 ${signed(actor.playerBond - oldBond)}。`;
}
export function conversationContext(world: WorldState, id: AgentId, message: string, tone: ConversationTurn['tone'], data: CanonData): ConversationContext {
  if (!message.trim() || message.trim().length > 400 || !['chat', 'comfort', 'challenge'].includes(tone)) throw new Error('请写下1至400字，并选择交谈语气。');
  if (!world.agents[id].alive) throw new Error('这位人物当前无法交谈。');
  const p = perceive(world, id, data);
  // Only this person's memories and their own conversation are sent upstream.
  return {literary: p.literary, agent: id, name: p.self.name, personality: p.self.personality, place: p.context.place, mood: p.self.mood,
    intention: p.self.plan?.goal ?? p.self.goals.join('；'), memories: p.memories.map(m => ({id: m.id, content: m.content})),
    history: (world.conversations ?? []).filter(t => t.agent === id).slice(-4).map(t => ({message: t.message, reply: t.reply})), message: message.trim(), tone};
}
export function localConversation(c: ConversationContext) {
  const voice = {baoyu: '你肯来同我说话，我心里便宽慰些。', daiyu: '既是真心相问，我便与你说几句。', baochai: '事情不妨慢慢说，总有商量的余地。', wangxifeng: '你且说仔细些，我也好拿个主意。'}[c.agent];
  const previous = c.history.at(-1);
  let reply = `${voice}你说“${c.message.slice(0, 60)}”，我记下了。眼下在${c.place}，我正想着${c.intention}。`;
  let evidenceIds: string[] = [];
  if (/听说|知道|消息|记得|记忆/.test(c.message)) {
    const memory = c.memories.at(0);
    reply = `${voice}${memory ? `我记得的是：${memory.content.slice(0, 240)}。` : '此刻没有新的消息。'}未曾亲闻的事情，我不能替旁人断言。`;
    evidenceIds = memory ? [memory.id] : [];
  } else if (c.tone === 'comfort') reply = `${voice}${c.mood.calm < 45 ? '我心绪未平，有人肯静静听一听，总是好的。' : '你这番宽慰，我领情了。'}${previous ? `方才你提起“${previous.message.slice(0, 40)}”，我并未忘记。` : ''}眼下不妨缓一缓。`;
  else if (c.tone === 'challenge') reply = `${voice}你问“${c.message.slice(0, 80)}”，我也要想想；我只能按自己所知作答，不敢替未发生的事作保。`;
  else if (previous) reply += `方才说到“${previous.message.slice(0, 40)}”，我们可以接着谈。`;
  return {reply: reply.slice(0, 600), evidenceIds};
}
export function recordConversation(journal: Journal, context: ConversationContext, raw: unknown, provider: string): Journal {
  const reply = conversationReplySchema.safeParse(raw);
  if (!reply.success || reply.data.evidenceIds.some(id => !context.memories.some(m => m.id === id))) throw new Error('回应格式或记忆依据无效，这次交谈尚未保存，请重试。');
  const {next, world, id} = moment(journal), outcome = effect(world, context.agent, context.tone);
  const turn: ConversationTurn = {id, agent: context.agent, tick: world.tick, message: context.message, tone: context.tone,
    reply: reply.data.reply, provider, outcome, evidence: [...new Set(reply.data.evidenceIds)].map(id => ({id, text: context.memories.find(m => m.id === id)!.content}))};
  world.conversations = [...(world.conversations ?? []), turn].slice(-20);
  const text = `你对${context.name}说：“${turn.message}”\n${context.name}：“${turn.reply}”`;
  world.events.push({id, tick: world.tick, time: clockLabel(world.minutes), kind: 'conversation', agent: context.agent, location: world.agents[context.agent].location,
    text, contentType: 'generated', evidenceIds: turn.evidence.map(e => e.id), reason: outcome});
  // A conversation is lived experience, never a new shareable fact.
  addMemory(world.agents[context.agent], {tick: world.tick, type: 'interaction', content: text.slice(0, 800), origin: 'player', participants: [context.agent], sourceEventId: id, importance: 55});
  return saveMoment(next, world, `与${context.name}交谈`, provider);
}

export interface EncounterChoice {id: string; label: string; consequence: string; tone: ConversationTurn['tone']; directive?: Omit<PlayerDirective, 'id' | 'tick'>}
export function encounterFor(world: WorldState, id: AgentId, data: CanonData) {
  const actor = world.agents[id];
  if (!actor.alive) return null;
  const memory = [...actor.memories].reverse().find(m => m.type === 'knowledge' && m.knowledgeId);
  const distressed = actor.mood.calm < 45 || actor.mood.energy < 35;
  const kind = distressed ? 'rest' : memory ? 'news' : 'scene';
  const key = `${world.worldId ?? world.branchId}:encounter:${id}:${kind}:${memory && kind === 'news' ? memory.knowledgeId : Math.floor(world.tick / 3)}`;
  const friend = agentIds.filter(other => other !== id && world.agents[other].alive).sort((a, b) => actor.relationships[b].trust - actor.relationships[a].trust)[0];
  const choices: EncounterChoice[] = distressed ? [
    {id: 'rest', label: '劝他先歇一歇', consequence: '宽慰对方，并托付静养；休息在下一步执行。', tone: 'comfort', directive: {agent: id, kind: 'rest'}},
    {id: 'listen', label: '陪他把话说开', consequence: '宽慰对方，保留原来的待办。', tone: 'comfort'},
  ] : [
    {id: 'quiet', label: memory ? '劝他先静下心' : '请他在此提笔', consequence: memory ? '平静稍增，并托付休息。' : '叙话片刻，并托付写字；会先沿路线入院。', tone: memory ? 'comfort' : 'chat', directive: {agent: id, kind: memory ? 'rest' : 'write'}},
    ...(friend ? [{id: 'visit', label: `请他找${world.agents[friend].name}谈谈`, consequence: '托付拜访；到场后才可能发生交谈。', tone: 'chat' as const, directive: {agent: id, kind: 'visit' as const, target: friend}}] : []),
    {id: 'press', label: '直问他是否想清楚了', consequence: '平静与熟悉度略降，重新考虑当前打算。', tone: 'challenge'},
  ];
  return {id: key, title: distressed ? '此刻，他需要缓一缓' : memory ? '一条消息，几种应对' : '相逢于这一处庭院',
    text: distressed ? `${actor.name}在${spotName(data, actor.location, actor.spot)}，${actor.mood.energy < 35 ? '精力已低' : '心绪未平'}。你打算怎样回应？` : memory ? `${actor.name}已得知：“${memory.content}”。此刻，你的话会影响他的安排。` : `${actor.name}正在${spotName(data, actor.location, actor.spot)}。你可以请他停留写字，也可以促成一次拜访。`,
    choices, resolved: world.resolvedEncounters?.find(e => e.id === key)};
}
export function chooseEncounter(journal: Journal, data: CanonData, agent: AgentId, encounterId: string, choiceId: string): Journal {
  const encounter = encounterFor(currentWorld(journal), agent, data), choice = encounter?.choices.find(c => c.id === choiceId);
  if (!encounter || encounter.id !== encounterId || !choice || encounter.resolved) throw new Error('情境已变化或已作出选择，请查看当前情境。');
  const {next, world, id} = moment(journal);
  const outcome = `${choice.label}。${effect(world, agent, choice.tone)}${choice.directive ? '托付已排入下一步。' : ''}`;
  world.resolvedEncounters = [...(world.resolvedEncounters ?? []), {id: encounterId, choice: choiceId, outcome, tick: world.tick}].slice(-32);
  world.events.push({id, tick: world.tick, time: clockLabel(world.minutes), kind: 'choice', agent, location: world.agents[agent].location, text: `你对${world.agents[agent].name}作出选择：${outcome}`, contentType: 'generated'});
  addMemory(world.agents[agent], {tick: world.tick, type: 'interaction', content: outcome, participants: [agent], origin: 'player', sourceEventId: id, importance: 60});
  const saved = saveMoment(next, world, `临场选择：${choice.label}`);
  return choice.directive ? queueDirective(saved, data, choice.directive) : saved;
}
export function forkMoment(journal: Journal): Journal {
  const next = clone(journal), world = clone(currentWorld(journal));
  if (next.if) {
    if (next.archives.length >= 3) throw new Error('已保留三条历史线，请先在“世界线”中导出并整理一条。');
    next.archives.push({id: next.if.uid ?? 'legacy-if', name: next.if.prompt.slice(0, 24), branch: next.if});
  }
  world.branchId = 'if'; world.worldId = `if:${++next.interventionSerial}`;
  // Preserve completed choices across forks; changing a branch must not reset them.
  world.resolvedEncounters = (world.resolvedEncounters ?? []).map(e => ({...e, id: e.id.replace(/^(main|if:\d+):encounter:/, `${world.worldId}:encounter:`)}));
  next.if = {id: 'if', uid: world.worldId, forkTick: world.tick, intervention: null, prompt: `从 Tick ${world.tick} 的这一刻另作选择`, cursor: 0, snapshots: [{worldState: world, actions: [], summary: '保留此刻全部状态，等待你的新选择。', provider: '用户选择', label: '从此刻分岔'}]};
  next.active = 'if'; return next;
}
export function inviteGathering(journal: Journal, data: CanonData, input: Pick<Gathering, 'place' | 'kind' | 'participants'>): Journal {
  if (currentWorld(journal).gathering?.status === 'pending') throw new Error('已有一场小聚正在等人，请先完成或散席。');
  const {next, world, id} = moment(journal);
  const gathering = gatheringSchema.parse({...input, id, status: 'pending', createdTick: world.tick});
  if (!courtRoutes[gathering.place] || !data.places.some(p => p.id === gathering.place) || gathering.participants.some(id => !world.agents[id].alive)) throw new Error('请选择已有庭院及能够赴约的人物。');
  world.gathering = gathering;
  for (const agent of gathering.participants) world.agents[agent].plan = null;
  const text = `你邀${gathering.participants.map(id => world.agents[id].name).join('、')}到${spotName(data, gathering.place, 'court')}${gathering.kind === 'poetry' ? '联句' : '品茗'}。众人将沿路赴约，身体需要与现有托付仍优先。`;
  world.events.push({id, tick: world.tick, time: clockLabel(world.minutes), kind: 'gathering', location: gathering.place, text, contentType: 'generated'});
  return saveMoment(next, world, '发出小聚邀请');
}
export function cancelGathering(journal: Journal): Journal {
  if (currentWorld(journal).gathering?.status !== 'pending') return journal;
  const {next, world, id} = moment(journal);
  world.gathering!.status = 'cancelled'; world.gathering!.finishedTick = world.tick;
  for (const agent of world.gathering!.participants) world.agents[agent].plan = null;
  world.events.push({id, tick: world.tick, time: clockLabel(world.minutes), kind: 'gathering', text: '你撤回了这次小聚邀请，人物将在下一步继续各自的安排。', contentType: 'generated'});
  return saveMoment(next, world, '撤回小聚邀请');
}

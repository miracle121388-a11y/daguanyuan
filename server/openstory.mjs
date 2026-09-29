// Adapted from ZJU-LLMs/OpenStory (Apache-2.0), commit 3e4857a.
// Changed: bounded structured results, edition-aware context, existing 3D places,
// individual perception, atomic snapshots; no Redis/Ray dependency.
export const storyInstructions = {
  'story-plan': `你是一个智能体的长期计划生成器。请根据以下人物档案信息，生成一个符合人物性格和动机的长期计划。
计划必须紧密结合人物的核心驱动和性格特点；明确说明任务目标、行动方式以及想要获得的具体结果。不要生成规律性的重复行为，而要生成具体的、一次性的目标或事件。
当前time给出真实时刻，每一步仅推进两小时；不得把同日上一时段说成昨天或整夜。计划中不可臆造过去已发生的交谈、眼神、承诺或往来。你只知道perception中的本人记忆、已知地点和当前感知。不能用原著后文预定结局。task是玩家托付，须结合人物性格判断如何落实；previous记录未完成计划与反思，优先延续真实尚未解决的事项。新消息可以打断旧计划。previous.completed为true时旧目标已完成，应根据已发生的结果生成下一件具体的事，不要重复已经完成的目标。
返回JSON {"goal":"第一人称具体目标，120字以内","steps":[{"intent":"本时段具体行动，80字以内","place":"places内地点id","target":"可选，nearby或knownLocations内人物id","activity":"investigate|persuade|confide|reconcile|organize|manage|read|write|rest","importance":1到10}],"reflection":"为什么延续或调整，160字以内"}。
steps为1到6个顺序时段，先准备再互动再处理后果。重要性1-3日常、4-6一般、7-8重要决策、9-10重大冲突。target不涉及他人时省略。涉及他人必须安排目标人物；不可直接安排对方同意或完成行动。地点只能从places选择。不能新增未登场人物或越过当前版本起点。`,
  'story-dialogue': `你正在扮演当前speaker。依据该人物自己的性格、目标、记忆，在给定scene中轮流交谈。
这是OpenStory式人物间自由对话，不是预设选项。history是当前会面中已经说出的话，其中他人陈述仍是听闻而非自动证实。只使用speaker感知，不知道别人的私密记忆。回应对方，允许追问、反对、拒绝、承诺或提出可执行建议，使对话推动当前任务。不要替其他人发言或宣称未执行的行动已完成。语言符合红楼梦时代、身份与亲疏，避免现代话语。
返回JSON {"text":"80到180字以内对话，可含简短神态","end":false}。对话可以提前结束，最多四轮。没有依据的旧事不得编造，未知则追问。必须输出有效JSON对象，例如 {"text":"此事尚未查明，不如先问清来处。","end":false}，不得只输出空格。`,
  'story-outcome': `你是大观园推演的行动裁决与反思模块。只根据给定scene、已发生的dialogue和actor感知，判断这次尝试实际得到的结果。它是虚构世界的新事件，不是原著事实。
当前时段仅两小时，禁止把近期同日经历说成昨天、前夜或整夜。scene.intent是计划，不是过去事实凭据；计划里提到的未经memories证明的旧事、人物动作和消息内容一律不能升级为事实。新事件只发生在当前时段。独自活动可以完成具体的写信草稿、整理账目、搜集当场线索或拟订方案；不能凭空获得外部钱财、人物答复、查明未经调查的秘密，不能宣称未在场者采取行动。对话中说“准备、会、打算”只是意向，不能判为已履行。可产生误解、分歧、商议、拒绝或约定，留下后续问题，不能总是和解。
返回JSON {"narrative":"本次发生的具体故事，100到350字","fact":"可写入参与者记忆的实际结果，最多240字","status":"progress|completed|blocked","thread":"尚未解决的具体问题或后续约定，最多160字；已解决可空","reflection":"发起者对本次结果的反思，最多160字","stability":0,"finance":0,"reason":"状态变化依据，最多120字","relations":[{"from":"参与者id","to":"另一参与者id","trust":0,"affection":0,"resentment":0}]}。
复刻OpenStory复兴评估：明确完成修缮、引入资源、化解重大冲突、完成集体活动才可stability +10；明确激化冲突、泄密或破坏才可-10；普通交谈读书休息为0。仅计划这些事不加分。finance为-5到5整数，无实际资源变化必须0。关系各项为-5到5整数，只能改变在场双方，允许负向变化。不得杀死人物、凭空改变身体、创造建筑或替其他地点的人作决定。status completed仅表示当前步骤完成，不代表整个故事结束。`,
};
const ids=['baoyu','daiyu','baochai','wangxifeng'];
const activities=['investigate','persuade','confide','reconcile','organize','manage','read','write','rest'];
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const str=(x,n)=>typeof x==='string'&&x.length<=n;
const integer=(x,n)=>Number.isInteger(x)&&Math.abs(x)<=n;
const only=(x,keys)=>obj(x)&&Object.keys(x).every(k=>keys.includes(k));
export function validStoryInput(op,p){
 if(!obj(p))return false;
 const perception=p.perception;
 if(!obj(perception)||!ids.includes(perception.self?.id)||!Array.isArray(perception.memories)||perception.memories.length>6||!Array.isArray(perception.places)||perception.places.length>100)return false;
 if(op==='story-plan')return str(p.task??'',400)&&(!p.previous||obj(p.previous));
 if(!obj(p.scene)||!str(p.scene.intent,80)||!activities.includes(p.scene.activity)||!perception.places.some(x=>x.id===p.scene.place)||!Array.isArray(p.participants)||p.participants.length<1||p.participants.length>2||new Set(p.participants).size!==p.participants.length||!p.participants.every(x=>ids.includes(x))||!p.participants.includes(perception.self.id))return false;
 if(!Array.isArray(p.dialogue)||p.dialogue.length>4||!p.dialogue.every(x=>obj(x)&&p.participants.includes(x.speaker)&&str(x.text,400)))return false;
 return true;
}
export function validStoryResult(op,r,p){
 if(op==='story-plan')return only(r,['goal','steps','reflection'])&&str(r.goal,120)&&r.goal.trim().length>0&&str(r.reflection,160)&&Array.isArray(r.steps)&&r.steps.length>=1&&r.steps.length<=6&&r.steps.every(s=>only(s,['intent','place','target','activity','importance'])&&str(s.intent,80)&&s.intent.trim()&&p.perception.places.some(x=>x.id===s.place)&&activities.includes(s.activity)&&Number.isInteger(s.importance)&&s.importance>=1&&s.importance<=10&&(!s.target||ids.includes(s.target)&&s.target!==p.perception.self.id&&(p.perception.nearby.some(x=>x.id===s.target)||p.perception.self.knownLocations?.[s.target])));
 if(op==='story-dialogue')return only(r,['text','end'])&&str(r.text,400)&&r.text.trim().length>0&&typeof r.end==='boolean';
 return only(r,['narrative','fact','status','thread','reflection','stability','finance','reason','relations'])&&str(r.narrative,1200)&&r.narrative.trim()&&str(r.fact,240)&&r.fact.trim()&&['progress','completed','blocked'].includes(r.status)&&str(r.thread,160)&&str(r.reflection,160)&&[-10,0,10].includes(r.stability)&&integer(r.finance,5)&&str(r.reason,120)&&Array.isArray(r.relations)&&r.relations.length<=2&&new Set(r.relations.map(x=>x.from+':'+x.to)).size===r.relations.length&&r.relations.every(x=>only(x,['from','to','trust','affection','resentment'])&&x.from!==x.to&&p.participants.includes(x.from)&&p.participants.includes(x.to)&&['trust','affection','resentment'].every(k=>integer(x[k],5)));
}

你现在接手的是一个已经完成主要 3D 建模和基础交互的大观园数字世界项目。

你的任务不是重新制作大观园，也不是单独创建一个新的多 Agent Demo，而是：

**直接在当前已有项目中加入真正可运行的“世界推演 / IF 反事实模拟”功能，让 AI Agent 的行为能够实时驱动现有大观园中的人物、地点和剧情。**

参考 OpenStory / Generative Agents 的设计思想，但优先适配当前仓库现有技术栈，不要为了模仿 OpenStory 而大规模重构。

## 一、首先检查当前项目

先完整阅读当前仓库：

- README
- package.json / requirements.txt / pyproject.toml
- src
- components
- scene
- character
- api
- backend
- 数据文件
- 3D 模型加载代码
- 地图和人物移动逻辑

先搞清楚：

1. 当前使用什么前端和 3D 技术；
2. 大观园有哪些地点；
3. 当前有哪些人物；
4. 人物现在能执行什么动作；
5. 是否已有后端；
6. 人物、地点、剧情数据目前存在哪里。

**必须基于现有代码继续开发，不要推翻原结构。**

---

# 二、目标功能

实现一个最小但真正能跑起来的：

# Grand View Garden Simulation Engine

核心机制：

```text
World State
    ↓
Agent Perception
    ↓
Memory Retrieval
    ↓
Agent Decision
    ↓
Semantic Action
    ↓
Rule Validation
    ↓
3D Scene Execution
    ↓
State Update
    ↓
Next Tick
```

---

# 三、第一版只实现 4 个核心人物

先使用：

- 贾宝玉
- 林黛玉
- 薛宝钗
- 王熙凤

如果当前项目已经有这些角色，直接连接现有人物。

不要重新建立另一套人物模型。

每个人物至少包含：

```json
{
  "id": "jia_baoyu",
  "name": "贾宝玉",

  "location": "yihongyuan",

  "personality": [],
  "goals": [],

  "mood": {},
  "relationships": {},

  "memories": [],

  "currentAction": null
}
```

---

# 四、建立统一 World State

新增统一世界状态，例如：

```json
{
  "tick": 1,
  "time": "午后",

  "world": {
    "jia_family_stability": 80,
    "jia_family_finance": 70
  },

  "agents": {}
}
```

世界中的所有人物都必须读取和修改同一个 World State。

不能让每个 Agent 自己想象一个独立世界。

---

# 五、实现 Tick 推演

新增：

```text
Run Next Tick
```

按钮。

点击后：

对所有 Agent 依次进行：

```text
感知当前世界
↓
读取相关记忆
↓
结合人格、目标、关系、情绪
↓
决定下一步行动
↓
执行行动
↓
更新世界
```

第一版一个 Tick 可以理解为：

```text
大观园中的 30 分钟～2 小时
```

---

# 六、Agent 不允许直接生成任意代码或坐标

LLM 只能生成结构化 Semantic Action。

例如：

```json
{
  "agent": "jia_baoyu",
  "action": "move",
  "target": "xiaoxiangguan",
  "reason": "想去看望林黛玉"
}
```

或者：

```json
{
  "agent": "jia_baoyu",
  "action": "talk",
  "target": "lin_daiyu",
  "content": "妹妹今日身子可好？"
}
```

支持的第一版 Action：

```text
move
talk
observe
rest
read
write
visit
wait
```

建立统一 Action Schema。

LLM 不能：

- 自己修改 3D 坐标；
- 自己创建不存在的建筑；
- 瞬移；
- 与不在同一地点的人直接对话；
- 使用角色不知道的信息。

---

# 七、让推演真正连接现有 3D 大观园

这是最重要的一步。

AI 输出：

```json
{
  "action": "move",
  "target": "xiaoxiangguan"
}
```

必须映射到现有场景：

```text
怡红院
↓
路径 / Navigation
↓
潇湘馆
```

人物模型必须真实移动。

AI 输出：

```json
{
  "action": "talk",
  "target": "lin_daiyu"
}
```

前端需要：

```text
人物靠近
↓
转向目标
↓
显示对话
↓
更新两个人物记忆
```

如果现有系统已经有动画、导航或角色控制能力，直接调用。

不要建立与现有 3D 场景脱离的文本模拟器。

---

# 八、实现 IF 功能

页面增加：

```text
创建 IF 世界
```

输入框允许用户输入：

```text
如果宝玉提前知道自己要迎娶宝钗，会发生什么？
```

先让 LLM 把自然语言转换为结构化 Intervention：

```json
{
  "type": "knowledge",
  "target": "jia_baoyu",
  "content": "得知家族准备安排自己迎娶薛宝钗"
}
```

然后：

1. 保存当前 World Snapshot；
2. 创建 branch；
3. 修改指定状态；
4. 从该状态继续运行 Tick。

注意：

**IF 本身只改变条件，不直接生成后续剧情。**

后续剧情必须通过 Agent 推演产生。

---

# 九、实现 Snapshot

每一个 Tick 保存：

```json
{
  "tick": 21,
  "worldState": {},
  "agents": {},
  "events": [],
  "actions": []
}
```

支持：

```text
恢复到某个 Tick
```

第一版暂时不需要复杂 Git 式分支管理。

只需要：

```text
主世界
+
一个 IF Branch
```

能真正运行即可。

---

# 十、加入简单推演 UI

尽量融入当前已有 UI 风格。

至少增加：

```text
当前时间：午后
当前 Tick：12

[运行下一 Tick]
[自动运行]
[暂停]

IF：
[如果___________]
[创建世界分支]
```

右侧或者底部增加：

```text
Simulation Log
```

例如：

```text
Tick 12

14:10
贾宝玉从怡红院前往潇湘馆。

14:18
贾宝玉遇见林黛玉。

14:22
林黛玉得知宝玉近日心绪不宁。

Relationship:
黛玉 → 宝玉
trust +2
```

---

# 十一、Memory

每个角色保存自己的记忆。

例如：

```json
{
  "agent": "lin_daiyu",

  "memories": [
    {
      "tick": 12,
      "type": "interaction",
      "content": "宝玉今日来潇湘馆看望我，并显得心事重重。"
    }
  ]
}
```

每次生成 Agent 行动前：

只抽取最相关的若干条记忆。

不要把所有历史全部塞给模型。

第一版可以简单实现：

```text
最近记忆 + 与当前人物相关记忆
```

以后再增加 embedding / vector retrieval。

---

# 十二、Relationship

第一版关系使用几个简单数值：

```json
{
  "affection": 85,
  "trust": 78,
  "jealousy": 20,
  "resentment": 5
}
```

对话或事件发生以后，可以小幅变化。

不要让 LLM 任意一次修改几十点。

设置合理范围，例如：

```text
单 Tick 默认变化范围 -5 ~ +5
```

---

# 十三、加入 Rule Engine

必须在 Agent 输出和 3D 执行之间增加验证层。

例如：

```text
宝玉想与黛玉聊天
```

检查：

```text
两人是否同一地点？
```

如果不是：

```text
拒绝 talk
→ 自动转成 move / visit
```

至少处理：

- 地点存在性；
- 人物是否存活；
- 人物位置；
- 对话距离；
- 信息是否已知；
- Action 是否允许。

---

# 十四、LLM Provider 抽象

不要把模型写死。

设计：

```ts
interface LLMProvider {
  generateAgentAction(...)
  parseIntervention(...)
  summarizeTick(...)
}
```

支持通过环境变量配置。

如果项目已经有 OpenAI / 其他模型接口，直接复用。

同时提供 Mock Provider。

这样没有 API Key 也能测试整个系统。

---

# 十五、优先做真实 MVP

本轮开发优先级：

P0：

1. WorldState
2. 4 个 Agent
3. Tick Engine
4. Agent Action JSON
5. Rule Engine
6. 3D 人物移动映射
7. 对话映射
8. Memory
9. IF Intervention
10. Snapshot

P1：

- 自动连续 Tick
- Relationship
- Timeline
- Simulation Log

暂时不要做：

- 几十个 Agent
- 复杂向量数据库
- 超复杂人格系统
- 微服务
- 分布式 Agent
- 大规模训练
- 复杂剧情编辑器

先让最关键的一条链路真正跑通：

```text
用户输入 IF
↓
改变世界状态
↓
Agent 根据改变做决定
↓
人物在现有大观园 3D 场景中移动
↓
人物发生互动
↓
状态和记忆更新
↓
继续下一 Tick
```

---

# 十六、测试案例

完成后必须跑通这个案例：

初始：

```text
宝玉：怡红院
黛玉：潇湘馆
宝钗：蘅芜苑
王熙凤：贾府
```

用户输入：

```text
如果宝玉提前知道贾府准备让他迎娶薛宝钗，会发生什么？
```

系统：

```text
parse IF
↓
给宝玉新增 knowledge memory
↓
运行 Tick
```

例如 Agent 决定：

```text
宝玉前往潇湘馆。
```

那么现有 3D 场景中的宝玉必须实际向潇湘馆移动。

到达后：

```text
宝玉与黛玉产生对话
```

新的对话进入双方 Memory。

下一 Tick 两人的行为受到这段经历影响。

这个测试案例成功，才算本轮功能完成。

---

# 十七、开发方式

直接开始修改代码。

不要只给方案。

工作顺序：

1. 检查仓库；
2. 输出简短现状分析；
3. 给出准备修改的文件列表；
4. 开始实现；
5. 每完成一个模块就测试；
6. 修复报错；
7. 最后实际运行整个项目；
8. 确保原来的大观园展示功能没有被破坏。

尽量少新增无必要依赖。

所有新模块写清楚注释。

最终补充：

```text
docs/simulation-engine.md
```

说明：

- 推演架构；
- Tick 流程；
- Agent Schema；
- Action Schema；
- IF 使用方式；
- 如何新增人物；
- 如何新增地点；
- 如何接其他 LLM。

最终目标不是生成一个“文字版红楼梦”。

而是让现有大观园真正变成：

**一个人物可以自主生活、用户可以改变历史条件、世界能够持续演化的《红楼梦》3D 可推演世界。**
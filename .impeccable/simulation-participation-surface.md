# 推演参与扩展 · v3

Scope: `src/panels/SimulationParticipation.tsx`, new participation entries in SimulationPanel/SimulationStage, participation styles in `src/styles/simulation.css`. Inherits the existing garden and paper/jade handbook identity. Global DESIGN.md and .impeccable/design.json remain authoritative and unchanged.

Mode: Experience, with Operate controls inside the established handbook. The existing modeled garden remains visible above the mobile panel and beside the desktop panel. No composition tournament or new raster assets: this is a functional extension within the incumbent surface.

User request: “目前的推演交互性有限，继续拓展”. Existing requirements call for immersive, interactive world simulation deeply connected to the modeled garden, personal agent knowledge and reversible worldlines.

## Direction contract

- Entry: the scene's “交谈入局” and the handbook's “入局互动” lead directly to one selected person and three participation modes.
- Continuous conversation: own memories, own last four conversation turns, distinct local-rule/DeepSeek attribution, evidence disclosure, bounded mood/familiarity effects. No implied omniscience, no converting model prose into literary facts or arbitrary state patches.
- Situational choices: describe actual place/needs/known information; show the consequences before choosing; save an immediate snapshot. Fork before choosing and restore a prior moment to explore another action.
- Gathering: invite two to four existing people to a verified courtyard. Each walks using the established scene executor. Shared results require arrival and completed write/rest actions. Needs and pending requests can delay the invitation; six ticks bound waiting.
- First viewport: the modeled person and garden remain visible; the paper panel names the selected person, place, participation modes and immediately reachable dialogue composer. On narrow devices the established expandable panel supplies working room.
- Signature interaction: a choice becomes a durable moment, then a visible action in the modeled garden. A gathering advances from invitation, through actual arrival, to shared memories.

## Quality bar

- Preserve serif literary voice, paper surfaces, jade actions, cinnabar focus. Use existing Lucide icons. No stock dashboard cards or new decorative background imagery.
- Desktop 1440×900; phone 390×844 and 320×740. Controls remain readable, keyboard reachable and contained. Mobile inputs ≥16px; primary actions ≥44px; garden remains visible.
- Busy state, cancellation, empty conversation, pending gathering, completed choice and persisted history must be inspectable. UI copy must distinguish queued tasks from completed activity.
- Verification must include real world state and browser behavior, not screenshots alone. Model credentials stay server side.

## Built ground truth · 2026-09-16

Recorded from the corrected `simulation-participation-20260916-v3` implementation, the two final browser reports, and their 19 screenshots. This is the built record for this surface extension; global visual authority and earlier garden review conclusions retain their existing scope.

### 实际交互

- **入局入口。** 场景人物旁的“交谈入局”选中该人物、切到临场镜头并打开手记的交谈页；“入局互动”提供“与他交谈／临场抉择／邀人小聚”。当前参与人物为贾宝玉、林黛玉、薛宝钗、王熙凤。手记显示所选人物、所在地点和与你的熟悉度，场景继续显示既有几何小像与庭院模型。
- **连续交谈。** 输入限 1–400 字，语气为叙话、宽慰、直言；可选用三条起句，也可用 Ctrl／Command + Enter 发送，输入法合成期间不触发快捷提交。本地规则与服务器模型各自具名；送入回应上下文的是此人的个人记忆及此人最近四轮交谈。回复保存为不推进时辰的完整时刻，并记录个人经历。每人每 Tick 的交谈与抉择共用一次平静／熟悉度调整机会，反复发送仍留记录，但不反复加减数值。
- **历史及依据。** 最近三条交谈直接显示，较早记录放入可展开区域；两处共用同一条目组件，每条保留玩家语气、回复来源、Tick、结果及存在时可展开的“他想起的经历”。引用的记忆 ID 必须属于本次个人上下文。记录中的对白与经历保持虚构身份；明确传递消息仍通过“托付与追问”。
- **临场抉择。** 情境读取当前人物所在地点、心绪／精力及已知消息；每个选项先显示后果，有待办时提示替换原托付。选择立即形成快照，写字、休息或拜访托付排入后续行动。“从此刻另开一线”保留完整当前状态与原线；刚完成选择且存在前一快照时显示“回到选择之前”，后续仍可从“时间快照”恢复。一次选择不等同于托付已经完成。
- **邀人小聚。** 从有舞台路线的现有庭院中择地，邀请两至四人；“联句”对应写字动作，“品茗”对应休息动作。待赴约、先歇息、先完成托付、已到院中分别列出，可继续下一步或撤回邀请。每人沿既有场景执行器行动；所有受邀者在同一 Tick 都已到指定院中并完成所选活动，才记录“小聚已成”及共同经历。仅到场不授予相处结果；成席额外贡献平静 +3、彼此信任最多 +2，并受既有数值上限约束。六个 Tick 后仍未完成便散约，可重新邀请。

### 布局与操作状态

桌面沿用右侧纸面手记（常规宽 402px，901–1180px 区间为 360px），三维园景占其余空间。宋体承担人物名、情境与回复，无衬线承担按钮和来源信息；青绿操作、朱砂焦点、细分隔线继续引用既有视觉角色。参与方式栏随手记内容滚动保持吸顶；回复、选择与结果使用阅读区和分隔线组织。此轮使用现有 GLB 与代码几何小像，没有新增运行时栅格图像。

900px 以下手记转到园景下方，可展开；600px 以下的布局为上方园景保留至少 180px，手记内部独立纵向滚动。390×844 与 320×740 最终图中，展开手记后仍可见园景、所选人物和场景入口。320px 交谈图的语气及发送行在当前滚动位置下方，需要继续纵向滚动；没有把它记录为全部操作同屏。较小场景会隐藏次要人物列表、观看方式及时间信息，仍保留人物入口。

手机交谈输入与选择框为 16px；参与方式、发送／取消、继续故事、邀请和场景人物操作最小高度为 44px，末尾样式覆盖了早先的 42px 声明。控件沿用可见焦点、标签和选中态；回复日志提供礼貌播报。减少动态偏好下手记关闭动画并使用直接滚动。这些是实现与静帧所支持的行为，未由此推定全部辅助技术或实体手机键盘体验。

### 恢复与存档边界

- 回应期间输入、语气和起句禁用，发送位置变为“取消这次交谈”。失败或取消后，同处显示具体原因与“重试这句话”；交谈页抑制手记顶部重复的错误 alert。取消使用独立非提交按钮，成功保存才清空输入。草稿按人物留在内存 store，切换参与方式仍保留；未发送草稿不属于刷新后恢复的存档。
- 远端格式或记忆依据无效时不保存这一轮；取消及迟到回复受 abort／当前 journal 检查保护。运行下一 Tick 必须等待三维场景就绪，每个动作完成播放后才应用状态，整步完成才提交快照；失败或撤销回到前一个完整快照。查看人物及已有存档的入口继续保留，未就绪时按钮和提示说明等待路径。
- 保存的交谈、抉择和邀约均进入同一浏览器 journal。当前世界保留最近 20 条交谈，各分支最多 30 个完整快照；恢复后继续会改写该分支后续记录。已有 IF 在再次分岔时进入历史线，最多保留三条，满额时提示先导出并整理。浏览器拒绝存储会提示导出；旧存档格式或道路版本无效会提示开启新的主世界。
- 原著依据、园林空间解释与舞台导航继续分列。人格、关系数值、对白、几何小像、赴约路线及王熙凤借用园门的展示锚点属于推演设定。回应内容只形成经校验的交谈记录与固定范围的效果，不作为原文证据或任意世界状态补丁。

### 验收证据与复判

| 证据 | 已记录结果及范围 |
| --- | --- |
| `.impeccable/review/simulation-participation/report.json` | 父任务执行的本地模式最终报告，21 项检查通过。覆盖交谈提交与同 Tick 效果边界、人物历史隔离、选择排入真实待办、原线保留与恢复、小聚到场后完成活动、刷新恢复、390px／320px 无页面或手记横向溢出，以及无浏览器运行错误。 |
| `.impeccable/review/simulation-participation-model/report.json` | 父任务执行的模型与恢复最终报告，24 项检查通过。真实交谈先出现一次严格校验 502，重试恢复；随后记录两次真实 200。另有一次故意使用错误访问令牌得到真实 401，未写入交谈。历史混合来源、结果与记忆展开校验、就地错误提示、草稿保留及取消不再提交均有报告记录。取消使用浏览器延迟 fixture，未将该请求发往模型，不能据此声称验证了真实上游中断。 |
| 两份报告的 `screenshots` | 本 documenter 逐张按原始尺寸打开全部 19 张最终图（本地 10、模型与恢复 9），覆盖 1440×900、390×844、320×740；文件与所名状态相符，没有空白或加载失败画面。桌面选择与邀约图显示待办／等待语义，成席图显示四人及共同经历。手机错误、忙碌、取消图显示发送区域旁的恢复入口；较早历史图显示该旧条目的本地规则来源，完整字段保留由共用组件及报告共同支持。部分图处于手记内部滚动位置。 |
| `reports/acceptance/simulation-participation-ui-review.md` 与 `simulation-participation-ui-verdict.md` | 初审保留；同一审稿人的最终复判将 F1 历史来源与依据、F2 就地忙碌／错误／取消恢复、F3 主操作高度全部记为 **resolved**，`disposition: ship` 仅覆盖这三项修复及该批次涉及的回归。 |

本记录核对了 `SimulationParticipation.tsx`、`SimulationPanel.tsx`、`SimulationStage.tsx`、`SimulationControls.tsx`、`simulation.css` 及 participation／store／engine 状态实现；未重跑浏览器、测试、构建或 detector。未扩大为整站批准、实体手机帧率结论、长期文学一致性保证或公网部署成功。最终部署与在线验证由父任务记录于 `docs/PROGRESS.md` 及对应发布报告。

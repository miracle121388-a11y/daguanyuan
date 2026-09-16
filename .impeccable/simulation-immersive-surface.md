# 场景中的世界推演

Mode: Operate within Experience. This bounded extension inherits DESIGN.md and the existing simulation surface. The garden remains the main subject; a compact scene companion introduces people, place, intentions and direct interaction. No replacement visual identity or decorative imagery.

User task: change a condition, observe people carry out plans in the existing modeled garden, intervene with a concrete request, and trace what actually happened across saved worlds. OpenStory informs persistent plans and interruption; MiroFish informs evidence-linked activity, interviews and reports. The implementation remains local and uses reviewed canon.

Direction: paper and ink reading surfaces, jade primary actions, cinnabar selected records, existing serif narrative. On desktop the garden sits beside a 402px notebook. On mobile a bounded sheet leaves the scene visible. “入园沉浸” hides the notebook while a compact dock retains run/pause, speed and reopen controls. No separate dashboard or card grid.

Signature: follow a person through an actual courtyard gate into a checked staging position; switch to a closer view, read their current intention, and give a request that becomes part of their next completed action. Changes in knowledge interrupt plans and can travel through actual conversations. Each report cites recorded events. World comparison requires the same Tick.

Honesty: court routes and figurines are staged navigation, not claims about the novel. Local interviews assemble the selected person's own current state and memories; they are labeled as such. No unconfigured AI service is presented as connected. No source project's marketing claim stands in for inspected implementation.

Evidence required: desktop 1440×900, mobile 390×844 and 320×740; ordinary and immersive stage, interaction, actual courtyard arrival, knowledge flow, same-time comparison, saved branch recovery. Check busy, cancellation, empty and error states, keyboard controls, page overflow and camera release. Browser results establish tested behavior, not physical-device performance.

Scope: simulation engine/store, SimulationPanel, new scene companion and interaction/branch sections, SimulationActors, scoped styles, and existing GardenScene/App integration. Keep garden art, content publication and broad design authority intact.

---

## Built-surface supplement — 2026-09-15

### Overview

本次建成范围是“场景中的世界推演”，沿用“一念之间”手记、既有纸面／玉绿界面和四个抽象舞台小像。模式仍为本 surface 的 Operate within Experience；`DESIGN.md` 与 `.impeccable/design.json` 保持全站权威。以下记录当前实现与已提供证据，不更新全站设计令牌，不新建 comp、QUALITY BAR 卡、插画或艺术世界。

园景中直接显示时刻、世界、人物选择、所在位置和当前打算；“托付与追问”连接人物与手记。手记现在提供园中纪事、人物心迹、消息流转、世界线、时间快照五类记录。“入园沉浸”收起手记，保留人物、镜头和运行操作。新增 IF 和记下托付分别保存条件与待办，均不立即推进时间或移动人物；后续 Tick 的实际行动、对话和完整快照才形成可追踪的结果。

### Colors

手记、场景伴随面板、名签和对白继续使用 `paper-light`，字段使用 `paper`，正文为 `ink`，辅助信息为 `muted`，分隔为 `line`。玉绿承担下一步、选中世界／人物、消息连线和交互入口；朱砂承担当前记录分类、条件变化、撤回／删除文字和焦点。原始值仍归既有设计文件与样式所有。

人物身份色继续由 `src/simulation/world.ts` 的 `agentColors` 提供：宝玉（`#9c493b`）、黛玉（`#416b67`）、宝钗（`#9a7435`）、王熙凤（`#77506c`）。同一颜色连接小像、脚下圆环、执行中的路径、选择器圆点与消息图节点边线；它们是推演人物标识。局部浅绿（`#e7ebdf`）用于例句、观看方式和追问选中／悬停；深锈色（`#87412c`）与暖纸（`#f4e9df`）用于错误。主操作悬停保留深绿底与白字（`#fff`）。

已有 `reports/acceptance/simulation-immersive-detector.json` 含 43 项 advisory：40 项字号提示和 3 项颜色提示；字号主要是辅助信息，另含现有标题字级，颜色为两处白字和一处错误深锈色。处理为在本 surface 记录真实用途并保留既有层级，没有机械改色、扩充全站令牌、添加忽略规则或重跑 detector。最终浏览器报告记录所采样的辅助文字与浅纸对比度为 5.1746:1；这只支持该采样，不代表全部状态完成无障碍审计。

### Typography

标题、时刻和叙述沿用设备宋体回退（`STSong, Songti SC, SimSun, serif`）；操作使用既有中文无衬线。手记标题保持 26px／1.4，≤900px 为 21px；场景人物名为 22px／1.4，手机为 18px，普通场景高度 ≤280px 时为 16px。场景打算为 13px／1.8、最多两行；普通手机场景隐藏该段，沉浸视图显示。

纪事、记忆与消息转述为 14px／1.85；打算正文为 15px／1.9，本地追问回答为 15px／1.95。沉浸对白为桌面 16px／1.9、手机 14px，文本区最高 110px 并可内部滚动。控件与辅助信息保留本功能的 9–13px 局部级别；这些尺寸不成为全站正文标准。请求字段桌面为 13px／1.7，手机为 16px；IF 输入和设置输入／选择器也保留手机 16px 的覆盖值。

### Layout

| 视口／模式 | 当前建成布局 |
| --- | --- |
| >1180px | 现有园景与不收缩的 402px 右侧手记并置，以 1px 纸缝分隔。 |
| 901–1180px | 手记宽 360px，页眉按既有规则收紧。 |
| ≤900px | 园景在上、全宽手记在下。手记默认占工作区 54%，展开为 73%；普通园景最小高度 180px。 |
| ≤600px | 手记默认 56%，展开仍为 73%，上限为 `calc(100% - 180px)`；工作区为底部导航预留 `52px + env(safe-area-inset-bottom)`。 |
| 沉浸 | 手记使用 hidden／display:none 退出布局，园景填满可用工作区；场景底部操作区提供下一刻、自动／暂停、速度、撤销与状态。手机底部主导航继续可见。 |

手记的标题、世界选择、Tick 标识和页脚位于内部滚动区之外；时刻、运行控件、速度、五类记录、表单、正文和设置均在滚动区内，因此向下阅读时运行控件会离开手记的可见区域。桌面滚动区水平内边距 24px，手机为 18px；页脚始终保留“全园观察”和“本地存档 · 虚构推演”。纪事、记忆、消息和世界对照使用连续行，关系表有独立横向滚动容器。

场景伴随控件在桌面距左右 20px、顶部 18px；人物条在其下，底部人物面板距底 20px、最大宽 600px。手机左右为 12px、上下约 10px；普通场景高度 ≤280px 时收起人物条与观看方式、隐藏时刻，保留人物身份、托付入口和入园沉浸入口。390px 与 320px 的展开记忆截图仍显示宝玉、黛玉和道路；320px 请求截图直接显示两项选择与提交按钮。容器覆盖层本身不截获画布操作，按钮和可滚动对白接收交互。

开启推演时，普通索引／详情、场景标题、工具条、园图区、院落取景按钮及原导览条由推演表面接替。场景人物决定所需的详细院落模型；退出推演后恢复普通游园入口。沉浸不新开页面，也不切换另一套园景。

### Elevation & Depth

手记与场景伴随面板是平整纸面，依靠细线和内容分组建立层次，没有新增面板阴影或模糊玻璃。人物上方对白继续使用小纸片阴影（`0 5px 20px #283b2929`）。空间深度来自现有三维园林与相机取景；本轮人物近景的记录不批准整体园林的艺术质量。

### Shapes

字段、主要按钮和场景容器以 3px 小圆角为主；人物选项、观看方式、追问按钮与名签使用 2px，对白使用 4px。下一步与自动／暂停按钮最低 44px；手记关闭按钮为 40px 方形。手机记录分类与 IF 提交最低 44px，世界选择／例句最低 36px，手记人物选择最低 40px，名签最低 38px。

场景人物选择与观看方式最低 36px；普通手机“托付与追问”最低 38px，沉浸手机提高为 44px，桌面为 42px。速度按钮桌面最低 32px、手机最低 36px；追问按钮桌面最低 38px、手机最低 44px。以上保留实际不同的操作范围，不声称所有控件都是 44px。请求与模型设置继续使用原生 select 和 password input，原生箭头及密码外观随浏览器变化。

### Components

#### Scene companion, figurines and camera

- 场景人物条只选择／聚焦人物；点击人物本体、人物名签或“托付与追问”会打开该人物的请求表单。底部面板显示姓名、当前位置／院内站位及计划目标，并提供“临场”“跟随”“全园”。时刻驱动既有晨光／月夜，退出推演恢复此前的日夜选择。
- “临场”使用相对人物偏移（3.6, 3.5, 6.2）；“跟随”为（15, 16, 22），两者均为 48° FOV、目标高于人物位置 1 单位。只有跟随模式在实际画布宽 ≤900px 且高 <600px 时，按 `min(.8, max(.36, height / 520))` 缩短偏移。调整画布大小重算取景；手动拖动画布释放跟随，再次选择同一人物也可恢复。
- 四个代码构成的小像保留衣色、发髻、脚下圆环，读书／写字时出现书卷与抬臂，休息时姿态降低。执行路径以人物色细线呈现。名签锚点高度 2.3，手机上移自身一半；同地点人物左右错开 35%，属于简单分离规则。交谈纸片锚点高度 4.2、宽度上限为 `min(270px, 70vw)`。沉浸底部另显示当前发言或与所选人物有关的最近对话。

#### Run, pause, speed and recovery

- “运行下一 Tick”是手记的实底主操作，沉浸中缩写为“下一刻”。可选择 1×、2×、4× 的场景播放速度；时间语义仍显示“一步约一小时”。自动运行在完成 Tick 后继续，关闭自动可停在完整步骤之间。
- 状态区分 ready、条件解析、人物思量、执行、暂停、自动及已保存。忙碌时禁用冲突的世界切换、条件提交、请求编辑、恢复和决策来源选择，保留“撤销本步”；解析阶段没有暂停操作。暂停保留当前步骤并停止人物播放，继续恢复；撤销中止当前步骤并回到上一个完整快照。隐藏页面停止自动运行并暂停正在播放的人物。减少动态规则取消手记动画／平滑滚动，园林动态设置限制小像起伏与写字摆动，不据此声称所有主动行动被移除。
- 场景未就绪时运行按钮禁用，并提示等待园林或重试模型；无三维能力时仍可查看人物与存档。错误在运行区域以可关闭 alert 呈现，沉浸控制区以状态文字呈现。存储不足提示导出，旧存档不兼容时说明已开启新主世界。图形上下文丢失会取消推演并提供以轻量画质重新加载三维的入口。上述状态依据源码记录，静帧不冒充逐项重新触发。

#### Requests, interviews and evidence boundaries

“托付一件事”提供前往地点、拜访人物、告知消息、读书、写字、休息、观察七类请求。前往现有院内路线的地点标有“入院”；拜访排除本人；消息有 400 字上限并明确只让所选人物先听到。提交后显示待办与“更新托付／撤回”，保存待办不推进时间或移动人物。运行后人物依当前条件逐步执行，完成的请求只消费一次。

追问提供“打算／听闻／信任”三个话题，回答始终标明“根据此人的当前状态与记忆整理 · 本地回应”，可展开对应记忆的 Tick 与内容；选择服务器决策模型不把此处改称在线模型访谈。人物页还可展开最近自省，展示最新八条记忆、总条数、消息来源及关系数值表。

| 信息类别 | 在本表面的身份与边界 |
| --- | --- |
| 原文证据 | “此地原文依据 · 与推演分列”折叠区从既有 reviewed canon 的地点来源中，按阅读范围展示最多两条摘录及标题／段落定位；无可展示来源时明确说明。引用仍属于文学资料。 |
| 空间解释 | 地点主题、院落模型、绝对位置和空间布置沿用既有园林解释；地点氛围说明不写成直接引文，三维细节不写成唯一考据复原。 |
| 舞台路线与虚构推演 | 四处庭院的站位和行动路线明确标为舞台安排；小像、人格、数值、计划、IF 知情、对白和结果属于推演。王熙凤初始“贾府”借园门作展示锚点。执行与通过路线检查不增加文学证据。 |

#### Records, message flow and worldlines

园中纪事包含条件、行动、对话、规则、关系、玩家托付和自省；“为何这样行动”展开理由与事件编号。IF 输入保留三个具体例句，创建新 IF 时明确旧 IF 自动保留至世界线。未开始、未传达消息、没有第二条世界线、缺少同 Tick 主世界快照及没有历史线均有各自空状态。

消息流转以四个固定人物节点和有向曲线呈现已完成的消息转述，读取保存的完整世界记录；未传达消息不产生连线。同方向转述聚合为一条边，事件列表显示最新十二条。图下四个人物按钮显示各自知情数并进入人物交互；SVG 自身提供图像语义和转述次数说明。事件可展开核对编号与理由，导出按钮保留下载图标和完整文字。

世界线只对照同 Tick 的主世界／IF 完整快照，逐人列出位置、平静差值与 IF 额外知情数，并提示差异是本次观察，不等于唯一因果。缺少匹配快照时说明如何运行到同刻。历史线显示当前数量／3、分岔与当前 Tick；恢复交换当前 IF 与被选历史线并保留各自进度。删除与恢复为分开的操作，说明中保留导出建议。时间快照显示当前／恢复状态、每分支最近 30 个完整快照及恢复后续写的影响。

JSON 导出覆盖所有世界与快照；Markdown 推演纪要按已完成的虚构快照生成，明确不是原著事实或现实预测，引用实际事件编号。已查看的纪要也对缺失同 Tick 对照给出说明，记录依据不因导出而变成文学原文。

#### Decision-source settings

“推演方式与说明”位于手记内部的 details 中。原生“决策来源”默认提供“本地规则 · 无需密钥”，服务器选项使用配置接口提供的模型显示名；未配置时标记并禁用。当前验收配置显示 `DeepSeek-V4.1-Flash`。获取配置失败会显示重试；仅在选用服务器模型且配置要求口令时出现“推演访问口令”密码框，说明为“使用项目管理员提供的推演口令”。口令不是前端填写的模型 API 密钥。

设置说明区分本地规则依据和服务器模型接收的个人感知／相关记忆，并保留小像、数值与舞台路线的虚构身份。桌面与手机设置截图都允许内部滚动：桌面可见模型选择及部分遮蔽口令框；手机可见模型选择和口令标签，下方字段与说明未全部进入截图。这里不宣称已拍到完整设置表单；后续线上完整捕获属于另一次发布证据。

#### Interaction repairs and keyboard behavior

1. **模型与人物焦点一致性：resolved。** 推演打开时，Overview 与 Detail 模型点击停止普通地点选择路径，Overview 的手形提示也按同一状态关闭；人物位置仍驱动详细院落与镜头，不再由隐藏的普通详情抢占。退出推演后保留普通地点拾取。
2. **“托付与追问”直达表单：resolved。** 每次 inspect 都设置目标并递增调用序号，即使当前已经是同一人物页也会在渲染后滚到请求表单、聚焦第一个 select，再消费目标。320px 请求图与桌面模型院落图显示相应表单和朱砂焦点；普通记忆阅读保持自己的滚动位置。

打开推演聚焦手记标题；退出按钮有名称，Escape 退出推演；人物、观看方式、速度、世界及记录按钮保留 pressed 状态，展开手记保留 expanded 状态。作用于手记按钮／select／textarea 和场景按钮的可见焦点为 2px 朱砂、偏移 3px；密码框沿用全局焦点规则。五类记录是带名称的按钮组，不据此声称实现了完整 ARIA tabs 键盘模式。

### Do's and Don'ts

- **Do** 在本 surface 延续纸面／宋体／玉绿层级，并让人物、道路和院门在手机有界手记上方保持可辨。
- **Do** 将原文证据、空间解释、舞台路线与推演结果分别具名；保留本地追问身份和事件编号。
- **Do** 按当前实际滚动边界与控件尺寸扩展本功能，保留关闭、暂停、撤销、重试、恢复与导出入口。
- **Don't** 将局部字级、状态色、小像外观或此处布局提升为全站新权威。
- **Don't** 将本次两项修复的 ship 结论扩大为整站审美通过、实体手机性能认证或公网部署完成。

**Evidence and limits:** 本文档核对 `PRODUCT.md`、`DESIGN.md`、既有 simulation surface、当前方向契约、document playbook、对应组件／样式／状态代码与下列已存在报告；没有运行浏览器、服务器、测试、detector、外网请求或读取私密配置。

- 实际打开 `output/playwright/simulation-immersive-final/` 全部 13 张 PNG，并读取其 PNG 尺寸：桌面 1440×900 的 `desktop-initial`、`desktop-moving-paused`、`desktop-dialogue`、`desktop-memory`、`desktop-interaction`、`desktop-court-immersive`、`desktop-message-flow`、`desktop-world-comparison`；390×844 的 `mobile-initial`、`mobile-memory`；320×740 的 `mobile-320`、`mobile-320-immersive`、`mobile-320-request`。
- 该目录 `report.json` 时间为 `2026-09-15T10:24:30.816Z`，记录 **35 项通过、Edge / default renderer、无运行错误或失败请求**，地址为本地 `http://127.0.0.1:4281/`。记录涉及完整 IF／行动／对话、私有知情、托付、院内到达、消息图、同刻比较、分支恢复、手机布局等；本文只引用已运行结果。
- `reports/acceptance/simulation-immersive-ui-review.md` 的初判是 **fix**；最新 `simulation-immersive-ui-verdict.md` 将上述两项 material fixes 都评为 **resolved**，`disposition: ship` **仅覆盖这两项修复**。该复判另外引用定向交互回归与原游园用例的记录，本文没有把 35 项烟测冒充这些独立回归的重跑，也没有重新全面审美审查。
- 实际另打开 `output/playwright/simulation-deepseek-accepted/` 的 `desktop-model-settings.png`、`desktop-model-court.png`（均 1440×900）和 `mobile-model-settings.png`（390×844）。同目录 `report.json`（`2026-09-15T10:23:22.138Z`）记录真实 HTTP 模型验收 **11 项检查通过**：一次条件解析、四人各自两次决策共八次、两次小结，11 个请求均返回 200；Tick 1 和 Tick 2 完成并保存，最终宝玉位于秋爽斋 court，快照决策来源显示 `DeepSeek-V4.1-Flash`，运行错误为空。它与本地规则的 35 项报告分别引用，不能互相替代。

截图记录了这些浏览器视口中的构图与状态；手机图是浏览器视口证据，设置图包含内部滚动裁切。本文不补证未运行状态、实体设备速度或后续在线行为。发布与线上验收状态继续以 `docs/PROGRESS.md` 和对应 release 证据为准。
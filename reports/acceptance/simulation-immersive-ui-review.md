disposition: fix

输入边界：本轮是既有纸面／玉绿界面与舞台小像的限定扩展，未选择新 comp 或 QUALITY BAR 卡；不要求重选视觉世界。未阅读全文级的历史设计记录、研究笔记或未列出的引擎模块；主要源码按本次交互路径抽查。未运行浏览器、测试、服务器或第二次 detector。

## persistence

**pass（本次扩展范围）**。PRODUCT.md、DESIGN.md、.impeccable/simulation-surface.md 与 .impeccable/simulation-immersive-surface.md 均存在。现有 DESIGN.md 的纸面、宋体、玉绿与朱砂规则仍与画面一致。没有发现本轮未记录选择的 comp 文件；历史园林 FORM 原始输出缺失仍按 DESIGN.md 保留，不由本次推演审查补证或扩大批准范围。

证据检查通过：独立打开了 output/playwright/simulation-immersive-final/ 中全部 13 张 PNG，并读取 PNG 尺寸。desktop-initial、desktop-moving-paused、desktop-dialogue、desktop-memory、desktop-interaction、desktop-court-immersive、desktop-message-flow、desktop-world-comparison 均为 1440×900；mobile-initial、mobile-memory 为 390×844；mobile-320、mobile-320-immersive、mobile-320-request 为 320×740。没有空白／黑块或与所称状态不符的必要截图；记忆、请求和对照截图允许手记内部滚动。

同目录 report.json 记录 35 项通过、Edge 默认 renderer、无运行错误或失败请求，次要文字对比度 5.1746:1。这是父任务提供的真实浏览器记录，本审查没有重跑；它不证明实体手机性能，也没有覆盖下列两个源码发现。已有 detector 的 43 项均为 advisory（40 字级、3 颜色）；继承的辅助字级与局部状态色不要求机械改成另一套界面。

## fidelity

| 元素／承诺 | 判定 | 证据与边界 |
| --- | --- | --- |
| TYPE | match | 叙事标题、时间和记忆沿用现有中文宋体气质，操作文字保持原有无衬线层级；PRODUCT.md 明确保留设备宋体，没有新增系统粗黑展示字。 |
| MATERIAL | match | 场景由现有三维院落、植物与明确抽象的舞台小像构成；手记是平面纸色阅读面，没有用 CSS 假金属、刻印或新增插画替代已建模型。 |
| GROUND | match | 界面遵循 DESIGN.md 的 paper-light #fcfaf3；report.json 的面板值为 rgb(252,250,243)，截图的纸面与现有整体温度一致。三维园景保留其独立材料，不作新艺术世界评价。 |
| THESIS／第一视口 | match | desktop-initial 中园景为主体，402px 手记并置；世界、时刻、下一 Tick 与具体 IF 示例可辨。推演已是主导航首项。 |
| OWN-WORLD | match | 玉绿主操作、朱砂记录选中态、薄分隔线和克制纸面容器延续既有系统；没有新增同尺寸卡片网格或装饰性仪表盘。 |
| STORY／模型与人物焦点 | contradicted | 场景点击仍能走普通地点选择路径；它与按人物位置维护详细院落的状态互相冲突，见修复 1。此结论来自源码，不冒称截图中已经复现了失配。 |
| STORY／托付与追问入口 | contradicted | 可见按钮没有独立的交互区导航目标。人物页已滚到记忆时，重复点击同一人物的按钮不会回到托付表单，见修复 2。 |
| FORM／响应式 | adaptation | 按本轮方向契约，桌面并置改为手机上方园景与有界底部手记。390px 与 320px 展开记忆仍留出人物和道路；320px 请求表单完整落在栏宽内。此为既有布局的响应式扩展，没有新概念 roll；历史 seed 边界见 persistence。 |
| 沉浸控制 | match | desktop-court-immersive 与 mobile-320-immersive 显示扩展后的园景，并保留下一刻、自动运行、速度和打开手记入口；320px 控制没有被导航截断。源码明确分出忙碌、暂停、撤销、加载与错误状态。 |
| Truth／文学依据与推演 | match | 本地追问标注“根据此人的当前状态与记忆整理 · 本地回应”；原文依据独立折叠并标明舞台路线。IF、人格数值、对白和小像的虚构边界有明确文案。导出纪要声明依据完整虚构快照，附事件编号；同刻对照明确拒绝缺失相同 Tick 的比较，不声称唯一因果。 |
| Floor | match | 未见标题上方 kicker、Unicode 替代图标、装饰性玻璃或硬阴影；图标来自 Lucide，消息图是实际几何关系图。记忆正文、输入、选中态和焦点样式沿用现有系统；不把所有小型辅助控件描述为 44px 触达目标。 |

## ceiling

reached（仅本次继承界面的视觉扩展）：既有园林提供空间深度，人物近景、对话、手记收起和同刻记录提供交互层次。没有本轮 QUALITY BAR 卡可作额外比较；本结论不批准整体园林艺术质量，也不推断未观察的动画流畅度或实体设备性能。

## material_fixes

1. **模型与焦点一致性** — [GardenScene.tsx](../../src/scene/GardenScene.tsx:41) 的 Overview 点击仍调用 choosePlace，后者把 selectedPlaceId 换成所点地点并置 panelOpen=true；[SimulationStage.tsx](../../src/panels/SimulationStage.tsx:19) 只在 open／派生 detail 变化时恢复人物院落，而 [store.ts](../../src/simulation/store.ts:121) 的同人重新聚焦仅清理面板／热点。普通详情在 [App.tsx](../../src/App.tsx:56) 被隐藏，但 CameraManager 仍根据 panelOpen 改视口偏移。推演开放期间应停用普通模型地点选择及其手形提示，或统一路由到明确的推演地点查看操作；保证人物焦点、待载入院落、panelOpen 与相机策略一致。以真实场景点击另一处 Overview 模型，再重复选择当前人物，核对其详细院落不会丢失、相机不会因隐藏详情偏移，退出推演后普通地点选择仍有效。
2. **让“托付与追问”直达实际表单** — [SimulationStage.tsx](../../src/panels/SimulationStage.tsx:32) 的入口只执行 [store.ts](../../src/simulation/store.ts:125) 的 inspect；当 people／非沉浸状态已经成立时，[SimulationPanel.tsx](../../src/panels/SimulationPanel.tsx:45) 的滚动 effect 不会重新执行，mobile-memory 与 mobile-320 所示的记忆阅读位置便会保留，托付表单仍在屏外。为该入口建立显式交互区目标／调用序号，在表单完成渲染后滚到并聚焦“托付一件事”的标题或首个控件；同一人物、同一页的重复点击也应生效。验证从已下滚的记忆页、其他记录页与沉浸视图进入，390px／320px 均能直接看到请求动作，且普通记忆阅读不被无故重置。

## keep

保留现有园林模型与色彩、抽象舞台人物、纸面／玉绿界面、同刻分支对照、可核对的消息记录，以及文学依据、空间解释和舞台推演的清楚边界；修复限于上述交互接线。

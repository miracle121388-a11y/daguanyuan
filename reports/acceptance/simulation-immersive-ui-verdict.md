## verdict

本轮仅复判 simulation-immersive-ui-review.md 的两项 material fixes。已重新打开原目录的全部 13 张同名 PNG，尺寸仍为桌面 1440×900、手机 390×844／320×740，画面有效；并查看用户新增 DeepSeek 配置与院落的三张图。核对了对应修复源码和既有回归记录，没有运行浏览器、测试、服务器或 detector，没有读取私密配置文件。

| 原修复项 | 评分 | 本轮证据 |
| --- | --- | --- |
| 1. 模型与人物焦点一致性 | **resolved** | [GardenScene.tsx](../../src/scene/GardenScene.tsx:41) 的 Overview 在 simulation.open 时不再执行普通 choosePlace，手形提示也受同一条件限制；Detail 点击在第 50 行采用相同保护。desktop-initial、desktop-memory、desktop-interaction 与 desktop-court-immersive 的人物、院落和手记构图保持一致。最新 [playwright.json](playwright.json) 记录定向回归及原 published-scene 用例均通过；[simulation-interaction.spec.ts](../../tests/e2e/simulation-interaction.spec.ts:34) 使用实际 canvas 点击检查推演期间 selectedPlaceId／panelOpen 不被更改、重新聚焦恢复人物院落，以及退出推演后普通地点拾取仍有效。 |
| 2. “托付与追问”直达表单 | **resolved** | [store.ts](../../src/simulation/store.ts:127) 的 inspect 每次写入 inspectionTarget 并递增 inspectionRevision；[SimulationPanel.tsx](../../src/panels/SimulationPanel.tsx:45) 在渲染后定位表单并聚焦首个 select，随后消费目标。新的 mobile-320-request 直接呈现“托付一件事”、两个选择框与提交按钮，首个选择框显示朱砂焦点框；desktop-model-court 也显示表单及其焦点。定向回归第 26–32 行与第 48–55 行记录桌面和 320px 同人物重复点击后的可见性、焦点检查通过，原 mobile-memory／mobile-320 仍可正常停留在记忆阅读位置。 |

## remaining

clear。未观察到本批修复引入的回归。重新捕获的 report.json（2026-09-15T10:24:30.816Z）记录 35 项通过、无运行错误或失败请求；本审查只引用该记录，不冒称重跑。新增模型配置仍在既有手记内展示，模型名与口令说明没有改变原两项修复路径；追问仍明确标为本地记忆整理。

**ship 仅覆盖上述两项已评分修复，不是对整个界面的重新全面审查。**

disposition: ship

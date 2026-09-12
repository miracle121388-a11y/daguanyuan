## verdict

**第 3 项“正式手机热点和等价入口”：resolved。** 本补记只评分 r6-full-review.md 的 material_fixes 第 3 项，不重做完整视觉矩阵，也不将局部修复升级为全页通过。

- 逐张重新打开本次指定的 7 张截图：.impeccable/review/mobile-courtyard.png、courtyard.png、interior.png、cutaway.png、narrow.png，以及 reports/browser/r6-packaged-production-mobile.png、r6-packaged-production-desktop.png。它们均为有效捕获，画布与对应内容已加载，没有需要 recapture 的缺图或错误状态。
- 最新正式手机截图中，潇湘馆的 1／2／3 三个数字热点均可见，彼此没有覆盖；“院内细节”原生选择器位于三项视图按钮之下，标签和操作框完整可见。mobile-courtyard.png 呈现相同入口，不再依赖测试模式才出现院内数字。courtyard.png 的桌面版本同样显示三个热点和选择器；interior.png 与 cutaway.png 中选择器保持“一明两暗的书斋”，相应室内与剖视内容可见。
- 已读取 r6-packaged-production-smoke.json 和 r6-hotspot-packaged-production-smoke.log：实际 dist＋server 包运行在 http://127.0.0.1:4275/，mobile.hotspotTap 与 mobile.equivalentDetailPicker 均为 true；无调试钩子，errors／failed 均为空。抽样阅读 scripts/production_smoke.mjs 确认其在正式包实际 tap“曲廊与竹径”、等待对应细节文本，再通过“院内细节”选择“竹下泉渠”、等待对应文本，最后恢复“院落全貌”。这给出了两条真实入口的运行证据，超出了仅检查按钮存在。
- 已读取 r6-hotspot-e2e.log 的 11 passed，并抽样阅读 tests/e2e/mobile.spec.ts 中上述热点 tap、等价选择器、细节文本和恢复流程。该记录对应主线程提供的 390px／DPR 3／4G／CPU×4 手机模拟；本审查者没有重新执行这些测试。正式包烟测本身的 networkThrottle 为 false，不能把这两组运行条件混写。
- 抽样阅读 GardenScene.tsx 和 ReferenceExperience.tsx：院内 Html 使用 occlude={false}；数字按钮与选择器都写入同一 hotspotId，并退出 cutaway；按钮有名称与 aria-pressed，原生 select 由“院内细节”标签包裹。截图中的可见入口和运行记录中的选点结果一致，因此本项不只是机械移动标签后的 partial。
- 在以上 7 张截图及已读运行记录覆盖范围内，未发现本修复批次引入的新实质回归。新增选择器、三种视图和“艺术参考”身份均保持可见。

## remaining

- 第 3 项在本次提供的本地正式包与手机模拟条件下已解决，没有留下该项的已知阻塞。
- 全园／主楼／潇湘馆资产完成度、手机选院取景、夜景主景层次仍属于原完整报告的未处理重建范围；本补记没有重新评分这些项，也没有复查文档与历史 seed 收尾。r6-full-review.md 的原始 disposition: rebuild 保留。
- 本次只检视指定 7 张新截图；320px 的 narrow.png 是总览画面，不能据此声称检查了 320px 选院后的完整细节流程。没有逐院、逐视角检查全园全部热点，没有实体手机、原生移动浏览器、屏幕阅读器或全部键盘流程实测。
- data-scene-ready／aria-busy 及正式烟测等待它们的代码已抽样阅读；它们不等于全部性能目标或所有分区加载状态获认证。本次不复核首次可交互速度或帧时间。
- Zeabur 上传已由主线程发起，但本次没有公网运行证据；127.0.0.1:4275 的正式包结果只证明本地包，不能写成线上通过。未启动浏览器、未执行第二次 detector、未修改实现或旧完整报告。

disposition: rebuild

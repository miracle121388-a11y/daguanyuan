disposition: rebuild

输入边界：无获批网页 comp 或独立 QUALITY BAR；采用用户明确的“写实、足够惊艳、尊重原著”标准。历史 seed 原始输出不可用。源代码按主要路径抽样，未逐行审计全部生成器、canon 数据及全部日志，也未独立打开 P01/P02 书图；不存在的 src/styles.css 以 src/styles/reference-world.css 为当前样式样本，CameraManager 位于 src/scene/GardenScene.tsx。

## persistence

- **pass — 产品与解释边界。** PRODUCT.md 存在；docs/SPATIAL_RECONSTRUCTION.md 与 docs/REFERENCE_WORLD.md 明确统一几何来源、艺术参考、文学证据和策划路线的区别。references/spatial-reference-provenance.json 记录 P01/P02 来源与未提供的配套资料，不能据此称本审查独立核实了书图平面。
- **pass — 捕获证据。** 以下 11 张必需截图均实际打开，尺寸与内容一致；没有加载占位、黑屏、空白画布或错场景。夜景中的暗树冠属于已渲染场景，不是无效截图。截图证明这些状态可见，不代替操作验证。

| 必需捕获 | 尺寸 | 实际可见状态 | 证据结论 |
| --- | --- | --- | --- |
| .impeccable/review/desktop.png | 1440×900 | 晨光全园、中央组群、水系、名签和导览 | valid |
| .impeccable/review/user-1266.png | 1266×712 | 用户尺寸的晨光全园 | valid |
| .impeccable/review/mobile.png | 390×844 | 轻量全园、手机导航和导览 | valid |
| .impeccable/review/narrow.png | 320×740 | 窄屏轻量全园，控制没有出屏 | valid |
| .impeccable/review/plan.png | 1440×900 | 俯视水陆、道路与院落 | valid |
| .impeccable/review/central-ensemble.png | 1440×900 | 大观楼组群与对应资料 | valid |
| .impeccable/review/courtyard.png | 1440×900 | 潇湘馆院墙、月门、竹林与屋舍 | valid |
| .impeccable/review/interior.png | 1440×900 | 潇湘馆书案、书架与室内围护 | valid |
| .impeccable/review/cutaway.png | 1440×900 | 潇湘馆揭顶结构与隔间 | valid |
| .impeccable/review/night.png | 1440×900 | 全园月夜和发光窗灯 | valid |
| .impeccable/review/mobile-courtyard.png | 390×844 | 潇湘馆近景、手机资料抽屉 | valid |

- **fail — 最终设计持久化。** 当前空间契约明确说明 DESIGN.md / .impeccable/design.json 仍为 r3，r4 尚待记载；已有 detector 的 51 项均为 advisory：20 颜色、30 字号、1 圆角。它们说明旧文档与当前样式存在待确认差异，不等于 51 个已证实的视觉缺陷。本审查没有再次运行 detector。
- **fail — FORM 的 seed 可核实性。** 41ecba8d 只有历史文档记载；新契约诚实披露原始输出不可用，仍不能把 seed 核对记为通过。用户指定的沉浸园林方向继续有效，随机形式不能覆盖它。
- **功能证据，单独列示。** 已读 spatial-e2e-release.log，记录 11 E2E passed；已读最终捕获日志及 reference-smoke.json 的捕获/检查清单。319 空间检查、2217 地形道路射线检查、1359 完整性检查、1822 meshes / 18 images / 15 roots / 34 GLBs 是父任务提供的验证范围，本审查未重跑，也不据其数量判断写实程度。spatial-rebuild-provenance.txt 记录 45 rasters、0 missing。performance.json 的 Intel UHD 桌面结果为 high 52.62 ms mean / 94.1 ms p95、low 27.48 / 77.8 ms，明确不是实体手机测试。r4 部署仍待进行，当前截图不构成线上 r4 验证。

## fidelity

参考图片已先于方向契约打开。其可借鉴之处是层层遮掩的园林空间、随地势组织的群植、岸石与水边植物的细密过渡、木构和瓦面的真实光影，以及建筑倒影形成的纵深。它不是获批网页构图或可测量平面；以下矩阵只按用户要求及五项方向承诺评判，不把参考图的湖形、楼层数或建筑位置强加为规格。

| 要素或承诺 | 分类 | 可见证据与判断 |
| --- | --- | --- |
| TYPE | adaptation | 宋体主标题、清楚的界面文字和统一线性图标延续纸面文学阅读。PRODUCT.md 明确系统宋体回退、不分发本机字体，是本次适配依据；没有获批字样可供逐字复刻。 |
| MATERIAL：三维主体 | contradicted | 真实网格和纹理确实在场，但 desktop / central-ensemble / courtyard 的整体仍呈低细节模型：草坡宽阔而光滑，树群像重复的同类轮廓，白墙、木格与屋顶连续重复，岸线缺少足以读成自然石岸的细密层次。文件中存在细节不能替代最终画面里的写实感。矛盾覆盖主要场景，触发 rebuild。 |
| GROUND | match | PRODUCT.md 指定的米白纸面、深墨与低饱和青绿在导航、资料和控制区成立。OWN-WORLD 未规定三维地表或天空的唯一色值，不能将参考图片的暖光色温强行作为数值标准；地面和水面的质感问题归 MATERIAL。 |
| THESIS：连续可探索、能核查空间 | match | plan 能辨认中央组群、周围曲水、两侧院落及相接道路；水面与园图代码消费同一轮廓。此结论限于本方案的可读性和一致性，不声称这是原著唯一位置关系。 |
| OWN-WORLD：真实地形、石岸、木构和陈设形成近远层次 | contradicted | 大部分全园视野被相似树形和均匀草坡占据；近景竹叶显露大量片状轮廓，主楼的白墙块面及相似屋面压过木构细节。室内已能看到线装书、卷轴和椅子，但大面积木纹隔板、简化家具与重复书堆仍未形成可近看的写实书斋。 |
| STORY：图文与原文分别展开 | match | 中央组群和潇湘馆详情均展示参考图及解释；桌面可见“艺术参考”“空间布局 · 设计解释”，底栏明示策划路线。App.tsx 把直接引文、摘要、展示位置和设计解释分别处理。该判断不扩展为所有 canon 引文的独立复核。 |
| FIRST VIEWPORT：主楼、水岸、桥廊与前景 | contradicted | 主楼、水岸和桥亭均存在，但 desktop / user-1266 的第一记忆仍是铺满同类树木的绿色模型地形：中心建筑规模偏弱、远坡占据大块画面，前景没形成足以引人入园的空间层次。这里要求重新组织焦点与深度，不要求复制参考图布局。 |
| FORM：用户指定沉浸游园、纸面阅读 | adaptation | 全幅三维、四周轻量控制与选景后资料面板符合用户指定方向。历史 seed 无原始记录，核实缺口仍保留于 persistence；没有证据证明本轮另行完成了可核对的 concept roll。 |
| 手机响应布局 | adaptation | mobile / narrow 的底部导航、独立镜头、简化名签与 mobile-courtyard 抽屉均有合理位置；PRODUCT.md 明确要求手机底部抽屉及低画质，是其依据。截图中没有文字或按钮出屏。 |
| 手机视觉材质 | contradicted | mobile / narrow 中院落、地面、水和路径明显变为大片平色；mobile-courtyard 虽保留屋面与竹叶几何，缺少足够接触阴影和材质层次，竹叶切片感更强。低画质需求能支持 LOD，不能把“写实”整个移除。mobile_export.py 的纯顶点色总览和低画质关闭阴影与所见一致。 |
| 月夜 | contradicted | night 是有效月夜状态，窗灯也实际发光；但树群大面积并成暗块，景深、主楼轮廓与水面光影不足以建立夜游焦点，亮纸面控制反而先被看见。 |
| Craft floor | match | 必需截图中未见渐变文字、装饰性玻璃、硬块阴影或 Unicode 图标替代系统。路线选择器上方文字是实际表单 label，不能误判为标题 eyebrow；地点数字承担索引对应关系。未从静态截图推断未展示状态的对比度、键盘或动效检查已通过。 |

## ceiling

未达到用户要求的“足够惊艳”的写实园林。仍未充分使用这个世界自身的表现手段：疏密有别的乔灌草层、石岸与土坡互相嵌合、近处瓦口和木构的真实体积、墙脚和构件交接处的接触阴影、水与岸之间连续的反光、在院门与竹影后逐步露出的空间。中央组群、潇湘馆与书斋的主体细节仍低于其自身旁边所展示的艺术参考所承诺的材料完成度。已有坐标统一和构件数量不能弥补这一差距。

静态捕获不证明镜头和交互的流畅性；当前性能记录的高画质均值超过 50 ms、两种画质都有明显 p95 帧时延，尚不足以支撑流畅漫游的完成声明，实体手机体验仍未测得。

## material_fixes

1. **Fidelity / MATERIAL / OWN-WORLD — 重建三维主体的视觉资产与呈现：** 重新推导全园前中远景、中央组群、水岸、潇湘馆竹院和书斋；produce：多种有分枝体积的树冠与对应真实轮廓 LOD、分层地被和岸石组、能近看且比例一致的木构/瓦口/家具，以及按实际尺度制作的材质与烘焙阴影图集；验收必须发生在实际镜头中，保持已审查坐标、水陆轮廓和稳定 ID，不以增加散点、重复模块或滤色代替重建。
2. **Fidelity / 手机 MATERIAL — 将手机总览的大片顶点平色替换为保留表面差异和接触深度的低成本版本：** produce：针对手机模型的材质/环境遮蔽烘焙图集与适合近距离的植被 LOD；在 390 和 320 视口保留屋面、墙面、地面、水与竹林的可辨质感，继续保留现有触控布局。
3. **Fidelity / FIRST VIEWPORT / 月夜 — 随重建重新确立日夜构图：** 让入口或桥岸提供前景、主楼及水岸形成明确中景、疏密树群承担远景；夜景需让受光轮廓与水边反光指出同一个焦点，避免主要画面仍读作暗色树群和草坡。
4. **Contract / FORM — 41ecba8d 保持“未核实”状态，只有取得可追溯的原始 roll 证据才能关闭这一核查项；** 用户指定形式继续优先，不为补齐记录而声称历史输出已找到，也不借此改换园林方向。
5. **Persistence — 最终视觉确定后更新 DESIGN.md 与 .impeccable/design.json，** 记录 r4 实际世界、当前色彩/字号/圆角、LOD 材料适配和来源边界，逐项解释已有 advisory，不能将旧 r3 文档当作本次完成记录。
6. **Ceiling / 运行体验 — 在重建后的实际游览与近景切换上处理帧时延，** 当前 high 52.62 ms / low 27.48 ms 均值及 p95 证据须如实保留；优化目标与实测条件应同时记录，实体手机未测时继续明确说明，不能将桌面模拟宣称为真机验收。

## keep

保留统一布局与水陆/路网数据源、15 个稳定地点 ID、文学证据与空间解释及策划导航的区分、真实可编辑三维与 Manual_Adjustments、本地资产及 provenance，以及已可见的图文联动、院内/屋内/剖视和手机控制结构。

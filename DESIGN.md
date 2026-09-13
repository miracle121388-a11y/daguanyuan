---
name: 大观园·入梦
description: r15 有实体围护的清代重彩三维园林；保留纸面阅读系统和文学证据边界。
colors:
  paper: "#f3f0e6"
  paper-light: "#fcfaf3"
  ink: "#28372c"
  inherited-ink: "#343d34"
  muted: "#606e5d"
  line: "#d4d8c8"
  jade: "#496343"
  cinnabar: "#8b4b34"
  icon-selection: "#e4e8dc"
  index-selection: "#e3e8d8"
  view-surface: "#e3e7d9"
  scene-paper: "#f3f0e6eb"
  tour-green: "#466345"
  tour-green-hover: "#344f36"
  action-paper: "#fff9eb"
  world-earth: "#e4e8d4"
  world-plaster: "#eadcb6"
  world-limestone: "#d4d8d0"
  world-day: "#c9dfda"
  world-night: "#253d4b"
  water-day: "#337e77"
  water-night: "#2e4651"
  lamp-warm: "#ffc785"
typography:
  brand:
    fontFamily: "STSong, Songti SC, SimSun, serif"
    fontSize: "23px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "2px"
  display:
    fontFamily: "STSong, Songti SC, SimSun, serif"
    fontSize: "31px"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "3px"
  headline:
    fontFamily: "STSong, Songti SC, SimSun, serif"
    fontSize: "29px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "3px"
  title:
    fontFamily: "STSong, Songti SC, SimSun, serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "normal"
    letterSpacing: "1px"
  body:
    fontFamily: "STSong, Songti SC, SimSun, serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.9
  interface:
    fontFamily: "Microsoft YaHei, PingFang SC, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "normal"
  label:
    fontFamily: "Microsoft YaHei, PingFang SC, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "normal"
rounded:
  label: "2px"
  control: "3px"
  small-paper: "4px"
  compact-panel: "5px"
  mobile-index: "6px"
  tour-panel: "7px"
  floating-panel: "8px"
  mobile-drawer: "12px 12px 5px 5px"
spacing:
  tight: "4px"
  small: "8px"
  compact: "12px"
  regular: "16px"
  section: "20px"
  reading: "24px"
  desktop-edge: "27px"
components:
  button-primary:
    backgroundColor: "{colors.tour-green}"
    textColor: "{colors.action-paper}"
    rounded: "{rounded.small-paper}"
    typography: "{typography.interface}"
    height: "44px"
    padding: "0 24px"
  button-primary-hover:
    backgroundColor: "{colors.tour-green-hover}"
    textColor: "#fff"
  button-icon:
    textColor: "{colors.inherited-ink}"
    rounded: "{rounded.control}"
    height: "44px"
    width: "44px"
  button-icon-hover:
    backgroundColor: "{colors.icon-selection}"
    textColor: "{colors.jade}"
  navigation-active:
    textColor: "#3a583e"
    typography: "{typography.interface}"
  search:
    textColor: "{colors.ink}"
  detail-point-select:
    backgroundColor: "{colors.paper-light}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "8px"
  person-chip:
    backgroundColor: "#edeedf"
    textColor: "#586d51"
    rounded: "{rounded.label}"
    padding: "6px 10px"
  catalogue-row:
    rounded: "{rounded.label}"
    padding: "11px 13px"
    width: "100%"
  catalogue-row-selected:
    backgroundColor: "{colors.index-selection}"
    textColor: "#3e614b"
  atmosphere-button:
    rounded: "{rounded.control}"
    typography: "{typography.label}"
    height: "44px"
    padding: "10px 13px"
  atmosphere-button-selected:
    backgroundColor: "#455d43"
    textColor: "#f8f4e8"
  view-button:
    backgroundColor: "{colors.view-surface}"
    rounded: "{rounded.control}"
    padding: "9px 5px"
  view-button-selected:
    backgroundColor: "#4e6749"
    textColor: "#fff"
  courtyard-framing:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.small-paper}"
    typography: "{typography.label}"
    height: "44px"
    padding: "10px 14px"
  interpretation-strip:
    backgroundColor: "#eef0e5"
    textColor: "#65715d"
    padding: "10px 9px"
  scene-label:
    backgroundColor: "#f4f1e6ed"
    textColor: "#314b37"
    rounded: "{rounded.small-paper}"
    padding: "6px 10px"
  scene-label-selected:
    backgroundColor: "#38573f"
    textColor: "#fff"
---

# Design System: 大观园·入梦

## r15 当前修正方向（2026-09-13）

用户明确要求三维建筑具备真实墙体，并采用清代绘本的浓墨重彩、富丽堂皇。这取代下文历史版本的三维低饱和方向及“快速结束”限制；纸面界面、阅读内容和导航位置继续保留。体验主体由朱红漆木、石青石绿彩画、暖白围护、金色线脚及大观楼金色屋面构成。青绿水色与较中性的日光承接园景；潇湘馆、蘅芜苑采用青绿梁枋，稻香村与芦雪庵保留土色、茅屋和自然木作。

已实际查看 `references/paintings/M02.jpg` 全景、M03 山石、M04 省亲与 M15 室内图版。参考的是墙面与开口的实虚关系、朱红／青绿／金色的层次，以及彩画集中于梁枋和格扇的方式。具体墙厚、窗扇、梁枋纹样和材料参数是建模解释，不作为原著引文或清代实测数据。来源与哈希见同目录 `provenance.json`。

房屋增加实体墙、窗下墙、门窗侧壁和窗纸，中央门洞保持畅通；亭、游廊及桥亭依功能敞开。新增围护在高模、手机与全园远景中保持同一厚度；剖视同时隐藏对应的顶棚。配色通过 Blender 材质烘焙保留来源微观纹理，原始照片不改写。现阶段为 r15 候选，实际验收与发布状态以 `docs/PROGRESS.md` 为准；以下 r14 及更早图像和结论均为历史快照。

## Overview

**Creative North Star: "沉浸游园"**

访客直接进入可旋转、缩放与近看的真实 WebGL 园林，纸面索引、文学释文和导览操作停留在画面边缘。界面以温纸、深墨和低饱和青绿为主，宋体承接文学内容，中文无衬线承接操作信息。默认收起地点索引与详情；选择地点后才展开阅读。手机手动选院时以近景和可滚动图文抽屉共存，闲置导览条收起。

**本记录的当前建成版本为 `spatial-garden-20260912-r14`。** 对应冻结候选包 `.deploy/reference-20260912-155712-092545`（49,536,574 bytes／47.24MiB，588 个实际文件的长度与 SHA-256 见 `reports/acceptance/r14-package-inventory.json`），本地包预览地址为 `http://127.0.0.1:4293/`。本轮重建既有锚点上的竹枝叶扇，在原有床带的源蕨下连接低叶组，收窄土壤／草地过渡，并防止贴图重复编码；两份几何／地影控制图更新，其余交付材料和园景艺术栅格保持 r13 字节。纸面、字体、建筑、水路、完整源林冠、手机取景和夜景构图保留。GLB／JS／WASM 在上传目录中以 Brotli 单份存储，逻辑资源的 identity／gzip 内容由服务器无损还原。截至 Ready 交接，r14 正在按授权发布到既有 California 服务，成功及在线验证尚未确认；r13 是此前最后确认的在线版本。文档不宣布视觉批准或本轮部署成功。

**历史记录边界。** r8／r10／r11 的参数和结论属于各自版本；r10 完整独立复核为 **REBUILD**。旧 r11 包 `.deploy/reference-20260912-081731-311690`（46,623,899 bytes，557 个文件）及其 14 图扫描、性能和验收是历史快照。r12 包 `.deploy/reference-20260912-102643-070479`（52,217,390 bytes，437 个文件）和 `.impeccable/review/r12-final/` 保留；`r12-full-review.md` 为 **FIX**，列出 FORM 来源、种植地表、焦点植物、手机近景与月夜深度五项。fix1 包 `.deploy/reference-20260912-124455-508731`（50,915,889 bytes，588 个文件）及 fix2 包 `.deploy/reference-20260912-135401-786847`（51,218,986 bytes，591 个文件）与各自记录保留。r13 包 `.deploy/reference-20260912-150313-914164`（51,284,686 bytes，591 个文件）的 `r13-verdict.md` 仍为 **FIX**：第 1 项 unresolved，第 2、3 项 partial，第 4、5 项保留限定 resolved；过暗回归 R1 已 resolved。本轮只延续同五项及本批次回归，r14 同一复判尚待完成，不以文档、种植数量或技术检查替代。

用户指定的沉浸三维、克制纸面和设备宋体继续有效；用户继续要求精修材质与景观，最新要求“快速结束”，本轮不再追加精修或性能采样。方向承诺见 `docs/SPATIAL_RECONSTRUCTION.md`，全园院落、水系和道路位置仍是统一解释。没有已批准的网页 comp、decision comp 或 QUALITY BAR 卡；给定艺术图只提供题材与完成度参考。历史 FORM seed `41ecba8d` 仍没有可认证的原始输出，来源要求明确未满足，没有重摇或重建假输出。十五幅本地生成园景图属于艺术参考；原著依据、空间解释、策划导览和艺术参考分别具名。

当前网页竹枝可见分层叶扇与露出的枝节，原生潇湘馆图的叶扇结构更清楚；竹脚、石旁与院边出现更多连接的低叶组。局部仍可见重复组形、分开的种植片与中央大块平缓草地，手机竹叶在缩小画面上仍有细碎纹理合并；这些观察不成为种植或配色标准，也不由文档关闭原第 2、3 项。过暗回归 R1 已由 r13 复判限定解决，不再记作本轮既存未关闭项。近景／全院、三点选择器与艺术参考标签继续可见，夜景保留路径—桥—楼层次；此前两项的限定 resolved 不扩大为全园批准。原生图呈现独立的物理材质和照明，不能替网页与手机叶面可读性结案。

本次文档更新沿用已核对的 `PRODUCT.md`、样式与组件记录，读取 r13 复判、r14 最终交接和报告，逐一打开 21 张当前图像：`.impeccable/review/r14-final/` 中的 desktop、plan、courtyard、interior、cutaway、night、central-ensemble、yihongyuan、hengwuyuan、qiushuangzhai、character、event、user-1266、mobile、mobile-courtyard、mobile-whole-courtyard、narrow，`reports/browser/r14-packaged-production-desktop.png` 和 `r14-packaged-production-mobile.png`，`reports/blender/r14-master-full.png` 和 `r14-master-xiaoxiang.png`。对应库存为 `r14-final-capture-inspection.json`、`r14-package-capture-inspection.json`、`r14-native-capture-inspection.json`；完整索引为 `.impeccable/review/r14-review-packet.md` 及 Ready 附记。独立图像尺寸、SHA-256 和实际开图记录见 `reports/acceptance/r14-documenter-completion.json`。没有重跑浏览器、应用测试、构建、detector、context 或 seed。室内静帧关闭动态，手机图来自 Windows 触摸模拟，原生图不证明网页外观、手机性能或默认公网访问。

**Key Characteristics:**

- 三维园林占据页眉以下的完整画布，界面围绕边缘展开。
- 温纸浮层、细边线、小圆角与柔和阴影共同建立阅读层。
- 宋体文学标题与叙述，中文无衬线导航与操作。
- 原著依据、空间解释、策划路线和生成美术参考分层；手机缩略图保留“艺术参考”。
- 桌面右侧释文在手机转为底部抽屉；手动选院收起闲置导览条，以较低近景／全院两种构图配合等价细节选择器。
- 十五个地点、十五幅参考图；十三处具有各自的室内镜头。
- 同一布局供地形、水面、园图与导览使用；实际道路与桥面保持朝上的可见铺地。
- 本地来源木石表面按构件尺度与方向重制；实际几何 AO、树冠地影和真实场景反射分别承担深度。
- 原生母版使用完整源树冠的关联实例；网页近景从全叶面开始预算简化，远景使用四行二十视向图集，根部保持同一种植位置。
- 庭院配置、地表遮罩和原生源植物共享床带解释；999 个源蕨实例按网页预算显示，本地程序焦点材质与 CC0 源植被分别具名。
- 苗木、庭石与庭院细节仍是空间美术解释；完整原生、近景与远景各有层级，网页薄叶散射是引擎近似而非自发光。
- 院内数字点与原生细节选择器同步地点细节和镜头。

## Colors

温纸、墨色与多种克制的园林青绿构成界面；前置令牌记录实际使用值，不把相近的局部绿色强行合并。

### Primary

- **园林青绿 / jade**：链接、设置、部分图标及室内入口使用的全局主色。
- **导览深绿 / tour-green**：底部开始、暂停和继续按钮；悬停使用 tour-green-hover。
- **操作浅青 / icon-selection、index-selection、view-surface**：分别用于图标状态、选中地点条目与视角选择底面。它们在代码中不是同一个值。

### Secondary

- **印章朱砂 / cinnabar**：品牌印章、索引标签的当前项、关联点、通用悬停与键盘焦点。主导航当前项已经改为青绿，不再沿用旧文档的朱砂导航规则。

### Neutral

- **温纸 / paper**：页眉、浮动索引、详情、导览条与图录的主要底面。
- **浅纸 / paper-light**：设置与部分恢复提示。
- **场景纸 / scene-paper**：总览标题的半透明阅读底面。名签、园图和操作工具另有局部透明度。
- **字段深墨 / ink**：搜索输入和建筑要点通过变量引用。
- **继承深墨 / inherited-ink**：根元素的默认文字仍从基础样式继承此值；更新 --ink 并未同步改变这一直接赋值。
- **淡墨 / muted、纸缝 / line**：次级说明与分隔。具体释文和辅助文字仍有局部颜色，不宣称全部统一到两个变量。
- **动作浅纸 / action-paper**：导览主按钮上的文字。

**The Evidence Label Rule.** 用可见文字区分原著依据、空间解释、策划路线与生成美术参考；手机缩略图也保留“艺术参考”，颜色和放大图标不能代替身份文字。

附属 JSON 中的八阶色带由已用颜色合成，仅供设计面板预览；应用本身没有对应的八阶主题或颜色切换功能。

三维颜色独立于纸面界面。`world-earth`、`world-plaster` 和 `world-limestone` 是当前网页对同名地面、灰泥和石灰岩材质施加的色调；地表另按世界坐标混合来源土壤、种植／近岸遮罩、多尺度变化与几何地影。梁柱、深木、格扇、地板、家具、屋面、瓦、切石、铺地、`courtbase`、岸石、庭石、旧石及竹下土层保留来源贴图，运行时使用白色乘数；`gardenstone` 是 r12 新增的来源表面角色，未被伪装成单一纯色石块。岸石与石灰岩下部按世界高度降低明度与粗糙度。`world-day` / `world-night` 共用于网页天空与雾，`water-day` / `water-night` 共用于两档网页水面，`lamp-warm` 用于窗屏、纸与灯笼发光。前置令牌记录当前实际输入；r12-fix1 更新月夜水色，原生 Cycles 水材质另有物理参数；两套渲染不能靠同一色卡等同。所有三维输入受纹理、光照和色调映射影响，不是截图取色，也不供网页正文套用。

历史 detector 留有 51 项 advisory（20 颜色、30 字号、1 圆角），以当时旧记录为比较范围；本次没有重跑，也没有声明这些提示全部消失。用户明确指定的中文系统宋体和纸面小圆角继续保留。当前文档按最终 CSS 级联保留真实的组件选中色、辅助字号与半透明表面，不以扩大令牌表掩盖缺陷。侧车保留十二项现有组件预览，包括手机近景／全院按钮；来源材料色带只作元数据展示，不合成照片式材质。

## Typography

**Display Font:** STSong、Songti SC、SimSun、serif。
**Body Font:** 文学叙述沿用宋体；操作使用 Microsoft YaHei、PingFang SC、sans-serif。
**Label/Mono Font:** 没有独立等宽字体。目录序号使用 tabular-nums。

**Character:** 宋体、正常字重与标题字距承担文学语气。导航和控件使用较紧凑的无衬线文字；项目没有固定比例的字号阶梯，也不分发系统字体文件。

### Hierarchy

- **Brand**：桌面名称使用 brand；手机为 19px，370px 以下为 16px。手机隐藏印章与副标语。
- **Display**：场景标题使用 display；1150px 以下为 29px，手机总览为 22px，370px 以下为 19px。手机展开详情时隐藏标题纸面。
- **Headline**：详情标题使用 headline；手机最终覆盖值为 24px。图录标题独立使用 30px / 1.4，手机为 23px。
- **Title**：地点列表名称使用 title；详情小节为 15px，图录缩略图标题为 19px，手机为 20px。
- **Body**：主要释文使用 body，手机最终也是 14px / 1.9；原文引文在手机为 14px，来源展开操作为 13px。
- **Interface / Label**：桌面主导航为 interface；日夜与图录入口以 label 为基础。视角按钮为 11px，窄屏为 10px。9–11px 的局部辅助文字是当前实现事实，不应直接推广为新的正文标准。

**The Reading Voice Rule.** 文学标题与叙述使用设备宋体回退，导航与操作使用设备中文无衬线；不以远程字体建立运行依赖。

## Layout

应用占据 100dvh，没有旧版固定最小高度。桌面页眉高 68px；其下为完整三维画布。初始索引关闭，标题位于左上，晨光／月夜位于右上，垂直工具条靠右，园图在左下，导览条浮在底部。

桌面索引为左侧浮层：宽 270px、左距 22px、上距 20px、下距 118px。打开后场景标题移到左侧 315px。详情是右侧可滚动浮层：宽 350px、右距 82px、下距 114px；选中内容时顶部为画布内 82px。1150px 以下详情宽 326px。底部导览容器左右留白 27px、离底 21px、高 75px；1150px 以下隐藏左侧阅读统计，850px 以下继承隐藏路线说明的基础规则。

手机断点为 600px：页眉高 60px，三个主导航入口固定在底部，高 52px 加设备安全区。导览条左右 11px，高 65px，位于底部导航上方。索引以浮层展开，宽 min(278px, calc(100vw - 24px))；选择地点或人物后关闭索引。搜索输入为 16px，地点行至少高 54px。

手机详情最终从 52dvh 向下展开，左右留白 9px；370px 以下从 50dvh 开始。一般详情底部为 137px 加设备安全区；手动打开地点且导览闲置时，导览条隐藏，抽屉底部改为 60px 加设备安全区，内容区获得更多高度。该状态顶栏高 34px，关闭按钮以绝对定位保留至少 44px 操作高度。抽屉内部滚动，视角选择条置顶吸附，其后是独立的“院内细节”原生选择器；地点参考图缩成右浮的 116px × 78px 缩略图，并保留图上的“艺术参考”。详情打开时隐藏下方园图与手势说明。

手机选地默认进入近景，并显示“看全院／拉近院景”；切换只改变同一院落的镜头。镜头读取抽屉实际边界，扣除工具与底部占位，按目标包围盒的八角计算透视距离并留 6% 余量。r12-fix1 近景进一步裁小且降低：普通特色院落横向半宽为 8.8，深度为地点局部 -2 至 12.6，高度上限为 6.5；大观楼与其他地点另有范围。近景方向采用较低的 0.38／0.62／1 比例，全院为 0.30／1.32／1，均归一化；这些是当前相机参数，不是文学空间尺寸。全院使用完整包围盒以帮助定位。

当前手机近景图中建筑和竹径占据更多画面，院墙局部可以离开画布；全院状态明显后退并升高。选中地点的屋顶名签在手机隐藏，三个数字细节点继续显示，并保留原生选择器。较低构图与投影检查能说明近景和全院不同，不能单凭这两点宣布叶片与材质已经充分可读；原手机近景项已在 fix1 的限定复判中 resolved，当前薄叶受光和手机缩放后的叶面细节仍属于植物项的复判边界。近景仍是外部院落镜头，不称为步入院内。

图录为原生模态 dialog：桌面最大宽 1280px 或 94vw，最大高 92dvh；缩略图为 3:2。网格默认三列，1150px 以下两列，600px 以下一列。大图等比容纳，最大高度为桌面 68dvh、手机 60dvh。

实际样式还包含 1600px、850px、800px 和 370px 的局部规则。850px 的继承规则使 601–850px 且详情打开时的场景标题与工具条隐藏，不能把所有平板行为推断为手机行为。间距令牌只记录复用值，不表示项目采用统一八像素网格。

总览、俯瞰、选地、室内、剖视和院内细节是同一三维世界的相机／显示状态。手机使用独立总览位置与 58° 普通视角，俯瞰为 72°；桌面总览为 48°、选地为 43°，室内使用地点预设。详情打开时镜头按可见区域偏移。俯瞰入口先返回全园再切换高位镜头，显示同一水陆和路网关系；它不是另一张独立园林贴图。

## Elevation & Depth

相对于旧版固定列，当前索引、详情、设置和导览条均是覆盖在园景上的纸面浮层。小圆角、半透明背景与柔和阴影让它们与三维深度分开；原文记录与列表仍通过细线和色差组织，不逐条增加重阴影。

### Shadow Vocabulary

- **主要纸面浮层**（0 16px 46px #182a2424）：索引、详情、导览与设置使用 --shadow。
- **标题入口**（0 5px 18px #1b302322）：展开索引按钮。
- **小工具浮层**（0 8px 22px #1d32221a）：日夜选择与场景工具条。
- **地点名签**（0 5px 16px #12241723）：随三维位置出现的纸签。
- **图录模态**（0 25px 80px #08140d66）：配合深色遮罩的高层阅读容器。

桌面释文沿水平方向短移并淡入（350ms、cubic-bezier(.16,1,.3,1)）；手机改为自下方淡入（300ms、ease-out）。索引有 250ms 透明度规则，但关闭状态为 display:none，不将它描述成完整的开合动画。系统减少动态偏好关闭 CSS 动画与过渡，并初始化关闭水面与路径动态。用户主动开始的导览仍会移动镜头；拖动画布会暂停导览。

**The Scene and Paper Rule.** 园林的光影表达三维空间，纸面与阴影表达可操作的阅读层；晨光／月夜只改变园景，不把界面换成另一套主题。

### Spatial Materials and LOD

r14 的 `r14-layout-preservation.json` 记录 `config/garden.layout.json` 除 revision 外完整相同；`garden.planting.json` 与 reviewed canon 未变。`r14-focal-rebuild.json` 检查 14,727 个保留对象的身份及 11,196 个源树种植变换，Manual_Adjustments 集合保留，当前对象数为 0。`r14-botanical-export-preservation.json` 另检查 17 份近景／总览交付的非植物几何与地点／热点语义不变；本轮植物网格重新导出，不能沿用 r13“全部 40 份 GLB 未变”的结论。中央楼群、潇湘馆一明两暗、竹径、踏石与绕屋水渠仍延续同一解释。植物习性、密度、尺寸、陈设和镜头路线属于美术空间解释，不是唯一原著坐标或历史形制。

**The Shared Geometry Rule.** 水陆边界读取 `config/garden.layout.json` 的同一 outline / holes，精确岸线填面校验该水系的哈希，地形、水面与园图不各自描摹；铺路与导览读取同一路网。生成集合可替换，Manual_Adjustments 保留。

#### 材质与可编辑构件

`config/craft.materials.json` 的基础材质 revision 仍为 r12，共十五个角色；fix1 引入的五个 botanical 材质现由焦点植物模块读取 fix2 来源图，不把场景版本与基础材质配置版本混为一谈。装配入口 `blender/r8_materials.py` 保留历史文件名，实际读取当前配置和衍生图片。底色、法线与粗糙度分别连接并打包，面片长轴决定木纹方向，纹理周期使用建模米制。r12 在实际裁片的线性光均值附近调节底色对比，再转换颜色；五类木作分别控制表面周期、法线和粗糙度。来源像素已由最终报告检查，但这些参数是可重放的本轮设置，不自动成为未来视觉质量标准。

| 复用表面角色 | 当前本地来源 | 在园林中的实际作用 |
| --- | --- | --- |
| 梁柱、深木、格扇、地板、家具 | wood_table_001 | 同源裁片按构件长轴投射；梁柱与格扇、较哑的地板、较光的家具使用各自的尺度和对比。 |
| 连续屋面、明暗瓦 | grey_roof_tiles 的单瓦内部裁片 | 来源提供表面；瓦面弧度、搭接、脊、檐和承托由三维构件建立。 |
| 切石、铺地、旧石、连续铺地承托 | white_sandstone_blocks_02 的单块内部裁片 | 避开源照片砌缝；实际台阶、铺板边界与承托几何定义构造，r12 更新铺路与台基的明度和周期。 |
| 岸石、庭石 | mossy_sandstone | 岸石与保留源比例和 UV 的 rock_moss_set_01 岩块共用岸边层次；gardenstone 将来源表面施于有侵蚀凹洞的自建庭石，不能据材质命名推断地质真品。 |
| 地表与竹下土层 | 本地来源草地／土壤及 litter 材质 | 同一种植和岸线坐标生成 surface-zones 遮罩，配合来源土壤、多尺度变化与真实几何地影；水中近岸色同样读取该坐标。 |

`courtbase` 只覆盖已有铺地轮廓，不创建新路径。道路和拱桥保持朝上的实际表面，轻量导出保留 paving、courtbase 和 floorwood 的朝上面片与 UV，并保护独立连续屋面；不以地形冒充铺地。庭石的 cavity 几何在母版、细模、手机模型和总览中分别受检。地点细模替换同一总览分区，屋顶可独立隐藏并恢复；BatchedMesh 合并兼容材质提交，保留实例到地点 ID 的拾取与显示关系。

#### 本轮共享种植与焦点植物

`config/garden.planting.json` 为潇湘馆、怡红院、蘅芜苑、秋爽斋和大观楼记录既有椭圆床带。r13 的 `r9_understory.py` 与 `refresh_court_understory.py` 曾在这些床带新增 623 个 fern_02 来源网格关联实例：潇湘馆 137、怡红院 71、蘅芜苑 98、秋爽斋 105、大观楼 212，当前合计仍为 999 个、共用两份网格。错列、偏移、旋转、边缘缩放和根部落位沿用同一床带及步道／水渠净空。r14 的 `blender/court_planting.py` 在源蕨下增加连接的匍匐低叶组；当前院内生成组数为潇湘馆 282、怡红院 141、蘅芜苑 196、秋爽斋 208、大观楼 641，岸边生成保留。这里的“组”不是新增源蕨实例，也不等于每帧可见叶片数或已达到视觉连续。选中地点后网页仍从发布的原生源蕨位置按预算筛选。

**The Shared Planting Rule.** 床带范围来自 `config/garden.planting.json`，地表遮罩、原生地表与相应植物组延续同一空间解释；网页实例读取原生发布位置，保留步道、水渠和建筑范围，不以来源植被或程序纹理证明原著中的物种和种植密度。

`blender/bake_surface_zones.py` 从实际林冠、竹脚、既有床带、道路和岸线计算本地标量控制图；它不是园景照片或生成美术。r13 收窄床带归一化衰减，将路肩指数衰减尺度从 2.5m 改为 1.15m，该尺度继续保留且不是道路实际宽度。r14 原生 `native_ground.py` 与网页在同一几何遮罩上使用 .30–.68 平滑阈值，网页另加 .26 细噪声调制，缩窄土壤／草地过渡。二者仍取土带、近岸和路肩权重的最大值，并分别以引擎材质处理来源土色与光照；共用坐标和遮罩不代表逐像素相同。当前地表控制图与实际种植母版地影均已重新生成；较窄边界、植物组数和技术检查不证明种植视觉已经连续。

`blender/focal_botany.py` 的 r14 竹子保留庭院竹丛锚点，生成有节竹竿、不等层距的侧枝与露枝间隔，每枝三个末端叶扇，每扇五片带实际纹理和折面的叶片，叶片在共同平面内成组。宽长比与新旧叶姿是艺术解释，不指定经考据的物种。芭蕉的分段非对称叶、实际缺口及花树生成默认值沿用；叶、茎、花瓣和落叶保留实际 UV。五份表面图来自 `scripts/bake_focal_foliage.py`，旁车在 `assets/processed/focal-r12-fix2` 保留程序哈希、图片哈希、尺寸与来源：这是本地确定性绘制的 botanical swatch，不是摄影、Poly Haven 下载或 AI 园景图。其随机数只用于可重放材质生成，不补足缺失的历史 FORM seed 原始输出。

基础木石表面继续使用来源资产；五个 botanical 表面继续读取 `assets/processed/focal-r12-fix2`，r14 没有重画这些材料图或生成园景图。`src/scene/leafMaterial.ts` 保留 r13 给竹叶、芭蕉和 fern_02 源蕨加入的反面散射、包裹受光、半球光响应与世界坐标叶色变化。直接光使用实际场景光的衰减、可见性与适用阴影；emissive、强度和 emissiveMap 明确清零。这是 Three.js 的薄叶受光近似，不是自发光、完整物理次表面散射或原生材质的逐像素复制，也没有施于建筑。原生叶材质保留来源图与 Cycles 物理渲染；网页仍使用实际 UV、底色图、双面材质和角色粗糙度。最终 32 项焦点地图／UV 检查说明资源保留，不能证明运行时叶面已经通过视觉复判。

原生母版与高／手机近景分区分别保留完整或预算内的焦点植物几何和细茎；r14 重新交付植物网格，远景仍是独立预算层，不能把远景细茎省略说成近景也没有细茎。源蕨继续复用两份既有源网格，999 个实例变换与选院 512／320 的运行预算分开。室内家具、书卷、木地板和可逆剖视仍是已建成几何，其陈设不是历史实物证明。

`scripts/shared_gltf_textures.mjs` 现复用经核对的既有交付图片字节，或以原始输入 SHA 与地图名匹配同一图片；不通过近似像素相似度挑选贴图。`r14-material-byte-preservation.json` 记录 23 份 GLB 恢复先前已核对的栅格字节，修复过程中各自 geometry BIN 未改变。`r14-texture-roundtrip.json` 实际对含 19 份地图的一处院落重嵌入／再导出，全部图片字节哈希保持，随后重读全部 40 份交付 GLB 与本地图像。它防止重复 JPEG 编码损失，不表示本轮植物几何未改，也不是新的材料风格或视觉批准。

#### 林冠、低木丛与地被

`public/scene-manifest.json` 当前有 11,196 个树冠／低木丛种植点：三种来源树冠分别 1,867、1,848、626 个，第四类低灌木 6,855 个；另有 2,107 个源草丛点和 999 个源蕨类点（原有 376 加 r13 新增 623），源蕨在母版共用两份网格数据。这是母版关联的布置清单，不等于每帧可见数量。`r12_landscape.py` 在共享岸线和路网旁增加相连但留有开口的植物群，形成远山林带、岸边低木丛与路边过渡；根部沿地形落位。这里的密度和物种属于解释性美术布置。

r12 曾修复旧随机叶面抽样造成裸枝的故障，见历史 `r12-crown-coverage-repair.json`。当前 11,196 个完整归一化源冠形关联实例及种植变换保持；网页依各层预算呈现。最终 r14 母版 SHA-256 为 `d8e497880d0d0902b36a8d3c8fd8f7f8ca46563ca631e545861ec946ebe33f48`，对应 `r14-master-render-evidence.json`；`r14-focal-rebuild.json` 的 afterMaster 是焦点重建完成时的中间哈希，不代表此最终母版。原生总览与潇湘馆图呈现完整冠形及源植物／土带关系，不把网页预算层称为完整源几何。

低灌木的 `shrub_source` 继续从 island_tree_01 形变，压低下部枝干与冠高，母版、`shrub.glb` 和图集第四行由同一形变函数派生。四种形态各有四个水平视向及一个顶视向，形成二十张 384px 来源渲染、5 列 × 4 行（1920 × 1536）的 WebP 图集。旁车保留 CC0 来源、生成方法、视向与哈希；它是源三维植被的距离 LOD，不是生成园景图。叶片流程将源底色实际解码为 RGB，再与叶缘 alpha 合并为 RGBA，并检查可见叶片的颜色与透明度；来源 UV 和图片出处继续保留。

| 层级 | r14 实际实现 | 解释边界 |
| --- | --- | --- |
| 原生母版树冠 | 四类完整源冠形作为关联几何，11,196 个种植变换在本次修复中保持不变。 | 原生完整几何不随网页预算替换；原生 Cycles 图不是网页截图或手机性能证明。 |
| 网页近树与低木丛 | 从全叶面开始简化；两类阔叶叶面预算各 22,000、松类 10,000、低木丛 9,000。精细总览最多 6 株、选地 16 株，轻量总览 0 株、选地 3 株；精细近景投实时阴影。 | 预算是简化目标，不是每个成品的总三角面数。查看建筑时临时消隐穿过查看通道的冠形，室内另隐藏地点周围 12 单位内的外树；母版种植位置不变。 |
| 网页中树 | 精细模式最多 12 株第一来源 broadleaf-low；该文件从全叶面按 6,500 预算简化，轻量不使用中层。 | 文件名不能代表所有手机植被，网格与数量不证明写实程度。 |
| 网页远树与低木丛 | 同一四行图集随相机方向选择视向，透明阈值 0.35，根部投影偏移随相机朝向和俯视状态计算。 | 仍是随相机面向的面片 LOD，不能宣称所有视距都呈现完整三维枝叶。 |
| 草丛 | 精细完整／最远区为 35／82，轻量为 24／54；中间带每三处取一处，最远 12 单位内缩放退场。 | 草叶不投影，精细可接收阴影；远处保留来源地表。 |
| 源蕨类 | fern_02 两个来源变体、999 个原生关联实例；精细模式或选地后才挂载，轻量总览继续延后加载。总览预算精细 64／轻量 28，选院提高为 512／320；先过滤屏幕区域，再按已选地点和距离排序。alphaTest 0.28，网页叶材质响应实际场景光。 | 预算是合计选择上限，不是保证同时显示 999 株；普通距离 46／29，已选院落 200 单位内可入选且不按普通距离缩退。相机转向会更新；实体手机和帧率仍需单独证据。 |

`blender/bake_landscape_light.py` 的地影由实际母版源冠形、建筑、竹、石及种植投向地面，属于烘焙结果；r14 已重新烘焙 `landscape-light.webp`，并更新 `surface-zones.png` 控制遮罩，两者都不是园景美术图。另有程序软树影片与精细实时阴影，不能统称实时光照。源蕨在网页精细模式接收阴影，但自身不投影；原生 Cycles 按实际源几何处理照明。既有林冠和岸边低木丛保持；烘焙图、植物数量或原生投影不能代替网页地表与叶面的视觉复判。

#### 水、光与验证边界

网页两档水面均反射真实场景，反射分辨率为精细 768px／轻量 320px；移动更新按 75ms／130ms 节流，静止缓存达到 1500ms 后在下一实际渲染帧刷新，日夜切换标记刷新。按需渲染空闲时不保证后台定时刷新。r12 使用本地 `pond-normal.png` 的三个旋转尺度叠加小幅坡度，替换旧正弦网格，并对真实反射做小范围采样柔化；水下近岸色继续共享 surface-zones 世界坐标。法线算法的更换不等于已通过自然水面观感验收。

母版保留可编辑的 `Reference_Water_Surface` 集合，读取同一外环和孔洞，水位同为 -0.12m。原生 Cycles 使用透射、折射率、粗糙度和噪声凹凸；网页使用实时平面反射着色器，二者水陆一致，但光照和表面观感不能相互替代。当前 r14 模型验证记录记录原生水面覆盖检查通过；两张原生图的条件和哈希见 `reports/acceptance/r14-master-render-evidence.json`，采用 Cycles 24 samples、降噪与 AgX Medium High Contrast／曝光 +0.4。该渲染的专用灯光和相机只存在于未保存的渲染会话，不宣称已写入母版或网页。

网页天空和雾共享晨光／月夜颜色，雾区间仍为 310–670；主方向光为白昼 3.4／夜间 1.45，环境图为白昼 0.55／夜间 0.30，色调映射曝光为 1.0，沿用基础 r12 输入。r12-fix1 更新了月夜水色与反射权重、远冠图集的夜间色调，并在共享路网的三个锚点附近增加局部聚光：精细显示三处、轻量显示两处。它们与既有主楼上层、地点和路径暖灯分别作用于岸边、路面和建筑；不把远冠图集的颜色变化当作完整枝叶实时受光。

当前夜图保留前方路径、桥头、局部岸带与亮起楼层的先后关系，园景仍显著暗于纸面。原月夜深度项已在 `r12-fix1-verdict.md` 的限定范围内 resolved，r14 保留该夜景构图，叶面受光近似会继续响应当前场景灯光；此结论不扩大为摄影式完成度、运动或真实设备认证，也不重复把原项记为未解决。灯具数量、当前光强与水面权重仍为描述性实现参数。晨光／月夜继续只改变园景，纸面主题不变。

600px 以下或粗指针设备初始使用轻量画质，用户可手动切换。精细 DPR 为 1–1.5，轻量为 1，实时阴影仅精细开启；轻量或关闭动态的闲置状态按需渲染，主动导览仍推进相机，拖动画布会暂停导览。

运行模型、贴图、HDR、解码器和艺术参考均来自本站；文学发布数据只来自 reviewed `data/canon`。来源资产、许可和源／衍生 SHA-256 由 manifest、processed 旁车与 `THIRD_PARTY_NOTICES.md` 维护。当前 `r14-raster-provenance.json` 检查 172 份交付 PNG／JPEG／WebP／GIF，0 出处或哈希缺口；相对冻结 r13 只有 `textures/ground/surface-zones.png` 与 `textures/landscape-light.webp` 两份几何／地影图改变，一份未引用生成衍生图移除，其余艺术与材料栅格字节相同。该最终交付差量不同于修复过程清理的临时文件数；出处扫描也不是新设计 detector。实际模型验证记录原生、地形、道路、屋面、地板、铺地、水面、庭石，以及 52 项基础材质、32 项焦点地图／UV、2 项源蕨 alpha 和 7 项植被像素检查。图片字节恢复后另重读全部 40 份实际 GLB 和地图，32 项焦点检查通过；不把这些结果写成摄影式质量或完整视觉批准。本次文档没有重跑应用检查。

当前功能证据采用 `r14-final-e2e.status.json` 的实际退出码 0 与完整重跑的 11 项 E2E 通过记录，包括近／全院投影和操作流程。`r14-reference-smoke.json` 记录 17 状态、0 页面错误／失败资源。最终 build、lint、typecheck、6 项单元与 319 项空间检查均有实际通过记录；`r14-packaged-production-smoke.json` 的准确包桌面与手机流程也已完成。这里引用既有结果，不把文档读取或 21 张图有效说成重新执行或视觉验收。

**失败记录的时间边界。** fix1 的 `r12-fix1-final-e2e.log` 虽然名称含 final，仍保留 10 passed／1 failed 和 8,394,880 bytes 超过 `< 8,388,608` 的旧失败；其后 release 结果另有历史记录。fix2 初次 GLB 合并缺少 unpartition、首次 release 模型检查发现未引用旧材质和过期源色、独立 LOD 导出缺少模块路径也各有失败档案。fix2 最终成功依据是该轮最后的 optimization、release-model-verification 和 release-e2e 状态及其配套报告；不能把中间 rebuild／optimization 哈希或旧失败日志当作当前成品，也不改写为失败从未发生。r13 又记录一个报告身份问题：旧脚本曾把当前 r13 检查覆盖写入 fix2 命名的 focal-pixels 文件，详见 `r13-legacy-report-note.json`；当时 r13 结果只引用 `r13-focal-pixels.json`，不把被覆盖路径用作历史 fix2 证据，原 fix2 日志、状态、冻结包与视觉记录仍保留。 r14 首次 Playwright JSON 实际为 11 passed，但 PowerShell 包装器误将原生颜色环境警告作为终止错误，返回 1；`r14-initial-e2e-wrapper-note.json` 保留此差异。这不是失败的应用用例。修正退出码记录后，真实完整重跑由 `r14-final-e2e.status.json` 确认退出码 0，没有删除首次包装器失败记录。

| 历史 r13 运行证据（不是 r14 实测） | 当时已记录结果 | 条件与边界 |
| --- | --- | --- |
| `r13-mobile-4g-final.json` | 首屏就绪 10,170.8ms；初始资源 8,320,934 bytes，低于 8MiB；触摸改变镜头，手机分区已加载。 | 390 × 844，设备 DPR 3／渲染 DPR 1，9Mbps／80ms／CPU ×4，桌面触摸模拟；没有实体手机。 |
| `r13-performance-final.json` 精细静止 | 71 draws／435,428 triangles；平均回调间隔 29.814ms、P95 42.700ms。 | 本地 Windows Edge、Intel UHD，精细预热后静止采样。 |
| 同报告轻量拖动 | 68 draws／288,990 triangles；平均 26.457ms、P95 52.800ms。 | 动作不同且系统负载未隔离；不换算稳定显示 FPS，也不声称长时发热、实体手机或总显存认证。 |
| `r13-packaged-production-smoke.json` | 精确候选包桌面 5,880ms、手机触摸模拟 2,687ms 就绪；加载、选地、刷新、俯瞰、键盘焦点、数字热点、细节选择器、近景／全院切换有完成记录，错误为空，调试 hooks 不存在。 | 本地未限速；手机 PNG 1170 × 2532 对应 CSS 390 × 844／DPR 3，不与 4G 初次加载直接比较。 |

历史 `r13-courtyard-performance.json` 另记录本地 390 × 844 触摸院景：150 次 CDP 触摸移动后取 300 个正间隔，平均 16.162ms、P95 35.200ms，48 draws／731,713 triangles，249 个可见源植物。该探针未施加网络／CPU 限速，与总览采样的画面、动作和条件不同，也不是实体手机或严格前后对照。`performance.json`、`docs/PERFORMANCE.md` 仍是 r13 数据，不能当作当前 r14 性能。按用户“快速结束”要求，本轮没有新增性能采样或 4G 计量。模型与图录大图按需加载，一次加载和回调间隔不能代表所有访客速度、显示 FPS、发热或总显存。

当前 `r14-packaged-production-smoke.json` 记录本地准确包桌面 5,813ms、手机触摸模拟 2,607ms 就绪，错误与失败资源为空；刷新、俯瞰、选地、键盘焦点、数字热点、等价细节选择器和近景／全院切换完成，调试 hooks 不存在。手机未限速、没有并发桌面页面；PNG 1170 × 2532 对应 CSS 390 × 844／DPR 3，渲染 DPR 1。这是本轮功能烟测的就绪时间，不能与历史限速数据直接比较，也不表示物理手机、Safari 或稳定帧率认证。

当前冻结上传包为 49,536,574 bytes／47.24MiB、588 个实际文件。GLB／JS／WASM 只存 Brotli 文件，服务器按逻辑 URL 无损还原 identity 或 gzip；其他适用资源保留原件与 Brotli。`r14-packed-logical-file-hashes.json` 记录 45 份仅压缩存储逻辑资源解码后与源 SHA 匹配。五类资源与编码、HEAD、304、各表示 ETag 的协议检查属于先前 r13 报告，本轮不冒称新增协议全测。物理文件数与逻辑资源数分开，不能称每份原始资源都在上传目录单独存储。

截至 r14 Ready 附记，当前冻结包已开始按授权发布到既有 California 服务，成功和在线验证仍待父任务另行留证。此前 r13 已由 `r13-zeabur-deployment-verified.json` 确認 RUNNING，并记录 18 份在线文件身份及桌面／手机操作；那次验证使用临时公共 DNS 解析并保留 TLS 校验，默认本地连接仍失败，不能写成所有访问条件均恢复。没有因本轮文档修改项目外代理配置。当前本地准确包烟测、后续公网状态与 r14 视觉复判相互独立。本文件只记录交接时点，不推断发布成功；没有已批准网页 comp 与 FORM 原始输出缺失的边界继续保留。

## Shapes

主纸面使用小幅圆角：桌面索引和详情为 floating-panel，导览为 tour-panel，日夜控制与工具条为 compact-panel；手机索引为 mobile-index，详情只有上边角明显放大。列表、人物签和小操作按钮更接近纸上小矩形。数字热点保留椭圆／圆形边界，地点名签保留短引线。品牌印章使用直边、双线框和竖排字；线性 SVG 图标与印章各自承担不同功能。

## Components

### Buttons

导览主按钮为深绿实底、浅纸文字和图标，最小实际高度已提升至 44px，桌面左右内边距 24px；手机与窄屏减少水平内边距。悬停变深，不附加位移或缩放。默认禁用按钮使用 0.5 透明度与 not-allowed 光标。

图标按钮的基础尺寸仍有 34px 变体；桌面场景工具为 44px × 44px，手机场景工具的最终覆盖值为 40px × 44px，工具条宽 48px。手机页眉和图录翻页等主要操作单独保留至少 44px 的操作范围。全局按钮、链接、输入、select 与显式 tabindex 元素使用 2px 朱砂焦点框、偏移 4px；搜索有同样的明确焦点覆盖。不要把全部交互都记录成统一大小的按钮。

### Chips

人物签是浅青小矩形、宋体文字和小圆角，换行排列，间距 7px；悬停改变底色，可直接打开人物详情。手机人物签最小高度为 38px，未统一为 44px；没有多选筛选状态。

### Cards / Containers

地点目录是连续列表：两位序号、宋体地点名、主题说明和右箭头。选中与悬停有浅青底，选中名称变深绿；人物或回目关联另有朱砂点。阅读浮层使用内部滚动与固定底部来源提示。

### Inputs / Fields

搜索以底线界定，透明背景，带线性搜索图标和可清空输入。设置使用原生 select、复选框和 range；原生部件的具体外观随设备变化。范围控件表示阅读进度，防剧透开关限制情节、资料与来源；不要将隐藏内容写成不存在。

“院内细节”沿用原生 select：旁侧标签为 12px，选择框使用浅纸、深墨、纸缝细边线与 control 圆角，内边距 8px、最小高度 44px。默认项为“选择一处细看”，选项根据地点热点显示序号与名称；它是选择具体空间细节的入口，不是装饰性下拉框。

### Navigation

桌面主导航是图标加文字，当前项为深绿且有底边 2px 绿线。索引标签沿用朱砂文字与下划线。手机主导航移至底部，当前项文字变绿；基础样式隐藏的下划线仍未恢复。不能仅凭后续 top:0 声明声称手机导航有可见顶线。

### Atmosphere and View Controls

晨光／月夜使用两个带 aria-pressed 的按钮，选中按钮为深绿实底；它们改变三维背景、雾、环境光、灯具和水色，纸面界面保持原色。

地点视角使用“院落全貌”“屋内陈设／层楼细看”“剖视结构”三个模式。当前十五地点中有十三处配置专属室内相机；曲径通幽和滴翠亭没有室内入口。室内模式保持屋面，剖视模式临时隐藏被指定为屋面／瓦材的网格；不能把剖视当作真实拆建或原著陈设证据。手机视角按钮至少高 44px，并在阅读滚动时吸附于上方；手动地点阅读状态的控制条内边距为 0 0 6px。手机场景左上另有至少高 44px 的“看全院／拉近院景”按钮，仅改变取景。

原生“院内细节”和场景数字点读取同一热点 ID，二者同步选择状态与镜头，选择新细节会退出剖视；数字点点击同时展开详情。潇湘馆的三项为“曲廊与竹径”“竹下泉渠”“一明两暗的书斋”。r14 保留同一入口与热点 ID，当前 final E2E 与正式包烟测记录相关室内／剖视、手机流程、数字热点和等价选择器；这些各自具备版本证据，不以静帧数字点可见或旧版结果代替。

### Scene Labels and Map

地点名签随三维地点投影显示，接近画布边缘时隐藏；桌面选中地点变深绿纸签，手机选中地点的名签隐藏以避开屋顶数字点。场景内数字热点继续用于细节查看。名签可见高度约 31px，额外伪元素扩展竖向命中区域至 44px，不能将可见标签说成 44px 高。园图是示意 SVG，地点支持键盘选择；小地图点不是已经统一放大的手机按钮。

当前选中地点的院内数字点使用 `occlude={false}`，不再因场景网格遮挡而隐藏，按钮有与热点选择同步的 `aria-pressed`。手机数字点的实际点击区域为 44px × 44px，常态可见圆面由内缩 10px 的伪元素绘制；可见圆面与操作区域不是同一个尺寸。

场景工具依次提供返回全园、名签显示与俯瞰布局。俯瞰沿用线性罗盘图标；手机保留图标，隐藏其下说明文字和分隔线。

### Literary Annotation

地点、人物、事件与回目共用阅读面板。摘要、相关人物、情节、建筑要点和原文依据依内容类型排列。来源使用 details / summary 展开引文、段落定位与记录修订的原文链接；“空间布局 · 设计解释”和“策划路线，非原著完整行迹”保留明确文字身份。

### Reference Gallery and Recovery

十五幅本地生成图以缩略图网格和单幅大图呈现；地点缩略图可放大，关联的大图可返回该三维地点。大图有前后翻页、键盘左右键和返回全部园景；原生 dialog 承担模态语义。图录清单和单幅图片分别有加载、失败与重试状态，低阅读进度还有明确空状态。

桌面地点图注保留完整的美术参考说明，手机仍隐藏图注，但图上按钮已经改为“艺术参考”，两种视口都直接说明图像身份。图片仍可放大查看；图上的文字身份不能被单独的放大图标取代。

三维模型与资料也各有重新加载操作；无 WebGL 时显示文本提示，索引与阅读内容仍可使用。它们是实际的恢复流程，不以装饰性进度条或成功画面代替。

画布容器的 `aria-busy` 与 `data-scene-ready` 反映当前场景的模型和树木等资源的实际就绪状态，供辅助语义与可靠观察使用；它们不是调试 hooks，也不能单凭 DOM 存在就断言园景已加载。正式包不存在测试模式的调试对象。

## Do's and Don'ts

### Do:

- **Do** 让三维画布保留连续空间，索引、阅读、设置和导览各自承担明确功能。
- **Do** 用文字区分原文摘录、摘要、空间解释、策划导览和生成美术参考。
- **Do** 保留设备宋体与中文无衬线的角色分工，以及本地模型、材质、图片、解码器和字体回退。
- **Do** 保持稳定地点 ID、共享水陆与路网、共用种植解释；重建生成集合时保留 Manual_Adjustments，来源资产、程序材质和艺术图各自保留出处与哈希。
- **Do** 延续已实现的键盘焦点与主要手机控制的 44px 操作范围，并分别检查可视尺寸和实际点击区域。
- **Do** 在相机、阅读抽屉、图录和加载失败状态中保持可返回、可重试的操作。
- **Do** 将之后的视觉改动重新与用户参考图及整页截图对照；当前文档不替代独立验收。
- **Do** 从同一源形变派生完整母版树冠、预算简化网页网格与远景图集，保留种植变换、可见叶片 RGB、alpha、UV 和出处；轻量导出保留受检屋面、木地板、朝上铺地与庭石洞口。

### Don't:

- **Don't** 把目前的模型、材质或植被外观表述为已通过写实参考图一致性验收。
- **Don't** 把十五幅生成参考图当作实拍、原著文献、已批准网页效果图或三维模型截图。
- **Don't** 把全园方位、建筑尺寸、室内摆位、剖视和相机路线描述成唯一考据复原。
- **Don't** 将每个小字号、局部硬编码绿色或原生控件外观扩展为强制的全局设计标准。
- **Don't** 将 44px 的主要控制改进夸大为所有链接、人物签和地图点均已满足同一触摸尺寸。
- **Don't** 用文档扫描、局部修正或未运行的测试替代整页视觉通过结论。
- **Don't** 将当前重复组形、分开的种植片、手机细叶纹理压缩、大块平缓草地和陈设模型感升格为风格；历史过亮路带、正弦水纹、断续路面和稀疏原生树冠只属于诊断档案。

**Not canonized:** 当前重复组形、分开的种植片、手机细叶纹理压缩和大块平缓草地未成为设计规则；连接低叶、竹枝重建及技术通过不能替代原第 2、3 项与整园材料视觉复判。R1 已在 r13 限定解决，近景／夜景限定通过不扩写为全园批准；FORM 原始输出缺失也不由程序种植随机数补足。

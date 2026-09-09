---
name: 大观园·入梦
description: 以纸、墨、青绿组织三维园林与有出处的文学阅读。
colors:
  paper: "#f4f1e8"
  paper-light: "#faf8f1"
  ink: "#343d34"
  muted: "#737869"
  line: "#dedfd2"
  jade: "#536e5c"
  cinnabar: "#9a5039"
  sage-selection: "#e4e8dc"
  caption-ink: "#626e59"
  annotation-ink: "#606e56"
typography:
  display:
    fontFamily: "STSong, Songti SC, SimSun, serif"
    fontSize: "27px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "3px"
  headline:
    fontFamily: "STSong, Songti SC, SimSun, serif"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "3px"
  title:
    fontFamily: "STSong, Songti SC, SimSun, serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "normal"
    letterSpacing: "2px"
  body:
    fontFamily: "STSong, Songti SC, SimSun, serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 2.05
  interface:
    fontFamily: "Microsoft YaHei, PingFang SC, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "normal"
  label:
    fontFamily: "Microsoft YaHei, PingFang SC, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "normal"
rounded:
  label: "2px"
  control: "3px"
  drawer: "15px 15px 0 0"
spacing:
  "7": "7px"
  "8": "8px"
  "12": "12px"
  "18": "18px"
  "22": "22px"
  "30": "30px"
components:
  button-primary:
    backgroundColor: "{colors.jade}"
    textColor: "#fff9eb"
    rounded: "{rounded.label}"
    height: "39px"
    padding: "0 19px"
  button-icon:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "34px"
    width: "34px"
  button-icon-hover:
    backgroundColor: "{colors.sage-selection}"
    textColor: "{colors.jade}"
  navigation-active:
    textColor: "{colors.cinnabar}"
    typography: "{typography.interface}"
  search:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
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
    backgroundColor: "{colors.sage-selection}"
    textColor: "#3e614b"
  evidence-disclosure:
    padding: "11px 0"
    typography: "{typography.label}"
  interpretation-strip:
    backgroundColor: "#eef0e5"
    textColor: "#65715d"
    padding: "10px 9px"
  interior-inspection:
    backgroundColor: "{colors.jade}"
    textColor: "{colors.paper-light}"
    minHeight: "44px"
    padding: "8px 13px"
---

# Design System: 大观园·入梦

## Overview

**Creative North Star: "园林游赏图录"**

一座可以转动、走近与阅读的文学园林，置于温暖纸面之中。园林是展品，地点索引是目录，人物、事件与原文是旁注。视觉语气安静、疏朗而有检索密度：青绿承接园景，深墨组织阅读，朱砂指示选择与操作状态。

宋体承担文学标题和叙述，中文无衬线承担操作与辅助信息。纸面、细线和有限的浮层形成层次；园林模型保留青瓦、白墙、木构、竹影与花木的材质差别。来源于 PRODUCT.md 与艺术方向的约束，以实际组件和样式为准：例如当前桌面页眉是 85px，而 index.html 的早期方向注释仍写 72px。

**Key Characteristics:**

- 三维园景占据主要空间，目录与释文围绕它组织。
- 米白纸面、深墨正文、低饱和青绿与朱砂状态色。
- 宋体文学内容与无衬线操作信息分工清楚。
- 原著依据、空间解释、策划路线各有可见文字说明。
- 桌面侧注在手机上转换为底部阅读抽屉。

## Colors

配色来自纸张、墨迹、园林植被与印章；前置令牌中的值为规范来源。

### Primary

- **园林青绿 / jade**：主导览按钮、链接、场景操作和若干标题的主色。
- **选中浅青 / sage-selection**：地点、人物、回目索引及图标按钮的选中或悬停底色。

### Secondary

- **印章朱砂 / cinnabar**：品牌印章、当前导航、关联点、悬停文字与键盘焦点。它表达状态，不替代正文。

### Neutral

- **温纸 / paper**：全局、页眉、目录和导览条的连续底面。
- **浅纸 / paper-light**：阅读释文、来源页、设置浮层。
- **深墨 / ink**：默认正文和操作文字。
- **淡墨 / muted**：次级说明；现有小字号说明还使用更深的 caption-ink 与 annotation-ink。
- **纸缝 / line**：栏目边界、列表与来源条目的细分隔线。

**The Paper Caption Rule.** 场景标题使用半透明纸色底面，使文字在相机角度变化时仍有稳定的阅读背景。

**The Evidence Label Rule.** 使用文字明确标注原著依据、空间解释与策划路线；颜色不能代替这些区别。

## Typography

**Display Font:** STSong、Songti SC、SimSun、serif，全部为设备字体回退，不分发字体文件。
**Body Font:** 文学叙述沿用宋体栈；界面默认 Microsoft YaHei、PingFang SC、sans-serif。
**Label/Mono Font:** 辅助文字使用界面字体或局部 sans-serif。没有独立等宽字体；目录序号使用 tabular-nums。

**Character:** 细致的宋体字形与疏开的标题字距呼应书页。界面文字保持克制，文本层级由大小、间距和位置共同建立，没有人为补充固定比例的字号阶梯。

### Hierarchy

- **Display**：园景上的标题采用 display 令牌；手机缩至 21px。后置样式将桌面各档统一为 27px。
- **Headline**：阅读侧注标题使用 headline；手机缩至 26px、字距 2px。来源页单独使用 38px 标题，逐档缩小。
- **Title**：目录地点名称使用 title；栏目题为 18px，释文小标题为 14px，事件标题为 13px。
- **Body**：文学释文使用 body；手机正文与建筑要素为15px / 1.9。手机引文14px，来源说明12px，来源展开操作13px。
- **Interface / Label**：主导航为 13px，搜索、导览动作及来源条目为 11px。组件局部字号有差异，不将每一个小字号扩展为公共令牌。

**The Reading Voice Rule.** 文学标题与叙述用宋体，操作信息用中文无衬线；新页面继续使用设备字体回退，不以远程字体建立运行依赖。

## Layout

桌面为固定页眉、左目录、弹性园景、底部导览条。应用使用 100svh 高度、570px 最小高度，主要滚动发生在目录与释文内部。页眉为 85px，目录与阅读状态栏宽 232px，底条高 88px；释文是园景右侧宽 332px 的覆盖面板。目录并非一组大型卡片，而是连续编号列表。

实际响应档位为1600px、1150px、850px、600px，370px以下进一步缩紧导览操作。大屏目录 / 侧注为254px / 360px；1150px以下为218px / 304px；850px以下目录为200px，页眉73px，来源页改为单列。600px以下页眉67px，底部主导航54px加设备安全区，导览条86px；目录覆盖层宽min(280px,85vw)。手机释文从园景底部展开，高48%，保留顶部园景。选择地点或人物后自动关闭覆盖目录。

组件间距多次使用 7、8、12、18、22、30px，作为实测复用值记录；项目没有强制等比或八像素网格。目录内边距、面板阅读边距和画面边缘留白按各自密度组织。

## Elevation & Depth

常驻界面主要用纸面色差和细边线分层。软阴影用于临时设置面板、场景加载错误、手机目录以及三维名签与热点，避免把常驻目录转成悬浮卡片阵列。三维模型自身的光影属于园景材质和体积表达。

### Shadow Vocabulary

- **纸上浮层**（`0 12px 35px #283b2912`）：设置与场景错误；来自 CSS 的 --shadow。
- **手机目录**（`12px 0 30px #27361e12`）：覆盖园景时区别于底层。
- **地点名签**（`0 3px 13px #344e2e10`）：将定位纸签轻微托起。
- **数字热点**（`0 3px 9px #352d2320`）：近景内的小圆形操作点。

释文用 350ms、cubic-bezier(.16,1,.3,1) 的短水平淡入；手机抽屉改为 300ms ease-out 的短垂直淡入。目录透明度变化为 250ms。prefers-reduced-motion 下取消 CSS 动画和过渡；水面与路径动态另有设置开关。

## Shapes

纸面栏目默认方角。小按钮、人物签与地点名签使用极小圆角；设置面板与相关地点按钮保持方正。手机释文仅顶部两角明显变圆，提示抽屉边缘；数字热点和关联点保留圆形。印章的直角、细框和双线来自书页语境，不是通用按钮装饰。界面图标为线性 SVG；文字印章不是导航图标替代品。

## Components

### Buttons

主导览动作使用青绿实底、浅色文字、小圆角，图标与文字并列；悬停底色为 #3f5a48、文字为白色。手机导览按钮与前后站操作高44px；370px以下缩小水平内边距，保留操作文字。图标按钮默认透明，悬停或启用时用浅青底与青绿图标。全局禁用按钮使用0.5透明度和not-allowed光标。

键盘交互的全局焦点为 2px 朱砂外框，偏移 4px。这一规则也覆盖链接、select 和可聚焦元素；搜索框显式使用同样的焦点规则。

### Chips

人物签是浅青色小矩形、宋体标签与 2px 圆角，成行换行排列，间距 7px。悬停底色为 #dfe7d5。签条可直接跳转人物释文；没有虚构的多选过滤状态。

### Cards / Containers

目录是平面条目，序号、宋体名称与辅助主题上下组合。选中或悬停时出现浅青底及右侧箭头；选中名称变深青。释文使用浅纸底、细左边线和独立滚动区。内容标题承担身份说明，不在标题上方增加重复类别眉题。

### Inputs / Fields

搜索框以底部细线界定，背景透明，带搜索 SVG、可清空输入和中文占位提示。设置中的 select 使用淡青底、细框和完整文字选项；复选框与范围控件使用青绿 accent-color。不要把系统原生控件的外观细节当成跨平台恒定值。

手机搜索输入字号16px，目录条目高至少52px，目录标签页高至少44px；使用真实触摸事件验证场景拖动。

### Navigation

桌面主导航以线性 SVG 配文字，当前项为朱砂并在页眉底边显示 2px 下划线。目录标签页复用文字加下划线的选中模式。手机主导航迁至底部，保留朱砂状态而隐藏下划线。状态还应由位置、内容和语义共同表达。

### Literary Annotation

地点、人物、事件与回目共用一个阅读容器。释文先给标题与摘要，再用解释条注明空间关系，随后排列人物、事件与来源。来源条目为可展开的 details / summary，展开后展示引文、段落定位及原文链接。解释条、来源记录和策划导览不能被合并为含糊的“真实还原”标签。

### Scene Labels

地点名签是有细边框的半透明纸签，带序号和名称，底部细线指向园景。选中后反转为深青底与浅色字。近景数字热点为朱砂边框的浅纸圆点，与名签分工；不要将任意 Unicode 符号作为图标库。

### Architectural Evidence and Interior

“原著中的形与景”使用简短条目说明模型里可见的有据细节，后接现有来源展开条，服从防剧透设置。“查看屋内陈设”使用44px高青绿按钮，与“返回院落全貌”构成可逆操作。临时移开屋面只用于观察；尺寸、纹饰与画卷图案仍明确属于设计解释。手机热点直径至少40px。

## Do's and Don'ts

### Do:

- **Do** 让纸面目录与释文辅助园景，保持连续、可检索的阅读顺序。
- **Do** 以明确文字区分文学依据、空间解释与策划路线。
- **Do** 保留宋体文学内容、无衬线操作文字和本地设备字体回退。
- **Do** 在变化的三维背景上给标题稳定的纸色阅读底面。
- **Do** 为交互保留可见键盘焦点，并尊重减少动态设置。

### Don't:

- **Don't** 把全局园林布局、建筑尺寸或相机路线描述成唯一考据复原。
- **Don't** 在内容标题上方增加重复的类别眉题。
- **Don't** 把常驻目录条目扩展为重阴影的大卡片阵列。
- **Don't** 把局部极小字号、低对比辅助文字或搜索焦点抑制当成可复用标准。
- **Don't** 引入运行时远程字体、图标字体或无来源的外部图像依赖。

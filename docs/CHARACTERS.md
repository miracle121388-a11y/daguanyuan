# 推演人物模型

当前方案采用 MPFB 的均衡默认男女完整人体底模确定头、颈、肩和四肢比例，再分别调整四位人物的体形与脸型。身高设定为宝玉 1.70 m、黛玉 1.60 m、宝钗 1.64 m、凤姐 1.65 m。这些是文学角色的设计值，不是所谓唯一的汉族标准，也不代表原著提供的历史肖像。

人物衣着改用明式设计；园林仍沿用孙温绘本的青绿重彩气质。宝玉为交领长袍、束发髻与玉饰；女性采用明代上衣与马面裙，分别使用青绿、暖雅和绛红设色，发髻与饰品各自区分。面部包含男女皮肤纹理、眉毛、睫毛、耳廓、眼球与口部结构，仍是实时三维角色，不是照片级数字人。

女性衣裙使用连续骨骼权重，肩、肘带动布料变形。脸部眨眼、嘴部微动和手部握持保留形变目标，睫毛跟随闭眼。每人提供高低两档模型；仅当前近景人物切换精细版本。所有运行纹理和 Draco 解码器来自本站。

## 素材来源

- MakeHuman：CC0 头手拓扑、表情形变和眼睛资源，固定提交 `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`，文件与哈希见 `assets/characters/makehuman/provenance.json`。
- MPFB：固定工具提交 `3edf9df0551765be43563d047888cf7877eb89b4`，用于 Blender 内生成完整人体底模。工具是 GPL；本项目打包的核心素材与生成结果为 CC0。男女皮肤、眉毛与睫毛取自官方 CC0 system asset pack。见 `assets/characters/mpfb/provenance.json`。
- Style3D CG：站姿「Ming Dynasty group embroidery horse skirt set」，CC BY 4.0。衣裙经过提取、减面、贴图缩放、配色、体形适配及重新绑定。源人物、现代发型和鞋未采用。署名和原始文件哈希见 `assets/characters/style3d/ATTRIBUTION.md` 与 `provenance.json`，界面「资源来源」亦提供署名。
- 用户指定的织金马面裙套装已下载完整 GLB 和原始 OBJ 包。它是带椅子的静态坐姿展示，无骨骼与动作数据；保留为纹样、衣褶和材质对照，当前可动女性衣裙实际采用同一作者的站姿套装，不能把两者混称。

## 重建

普通重建只需要仓库中的预处理服装、人体坐标与本地 Blender，不需要运行时联网或 Sketchfab 登录。

```sh
conda run --no-capture-output -n daguanyuan npm run models:characters
npm run models:characters:check
npm run verify
npm run build
```

如需重新生成完整人体，将官方 MPFB 仓库置于 `.tools/mpfb2` 并检出上述固定提交，再执行：

```sh
conda run --no-capture-output -n daguanyuan npm run models:characters:bases
```

服装来源预处理命令为 `conda run --no-capture-output -n daguanyuan npm run models:characters:clothing`，脚本 `blender/prepare_style3d_clothing.py` 读取 `.local/characters-ming-20260927/style3d-standing.glb`。原始下载文件保留在本机 Downloads，未将大体积展示模型直接用于网页。修改服装预处理或人体配置后，须重建对应输入、更新来源哈希，再生成八份人物 GLB 与四张头像。

生成器为 `blender/build_simulation_characters.py`；解剖适配见 `blender/character_anatomy.py`，衣裙适配见 `blender/style3d_clothing.py`。仅构建人物专用场景，不覆盖园林的 Manual_Adjustments。`GARDEN_CHARACTER_PREVIEW=<人物ID>` 可渲染单个人物到 `reports/characters/ming-20260927`，不会替换生产模型。

模型检查实际解码 GLB，核对顶点、索引、嵌入纹理、表情、骨骼和归一化权重。验证与上线结果另记 `docs/PROGRESS.md`，本说明不表示尚未执行的检查已通过。

## 明式衣冠核对（2026-09-27）

角色采用明式衣冠的艺术改编，不把《红楼梦》的文学年代或人物肖像当作已考定史实。国博《中国古代服饰文化》展中的明代金丝䯼髻，以及国博「楼阁人物金簪」对明代整齐髻发、金花压鬓的说明，作为髻罩和簪饰的形制依据：

- https://www.chnmuseum.cn/portals/0/web/zt/202102gdfsh/
- https://www.chnmuseum.cn/zp/zpml/kgfjp/202209/t20220905_257246.shtml
- https://www.dpm.org.cn/explode/others/255353.html

宝玉保留完整前额发际、顶髻、小冠与横簪；黛玉为双侧低髻，宝钗为后盘髻，凤姐为紧凑䯼髻与金簪。未采用剃额辫发、两把头、大拉翅、旗装、马蹄袖或朝珠。女性衣裙来自明确标注 Ming Dynasty 的授权素材，属于明式上衣、马面裙组合；不是复刻某件出土衣物。

宝玉衣袖已改为单个肩至腕的连续蒙皮网格，肩部与躯干混合权重，肘部约 17 cm 范围平滑过渡。袖口仅为同一网格上的缘边，不再分别用上臂、前臂两节圆筒构造。长袍增加纵向垂褶与细密暗纹；袖部褶皱收敛，避免夸张膨胀。检查脚本同时验证高低模的连续衣袖、骨骼和权重。

头颈修正 v5：颈部过渡范围内平滑缩短 28 mm、后移 18 mm，头、五官与附属物整体随动，肩与衣领锚点保持固定。取消低情绪的固定低头；阅读/写字俯角由 0.19 rad 降至 0.075 rad，谈话点头幅度降至 0.02 rad。人物特写的取景高度同步下移，新增四人的侧面渲染用于检查头颈与肩线。

面部修正 v6：移除固定单一族裔宏预设，按角色调整椭圆/圆润轮廓、下颌支撑、眼部开合和鼻部比例。衣领收缩范围限制在颈根，生成与 GLB 检查均验证面部顶点未受衣领挤压。Blender 官方 CC0 头模仅作比例参考，生产拓扑仍为 MPFB；候选资源、许可与提取资产见 `references/characters/blender-heads/README.md`。

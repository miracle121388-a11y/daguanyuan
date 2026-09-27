# 推演人物模型

四位人物采用同一清代绘本园林色系，脸型、发髻、发饰、衣饰分别设计。人物是文学角色的艺术诠释，不是原著提供的人像，也不代表历史肖像复原。

2026-09-27 版本增加解剖结构的头部与手部、眼睑和棕色虹膜、耳廓、分开的手指与指甲，保留工笔设色的柔和肤色。服装包括立领、滚边、盘扣、腰带、衣褶、花枝绣纹、玉饰和发饰；皮肤与织物使用独立材质和微表面法线。人物仍属风格化实时角色，并非照片级数字人。

世界推演中选择人物，展开「镜头与速度 → 人物特写」可查看脸部。近景只给当前人物加载精细模型，其余人物使用轻量模型；手机也可显式选择精细特写。每人高精度约 7.5 万三角面、约 1 MB，轻量版约 3.2 万三角面、约 0.47 MB。所有纹理嵌入本地 GLB，Draco 解码器使用本站文件。

眼睑眨眼、交谈时嘴部微动与握持手势使用形变目标，行走、读书、写字、饮茶沿用项目动作层。减少动态设置关闭持续眨眼及说话微动。人物特写支持近距离缩放；离开推演恢复园林镜头。

## 来源与重建

仅引入 MakeHuman 官方仓库的 CC0 网格、形变和眼睛纹理数据，固定提交 `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`。未引入其 AGPL 应用程序代码。原文件、许可证、逐文件 URL 与 SHA-256 位于 `assets/characters/makehuman/`，汇总收录于 `assets/manifest.json`。只提取头、颈和手部，服饰覆盖的身体不导出。

配置：`config/simulation.characters.json`；生成器：`blender/build_simulation_characters.py`，解剖数据适配：`blender/character_anatomy.py`。生成角色专用 Blender 文件，不重建园林，不覆盖园林手工调整。

```sh
conda run --no-capture-output -n daguanyuan npm run models:characters
npm run models:characters:check
npm run verify
npm run build
```

重建后需同步 `assets/manifest.json` 内此资源的衍生文件哈希。生成清单 `public/textures/characters/manifest.json` 包含配置、生成器、依赖、12 个交付文件的哈希。模型检查实际解码全部八个 GLB，检查索引、顶点属性、纹理、形变与高低精度关系；可设置 `GARDEN_CHARACTER_BASELINE` 指向原公开文件哈希清单，额外核对其他资源未变。

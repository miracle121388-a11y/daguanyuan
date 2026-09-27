# 免费头部资产核对

2026-09-27 下载 Blender 官方 Human Base Meshes v1.4.1（CC0）。`provenance.json` 记录官方地址、原始 ZIP 哈希、提取方式和各文件哈希；`license-evidence.html` 为当日官方 Demo Files 页，其中该包明确标注 CC0。

`realistic-head.obj` 提取自 `GEO-head_animation_realistic`，在源坐标下求值一级 Multires，供 Blender 内检查下颌支撑、鼻唇颏关系和颅骨轮廓。PNG 是包内原始预览。这里的头模只作解剖比例参照，**没有作为游戏内四个角色的最终头部网格**。当前生产头部仍由 MPFB 免费底模生成，移除了单一族裔预设并修复了衣领适配误压下颌的问题。

研究过的其他资源：

| 项目 | 官方/作者来源 | 许可 | 本次处理 |
| --- | --- | --- | --- |
| Blender Human Base Meshes | https://www.blender.org/download/demo-files/ | CC0 | 下载、提取动画头模作比例参考 |
| Blender Studio Rain | https://studio.blender.org/characters/rain/v1/ | CC BY，需署名 | 完整绑定角色候选；未下载、未用于生产 |
| 2 Human Head Basemeshes | https://opengameart.org/content/2-human-head-basemeshes | 作者页面标注 CC0 | 低面数男女 OBJ 候选；未用于生产 |
| MPFB / MakeHuman | https://static.makehumancommunity.org/mpfb/docs/randomization/phenotype.html | 工具 GPL；本项目生成资产 CC0 | 保留现有拓扑、UV、表情绑定，使用均衡默认参数与个体脸型调整 |

“免费”不等于无条件许可；最终运行资产的来源、变更及哈希仍见 `assets/characters/*/provenance.json`。本次没有将真实人物扫描或名人肖像套到文学角色上。

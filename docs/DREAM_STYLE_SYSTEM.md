# 梦绢 · 第一阶段风格系统

`honglou-silk-v1` 将剧情新绘定义为“晚清绢本工笔彩绘册页的当代叙事游戏化演绎”。细墨勾线、矿物色、薄层罩染、哑光绢底和含蓄神情共同约束画面。晚清在这里是美术参考时代，不是小说情节年代的考据结论。三维园林、三版本起点和已有动态漫画机制继续沿用。

生成画的漫画第1镜、第3镜完整呈现原图，标题与旁白位于画面之外，避免手机竖屏裁掉手势或持物；第2镜保留近景。原有暂停、切镜、返回与减少动态继续有效。这里仍是单幅图的三镜运镜，不是逐帧角色动画。

## 提示词与服务参数

`server/dream-prompts.mjs` 生成八段可单独追溯的 `promptSections`：总风格、文学边界、地点场景、人物造型与在场者、构图、光色情绪、实际剧情快照、禁止项。段名保存在元数据；发给模型时先送当前动作，再拼接其余正文，去掉段名与参考标记。准确发送文字存为 `prompt`，版本为 `dream-silk-4`，另存 SHA-256。出版／目录说明完整保存在 `moment`；有明确“舞台演绎”行时只将该行作为可见动作，否则排除纯目录说明行。对白用表情表现，不能写成画面字幕。文学边界继续保留在提示词；愿望、托付、计划不自动变成已完成动作，不能借用其他版本的结局。

`server/dream-scene-plan.mjs` 复用已有 `LLM_*` 文本服务，将这次剧情整理成简短英文的环境与动作说明，重点保留手势、持物、视线和室内／室外关系。没有接入新供应商。整理最长25秒、每幅至多一次；校验英文长度与在场者，拒绝增加核心人物的结果，失败则保留原始场景正文继续作画。`scenePlanSettings` 保存配置身份，`scenePlan` 保存结果／回退原因、模型、输入与结果哈希。结果先持久化再提交生图，重试使用已保存结果；重新发布后不会悄悄换用别的文本配置。最终提示词确定后再计算派生seed；同一原始配方仍复用同一任务。这是美术场面整理，不能视为新增原著证据，也不能保证所有生成动作都准确。

`server/dream-style.mjs` 内置完整 `negativePrompt`，排除摄影、3D、塑料皮肤、玻璃眼、现代仙侠、海报、轮廓光、HDR、bloom、强虚化、过度金饰和图中文字。当前 DashScope 异步接口通过 `parameters.negative_prompt` 传递；同样的排除约束也保留在第八段，供通用协议回退。

根据 [Qwen 官方接口文档](https://help.aliyun.com/zh/model-studio/qwen-image-generation-and-editing-api-reference)，原生参数为 `prompt_extend`、`enable_thinking`、`negative_prompt`、`seed`，输入支持最多三张参考图。`enable_thinking` 只有在 `prompt_extend=true` 时才生效。因此默认配置记录“请求 thinking=true，实际 thinking=false”，不会声称关闭扩写后仍在启用扩写思考。

| 环境变量 | 本轮默认与用途 |
| --- | --- |
| `IMAGE_PROTOCOL` | 当前服务保留 `dashscope`。 |
| `IMAGE_MODEL` | 保留 `qwen-image-3.0-pro`。 |
| `IMAGE_BASE_URL` | 沿用现有 DashScope API 基础地址。 |
| `IMAGE_API_KEY` | 仅服务端；现有私有 `.env`／生产环境继续使用。 |
| `IMAGE_REFERENCE` | `true`，启用本地三层参考。 |
| `IMAGE_SCENE_PLAN` | 默认 `true`，复用已有 `LLM_BASE_URL`／`LLM_MODEL`／`LLM_API_KEY`；缺配置或显式 `false` 时直接用原场景正文。 |
| `IMAGE_PROMPT_EXTEND` | `false`，减少模型扩写改变明确画风。 |
| `IMAGE_ENABLE_THINKING` | `true`；是否有效还取决于扩写开关。 |
| `IMAGE_NATIVE_PARAMETERS` | `true`；不支持扩展字段的兼容网关可设 `false`。 |
| `IMAGE_SEED` | 留空则由剧情、提示词、参考和参数生成稳定 seed；也可指定 0–2147483647。 |

通用 `images` 协议只发送普通 Images 字段，保留文本禁止项，记录 `seed=null`、`negativePromptTransport=prompt-only`、`thinkingEffective=null`。DashScope 兼容网关拒绝扩展字段时，设置 `IMAGE_NATIVE_PARAMETERS=false` 后重启即可采用同样的扩展字段降级；仍保留原生多图输入。不会在错误或超时后自动另付费重画。是否支持多图仍由所选协议决定，当前指定 Qwen 服务按官方原生协议调用。

## 三层参考与来源

维护入口为 `config/dream.references.json`。运行 `npm run content:dream-refs` 整理默认图，审阅后由 `npm run data:build` 将 `data/canon/dreamReferences.json` 发布到 `public/data/`。构建校验源图、派生图、回溯目录、字节数和 SHA-256；浏览器运行时仅访问本站资源，服务器将图像字节送往用户指定的生图服务。

| 层 | 默认资源 | 职责与限制 |
| --- | --- | --- |
| `styleRef` | `public/dream-style/silk-study-1.webp` | 从原竹窗漫画的屏风局部裁切，提供临时墨线、米绢底参考；不是最终风格母本。 |
| `characterRefs[]` | `public/dream-characters/` | 黛玉、宝玉、宝钗、熙凤分别从已有漫画裁切，固定人物入口。仅参考年龄、发型、衣着；旧图的高光皮肤和 CG 材质明确排除。 |
| `sceneRef` | `public/dream-scenes/` | 潇湘馆、怡红院、蘅芜苑、稻香村、秋爽斋，按精确 `placeId` 选择已有园景。只参考空间关系，不复制天气、人物和摄影材质。 |

默认图均为临时美术素材，源图本身为此前生成并审阅的艺术演绎。当前目录为 `dream-references-2`，21份图共1,633,828字节。黛玉参考进一步收紧到发髻与面部上部，去除执笔、托腮及桌案，减少旧姿势干扰；衣着以文字规范为准。每个 WebP 有 JSON 侧车，记录准确源提示词、源路径和哈希、裁切坐标／合成格位、来源与授权说明、派生文件哈希。派生合成不会冒称新生成原画或历史绘画。

为了适配最多三张图，四个核心人物的十五种非空组合预先合成独立造型页。人物参考页只含本次在场的已支持人物，不把四人总表发给双人场景。实际输入按“画法 → 当前人物页 → 当前地点”排序，最多三张图片和一段文字；提示词按实际序号逐张说明职责，要求重新安排动作与构图。

缺人物、缺场景或关闭参考时保留文本说明；找不到当前地点不会换成别的院落。重启恢复尚未提交的任务时，若当初选定的图缺失或哈希变化，整个参考输入退回文字，保留 `planned` 来源、记录原因，并更新实际提示词和哈希，不悄悄替换为后来修改的图。

## 编号与画作记录

`server/dream-cards.mjs` 保存只增不重排的节点映射：葬花 `NO.001`、诗社 `NO.002`、抄检 `NO.003`、焚稿 `NO.004`、查抄 `NO.005`、论诗 `NO.006`、待姻 `NO.007`、围园 `NO.008`。只有目录中的原始起点快照可得节点编号；它不是全书回目计数，也不是稀有度。

同一节点的不同画意可以共用 `NO.`，每幅画仍有独立 UUID、图像哈希、版本与快照。入局后的个人世界、IF选择、对话、手动留影等按当前私有画册持久递增为 `IF.0001`、`IF.0002`……；这里 IF 是个人画册编号前缀，实际主世界／IF分支仍取 `moment.branch`，不会被编号改写。失败任务占用已分配编号，重试不跳换编号；不同浏览器画册各自计数。

新增字段包括 `styleVersion`、`styleName`、`cardNo`、`cardKind`、`negativePrompt`／哈希、`seed`／来源、`promptSections`、`referenceSet`／逐图哈希、`providerSettings`、实际 `submittedParameters`、提交载荷 `providerPayloadSha256`。原有 `model`、`moment`、`promptRevision`、`promptSha256`、原图哈希和异步任务身份继续保存。seed 和参数用于追溯与尽量稳定生成，不保证服务商版本变化后逐像素重现。

去重键包含整套创作参数，画风、参考、seed 或开关变化会形成新任务。已提交任务的恢复沿用原画作配方和服务商任务，不重新选择新画风。

旧服务端记录启动时一次性补充稳定编号，标记 `styleVersion=legacy`；原图、提示词、原哈希与提交次数保持原样。尚未同步的旧 IndexedDB 记录也可读，显示“旧藏 · 未编目／原画风”。服务端补全后更新元数据，同时保留本机原图与珍藏标记；旧画绝不改标为梦绢。

## 本地操作与检查

1. 现有 `.env` 保留生图服务地址、模型和密钥，按上表补充开关。作画口令使用 `IMAGE_ACCESS_TOKEN`，未单设时沿用 `LLM_ACCESS_TOKEN`；口令与 API key 不同。
2. 执行 `npm run build`，PowerShell 下执行 `$env:PORT='4291'`，再执行 `npm start`；开发热更新可用 `npm run dev -- --port 4291`，两种服务不要同时占用端口／写同一画册目录。
3. 打开“剧情画卷”，选文学版本和一幕，点“为此幕作画”，选择画意并填作画口令，再点“生成这一幅”。或在实际推演／交谈后作画。等待时可继续游园。
4. “我的梦藏”在标题下显示编号与“梦绢”；展开“回看这一刻”可见画风版本、编号含义、参考角色、seed 和留存时间。点击“剧情记录”下载完整 JSON，查看 `job.styleVersion`、`job.cardNo`、`job.referenceSet`、`job.submittedParameters`。
5. `npm test` 验证 API 与旧记录兼容；`npm run test:dreams:silk` 使用已有真实验收图检查浏览器，不提交新的生图请求。`node scripts/dream_silk_live.mjs --generate --trial=4` 是开发者显式付费验收入口，只执行一次；已有任务用 `--resume --trial=4`，不重复生成。验收画册凭证只保存在 `.local/`，不随发布包提供。

本轮前两幅本地图因画出标题／目录说明而拒收；第三幅未见文字，但动作沿用了执笔托腮。首次线上葬花图再次出现题字和旧姿势，保存在 `dream-silk-rejected-online-1.json`。这些结果推动了场景整理与参考裁切修正。第四次本地实调采用新的IF剧情“花归绢袋”，原图显示蹲身、左手撑袋、右手收花，未见文字；报告为 `dream-silk-live.json`。旧三次及首次部署证据保存在 `output/playwright/dream-silk-3-evidence/`。这些是实际观察，不是对未来每幅图的质量保证。

## 下一阶段

优先替换临时参考素材：绘制一张纯绢本工笔风格母本，以及四位核心人物的正侧面统一设定。用相同剧情／seed 做小规模对照，再决定是否引入更复杂流程。当前不加入 ComfyUI、新供应商或大规模美术重制。

# 加利福尼亚部署 · 当前版本

[在线推演与游园](https://daguanyuan-rumeng.zeabur.app/)。当前功能版本 `honglou-silk-20260917-v6`，部署ID `6aabcfecfa283769e51c22a5`，状态 **RUNNING**，2026-09-17T11:34:13.534Z 完成构建。实际提示词为 `dream-silk-4`、参考目录为 `dream-references-2`，园林模型仍为 `spatial-garden-20260913-r15`。最终验收范围以 `reports/acceptance/dream-silk-release.json` 为准。下方v5验证数字保留为历史记录。

使用既有 Aliyun California 4C 8GB 服务器，Los Angeles，美国。服务器ID `6a8eee0bb11fb81fb4aaca05`，区域 `server-6a8eee0bb11fb81fb4aaca05`；项目 `6aa142fb6c3d9581b71560ed`，服务 `6aa143296c3d9581b71560fa`，环境 `6aa142fbda9bc245fba1e845`。只更新当前服务的发布包、IMAGE配置与专用画册持久卷；原有模型变量保留，未购买新服务器或更改其他服务。

## 剧情新绘与我的梦藏

本轮新增三个明确的服务端开关：`IMAGE_PROMPT_EXTEND=false`、`IMAGE_ENABLE_THINKING=true`、`IMAGE_NATIVE_PARAMETERS=true`，已回读匹配；密钥、其他变量与已有 `/data/dreams` 卷保持。`IMAGE_SCENE_PLAN` 默认开启，复用已有DeepSeek整理动作，结果落盘后再提交Qwen；可显式关闭，缺配置或整理失败则用原始场景正文。seed默认按最终创作配方稳定生成。配置、临时参考素材、编号与兼容方式见 [梦绢风格系统](DREAM_STYLE_SYSTEM.md)。八段式记录保留来源语境，实际作画提示去除分段标题与出版目录文案，先描述当前动作。旧画不改标新风格。

从“剧情画卷”选择版本与一幕，点“为此幕作画”；推演中的“此刻作画”和交谈后的“将这句心声入画”会捕获玩家当下的故事。选择意境、取景和细节，填写已有访问口令即可生成。开启“后续关键剧情自动作画并收藏”后，入局、临场抉择和小聚完成会提交新快照；等待时仍可游园。口令仅存当前页面内存，刷新后需重新填写。

指定模型为 `qwen-image-3.0-pro`，使用 DashScope 异步接口、本站造型参考与实际剧情提示词，输出1536×1024全彩图。图像返回后可展开三镜动态漫画、暂停、手动切镜，并收入“我的梦藏”。生成画的第1／3镜完整显示、旁白外置，第2镜保留近景，手机能看清手势与持物。画册提供版本筛选、珍藏、原图和剧情记录下载。生成图片与预设参考画分别标识；每幅图保留生成时的版本、主世界／IF线、人物、地点、画意、模型与来源哈希。

API密钥只在服务端。全站每天最多20次实际提交（UTC日界），默认1个并行、5个待处理任务；相同快照与画意复用画作。已受理任务可以继续查询原任务；真正重新提交仍可能再次计费。原图存入当前服务的 `/data/dreams` 专用持久卷，浏览器校验原图后存入IndexedDB。清除浏览器数据也会清除本机画册凭证；重要画作可下载保存。本次线上1536×1024原图从提交到保存用时约7分35秒，属于单次实测，不能保证每次耗时。完整说明见 [DREAM_ATELIER.md](DREAM_ATELIER.md)。

## 进入剧情画卷

从顶栏“剧情画卷”（手机为场记板图标）进入，或从“世界推演”的版本入口进入。选择前八十回、程高120回、癸酉108回，再选剧情节点。点“展开动态漫画”观看，或“从此幕入局”创建独立IF线。三版本分别保存本机进度，切换可恢复原有存档；旧无版本存档保留在八十回工作区。

首批共8个编写起点、5幅内置image_gen全彩参考插画，原有参考漫画继续可看；新生图功能可根据这些起点或玩家当前快照作画。每幕三镜，支持运镜、环境粒子、暂停、逐镜、重播、Esc返回与减少动态。运行时图像从本站读取，动态表现为单幅画作的多镜运镜，未实现逐帧角色动画。癸酉后三个节点仅依据2014九州版公开回目编写，未核对或分发全文；三版本均不是逐回完整剧情库。具体节点、文学边界和美术来源见 [三版本说明](STORY_VERSIONS.md)。

原有连续交谈、临场抉择、庭院小聚、漫游和院内细节继续保留。交谈保存当下时刻；托付和赴约在继续推演后执行。图像、人物关系和后续行动属于改编推演，原文证据独立展示。

## 本轮梦绢 v6 验证

- 当前部署 `6aabcfecfa283769e51c22a5` 为 RUNNING。发布包542文件、51,097,048字节（48.73MiB）；源模块、完整构建、21份参考图与侧车逐一匹配，Brotli解码内容亦未发现凭据。
- `dream-silk-4` 线上实际葬花图已生成，1536×1024、2,730,751字节，SHA-256 `3709c316ef102b3e22c8b52c44b8f1a23486b656419738f5d27f76a3f055d407`。单次实测从开始到保存约55秒，不代表稳定耗时。画中黛玉跪在竹径旁、手边有落花与花穴，未见题字；属于短摘要的舞台演绎，不保证后续每幅质量。
- 8项线上API检查通过：新配方、NO.001、三层参考与原生参数、已保存DeepSeek场景整理、原图哈希、同请求复用和旧藏迁移。首次线上图因文字与姿势错误拒收保留，本次是修正后的第二次线上实际作画；未把旧图标为新成果。
- 本地和线上各29项梦藏浏览器检查通过，覆盖真实原图、编号、来源／场景整理记录下载、珍藏刷新、完整开场镜和手机视口；浏览器验收新增生图调用为0。11张最终线上功能截图及2张游园截图已实际查看。
- 93项单元/API、3974项资料校验、lint和正式构建通过；24项三版本本地回归通过。线上游园桌面／触摸、HTTPS、CSP与83份公开文件哈希匹配。本轮没有把v5的重启实验或旧文本模型回归计为新实验；新部署已回读旧卷中的画作和提交记录。
- 原UI finish review通过，新增图触发的A1取景问题一次修复后单项复核通过；两份结论各有范围。documenter更新梦藏表面说明，全局设计文件保持原哈希。

精确来源与检查索引见 `reports/acceptance/dream-silk-release.json`。本机默认Edge仍报连接关闭；成功公网检查使用实时公共DNS地址的单请求／单浏览器解析，保持TLS验证，未改系统DNS或代理。本地4291预览使用同一正式构建。

## v5 历史验证

- HTTPS、CSP、域名PROVISIONED、原California服务器身份和40份在线文件SHA-256一致，包含当前HTML/JS/CSS、三版本目录、全部参考漫画图与提示词侧车；健康端点返回当前v5功能标识。
- 一次线上实际Qwen异步任务生成1536×1024、2,211,741字节原图，SHA-256为 `7bb91260bbcc499c3858673ad9b5eac35a8b162237baf944e001423d51a9090c`。原图、来源记录、同请求复用通过；报告 `dream-live-online.json`。
- 对当前服务执行一次重启后，新进程仍读取同一幅原图和任务，文件哈希与一次提交记录不变，本站当日剩余19次；运行应用与画册目录均使用UID/GID1000。报告 `dream-persistence-online.json`、`dream-volume-before.json`、`dream-volume-after.json`。
- 线上新增23项主流程与7项边界检查通过：真实图片下载与校验、收藏和刷新、来源导出、逐镜与暂停、390/320像素布局、静态模式、真实交谈快照、自动触发载荷、重新填写口令后的原任务恢复和防剧透。新提交／排队／失败部分使用明确拦截夹具，浏览器验收没有额外调用生图。
- 线上原三版本24项回归、正式游园桌面和390px触摸模拟通过；全部23张线上截图均已按原尺寸打开核对。截图清单为 `dream-online/capture-inventory.json`，发布后没有修改产品代码。
- 本地82项单元/API、3804项资料检查、lint、类型检查和正式构建实际通过；本地新增23+7项、三版本24项亦通过。本轮没有把v4的全园E2E、三次DeepSeek实调等历史结果算成新运行，历史证据保存在v4归档。

本机默认浏览器在本轮仍为 `ERR_CONNECTION_CLOSED`。成功的公网验收使用实时公共DNS地址 `47.89.212.251`，仅为测试浏览器/curl指定解析，HTTPS证书校验开启，未修改系统DNS或代理。默认连接问题未被本次功能更新解决。[本机预览](http://127.0.0.1:4291/) 使用同一正式前端构建。网络记录为 `reports/acceptance/dream-network.json`。浏览器触摸模拟不证明实体手机帧率。

## 使用模型

默认本地规则无需口令。进入“世界推演” → “推演方式与说明” → 决策来源选择 **DeepSeek-V4.1-Flash**，填写推演访问口令。管理员本机说明位于 `.local/推演模型访问说明.txt`。访问口令仅存当前页面内存，API密钥保存在服务端。

官方调用标识 `deepseek-flash`；同源接口要求口令，最多2个并发、每分钟30次，服务端25秒超时。人物仅接收自身记忆、最近四轮自身交谈及当前版本/回目边界；严格校验回应依据，异常结果不入档。模型文案仍是虚构推演。旧分类追问继续标为本地记忆整理。详见 [推演系统说明](simulation-engine.md)。

## 发布包与更新

本轮包 `.deploy/reference-20260916-174034-411820` 共473文件、49,189,185字节（46.91MiB）。逐文件及Brotli解码内容的凭据扫描通过；只包含当前Vite构建、已审核公开资源、HTTP服务与Dockerfile。私有生成图与凭据不在包内。发布后再次核对全部473份文件哈希未变。完整身份、范围及证据见 `reports/acceptance/dream-release.json`。

```powershell
npm run build
npm run deploy:package
$gardenPackage = Get-Content -LiteralPath reports/acceptance/deployment-package.json | ConvertFrom-Json
Push-Location -LiteralPath $gardenPackage.directory
try {
  npx --yes zeabur@0.22.2 deploy --service-id 6aa143296c3d9581b71560fa --project-id 6aa142fb6c3d9581b71560ed --environment-id 6aa142fbda9bc245fba1e845 -i=false
} finally { Pop-Location }
```

Node24启动器准备专用画册目录后降权至UID1000运行，端口3000。GLB/JS/WASM只存一份Brotli，HTTP服务按客户端能力无损返回。文本模型POST `/api/simulation`；生图POST `/api/dreams/jobs`，状态与私有图片均由同源接口读取。公共文学和参考美术资料仅从已审核data/canon发布；运行时生成图存专用卷，不写入公共资料。

## 复核入口

- `npm run test:story`：APP_URL指定站点，STORY_REPORT_DIR指定报告目录。
- `npm run test:dreams`：实际验收画册须以DREAM_ALBUM_FILE指定本机私有记录，DREAM_REPORT_DIR指定输出；脚本在实际图片读取后拦截新建任务，不再消费生图。
- `node scripts/dream_online_smoke.mjs --generate`：明确提交一次真实付费生图。已执行任务只用 `--resume` 恢复，不重复使用generate；恢复报告会覆盖当前实调报告，保存历史证据后再运行。
- `node scripts/production_smoke.mjs`：原有正式游园与触摸检查。
- `python scripts/verify_deployment.py`：同一服务、HTTPS、文件SHA与最新正式浏览器报告。
- `node scripts/story_model_smoke.mjs`：显式发起三次真实文本模型交谈；口令不写入报告，本次v5未重新执行。
- 既有 `npm run test:simulation`、`test:simulation:model`、`test:simulation:participation` 继续可用；带model的流程会实际调用模型，本轮未宣称重新执行其全部历史验收。

APP_RESOLVE_IP只作用于测试浏览器，不写系统hosts。本轮独立reviewer将长剧情完整阅读、标题先于元数据两项修正均记为resolved，disposition ship仅限两项；独立documenter核对14张最终本地图，记录于 `.impeccable/dream-surface.md`，DESIGN.md与design.json哈希不变。v4发布证据及旧部署说明保存在 `output/playwright/literary-v4-published-evidence/`；更早v3证据另行保留。

v5发布确认日期：`2026-09-17`（Asia/Shanghai），报告为 `dream-release.json`；v6的精确时间、源文件、发布包哈希和当前验收范围见 `dream-silk-release.json`。

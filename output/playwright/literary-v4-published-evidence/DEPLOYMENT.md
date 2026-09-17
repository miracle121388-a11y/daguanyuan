# 加利福尼亚部署 · 当前版本

[在线推演与游园](https://daguanyuan-rumeng.zeabur.app/)。当前功能版本 `literary-comics-20260917-v4`，部署ID `6aaac441c52f86b5e0201ee3`，状态 **RUNNING**。本轮加入三版本推演与全彩动态漫画；園林模型仍为 `spatial-garden-20260913-r15`。

使用既有 Aliyun California 4C 8GB 服务器，Los Angeles，美国。服务器ID `6a8eee0bb11fb81fb4aaca05`，区域 `server-6a8eee0bb11fb81fb4aaca05`；项目 `6aa142fb6c3d9581b71560ed`，服务 `6aa143296c3d9581b71560fa`，环境 `6aa142fbda9bc245fba1e845`。只更新当前服务发布包，沿用已有模型环境变量；未购买新服务器或更改其他服务。

## 进入剧情画卷

从顶栏“剧情画卷”（手机为场记板图标）进入，或从“世界推演”的版本入口进入。选择前八十回、程高120回、癸酉108回，再选剧情节点。点“展开动态漫画”观看，或“从此幕入局”创建独立IF线。三版本分别保存本机进度，切换可恢复原有存档；旧无版本存档保留在八十回工作区。

首批共8个起点、5幅内置image_gen全彩插画，每幕三镜，支持运镜、环境粒子、暂停、逐镜、重播、Esc返回与减少动态。运行时图片从本站读取；单幅画作多镜运镜不是逐帧角色动画或实时生图。癸酉后三个节点仅依据2014九州版公开回目编写，未核对或分发全文；三版本均不是逐回完整剧情库。具体节点、文学边界和美术来源见 [三版本说明](STORY_VERSIONS.md)。

原有连续交谈、临场抉择、庭院小聚、漫游和院内细节继续保留。交谈保存当下时刻；托付和赴约在继续推演后执行。图像、人物关系和后续行动属于改编推演，原文证据独立展示。

## 本轮验证

- HTTPS、CSP、域名PROVISIONED、原California服务器身份和40份在线文件SHA-256一致；包含当前HTML/JS/CSS、三版本目录、全部漫画图与提示词侧车。
- 线上24项新功能检查通过：版本隔离与刷新恢复、剧情入局、剧透过滤、末镜暂停、重播、静态模式、390/320布局及资源加载。
- 原有正式游园桌面和390px触摸模拟检查通过；线上9张最终画面已实际打开核对。首轮线上目录截图早于图片加载，原图保留，三张目录视口在图片解码后重新捕获；没有修改产品代码。
- 本地73项单元/API、3804项资料检查、lint、类型检查及正式构建通过。原12项E2E首轮11通过、1被预期自动漫画阻挡；补充关闭漫画步骤后，该完整游园用例定向重跑通过。
- 三个版本各一次真实DeepSeek交谈均200；这是本地服务端的实际短程接口验证，非全书或长期文学一致性认证。线上配置端点确认已有DeepSeek模型仍可用且要求访问口令。

本机默认浏览器在本轮仍为 `ERR_CONNECTION_CLOSED`。成功的公网验收使用实时公共DNS地址 `47.89.212.251`，仅为测试浏览器/curl指定解析，HTTPS证书校验开启，未修改系统DNS或代理。默认连接问题未被本次功能更新解决。[本机预览](http://127.0.0.1:4291/) 使用同一正式构建。网络记录为 `reports/acceptance/story-network.json`。浏览器触摸模拟不证明实体手机帧率。

## 使用模型

默认本地规则无需口令。进入“世界推演” → “推演方式与说明” → 决策来源选择 **DeepSeek-V4.1-Flash**，填写推演访问口令。管理员本机说明位于 `.local/推演模型访问说明.txt`。访问口令仅存当前页面内存，API密钥保存在服务端。

官方调用标识 `deepseek-flash`；同源接口要求口令，最多2个并发、每分钟30次，服务端25秒超时。人物仅接收自身记忆、最近四轮自身交谈及当前版本/回目边界；严格校验回应依据，异常结果不入档。模型文案仍是虚构推演。旧分类追问继续标为本地记忆整理。详见 [推演系统说明](simulation-engine.md)。

## 发布包与更新

本轮包 `.deploy/reference-20260916-162644-066562` 共468文件、49,147,156字节（46.87MiB）。逐文件和188份Brotli解码内容的凭据扫描通过；只包含当前Vite构建、已审核公开资源、HTTP服务与Dockerfile。发布后再次核对全部包文件哈希未变。完整身份、范围及证据见 `reports/acceptance/story-release.json`。

```powershell
npm run build
npm run deploy:package
$gardenPackage = Get-Content -LiteralPath reports/acceptance/deployment-package.json | ConvertFrom-Json
Push-Location -LiteralPath $gardenPackage.directory
try {
  npx --yes zeabur@0.22.2 deploy --service-id 6aa143296c3d9581b71560fa --project-id 6aa142fb6c3d9581b71560ed --environment-id 6aa142fbda9bc245fba1e845 -i=false
} finally { Pop-Location }
```

Node24容器以非root用户运行，端口3000。GLB/JS/WASM只存一份Brotli，HTTP服务按客户端能力无损返回。模型POST `/api/simulation`，状态GET `/api/simulation/config`；文学和美术资料仅从已审核data/canon发布。

## 复核入口

- `npm run test:story`：APP_URL指定站点，STORY_REPORT_DIR指定报告目录。
- `node scripts/production_smoke.mjs`：原有正式游园与触摸检查。
- `python scripts/verify_deployment.py`：同一服务、HTTPS、文件SHA与最新正式浏览器报告。
- `node scripts/story_model_smoke.mjs`：显式发起三次真实模型交谈；口令不写入报告。
- 既有 `npm run test:simulation`、`test:simulation:model`、`test:simulation:participation` 继续可用；带model的流程会实际调用模型，本轮未宣称重新执行其全部历史验收。

APP_RESOLVE_IP只作用于测试浏览器，不写系统hosts。独立reviewer将末镜暂停与选中行两项修正均记为resolved，disposition ship仅限两项；独立documenter记录于 `.impeccable/story-surface.md`，DESIGN.md与design.json哈希不变。v3发布证据和旧部署说明保存在 `output/playwright/simulation-v3-published-evidence/`。

最终确认时间：`2026-09-16T16:39:27.304559+00:00`。

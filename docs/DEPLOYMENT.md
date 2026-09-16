# 加利福尼亚部署 · 当前版本

[在线推演与游园](https://daguanyuan-rumeng.zeabur.app/)。当前功能版本 `simulation-participation-20260916-v3`，部署ID `6aa99631d3687c7a2564cfe3`，状态 **RUNNING**；最终记录时间 `2026-09-15T19:09:08.797Z`。本轮新增连续交谈、临场抉择与庭院小聚。园林模型版本仍为 `spatial-garden-20260913-r15`，沿用既有模型。

使用既有 Aliyun California 4C 8GB 服务器，Los Angeles，美国。服务器ID `6a8eee0bb11fb81fb4aaca05`，区域 `server-6a8eee0bb11fb81fb4aaca05`；项目 `6aa142fb6c3d9581b71560ed`，服务 `6aa143296c3d9581b71560fa`，环境 `6aa142fbda9bc245fba1e845`。本轮只更新当前服务发布包，沿用已有模型环境变量；未购买新服务器或更改其他服务。

## 进入新互动

进入“世界推演”，点击人物旁“交谈入局”，或打开手记的“入局互动”。

- **与他交谈**：自由输入、选择语气，连续追问；人物结合自己的记忆回应，每条记录保留实际来源和记忆依据。
- **临场抉择**：根据人物所在地、需要及所知消息选择行动；先“从此刻另开一线”，可保留原线并尝试不同选择。“回到选择之前”可撤回刚才的选择。
- **邀人小聚**：选已有庭院，邀两至四人联句或品茗；点击“继续这场小聚”，人物沿园路赴约，完成共同活动后留下记忆。

交谈保存当下时刻；托付及赴约在继续推演后执行。模型回复、人物关系和舞台动作均为虚构推演，不作为原文证据。

## 已验证的发布结果

- HTTPS健康检查、CSP、域名PROVISIONED与18份在线文件（包含当前HTML／JS／CSS）的SHA-256一致。
- 原有游园正式浏览器检查通过：加载、选景、刷新、键盘焦点、390px触摸模拟与院落细节。
- 21项线上新增交互检查通过：连续交谈、个人历史隔离、同刻效果边界、选择形成待办、原线保留、回退、四人沿路入院、活动完成后产生共同记忆、390／320px布局与刷新恢复。
- 24项线上模型／恢复检查通过：两次真实DeepSeek交谈均200；另以一次故意错误令牌401验证失败不入档，用浏览器延迟替身验证取消不重复提交和迟到结果不保存。历史混合来源、输入旁错误与重试、草稿跨模式保留均通过。取消替身不发送上游，不计入真实模型调用。
- 本地57项单元／接口测试、35项旧推演浏览器回归、一项定向交互E2E、3719项数据检查、类型检查、lint与正式构建通过。此前v2的11项原有E2E及648次结构射线属于历史证据，本轮未重跑。浏览器模拟不证明实体手机帧率。

本机默认网络在本轮发布后仍出现 `ERR_CONNECTION_CLOSED`；成功的公网验收使用实时公共DNS查询得到的 `47.89.212.251`，仅为测试浏览器和curl指定解析，TLS验证始终开启，没有修改系统DNS或代理。默认连接问题尚未消除。[本机预览](http://127.0.0.1:4291/) 使用相同最终构建和模型配置。详见 `reports/acceptance/simulation-participation-network.json`。

本地模型验证曾严格拒绝一轮不合规则的回复（502），经界面重试成功；首轮取消测试还发现表单再次提交，修复后重新验证通过。失败记录保留在 `output/playwright/simulation-participation-model-strict-rejection/` 与 `simulation-participation-cancel-first-attempt/`。最终线上交谈两次成功，没有将本地拒绝记录抹去或算作首次成功。

## 使用模型

默认本地规则无需口令。进入“世界推演” → 手记下方“推演方式与说明” → 决策来源选择 **DeepSeek-V4.1-Flash**，填写推演访问口令。管理员本机说明位于 `.local/推演模型访问说明.txt`。访问口令仅存当前页面内存；API密钥保存在服务端 `.env`／Zeabur环境变量中。

官方调用标识为 `deepseek-flash`；服务器使用 `max_tokens: 1600` 与非思考模式生成短小语义决策或交谈回复。接口同源并要求访问口令，最多2个并发、每分钟30次，服务端25秒超时。模型决策严格校验人物、地点、可知话语与消息ID；新交谈只传入此人的记忆和最近四轮自身对话，返回依据必须属于本次上下文，异常结果不入档。旧“托付与追问”中的分类追问仍是明确标注的本地记忆整理。详见 [推演系统说明](simulation-engine.md)。

## 发布包与更新

本轮包 `.deploy/reference-20260915-185344-804562` 共434文件、46,784,060字节（44.62 MiB）。逐文件及Brotli解码后的凭据扫描通过；只包含当前Vite构建、已审核公开资源、HTTP服务与Dockerfile。完整文件SHA与源码身份见 `reports/acceptance/simulation-participation-release.json`。

```powershell
npm run build
npm run deploy:package
$gardenPackage = Get-Content -LiteralPath reports/acceptance/deployment-package.json | ConvertFrom-Json
Push-Location -LiteralPath $gardenPackage.directory
try {
  npx --yes zeabur@0.22.2 deploy --service-id 6aa143296c3d9581b71560fa --project-id 6aa142fb6c3d9581b71560ed --environment-id 6aa142fbda9bc245fba1e845 -i=false
} finally { Pop-Location }
```

Node24容器以非root用户运行，端口3000。GLB／JS／WASM只存一份Brotli，HTTP服务按客户端能力返回Brotli或无损解码的gzip／identity；所有园林资产保持同站加载。静态资源GET／HEAD，模型决策POST `/api/simulation`，配置状态GET `/api/simulation/config`。

## 复核入口

- `node scripts/production_smoke.mjs`：APP_URL指定线上地址；可选GARDEN_LOAD_TIMEOUT_MS，默认90000ms。
- `npm run test:simulation`：本地规则的完整浏览器流程；SIM_REPORT_DIR指定报告，SIM_SOFTWARE=0使用Edge默认渲染器。
- `npm run test:simulation:model`：显式进行11次真实模型调用；MODEL_REPORT_DIR指定报告，使用本地服务端配置中的访问口令。此命令会实际调用模型。
- `npm run test:simulation:participation`：新增参与流程；PARTICIPATION_REPORT_DIR指定报告。设置PARTICIPATION_MODEL=1时验证真实交谈和恢复路径，会实际调用模型；访问口令从本地服务端配置读取，不写入报告。
- `python scripts/verify_deployment.py`：核对同一California服务、HTTPS、文件哈希与最新正式浏览器记录。

APP_RESOLVE_IP仅作用于测试浏览器，不写入系统hosts。完整证据路径汇总在release报告；[两项目研究与实现对照](simulation-reference-study.md) 保存OpenStory／MiroFish的固定提交与来源记录。

本轮独立界面复判将F1历史依据、F2就地恢复、F3主操作高度三项记为resolved，ship仅限这三项；实际设计记录在 `.impeccable/simulation-participation-surface.md`。v2历史发布记录保存在 `reports/acceptance/simulation-immersive-release.json`，此前公开文件和游园报告另存 `output/playwright/simulation-v2-published-evidence/`。

# 加利福尼亚部署 · 当前版本

[在线游园](https://daguanyuan-rumeng.zeabur.app/)。验证时间 2026-09-12T16:14:29.912150+00:00，运行版本 `spatial-garden-20260912-r14`，部署ID `6aa5791dfbf9c810b64d524c`。

既有服务器 Aliyun California 4C 8GB，Los Angeles，美国；服务器ID `6a8eee0bb11fb81fb4aaca05`，区域 `server-6a8eee0bb11fb81fb4aaca05`。项目 `6aa142fb6c3d9581b71560ed`，服务 `6aa143296c3d9581b71560fa`，环境 `6aa142fbda9bc245fba1e845`。未购买新服务器，未更改其他服务。

CLI状态为RUNNING，域名PROVISIONED，HTTPS健康检查、CSP、18个公开文件（包含当前JS/CSS）的SHA-256及线上桌面/手机模拟正式构建检查通过。本机默认网络的正式网页检查未通过：page.goto: net::ERR_CONNECTION_CLOSED at https://daguanyuan-rumeng.zeabur.app/。公共DNS临时解析下的成功不能替代默认访问成功。本轮成功的浏览器检查是否使用临时解析覆盖：True。TLS验证保持开启，没有修改系统网络设置。本机条件不能代表每个访客的网络。

## 更新命令

在项目根目录执行：

```powershell
npm run build
npm run deploy:package
$gardenPackage = Get-Content -LiteralPath reports/acceptance/deployment-package.json | ConvertFrom-Json
Push-Location -LiteralPath $gardenPackage.directory
npx --yes zeabur@0.22.2 deploy --service-id 6aa143296c3d9581b71560fa --project-id 6aa142fb6c3d9581b71560ed --environment-id 6aa142fbda9bc245fba1e845 -i=false
Pop-Location
```

发布包是 `.deploy/` 内按时间创建的独立目录，不能上传整个 `.deploy/`。本轮目录 `.deploy/reference-20260912-155712-092545`，合计 47.24 MiB。只复制当前Vite清单与验证过的公开资源，避免Windows旧构建快照残留；不包含Blender、原文缓存、源资源下载和登录凭据。

Node24容器以非root用户运行，端口3000；仅允许GET/HEAD，模型MIME与Draco/WASM均在本站。发布目录内GLB、JS和WASM仅存一份Brotli文件，服务器按请求提供Brotli或无损解码后的gzip/identity；公开URL不变。哈希JS/CSS长期缓存，模型/JSON重新验证缓存。重建模型或数据后先通过完整性检查，再更新同一个服务。

线上验证脚本：设置APP_URL后执行 `node scripts/production_smoke.mjs`，再执行 `python scripts/verify_deployment.py`。最新证据为 `reports/acceptance/zeabur-deployment.json` 和 `production-smoke.json`。可选APP_RESOLVE_IP只作用于测试浏览器，不应长期写入hosts。

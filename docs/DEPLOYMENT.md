# Zeabur 加利福尼亚部署

在线地址：[大观园 · 入梦](https://daguanyuan-rumeng.zeabur.app/)

| 项目 | 值 |
|---|---|
| 服务器 | Aliyun California 4C 8GB，Los Angeles，美国 |
| 服务器ID | `6a8eee0bb11fb81fb4aaca05` |
| 区域ID | `server-6a8eee0bb11fb81fb4aaca05` |
| 项目 | `daguanyuan-rumeng` / `6aa142fb6c3d9581b71560ed` |
| 服务 | `daguanyuan` / `6aa143296c3d9581b71560fa` |
| 环境 | `6aa142fbda9bc245fba1e845` |
| 最新部署ID | 见 `reports/acceptance/zeabur-deployment.json` 中实际查询记录 |

使用用户既有服务器，没有购买资源或升级套餐。独立项目只部署本园的静态站点。Node24容器以非root用户运行，监听3000，健康检查为 `/healthz`。服务器启动与Zeabur运行状态已确认；线上具体检查结果记录在 `reports/acceptance/zeabur-deployment.json`。

## 更新步骤

在项目根目录执行，Zeabur CLI须使用已登录的用户账户。凭据不存入项目或发布包。

```powershell
npm ci
npm run build
npm run deploy:package
Set-Location .deploy
npx --yes zeabur@0.22.2 deploy --service-id 6aa143296c3d9581b71560fa --project-id 6aa142fb6c3d9581b71560ed --environment-id 6aa142fbda9bc245fba1e845 -i=false
```

更新现有服务即可，勿重复 `--create`。模型或内容改变时，应先按README重建模型/数据并通过校验。`.deploy/`只含`dist/`、`server.mjs`和`Dockerfile`，不含源文缓存、Blender、下载资产与私有配置。

生成文本及WASM的Brotli/gzip文件；GLB已经Draco压缩，保留一份。目录合计约35.32 MiB，打包脚本会拒绝超过50 MiB的上传目录；无需通过升级套餐解决。正式JS/CSS采用内容哈希，模型与JSON每次重新验证缓存，避免更新后混用数据。

```powershell
# 回到项目根目录后做正式网页检查
$env:APP_URL = 'https://daguanyuan-rumeng.zeabur.app/'
node scripts/production_smoke.mjs
```

本机代理DNS将新域名映射到虚拟IP后出现连接关闭；公共DNS均解析为47.89.212.251。另发现本机代理下浏览器HTTP/3请求会停滞，HTTPS的TCP传输正常。此次线上验收设置 `$env:APP_RESOLVE_IP = '47.89.212.251'`，测试脚本仅对此浏览器指定解析并关闭QUIC，保持TLS证书校验，不修改系统设置。精细总览完整显示、刷新及手机分区均通过。普通访问若遇到同样情况，可刷新代理DNS缓存或换用正常网络；服务器公网地址后续可能变化，不应永久写入hosts。

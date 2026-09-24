# 最新访问结论

2026-09-24 已上线弱网阅读后备与请求恢复，公网三维加载仍有波动，跨网络顺畅访问尚未全部完成。当前记录以 [NETWORK.md](NETWORK.md) 首节与 `reports/acceptance/access-20260924/release.json` 为准；下文为历史诊断。

# 当前访问结果 · r14

新版 `spatial-garden-20260912-r14` 的公网健康接口返回正常，完整桌面／触摸模拟交互检查通过。该次成功检查临时使用公共 DNS 地址47.89.212.251并关闭 QUIC，TLS 验证保持开启；本机默认浏览器仍返回 `ERR_CONNECTION_CLOSED`。两种网络条件分别记录在 `reports/acceptance/r14-network-observations.json`，不能把临时解析成功说成默认访问修好。

用户要求快速结束后，停止进一步环境排查。此前 `r13-access-repair-preview.patch` 仅为已准备的本站单域名方案，没有得到实施答复，没有修改任何项目外代理／系统 DNS 配置。本地准确成品可在 http://127.0.0.1:4293/ 查看。以下保留此前诊断，当前结果以本节为准。

# 当前访问状态 · r13

版本 `spatial-garden-20260912-r13` 已在原 California 服务运行。验证时间 2026-09-12T15:20:47.559141+00:00，部署 `6aa56ca8fbf9c810b64d503f`；18个线上文件（含本轮改变的地表遮罩）、HTTPS健康和CSP与当前包一致。临时公共解析下，完整正式网页桌面7.838秒／手机触摸模拟9.119秒就绪，后续交互检查通过。

本机默认连接仍为 `ERR_CONNECTION_CLOSED`，不能称普通访问已修复。仅测试浏览器指定当轮公共DNS地址并关闭QUIC，TLS验证保留；系统和代理配置未改。当前限定本站域名的修复预览见 `reports/acceptance/r13-access-repair-preview.patch`，已询问用户是否允许执行，未得到同意前不应用。Merge.yaml当前只有profile配置；拟保留当前实际运行的两条fake-IP例外，并新增本站域名，备份与回退安排见同名JSON。

## 以下为历史诊断

# 本机访问诊断 · 2026-09-12

## 当前已部署版本的完整访问检查

2026-09-12 14:21 UTC：spatial-garden-20260912-r12-fix2 已运行于原 California 服务（部署6aa55d89fbf9c810b64d4df4），HTTPS健康、CSP与17个线上文件SHA一致。默认 Edge 完整网页检查仍以 ERR_CONNECTION_CLOSED 失败；同机测试浏览器临时使用当轮公共DNS地址并关闭QUIC后，整园加载、选景、刷新、键盘和手机触摸检查通过，桌面23.103秒、手机模拟15.060秒，TLS验证保持开启。

当前证据：r12-fix2-network-observations.json、r12-fix2-production-smoke.json、r12-fix2-zeabur-deployment-verified.json。没有修改系统或代理配置。服务发布成功与本机默认访问失败是两项独立结论，临时解析结果不能代表所有访客。此台电脑可使用 http://127.0.0.1:4289/ 查看同一份正式包；本机预览只在该服务仍运行时有效。

## 2026-09-12 r12-fix2 发布前复查

2026-09-12T14:03:25.571Z 的 r12-fix2-public-transport-preflight.json：默认 Edge 与仅禁用 QUIC 均 ERR_CONNECTION_CLOSED；测试浏览器临时使用本轮公共 DNS 地址 47.89.212.251 的两组均 HTTP200，仍返回旧线上 r6。TLS 验证开启，没有修改系统或代理配置。这只验证健康接口；fix2完整生产包本地检查已通过，尚未上传。最终部署及默认网络的完整页面结果须另行记录。

## 2026-09-12 r12-fix1 发布前复查

13:01 UTC 的 `r12-fix1-public-transport-preflight.json` 再次记录：默认 Edge 及仅禁用 QUIC 都是 `ERR_CONNECTION_CLOSED`；仅在测试浏览器使用当轮公共 DNS 地址 `47.89.212.251`，以及同时关闭 QUIC，均 HTTP200，健康接口仍为旧线上 `spatial-garden-20260910-r6`。TLS 验证开启，未修改系统或代理设置。这是健康接口对照，不能当作新版上线或完整三维访问证明。

当前本地精修候选 `spatial-garden-20260912-r12-fix1` 已通过11项交互验收和正式包的桌面/手机模拟加载，视觉修正复核尚在进行，暂未上传。既有 California 项目/服务只读检查为 RUNNING，域名 PROVISIONED。

## 2026-09-12 r12 发布前复核（10:44 UTC）

最新证据是 `reports/acceptance/r12-public-transport-probe.json` 与同轮 `r12-public-dns.json`。默认 Edge 和仅禁用 QUIC 的健康请求仍为 `ERR_CONNECTION_CLOSED`；只在测试浏览器中使用当轮公共 DNS 地址，以及同时禁用 QUIC，两组均 HTTP200，返回旧线上版本 `spatial-garden-20260910-r6`。TLS 验证开启，系统和代理设置没有修改。

这再次将问题缩小到本机解析／代理路径，未证明具体内部原因，也不是完整网页验收。本地 r12 正式候选包已通过桌面与触摸模拟检查，完整视觉复核正在进行，尚未上传。原 California 项目/服务只读预检为 RUNNING，域名 PROVISIONED；登录可用。

## 2026-09-12 r10 历史健康接口复核

`reports/acceptance/r10-public-transport-probe.json` 记录同机同接口的四组Edge检查。默认连接及仅禁用QUIC均为 `ERR_CONNECTION_CLOSED`；仅在测试浏览器中将域名解析为公共DNS返回的 `47.89.212.251`，以及同时禁用QUIC，两组均HTTP200，健康接口返回 `spatial-garden-20260910-r6`。系统解析为 `198.18.0.183`。各组均保留TLS验证，未修改系统或代理配置。

这些是健康接口检查，不能作为完整三维载入或r10上线证明。证据将异常缩小到本机解析／代理路径，没有证明Mihomo内部具体哪项缓存或规则导致连接关闭。Zeabur原项目只读查询现已成功，原有401登录阻塞已解除；项目Region确认 `Aliyun California 4C8GB`。截至这份记录，r10已完成本地正式包测试但尚未上传，原服务最后核实运行r6。

## 2026-09-10 历史对照

以下为早期诊断的历史记录；`public-transport-probe.json` 是滚动输出，现已更新，不能继续用它佐证该轮。在同一台电脑、同一健康接口、保留 TLS 验证的四组测试中：默认浏览器与仅禁用 QUIC 均报 `ERR_CONNECTION_CLOSED`；仅把测试浏览器对此域名的解析指定为公共 DNS 返回的 `47.89.212.251`，以及同时禁用 QUIC，两组均 HTTP 200。该轮接口返回 r5；不能作为 r6 的发布核验或完整三维加载测试。

早先诊断把 `daguanyuan-rumeng.zeabur.app` 解析到 `198.18.0.124`；r6 发布核验时重新查询为 `198.18.0.132`；本机 Mihomo 的 DNS 网卡为 `198.18.0.2`，工作配置启用了 TUN 和 fake-ip。只读控制接口返回 Mihomo v1.19.29。当前 fake-ip 过滤名单中没有本站域名。这把问题缩小到本机代理／DNS 路径；仍未证明具体是缓存、映射还是后续路由导致连接关闭。

## 已准备、尚未执行的局部修复

`reports/acceptance/access-repair-preview.patch` 展示了唯一的持久配置增量：为本站域名加入真实 IP 解析例外，并保留当前两个已有例外。目标是 Clash Verge 的全局合并配置 `C:/Users/Lenovo/AppData/Roaming/io.github.clash-verge-rev.clash-verge-rev/profiles/Merge.yaml`。不改订阅、节点、规则模式、系统 hosts 或全局 DNS 地址。

这属于项目目录以外的本机网络配置变更，尚未获用户授权，因此没有应用。获准后应先备份合并配置和运行配置，记录 SHA-256，再应用增量并重载、复测默认浏览器。若未改善或出现新异常，恢复原配置；不把测试浏览器的解析覆盖冒充普通访问已恢复。

Mihomo 官方文档说明，黑名单模式下 `fake-ip-filter` 中的域名返回真实 IP：[DNS 配置](https://wiki.metacubex.one/en/config/dns/)。重载、缓存清理属于写操作，区别于本次已执行的只读接口：[控制 API](https://wiki.metacubex.one/en/api/)。

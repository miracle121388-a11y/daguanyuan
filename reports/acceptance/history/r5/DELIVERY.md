# r5 · 实际交付状态

[线上大观园](https://daguanyuan-rumeng.zeabur.app/)已部署到用户既有加利福尼亚服务器，版本`spatial-garden-20260910-r5`，部署`6aa26124c412702139fcc1c1`；核验时间2026-09-10T08:19:18.336657+00:00。RUNNING／PROVISIONED、TLS健康接口、CSP以及14个公开文件SHA-256与本地匹配。

保留十五地点、水陆、路网的统一布局及原文／出版解读／设计推演边界。新增三种源树、十五方向LOD图集、颜色与接触阴影烘焙、木构和竹林细节，支持真实三维分区、屋内、揭顶与图文联动。

319项空间、母文件及手机模型各2217项地形道路、1759项完整性、36个发布GLB优化重读；母场景1069网格、45张打包图、15个地点、无缺图且Manual_Adjustments保留。6项单元、类型、lint、正式构建通过，最后一次完整E2E为11项全过。

第三份完整独立视觉复核r5-full-review.md仍为 **REBUILD**。统一空间与交互成立，但主楼、岸水层次、树冠、木构室内和月夜焦点仍显模型预览质感。手机图注隐藏了“艺术参考”身份，详情抽屉遮住院门和院落；这些是待修复项。历史seed 41ecba8d原始输出未核实。

本地9Mbps／80ms／CPU×4的手机模拟首屏8.25秒、初始6.75MiB。Intel UHD无头桌面精细模式均值36.46ms、P95 62.2ms；轻量拖动24.71ms、P95 67.5ms。两种模式采样条件不同，不能作同条件速度比较；没有实体iOS/Android、Safari或长时发热验收。

本机普通浏览器仍出现ERR_CONNECTION_CLOSED。系统DNS为198.18.0.124，Mihomo虚拟网卡DNS为198.18.0.2，公共DNS为47.89.212.251。测试浏览器指定公共解析并关闭QUIC后，在标准90秒观察内通过，桌面首屏31.01秒、390px触摸模拟52.31秒。未修改系统网络，TLS验证保留；这不能证明普通访问已修复，也不能推断所有访客的速度。

实际证据：spatial-release.json、spatial-network-observations.json、zeabur-deployment.json、production-smoke.json、playwright.json、r5-e2e-verified.log、r5-full-review.md。完整目标仍进行中。

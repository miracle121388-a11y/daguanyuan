# 建模优化与上线验收

2026-09-09完成。在线地址：https://daguanyuan-rumeng.zeabur.app/ 。部署至用户现有Aliyun California 4C 8GB，静态包 `dist/`，Docker发布目录 `.deploy/`。

| 验证 | 结果与证据 |
|---|---|
| 类型与构建 | `npm run build` 通过，含 tsc；生成两个JS分包及本地静态资源 |
| Lint | `npm run lint` 通过 |
| 单元测试 | 6 / 6 通过 |
| 内容、引用、来源哈希、资产及模型校验 | 561项通过，43条来源，`integrity.json` |
| GLB优化后解码重读 | 26个通过，ID、热点、变换、边界和材质保持，`model-optimization.json` |
| Blender重开 | 12地点、156网格、7打包图片、无缺失图片，`blender-validation.json` |
| 端到端 | 7 / 7通过，0失败 / 0跳过 / 0 flaky，`playwright.json` |
| 线上正式构建烟测 | 桌面加载、选景、刷新、搜索焦点、无调试钩子；手机仅请求轻量模型与手机分区；无页面错误或失败响应，`production-smoke.json` |
| 依赖审计 | 执行时0已知漏洞，`npm-audit.json` |
| 视觉证据 | 14张实际浏览器截图、2张Blender渲染；旧版独立审查不代表本轮新增模型 |
| 性能 | 最终精细总览平均回调间隔9.25ms / P95 12.6ms；条件与边界见 `../../docs/PERFORMANCE.md` |
| 手机模拟 | 390×844、9 Mbps / 80 ms / CPU4倍降速约2.77秒；真实触摸旋转与手机分区请求通过，320×740导览控件通过；`mobile-4g.json` |
| 线上基础验证 | RUNNING、域名PROVISIONED、HTTPS健康200、4份线上资源与本地SHA256一致、CSP；`zeabur-deployment.json` |

端到端覆盖真实canvas点击三个地点、四个院落、人物与回目联动、引用展示、三条路线控制、防剧透、低画质、手机触摸和限速加载、窄屏操作、失败重试、室内屋面移除/恢复，以及实际沿路移动后自动停靠展示来源。

本机代理DNS导致新域名连接关闭，HTTP/3传输也有停滞；线上验收仅对测试浏览器指定公共DNS真实地址并关闭QUIC，保持证书校验，未修改系统配置。随后精细模型完整显示、刷新及手机近景通过；普通网络用户无需此测试参数。

语义复核由执行代理完成，没有声称人类专家审定。外部完整古建素材未取得，使用实际自建建筑与已获许可的材质 / 岩石 / 环境光；内容、性能和平台边界均在 `docs/KNOWN_ISSUES.md` 明确列出。

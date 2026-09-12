# r9 本轮性能实测

采样：2026-09-11T19:18:49.471Z。Windows / Edge 无头浏览器，本地 HTTP，1440×900，Intel UHD。记录 `r9-final-performance.json`。

| 场景 | 样本 | 平均回调间隔 ms | P95 ms | 绘制调用 | 三角面 |
|---|---:|---:|---:|---:|---:|
| 精细总览 | 230 | 25.95 | 35.30 | 70 | 431,618 |
| 轻量拖动 | 300 | 21.95 | 58.50 | 230 | 690,204 |

精细档低于120万三角面预算；轻量档690204超过35万预算，未通过。两档动作不同，回调间隔不等于显示FPS；未进行实体手机、Safari或长时间发热测试。

手机390×844、DPR3／渲染DPR1、9Mbps／80ms／CPU×4测试在首屏资源断言失败：8428280字节超过8388608字节预算，多39672字节。后续限速触摸步骤未执行，因此本轮没有完整通过的mobile-4g报告；现有mobile-4g.json属于r8。正式包的不限速触摸、热点及近看／全院操作另有通过证据r9-packaged-production-smoke.json。

完整E2E本轮10通过、1失败；日志r9-e2e-final.log，失败追踪r9-e2e-mobile-failure-trace.zip。总览GLB几何增长见r9-low-budget-diagnosis.json，首屏资源清单见r9-mobile-failed-transfer.json。

确切r9上传目录45.21MiB，全部运行时资源本地托管。尚未上传；Zeabur原项目登录恢复并确认原加利福尼亚地区，线上仍为r6。

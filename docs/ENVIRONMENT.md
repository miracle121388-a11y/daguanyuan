# 实测环境

记录日期：2026-09-09。工作目录为Windows本地中文路径；原版在本地完成，后按用户追加要求部署至Zeabur加利福尼亚服务器，见DEPLOYMENT.md。

| 项目 | 实测 |
|---|---|
| 操作系统 | Windows 11 / x64 / PowerShell |
| CPU / 内存 | Intel Core i7-14650HX / 16 GB |
| 图形硬件 | Intel UHD + NVIDIA RTX 4060 Laptop GPU |
| 本次浏览器实际渲染设备 | Intel UHD，经 ANGLE / Direct3D 11 |
| Node / npm | 24.12.0 / 11.6.2 |
| Blender | 4.5.9 LTS，官方便携 ZIP，SHA256 校验通过 |
| Python | 本机 Miniconda Python；使用 requests、beautifulsoup4、Pillow |
| 浏览器测试 | 本机 Microsoft Edge 152，Playwright 1.63.0，无头模式 |

Blender 的运行记录见 `reports/acceptance/doctor.json`。官方校验清单保存在 `references/upstream-notes/`；便携程序位于 `.tools/`，不进入静态包。安装前实际检查 PATH 与常见安装目录，未发现 Blender，随后获取便携版并运行版本检查。

网页浏览不需要 Blender、Python、API Key 或外网资源。重新获取资产和原文需要网络；已有缓存可用于模型及内容重建。macOS/Linux 的命令说明已提供，但未在这些操作系统运行，不能视作跨平台验收通过。

浏览器视口模拟手机不代表真实手机硬件。性能完整条件与测量局限见 `PERFORMANCE.md`。

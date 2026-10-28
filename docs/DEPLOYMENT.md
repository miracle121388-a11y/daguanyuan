# 阿里云香港 · 当前部署

正式入口：**https://daguanyuan.inspiralai.com/**。2026-10-24 从 Zeabur 香港迁到用户既有阿里云 ECS；`inspiralai.com` 主域名仍用于 elsewhere。

| 项目 | 当前配置 |
| --- | --- |
| CLI profile | `elsewhere-hk` |
| 地域 / 实例 | `cn-hongkong` / `i-j6c3egnl5bzb0itdjs7d` |
| 公网 IP | `8.218.221.59` |
| 服务目录 / 容器 | `/srv/daguanyuan` / `daguanyuan` |
| 运行配置 | [Compose](../deploy/aliyun/compose.yaml) |
| HTTPS | 现有 Caddy 网关新增独立域名，[站点配置](../deploy/aliyun/Caddyfile)；自动续期 |
| 数据 | `/srv/daguanyuan/data/dreams` 持久挂载为 `/data/dreams` |
| 密钥 | `/srv/daguanyuan/secrets/runtime.env`，权限600，不进Git或镜像 |
| 容器网络 | `daguanyuan-edge`，只连接大观园和共享网关，不公开应用端口 |

18项旧站配置迁入，平台端口引用 `${WEB_PORT}` 改为容器固定3000。应用以UID1000运行，根文件系统只读，限制内存768MiB、CPU 1核，自动重启并检查 `/healthz`。私有癸酉108回正文保留在镜像的服务器目录，公共请求404；公开模型、贴图、三版本目录均由本站提供。

## 发布与回退

1. 在 `main` 完成测试、lint和 `npm run build`。使用 `GARDEN_DEPLOY_MAX_MIB=256 conda run -n daguanyuan python scripts/package_deploy.py` 打包完整资源；本次未依赖构建时从GitHub补下载素材。
2. 将包上传到实例 `/srv/daguanyuan/incoming`，解压至新的 `releases/<提交>`。保留旧目录用于回退，禁止覆盖 `data/`、`secrets/`。Workbench操作使用 `-P elsewhere-hk -r cn-hongkong -i i-j6c3egnl5bzb0itdjs7d`。
3. `docker build -t daguanyuan:<提交> releases/<提交>`；在 `/srv/daguanyuan/.env` 设置对应 `GARDEN_IMAGE`，执行 `docker compose up -d`。更新时只操作大观园项目。
4. 检查容器健康、HTTPS资源哈希、访问口令、画册及三维页面；失败则将 `GARDEN_IMAGE` 改回上一版本并重新 `up -d`。画册不随镜像替换。
5. 确认后清理本次上传和展开的重复临时文件，保留一个必要的数据备份及上一可用发布。不要执行全服务器的镜像或数据卷清理。

共享网关 `elsewhere-edge` 已接入 `daguanyuan-edge`，现有站点配置完整保留并通过Caddy校验后热加载。如以后重建网关容器，需要恢复这个网络连接及大观园站点块；不要用只有单个站点的配置覆盖共享Caddyfile。

## 旧网址与本机存档

2026-10-28 用户明确无需继续保留旧入口。核对旧卷中的3幅画作及3份元数据与阿里云副本 SHA-256 全部一致、新站健康后，已删除 Zeabur 香港旧项目 `daguanyuan-rumeng`（`6ac7c8653913920b91cae35c`）。正式入口仍为 https://daguanyuan.inspiralai.com/ ，业务、模型调用和新增画册均在阿里云完成。旧版搬迁桥实现 [legacy-bridge.mjs](../deploy/aliyun/legacy-bridge.mjs) 仅作历史追溯，旧网址已不再提供服务。

故事及IF存档仍留在用户浏览器，不在服务器，更换域名不会自动共享浏览器存储。此前搬迁桥通过固定双域名与窗口身份验证转移本机存档、访问口令、画册身份和画作，遇到新站不同存档时拒绝覆盖；旧入口删除后，该跨域导入入口已停用。此次没有清除任何用户浏览器的本机存储。三维缓存可在新站重新生成。

## 验证与历史

本次证据在 [aliyun-20261024](../reports/acceptance/aliyun-20261024/)：231项应用测试、构建和lint；运行资源与数据哈希；真实线上前八十回续写及七项独立复核；桌面与390×844手机视口（模拟）三维展示；存档迁移和刷新恢复。场景执行器的模型验收是模拟执行，不冒充所有剧情及实体手机测试。

此前香港加载优化和美国旧部署清理的原始证据分别保留在 [loading-20261009](../reports/acceptance/loading-20261009/) 与 [server-cleanup-20261009](../reports/acceptance/server-cleanup-20261009/)，历史发布细节见Git及 [PROGRESS.md](PROGRESS.md)。旧美国服务器和其他项目不属于本次迁移范围。

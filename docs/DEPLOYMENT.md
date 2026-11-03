# 阿里云香港 · 当前部署

正式入口：**https://daguanyuan.inspiralai.com/**。2026-11-01 已对齐再次迁移后的香港 ECS；`inspiralai.com` 主域名仍用于 elsewhere。

| 项目 | 当前配置 |
| --- | --- |
| CLI profile | `miracle6-hk` |
| 地域 / 实例 | `cn-hongkong` / `i-j6c3bjaw8vp6z315yjvj` |
| 公网 IP | `47.238.123.112` |
| 服务目录 / 容器 | `/srv/daguanyuan` / `daguanyuan` |
| 运行配置 | [Compose](../deploy/aliyun/compose.yaml) |
| HTTPS | 原生 Caddy `swm-proxy` 管理独立域名，[站点配置](../deploy/aliyun/Caddyfile)；自动续期 |
| 数据 | `/srv/daguanyuan/data/dreams` 持久挂载为 `/data/dreams` |
| 密钥 | `/srv/daguanyuan/secrets/runtime.env`，权限600，不进Git或镜像 |
| 容器网络 | `daguanyuan-edge`；仅绑定 `127.0.0.1:13001`，原生网关反代 |

18项旧站配置迁入，平台端口引用 `${WEB_PORT}` 改为容器固定3000。应用以UID1000运行，根文件系统只读，限制内存768MiB、CPU 1核，自动重启并检查 `/healthz`。私有癸酉108回正文保留在镜像的服务器目录，公共请求404；公开模型、贴图、三版本目录均由本站提供。

当前应用镜像：`daguanyuan:hands-20261103`（2026-11-03 人物手部姿态修复）；上一可用镜像 `daguanyuan:cleanup-20261101`。

## 发布与回退

1. 在 `main` 完成测试、lint和 `npm run build`。使用 `GARDEN_DEPLOY_MAX_MIB=256 conda run -n daguanyuan python scripts/package_deploy.py` 打包完整资源；本次未依赖构建时从GitHub补下载素材。
2. 将包上传到实例 `/srv/daguanyuan/incoming`，解压至新的 `releases/<提交>`。保留旧目录用于回退，禁止覆盖 `data/`、`secrets/`。Workbench操作使用 `-P miracle6-hk -r cn-hongkong -i i-j6c3bjaw8vp6z315yjvj`。
3. `DOCKER_HOST=unix:///run/companion-docker/docker.sock docker build --network=host -t daguanyuan:<提交> releases/<提交>`；在 `/srv/daguanyuan/.env` 设置对应 `GARDEN_IMAGE`，执行 `DOCKER_HOST=unix:///run/companion-docker/docker.sock docker compose up -d`。更新时只操作大观园项目。
4. 检查容器健康、HTTPS资源哈希、访问口令、画册及三维页面；失败则将 `GARDEN_IMAGE` 改回上一版本并重新 `up -d`。画册不随镜像替换。
5. 确认后清理本次上传和展开的重复临时文件，保留一个必要的数据备份及上一可用发布。不要执行全服务器的镜像或数据卷清理。

当前 runtime 是 `companion-docker`，Docker socket 为 `unix:///run/companion-docker/docker.sock`；默认 Docker/containerd 保持禁用，禁止全局清理。大观园端口已并入正式 Compose，不再依赖 `/srv/migration-staging/daguanyuan.override.yaml`。原生 HTTPS 网关入口为 `/srv/swm-app/current/deploy/Caddyfile`，大观园站点位于 `/etc/caddy/migrated-projects.caddy`。只更新本项目站点，保留其他项目及全部 import。

唯一当前目标配置：[target.json](../deploy/aliyun/target.json)。发布后执行 `conda run -n daguanyuan python scripts/verify_deployment.py`。上传 tar 时使用 `COPYFILE_DISABLE=1 tar -czf ...`，避免打包 macOS 的 `._*` 元数据。

## 旧网址与本机存档

2026-10-28 用户明确无需继续保留旧入口。核对旧卷中的3幅画作及3份元数据与阿里云副本 SHA-256 全部一致、新站健康后，已删除 Zeabur 香港旧项目 `daguanyuan-rumeng`（`6ac7c8653913920b91cae35c`）。正式入口仍为 https://daguanyuan.inspiralai.com/ ，业务、模型调用和新增画册均在阿里云完成。搬迁桥源码及网页已删除，历史可由Git提交 `6218726` 追溯，旧网址不再提供服务。

故事及IF存档仍留在用户浏览器，不在服务器，更换域名不会自动共享浏览器存储。此前搬迁桥通过固定双域名与窗口身份验证转移本机存档、访问口令、画册身份和画作，遇到新站不同存档时拒绝覆盖；旧入口删除后，该跨域导入入口已停用。此次没有清除任何用户浏览器的本机存储。三维缓存可在新站重新生成。

## 验证与历史

2026-11-01 当时清理镜像 `daguanyuan:cleanup-20261101`，在前一验证镜像上仅删除失效搬迁页及 macOS `._*` 元数据。当前清理证据：[alignment-20261101.json](../reports/acceptance/alignment-20261101.json)。1287份原发布文件、6份画册及109份私有正文文件迁移前后核对一致；清理后1290份有效文件和17项当前配置不变。10份公网入口/资源与本地构建一致，访问口令有效、匿名401、旧页及私有路径404。此次未重新付费调用模型生成故事。

2026-11-01 用户确认旧 ECS `i-j6c3egnl5bzb0itdjs7d`（8.218.221.59）已释放，旧实例退役事项关闭。本确认来源为用户反馈，不代表本次执行了实例释放或独立检查了云盘销毁。当前生产只使用上述新实例。

2026-10-24 的历史证据在 [aliyun-20261024](../reports/acceptance/aliyun-20261024/)：231项应用测试、构建和lint；运行资源与数据哈希；真实线上前八十回续写及七项独立复核；桌面与390×844手机视口（模拟）三维展示；存档迁移和刷新恢复。场景执行器的模型验收是模拟执行，不冒充所有剧情及实体手机测试。

此前香港加载优化和美国旧部署清理的原始证据分别保留在 [loading-20261009](../reports/acceptance/loading-20261009/) 与 [server-cleanup-20261009](../reports/acceptance/server-cleanup-20261009/)，历史发布细节见Git及 [PROGRESS.md](PROGRESS.md)。旧美国服务器和其他项目不属于本次迁移范围。

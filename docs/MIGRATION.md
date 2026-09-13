# 从 GitHub 接续开发

本仓库提供当前网页源码、可编辑 Blender 母场景、原始与加工后的模型、PBR 材质、HDRI、植被素材、参考图、原文数据以及重建脚本。Git LFS 保存大文件，`config/handoff-assets.json` 记录开发素材的大小与 SHA-256。现用资源不依赖旧电脑的 `.checkpoints/`、`.deploy/` 或下载目录。

## 1. 获取仓库和工具

安装 [Git](https://git-scm.com/downloads) 和 [Git LFS](https://git-lfs.com/)。推荐使用已验证的 Node 24.12.0、Python 3.13.9、Blender 4.5.9 LTS；版本记录在 `.nvmrc`、`.python-version` 和 [development-tools.json](../config/development-tools.json)。该文件列出 Windows x64/ARM64、macOS Apple Silicon/Intel 的官方 Node、Blender 下载地址及 SHA-256。

- [Node 官方版本目录](https://nodejs.org/dist/v24.12.0/)：选择对应系统和架构的包。
- [Python 官方安装页](https://www.python.org/downloads/release/python-3139/)：安装 Python 后重新打开终端。
- [Blender 官方版本目录](https://download.blender.org/release/Blender4.5/)：macOS 下载对应的 4.5.9 DMG 并将应用放入 Applications；Windows 可下载 ZIP，或按下节使用仓库脚本。

```sh
git lfs install
git clone https://github.com/miracle121388-a11y/daguanyuan.git
cd daguanyuan
git lfs pull --include="" --exclude=""
git lfs fsck
```

已经克隆的成员先 `git pull --ff-only`，再执行 LFS 拉取。当前整库的大文件去重后约 4.43 GB；应使用 Git 克隆并拉取 LFS，不能仅凭 GitHub 的 ZIP 下载判断模型是否齐全。

从旧版仓库更新后，如果素材检查报告 glTF/JSON 的哈希不符，可运行 `npm run materials:check -- --repair-line-endings`。它仅恢复与当前 Git 提交内容一致的 CRLF/LF 差异，保留其他实质编辑；新克隆会直接使用仓库规定的素材字节格式。

## 2. Windows

在项目目录使用 PowerShell。虚拟环境把项目依赖与系统 Python 隔离：

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
$env:Path = "$PWD\.venv\Scripts;$env:Path"
npm ci
python scripts/bootstrap.py
npm run materials:check
npm run models:portability
npm run build
npm run dev
```

`bootstrap.py` 为 Windows x64 获取并校验 Blender 4.5.9 ZIP，安装到本仓库 `.tools/`。Windows ARM64 请使用工具清单中的 ARM64 ZIP 并设置下述路径。已有 Blender 可跳过下载，将 `$env:BLENDER_BIN` 设置为该电脑实际的 `blender.exe` 完整路径；不要照搬旧电脑的路径。

## 3. macOS

先安装对应架构的 Node、Python 和 Blender，再在 Terminal 执行：

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
export BLENDER_BIN="/Applications/Blender.app/Contents/MacOS/Blender"
npm ci
npm run materials:check
npm run models:portability
npm run build
npm run dev
```

Python 虚拟环境需要在每个新终端重新激活。`bpy`、`bmesh`、`mathutils` 来自 Blender 自带的 Python，不应在系统 Python 中另装。Python 依赖清单包括此前本机隐式使用的 Pillow、NumPy、Requests、Beautiful Soup、Shapely 和 Brotli；Brotli 用于复现部署包的压缩方式。

## 4. 使用模型和材料

| 路径 | 用途 |
|---|---|
| `blender/daguanyuan_master.blend` | 当前全园可编辑母场景；直接用 Blender 打开 |
| `blender/xiaoxiangguan_sample.blend` | 保留的潇湘馆样板 |
| `assets/source/` | 原始模型、树木、岩石、PBR 贴图、HDRI |
| `assets/processed/` | 制作中的网格、材质、植被原型、烘焙结果与归档模型 |
| `assets/textures/shared/` | 已补齐的归档模型外置贴图，保持原相对路径 |
| `public/models/`、`public/textures/` | 当前网页使用的模型和贴图 |
| `output/imagegen/daguanyuan-reference-20260910/` | 原始参考图、用户参考图、提示词与图录 |
| `config/`、`data/canon/` | 全园布局、材质配置和审核后的原文数据 |

`materials:check` 检查素材清单、来源哈希、GLB/glTF 外置资源引用；`models:portability` 只读打开母场景，检查贴图、字体和链接库是否依赖仓库外路径。当前母场景的 185 张文件贴图均已内嵌，没有外部链接库。素材许可和出处见 `assets/manifest.json`、`assets/textures/archive-provenance.json` 和 `references/licenses/`。

库中还保留了一份**未用于当前场景**的候选松树 `pine_tree_01.source.gltf`。它的 13 个原始依赖约 958 MB，按需从已冻结的官方元数据获取：

```sh
npm run materials:pine -- --dry-run
npm run materials:pine
```

下载脚本校验原始文件大小与 MD5，并记录实际 SHA-256；不会覆盖已修改的文件。这份候选不影响当前母场景、网页或现用素材的复现。其他现用源模型及依赖已直接提交，首次克隆无需再访问素材供应商。

## 5. 多人通过 GitHub 同步

每人使用自己的功能分支，例如 `git switch -c codex/member-materials`。开始工作前先拉取分支更新和 LFS。`.blend` 是二进制文件，同一时间安排一人编辑母场景；可用 Git LFS 锁协调：

```sh
git lfs lock blender/daguanyuan_master.blend
# 编辑并保存；手工调整保存在 Manual_Adjustments 集合中。
git add blender/daguanyuan_master.blend assets public config
npm run materials:inventory
git add config/handoff-assets.json
git commit -m "Update garden materials"
git push origin HEAD
git lfs unlock blender/daguanyuan_master.blend
```

新的 `.blend` 会自动使用 LFS。新增大型 GLB、FBX、BIN 等文件时，先按实际路径执行 `git lfs track "assets/source/example/model.glb"`，并把 `.gitattributes` 一起提交。素材编辑完成后更新清单，让其他成员能核对拿到的文件是否一致。合并到 `main` 后，其他人再次 `git pull --ff-only`、`git lfs pull` 即可同步。

日常继续开发应从当前母场景和现有配置出发。`content:prepare`、`pipeline` 和历史一次性迁移命令会重新生成或覆盖对应内容，按需使用；`models:overview-budget` 是旧版迁移入口，当前模型不需要再次执行。

墙体与清代重彩材质由 `config/qing.palette.json`、`config/craft.materials.json` 和 `blender/qing_enclosures.py` 管理。`npm run models:architecture` 会在当前母场景上更新厅堂围护与建筑材质，生成各档建筑补丁，保留现有植物、水路及 `Manual_Adjustments`；随后运行 `npm run models:optimize` 和 `npm run models:verify`。已有材质只改源码还不会自动改变已导出的 GLB。新增围护面在各档模型中保持厚度，`models:verify` 同时检查实际墙体、窗纸和门洞。清代绘本原图及来源哈希位于 `references/paintings/`，通过 LFS 获取；丢失时可运行 `python scripts/fetch_painting_references.py` 重新取得索引中指定的文件。

## 6. 测试、打包与验证范围

`npm run typecheck`、`npm run lint`、`npm test`、`npm run spatial:check` 验证代码和空间数据。`npm run test:e2e` 使用 Microsoft Edge；两种系统均可从 [Edge 官方下载页](https://www.microsoft.com/edge/download) 安装。模型检查使用 `npm run models:verify`。

```sh
npm run build
npm run deploy:package
```

这两个命令重新生成 `dist/` 和独立 `.deploy/` 发布包。部署目标仍是已有 Zeabur California 服务，步骤见 [DEPLOYMENT.md](DEPLOYMENT.md)；账号登录需要团队成员自行取得授权并登录。

旧的自动备份、部署快照、依赖安装目录与本机登录凭据不是现用素材依赖。迁移验证结果见 [MIGRATION_VALIDATION.md](MIGRATION_VALIDATION.md)，仅记录实际执行过的检查；提供 macOS 命令不等于已经在 macOS 上实测。


仅调整远景／手机建筑预算时，可运行 `npm run models:architecture:lod`，再执行 `npm run models:optimize` 与 `npm run models:verify`。它从当前母场景生成建筑 LOD，不重烘焙光照或重建植物。部署打包对字节完全相同的模型保存一个副本，并通过 `asset-aliases.json` 保留两个访问地址；Git 中仍保存完整模型文件。

"""Record only the verified r5 release. This is an intentionally versioned record."""
from pathlib import Path
import json, datetime
R=Path(__file__).resolve().parents[1];A=R/'reports/acceptance'
def read(name):return json.loads((A/name).read_text(encoding='utf-8-sig'))
def write(name,body):
 p=R/name;q=p.with_suffix(p.suffix+'.next');q.write_text(body,encoding='utf-8');q.replace(p)
def checks(name):
 value=read(name)['checks'];return len(value) if isinstance(value,list) else value
deploy=read('zeabur-deployment.json');smoke=read('production-smoke.json')
assert deploy['health']['revision']==smoke['revision']=='spatial-garden-20260910-r5'
assert (A/'r5-full-review.md').read_text(encoding='utf-8').startswith('disposition: rebuild')
master=read('blender-validation.json');integrity=read('integrity.json');stats=read('playwright.json')['stats']
assert stats['expected']==11 and stats['unexpected']==stats['flaky']==stats['skipped']==0
record={'recordedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'revision':smoke['revision'],
 'priorities':['courtyard locations','water and land boundary','connected roads'],
 'geometry':{'spatialChecks':checks('spatial-layout.json'),'terrainRoadChecks':checks('terrain-paths.json'),'mobileTerrainRoadChecks':checks('terrain-paths-mobile.json'),'integrityChecks':integrity['passed'],'publishedModels':len(read('model-optimization.json')),'blenderMeshes':master['meshes'],'packedImages':master['packedImages'],'manualAdjustmentsPreserved':master['manualLayerPresent']},
 'functionalTests':{'e2e':stats,'e2eLog':'r5-e2e-verified.log','unitPassed':6,'productionStandardResolvedObservationPassed':True,'productionReport':'production-smoke.json'},
 'visual':{'disposition':'rebuild','fullReviews':['reports/acceptance/r5-full-review.md'],'earlierReviews':['reports/acceptance/spatial-finish-review.md','reports/acceptance/spatial-rebuild-review.md'],'fullyMeetsUserQualityBar':False,'userAuthorizedContinuation':True,'seedRawEvidenceVerified':False},
 'deployment':{'deploymentId':deploy['deploymentId'],'serverId':deploy['server']['id'],'revision':smoke['revision'],'matchingPublicFiles':len(deploy['files']),'url':deploy['url']},
 'network':{'defaultConnectionPassed':False,'standard90SecondResolvedObservationPassed':True,'desktopReadyMs':smoke['desktopReadyMs'],'mobileReadyMs':smoke['mobile']['readyMs'],'report':'spatial-network-observations.json'},
 'designDocumentation':['DESIGN.md','.impeccable/design.json'],'completeUserObjective':False}
write('reports/acceptance/spatial-release.json',json.dumps(record,ensure_ascii=False,indent=2)+'\n')
verification='319项空间、母文件及手机模型各2217项地形道路、1759项完整性、36个发布GLB优化重读；母场景1069网格、45张打包图、15个地点、无缺图且Manual_Adjustments保留。6项单元、类型、lint、正式构建通过，最后一次完整E2E为11项全过。'
visual='第三份完整独立视觉复核r5-full-review.md仍为 **REBUILD**。统一空间与交互成立，但主楼、岸水层次、树冠、木构室内和月夜焦点仍显模型预览质感。手机图注隐藏了“艺术参考”身份，详情抽屉遮住院门和院落；这些是待修复项。历史seed 41ecba8d原始输出未核实。'
performance='本地9Mbps／80ms／CPU×4的手机模拟首屏8.25秒、初始6.75MiB。Intel UHD无头桌面精细模式均值36.46ms、P95 62.2ms；轻量拖动24.71ms、P95 67.5ms。两种模式采样条件不同，不能作同条件速度比较；没有实体iOS/Android、Safari或长时发热验收。'
network='本机普通浏览器仍出现ERR_CONNECTION_CLOSED。系统DNS为198.18.0.124，Mihomo虚拟网卡DNS为198.18.0.2，公共DNS为47.89.212.251。测试浏览器指定公共解析并关闭QUIC后，在标准90秒观察内通过，桌面首屏31.01秒、390px触摸模拟52.31秒。未修改系统网络，TLS验证保留；这不能证明普通访问已修复，也不能推断所有访客的速度。'
deployment=f"[线上大观园]({deploy['url']})已部署到用户既有加利福尼亚服务器，版本`{smoke['revision']}`，部署`{deploy['deploymentId']}`；核验时间{deploy['verifiedAt']}。RUNNING／PROVISIONED、TLS健康接口、CSP以及14个公开文件SHA-256与本地匹配。"
write('reports/acceptance/DELIVERY.md','# r5 · 实际交付状态\n\n'+deployment+'\n\n保留十五地点、水陆、路网的统一布局及原文／出版解读／设计推演边界。新增三种源树、十五方向LOD图集、颜色与接触阴影烘焙、木构和竹林细节，支持真实三维分区、屋内、揭顶与图文联动。\n\n'+verification+'\n\n'+visual+'\n\n'+performance+'\n\n'+network+'\n\n实际证据：spatial-release.json、spatial-network-observations.json、zeabur-deployment.json、production-smoke.json、playwright.json、r5-e2e-verified.log、r5-full-review.md。完整目标仍进行中。\n')
write('docs/KNOWN_ISSUES.md','# 当前边界 · r5\n\n'+visual+'\n\n'+performance+'\n\n'+network+'''\n
- 319项空间检查证明方案内部一致；低清书图和单幅艺术图不能证明原著唯一平面或完整三维背面。绝对坐标、尺度、园外林坡和导览是设计解释。
- 手机分区和两档总览使用实际颜色与AO烘焙，薄叶用顶点色，地表和石材保留源UV；照片级完美复刻未实现。
- 交互为轨道观察、室内预设、揭顶和道路导览，尚无任意第一人称墙体碰撞行走。22个事件为精选内容；数字文本保留章节、版本和哈希，未声称有人类红学专家审定。
- 来源和许可见assets/manifest.json，包含十项审查资源，运行资源均在本站。生成艺术参考不是原文证据，出版书图仅作研究。未启用环境音乐、实时人物在场或AI人物服务。
- r4旧证据保存在reports/acceptance/history/，不替代r5结果。功能检查通过不代表整体视觉达标。
''')
write('docs/DEPLOYMENT.md','# 加利福尼亚部署 · r5\n\n'+deployment+'''

用户既有Aliyun California 4C 8GB，Los Angeles，美国。服务器`6a8eee0bb11fb81fb4aaca05`，区域`server-6a8eee0bb11fb81fb4aaca05`；项目`6aa142fb6c3d9581b71560ed`，服务`6aa143296c3d9581b71560fa`，环境`6aa142fbda9bc245fba1e845`。未购买服务器或修改无关服务。

公开文件核验覆盖当前index、全部Vite JS/CSS、两档总览、手机分区、树冠图集、HDR、参考图及来源数据。两张公网实际截图已打开确认，见reports/browser/13-production-desktop.png和14-production-mobile.png。

## 访问实测

'''+network+'''

证据：r5-production-default.log、r5-production-resolved.log、r5-production-hashes.log、production-smoke.json、spatial-network-observations.json、zeabur-deployment.json。旧r4证据单独归档。

## 发布包与更新

本次目录`.deploy/reference-20260910-073118-947639`，上传48.96MiB，仅含dist、server.mjs、Dockerfile。未上传母场景、源资产、原文缓存或凭据。

```powershell
npm run build
npm run deploy:package
$gardenPackage = Get-Content -LiteralPath reports/acceptance/deployment-package.json | ConvertFrom-Json
Push-Location -LiteralPath $gardenPackage.directory
npx --yes zeabur@0.22.2 deploy --service-id 6aa143296c3d9581b71560fa --project-id 6aa142fb6c3d9581b71560ed --environment-id 6aa142fbda9bc245fba1e845 -i=false
Pop-Location
```

Node24容器以非root用户运行，端口3000；模型、图像、HDR、数据及解码器都在本站。文本支持Brotli/gzip，哈希JS/CSS和哈希共享纹理长期缓存，固定名模型与JSON重新验证。

设置APP_URL后运行node scripts/production_smoke.mjs，再运行python scripts/verify_deployment.py。APP_RESOLVE_IP只作用于测试浏览器，本次哈希请求上限180秒，浏览器观察上限90000毫秒。脚本核对当前版本，不将旧线上结果套用到新构建。
''')
p=R/'docs/SPATIAL_RECONSTRUCTION.md';body=p.read_text(encoding='utf-8').replace('## r5 继续重建（进行中）','## r5 继续重建（已发布，视觉仍未达标）')
body=body.replace('当前阶段不得把旧 r4 测试、部署或截图当作 r5 验收。完整构建、空间检查、手机触控、全截图矩阵、独立视觉复核与线上访问复核待执行。',verification+'\n\n'+visual+'\n\nr5已部署并核对公开文件；测试浏览器通过，普通连接仍失败。实测见DEPLOYMENT.md与PERFORMANCE.md。')
write('docs/SPATIAL_RECONSTRUCTION.md',body)
p=R/'docs/PROGRESS.md';body=p.read_text(encoding='utf-8');marker='### 2026-09-10 · r5 发布核验完成，完整目标仍进行中'
if marker not in body:body+='\n'+marker+'\n\n'+verification+'84栅格来源扫描零缺失。\n\n'+visual+'\n\n'+deployment+'\n\n'+network+'\n'
write('docs/PROGRESS.md',body)
print('Recorded verified r5 release, documentation and limitations.')

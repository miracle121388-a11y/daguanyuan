"""Record the verified r6 release, preserving its unmet visual requirements."""
from pathlib import Path
import datetime
import json

R = Path(__file__).resolve().parents[1]
A = R / 'reports/acceptance'
REVISION = 'spatial-garden-20260910-r6'


def read(name):
    return json.loads((A / name).read_text(encoding='utf-8-sig'))


def write(name, body):
    target = R / name
    temporary = target.with_suffix(target.suffix + '.next')
    temporary.write_text(body, encoding='utf-8')
    temporary.replace(target)


def count(name):
    value = read(name)['checks']
    return len(value) if isinstance(value, list) else value


deploy = read('zeabur-deployment.json')
smoke = read('production-smoke.json')
network = read('spatial-network-observations.json')
assert deploy['health']['revision'] == smoke['revision'] == network['revision'] == REVISION
assert deploy['cliDeploymentStatus'] == 'RUNNING'
assert deploy['cliDomainStatus'] == 'PROVISIONED'
assert all(item['matchesLocal'] for item in deploy['files'])
assert smoke['mobile']['hotspotTap'] and smoke['mobile']['equivalentDetailPicker']
assert not smoke['errors'] and not smoke['failed']
assert (A / 'r6-full-review.md').read_text(encoding='utf-8').startswith('disposition: rebuild')
assert (A / 'r6-hotspot-verdict.md').exists()
stats = read('playwright.json')['stats']
assert stats['expected'] == 11 and stats['unexpected'] == stats['flaky'] == stats['skipped'] == 0
for filename in ['terrain-paths.json', 'terrain-paths-mobile.json', 'spatial-layout.json']:
    assert read(filename)['passed']
master = read('blender-validation.json')
integrity = read('integrity.json')
mobile = read('mobile-4g.json')
performance = read('performance.json')
package = read('deployment-package.json')
MIB = 1048576

verification = (
    f"{count('spatial-layout.json')}项空间检查、母文件及手机各{count('terrain-paths.json')}项道路地形采样"
    f"（含重复地层检查）、{integrity['passed']}项完整性检查、{len(read('model-optimization.json'))}个GLB优化重读通过。"
    f"母场景{master['meshes']}网格、{master['packedImages']}张打包图、15地点，无缺图，Manual_Adjustments保留。"
    '6项单元、类型、lint、正式构建和最后一轮11项E2E通过；85栅格来源扫描零缺失。'
)
visual = (
    '完整独立视觉复核 `r6-full-review.md` 仍为 **REBUILD**：统一空间关系和文学／解释标识成立，'
    '主体地表、水岸、树冠、主楼木构、室内、月夜焦点及手机近看仍未达到参考图的写实质量。'
    '随后只修复正式手机数字节点隐藏，并增加等价的“院内细节”入口；专项补记见 `r6-hotspot-verdict.md`，'
    '不能把这一项的修复称为整体验收通过。历史seed 41ecba8d原始输出仍未核实。'
)
perf = (
    f"本地手机模拟为9Mbps／80ms／CPU×4，首屏{mobile['initial']['loadedMs']/1000:.2f}秒、"
    f"初始{sum(r['bytes'] for r in mobile['initial']['resources'])/MIB:.2f}MiB。"
    f"Intel UHD无头精细静止采样平均{performance['high']['meanFrameMs']:.2f}ms、P95 {performance['high']['p95FrameMs']:.1f}ms；"
    f"轻量拖动平均{performance['low']['meanFrameMs']:.2f}ms、P95 {performance['low']['p95FrameMs']:.1f}ms。"
    '两种动作不同，不能作为同条件速度对比；没有实体手机、Safari或长时发热验收。'
)
default = '本机普通浏览器本轮通过。' if network['defaultBrowser']['passed'] else '本机普通浏览器本轮仍报ERR_CONNECTION_CLOSED。'
network_text = (
    default + f"最终成功记录的浏览器观察上限{smoke['observationTimeoutMs']/1000:.0f}秒，"
    f"桌面园景就绪{smoke['desktopReadyMs']/1000:.2f}秒，390px触摸模拟{smoke['mobile']['readyMs']/1000:.2f}秒。"
    + ('该成功记录仅为测试浏览器指定公共DNS解析并关闭QUIC，保留TLS验证；不能称默认访问已修复。' if smoke.get('dnsOverride') else '该成功记录使用当前系统解析，并保留TLS验证。')
    + '当前证据、历史失败与条件见spatial-network-observations.json和ACCESS_DIAGNOSIS.md，不能推广为全部访客的体验。'
)
deployment = (
    f"[线上大观园]({deploy['url']})已更新到用户原有加利福尼亚服务器，版本`{REVISION}`，"
    f"部署`{deploy['deploymentId']}`。核验时间{deploy['verifiedAt']}；RUNNING／PROVISIONED、"
    f"TLS健康接口、CSP及{len(deploy['files'])}个公开文件SHA-256与本地一致。"
)
changes = (
    '沿统一院落—水陆—道路骨架重建层叠屋檐与主楼露台，增加成组植被和岸石；'
    '以实际母场景生成全园光影，移除重叠地面并精确裁切岸线。两档水面均有真实平面反射。'
    '手机按详情区域重新取景，艺术参考身份持续可见，院中数字点及等价选择器均可进入细节；'
    '真实屋内、可逆揭顶、图录、人物、回目和导览保留。'
)
record = {
    'recordedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'revision': REVISION,
    'priorities': ['courtyard locations', 'water and land boundary', 'connected roads'],
    'geometry': {'spatialChecks': count('spatial-layout.json'), 'terrainRoadChecks': count('terrain-paths.json'),
                 'mobileTerrainRoadChecks': count('terrain-paths-mobile.json'), 'integrityChecks': integrity['passed'],
                 'publishedModels': len(read('model-optimization.json')), 'blenderMeshes': master['meshes'],
                 'packedImages': master['packedImages'], 'manualAdjustmentsPreserved': master['manualLayerPresent']},
    'functionalTests': {'e2e': stats, 'e2eLog': 'r6-hotspot-e2e.log', 'unitPassed': 6,
                        'productionReport': 'production-smoke.json', 'hotspotTap': True, 'equivalentDetailPicker': True},
    'visual': {'disposition': 'rebuild', 'fullReview': 'reports/acceptance/r6-full-review.md',
               'limitedHotspotVerdict': 'reports/acceptance/r6-hotspot-verdict.md',
               'fullyMeetsUserQualityBar': False, 'seedRawEvidenceVerified': False},
    'deployment': {'deploymentId': deploy['deploymentId'], 'serverId': deploy['server']['id'],
                   'matchingPublicFiles': len(deploy['files']), 'url': deploy['url']},
    'network': network, 'designDocumentation': ['DESIGN.md', '.impeccable/design.json'],
    'completeUserObjective': False,
}
write('reports/acceptance/spatial-release.json', json.dumps(record, ensure_ascii=False, indent=2) + '\n')
write('reports/acceptance/DELIVERY.md', '# r6 · 实际交付状态\n\n' + '\n\n'.join([deployment, changes, verification, visual, perf, network_text]) + '\n\n完整写实目标仍未达成；本次发布不能作为最终视觉通过。\n')
write('docs/KNOWN_ISSUES.md', '# 当前边界 · r6\n\n' + '\n\n'.join([visual, perf, network_text]) + '''

- 空间检查证明本方案内部一致；书图与单张艺术图不能证明唯一原著平面或背面。绝对坐标、尺度、园外地貌及导览均属设计解释。
- 手机保持全院关系，但建筑在可用画布中仍偏小；近看构图和写实资产仍待继续重建。
- 交互为轨道观察、室内预设、揭顶和道路导览，尚无任意第一人称墙体碰撞行走。22个事件为精选内容，未声称经过人类红学专家审定。
- 来源、许可及衍生哈希见assets/manifest.json；生成艺术图不是原文证据，出版书图只用于研究。全部运行资源由本站提供。
- 未获授权的本机代理修复没有执行。详见ACCESS_DIAGNOSIS.md。普通网络失败与成功测试的条件分开记录。
- 历史r5报告、r6节点修复前截图和失败证据均保留。功能通过与整体视觉达标是不同结论。
''')
write('docs/DEPLOYMENT.md', '# 加利福尼亚部署 · r6\n\n' + deployment + '''

用户既有Aliyun California 4C 8GB，Los Angeles，美国。服务器`6a8eee0bb11fb81fb4aaca05`，区域`server-6a8eee0bb11fb81fb4aaca05`；项目`6aa142fb6c3d9581b71560ed`，服务`6aa143296c3d9581b71560fa`，环境`6aa142fbda9bc245fba1e845`。未购买服务器或修改无关服务。

''' + network_text + f'''

公开文件核验包括实际JS/CSS、两档总览、手机分区、树冠和地影图集、HDR、艺术图和来源数据。生产烟测用语义data-scene-ready等待初始园景资源就绪，实际验证触摸数字节点及等价选择器。公网两张截图已逐张确认，reports/browser/13-production-desktop.png、14-production-mobile.png。

最终上传目录`{package['directory']}`，{package['uploadDirectoryBytes']/MIB:.2f}MiB，仅含dist、server.mjs、Dockerfile。Node24以非root运行于3000端口，支持Brotli/gzip、本地资源和内容哈希纹理共享。

更新流程：npm run build → npm run deploy:package → 在报告指定包目录执行Zeabur deploy，沿用上述service/project/environment ID。部署后先测普通连接，再在必要时单独记录指定DNS的诊断连接，运行scripts/production_smoke.mjs及scripts/verify_deployment.py。不将本地包或旧r5结果冒充当前公网验证。

证据：r6-zeabur-upload.log、r6-production-default.log、r6-production-resolved.log、r6-production-hashes.log、production-smoke.json、zeabur-deployment.json、spatial-network-observations.json。
''')
for name, heading in [('docs/PROGRESS.md', '### 2026-09-10 · r6 发布核验完成'), ('docs/SPATIAL_RECONSTRUCTION.md', '## r6 实际发布与剩余视觉要求')]:
    path = R / name
    body = path.read_text(encoding='utf-8')
    if heading not in body:
        body += '\n' + heading + '\n\n' + '\n\n'.join([changes, verification, visual, deployment, perf, network_text]) + '\n'
        write(name, body)
print('Recorded verified r6 deployment, tested interactions and unresolved full visual review.')

"""Generate current measurements without carrying forward old budget claims."""
from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[1];M=1048576
p=json.loads((R/'reports/acceptance/performance.json').read_text(encoding='utf-8'));mobile=json.loads((R/'reports/acceptance/mobile-4g.json').read_text(encoding='utf-8'));package=json.loads((R/'reports/acceptance/deployment-package.json').read_text(encoding='utf-8'))
models=[R/'public/models/overview.glb',R/'public/models/overview-low.glb',*(R/'public/models/places').glob('*.glb'),*(R/'public/models/places-low').glob('*.glb'),*(R/'public/models/vegetation').glob('*.glb')]
revision=json.loads((R/'public/scene-manifest.json').read_text(encoding='utf8'))['assetRevision']
assert p['conditions']['overviewSha256']==hashlib.sha256(models[0].read_bytes()).hexdigest(),'Performance belongs to a different model build'
assert json.loads((R/package['directory']/'dist/scene-manifest.json').read_text(encoding='utf8'))['assetRevision']==revision,'Package revision differs'
online=''
smoke_path=R/'reports/acceptance/production-smoke.json'
if smoke_path.exists():
 smoke=json.loads(smoke_path.read_text(encoding='utf8'))
 revision=json.loads((R/'public/scene-manifest.json').read_text(encoding='utf8'))['assetRevision']
 if smoke.get('revision')==revision and 'desktopReadyMs' in smoke and smoke.get('url','').startswith('https://'):
  network_mode='测试浏览器临时解析到公共 DNS 地址' if smoke.get('dnsOverride') else '测试浏览器使用当前系统网络解析'
  if smoke.get('quicDisabled'):network_mode+='并关闭 QUIC'
  online=f'''## 本机网络访问线上服务

正式构建记录为 `production-smoke.json`，与上述本地限速测试是不同条件。本轮{network_mode}，TLS 仍验证；观察上限 {smoke['observationTimeoutMs']/1000:.0f} 秒，桌面首屏 {smoke['desktopReadyMs']/1000:.2f} 秒，390px 触摸模拟首屏 {smoke['mobile']['readyMs']/1000:.2f} 秒。最终载入、选景、刷新和俯瞰成功，仍不能据此称访问速度达标。当前及历史网络观察分别保存在 `spatial-network-observations.json` 与其历史归档；访问原因及配置变更边界见 `ACCESS_DIAGNOSIS.md`。不能把本机结果推广为所有访客的网络表现。

'''
budget='本次精细总览低于120万、轻量低于35万渲染三角面的预算。' if p['high']['triangles']<1200000 and p['low']['triangles']<350000 else '本次至少一档超过精细120万／轻量35万渲染三角面的预算，详见实测表。'
rows=[]
for title,key in [('精细总览','high'),('轻量拖动','low')]:
 v=p[key];rows.append(f"| {title} | {v['sampleCount']} | {v['meanFrameMs']:.2f} | {v['p95FrameMs']:.2f} | {v['drawCalls']} | {v['triangles']:,} |")
text=f'''# 本轮性能实测

版本 `{revision}`。采样：{p['high']['timestamp']}。Windows / Edge 无头浏览器、1440×900、本地 HTTP；后端 `{p['high']['renderer']}`。记录见 `reports/acceptance/performance.json`。历史 `performance-before-lod.json` 使用较早场景，不作为本版相同画面的严格对照。

| 场景 | 样本数 | 平均回调间隔 ms | P95 ms | 绘制调用 | 渲染三角面 |
|---|---:|---:|---:|---:|---:|
{chr(10).join(rows)}

精细模式在网络空闲并预热6秒后清空启动期历史，再记录6秒；轻量通过150次轨道拖动采样。保留所有正间隔（含超过250ms的停顿），最多300帧；只略去观察边界的第一个间隔。该指标不能直接换算为显示FPS；未隔离其他系统负载，两个场景动作不同。原始报告中的内存数据是资源估算，不是总显存实测。

远景使用从真实三维树烘焙的斜视／俯视透明树冠，近处使用三维树木；总览合并绘制调用，两档水面均有平面反射，分辨率分别为768／320。镜头移动时限制反射刷新频率，静止时复用反射纹理；多尺度法线来自本地可重建波纹场。{budget}回调间隔仍有明显波动，不宣称所有设备稳定60 FPS。

## 资源

精细总览 {models[0].stat().st_size/M:.2f} MiB，手机总览 {models[1].stat().st_size/M:.2f} MiB。{len(models)}个GLB共 {sum(f.stat().st_size for f in models)/M:.2f} MiB；相同贴图用本地内容哈希URI共享。当前上传目录 {package['uploadDirectoryBytes']/M:.2f} MiB。GLB使用Draco，本地文本支持Brotli/gzip，大图和景点分区按需载入。真实草丛按相机距离显示，远处保留本地地表材质及从母场景渲染的地面阴影；阴影图不等于草叶颜色纹理。两档总览使用保留独立地点拾取／隐藏的合并绘制。桌面另有最多12棵中距离三维树，手机不启用该层；低木丛和林带复用同一批源树冠，手机近景蕨类在选院后才加载。精细DPR上限1.5，手机1；分区缓存精细4处、手机2处。全部运行时资源在本站。

## 手机模拟

390×844，设备DPR3/渲染DPR1，9 Mbps、80ms、4倍CPU降速。总览与远景树冠纹理就绪 {mobile['initial']['loadedMs']/1000:.2f} 秒，记录初始资源 {sum(r['bytes'] for r in mobile['initial']['resources'])/M:.2f} MiB；分区细节和图录大图仍按需加载。触摸旋转和手机分区请求已检查，320px导览边界与44px高度另有检查。没有真实手机GPU、Safari、发热或长时间内存测试；线上跨地域首屏可能更慢。

{online}## 复测

`npm run test:e2e`生成测试构建，以`npx vite preview --outDir .test-dist --host 127.0.0.1 --port 4175`提供服务，再运行`node scripts/performance.mjs`及`python scripts/write_performance_report.py`。可用APP_URL指定测试地址；调试钩子仅在test构建中。
'''
target=R/'docs/PERFORMANCE.md';temp=target.with_suffix('.md.next');temp.write_text(text,encoding='utf8');temp.replace(target)
print('Current measurements and unmet budgets documented.')

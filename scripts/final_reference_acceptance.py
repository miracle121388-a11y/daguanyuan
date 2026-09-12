from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
def save(path,text):
 p=R/path;t=p.with_name(p.name+'.next');t.write_text(text,encoding='utf8');t.replace(p)
deploy=json.loads((R/'reports/acceptance/zeabur-deployment.json').read_text(encoding='utf8'));smoke=json.loads((R/'reports/acceptance/production-smoke.json').read_text());performance=json.loads((R/'reports/acceptance/performance.json').read_text())
assert deploy['health']['revision']=='reference-world-20260910-r3'
assert not smoke['errors'] and not smoke['failed']
summary={'revision':deploy['health']['revision'],'deploymentId':deploy['deploymentId'],'url':deploy['url'],'integrityChecks':1296,'runtimeModels':34,'places':15,'interiorCameras':13,'referenceImages':15,'unitTestsPassed':6,'browserCoverage':{'fullRunPassed':8,'artifactWriteFailures':2,'targetedRetestPassed':2,'logs':['reference-e2e-release.log','reference-artifact-retest.log']},'productionBrowserSmoke':smoke,'visualDisposition':'REBUILD','referenceFidelityComplete':False,'mobilePerformanceTargetsComplete':False,'defaultLocalBrowserLoadSucceeded':False,'publishedResourceHashesMatched':len(deploy['files'])}
save('reports/acceptance/reference-release.json',json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
save('reports/acceptance/DELIVERY.md',f'''# 当前交付记录 · 2026-09-10

[线上大观园]({deploy['url']})，既有加利福尼亚服务器，版本 `{deploy['health']['revision']}`，部署 `{deploy['deploymentId']}`。

## 已落地

- 统一布局中的15处三维景点，连续园路、水岸和植物；34个压缩模型，保留可编辑Blender母场景。
- 13处独立屋内镜头、可逆结构剖视、日夜光照、三条道路图导览。
- 15幅图录与三维地点跳转，原文、人物、事件及回目联动；46条来源证据与防剧透。
- 手机独立总览/分区、DPR1、按需加载、窄屏抽屉；远景实例和批量绘制降低开销。

## 验证

1,296项完整性检查、34个模型报告、Blender母场景重开、类型检查、lint、6项单元测试与正式构建通过。端到端最后全量执行8项通过；2项因本机截图/报告写入失败，改用原子写入后单独补跑通过，覆盖10个场景。这不是同一次10项全过的报告。

线上RUNNING、域名PROVISIONED、HTTPS健康接口、CSP及9个文件SHA-256与本地一致。正式浏览器检查包含载入、选景、刷新、键盘焦点、无调试钩子与手机分区。当前真实截图为reports/browser/13-production-desktop.png和14-production-mobile.png。

## 尚未达标

独立视觉复核最后完整结论为 **REBUILD**，实时材质、植被和空间层次仍未达到参考图的写实程度。后续定向修正不等于整体验收通过。精细总览平均回调间隔 {performance['high']['meanFrameMs']:.2f} ms，轻量拖动 {performance['low']['meanFrameMs']:.2f} ms；手机性能仍需优化，未测真实手机GPU或Safari。详细方法见docs/PERFORMANCE.md。

本机默认浏览器连接仍会卡在加载；指定公网解析并关闭HTTP/3的测试浏览器通过，TLS保持验证，没有改系统网络。不能把该结果称为默认网络访问问题已完全修复。

证据入口：reference-release.json、zeabur-deployment.json、production-smoke.json、model-optimization.json、integrity.json，以及两份端到端日志。设计事实已写入DESIGN.md与.impeccable/design.json。文学空间与生成图均为美术解释，原文依据在界面另列。
''')
print('Release record saved with incomplete fidelity, performance and default-network results stated explicitly.')

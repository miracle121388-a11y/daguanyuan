"""Inspect the PNGs and build a local gallery/archive without altering images."""
from pathlib import Path
from PIL import Image
import json,hashlib,html,zipfile,sys
sys.stdout.reconfigure(encoding='utf8')
root=Path(__file__).resolve().parent
items=sorted(json.loads((root/'manifest.json').read_text(encoding='utf8')),key=lambda x:x['n'])
assert [x['n'] for x in items]==list(range(1,16)), 'All 15 selected images are required'
prompts=json.loads((root/'prompts.json').read_text(encoding='utf8'))
specs={x['n']:x for x in prompts['assets']}
cards=[]
for item in items:
 file=root/item['file'];assert file.is_file()
 with Image.open(file) as im:
  im.verify()
 with Image.open(file) as im:
  item['width'],item['height']=im.size;item['mode']=im.mode
 item['bytes']=file.stat().st_size;item['sha256']=hashlib.sha256(file.read_bytes()).hexdigest()
 item['chapters']=specs[item['n']]['chapters']
 chapters='、'.join(str(c) for c in item['chapters'])
 cards.append(f'''<article><button class="picture" data-n="{item['n']}" aria-label="放大 {html.escape(item['title'])}"><img src="{item['file']}" alt="{html.escape(item['title'])}" width="{item['width']}" height="{item['height']}" loading="lazy"></button><div class="caption"><span class="number">{item['n']:02}</span><h2>{html.escape(item['title'])}</h2><a href="{item['file']}" download>保存原图 ↗</a></div><p class="meta">原著第{chapters}回 · {item['width']} × {item['height']} PNG</p></article>''')
(root/'manifest.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>大观园 · 文学空间图集</title><style>
:root{font-family:"Microsoft YaHei","PingFang SC",sans-serif;color:#28392f;background:#f5f2e9}*{box-sizing:border-box}body{margin:0}header,main,footer{max-width:1500px;margin:auto;padding:32px}header{padding-top:56px;border-bottom:1px solid #d8dbce}.eyebrow{letter-spacing:3px;font-size:12px;color:#687b68}h1{font:46px/1.3 "Songti SC",SimSun,serif;font-weight:400;letter-spacing:5px;margin:15px 0}header p{max-width:850px;line-height:1.9;color:#657263}a{color:#536f58;text-underline-offset:4px}nav{display:flex;gap:24px;font-size:13px;padding:12px 0}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px 24px}article{min-width:0}.picture{width:100%;padding:0;border:0;background:#e3e5db;cursor:zoom-in;display:block}.picture img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:contain}.caption{display:flex;gap:12px;align-items:baseline;margin-top:13px}.number{font-size:11px;font-variant-numeric:tabular-nums;color:#819078}h2{font:23px "Songti SC",SimSun,serif;margin:0;letter-spacing:1px}.caption a{font-size:12px;margin-left:auto;white-space:nowrap}.meta{font-size:12px;color:#75806b;margin:10px 0}.picture:hover{outline:2px solid #70866a;outline-offset:3px}button:focus-visible,a:focus-visible{outline:3px solid #9a5039;outline-offset:4px}footer{border-top:1px solid #d8dbce;color:#687364;font-size:13px;line-height:1.8}dialog{border:0;background:#101a16;color:#f4f0e5;padding:16px;width:min(96vw,1700px);max-width:none;max-height:96vh}dialog::backdrop{background:#07120deb}.viewer-top{display:flex;gap:14px;align-items:center;padding:0 3px 12px}.viewer-top a{color:#d4decc;margin-left:auto}.viewer-top button{height:44px;min-width:44px;font-size:18px;color:inherit;background:transparent;border:1px solid #637163;cursor:pointer}#large{display:block;width:100%;height:auto;max-height:80vh;object-fit:contain}@media(max-width:720px){header,main,footer{padding:23px}header{padding-top:32px}h1{font-size:33px}main{grid-template-columns:1fr;gap:25px}h2{font-size:21px}nav{gap:16px;flex-wrap:wrap}.caption a{font-size:11px}}
</style><header><div class="eyebrow">文学空间 · 三维建模视觉参考</div><h1>大观园，一园十五景。</h1><p>由原著中的院落、花木与陈设出发，借真实材质与自然光，逐处展开可近看的文学园林。点击图片放大，方向键可翻阅整组。</p><nav><a href="README.md">图目与建模参考说明</a><a href="generation-log.json">完整生成提示词</a><a href="literary-sources.json">原文依据</a></nav></header><main>'''+'\n'.join(cards)+'''</main><footer>内置 image_gen 生成 · 15张独立原生PNG。建筑尺寸、具体布局与书画纹饰属于艺术设定；未显露的背面和连接方式留待后续建模阶段统一。<br>原文数字整理来源：维基文库《紅樓夢》，详见原文依据文件。</footer><dialog id="viewer"><div class="viewer-top"><button id="prev" aria-label="上一张">←</button><span id="label"></span><button id="next" aria-label="下一张">→</button><a id="original" target="_blank">打开原图</a><button id="close" aria-label="关闭大图">×</button></div><img id="large" alt=""></dialog><script>
const items=ASSET_JSON;let current=0;const viewer=document.getElementById('viewer'),large=document.getElementById('large');function show(i){current=(i+items.length)%items.length;const item=items[current];large.src=item.file;large.alt=item.title;document.getElementById('label').textContent=String(item.n).padStart(2,'0')+' / 15 · '+item.title;document.getElementById('original').href=item.file;if(!viewer.open)viewer.showModal()}document.querySelectorAll('.picture').forEach(b=>b.addEventListener('click',()=>show(Number(b.dataset.n)-1)));document.getElementById('close').onclick=()=>viewer.close();document.getElementById('prev').onclick=()=>show(current-1);document.getElementById('next').onclick=()=>show(current+1);viewer.addEventListener('click',e=>{if(e.target===viewer)viewer.close()});document.addEventListener('keydown',e=>{if(!viewer.open)return;if(e.key==='ArrowRight'){e.preventDefault();show(current+1)}if(e.key==='ArrowLeft'){e.preventDefault();show(current-1)}});
</script></html>'''
page=page.replace('ASSET_JSON',json.dumps([{k:x[k] for k in ['n','file','title']} for x in items],ensure_ascii=False).replace('</','<'+chr(92)+'/'))
(root/'index.html').write_text(page,encoding='utf8')
archive=root.parent/'daguanyuan-15-images-20260910.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for item in items:z.write(root/item['file'],item['file'])
 for name in ['index.html','README.md','manifest.json','prompts.json','generation-log.json','literary-sources.json']:
  z.write(root/name,name)
print(json.dumps({'selectedImages':len(items),'sizePairs':sorted(set((x['width'],x['height']) for x in items)),'totalMiB':round(sum(x['bytes'] for x in items)/1048576,2),'archive':str(archive),'zipMiB':round(archive.stat().st_size/1048576,2)},ensure_ascii=False))

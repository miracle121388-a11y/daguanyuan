from pathlib import Path
p=Path(__file__).resolve().parents[1]/'src/App.tsx'
s=p.read_text(encoding='utf8')
needle='<h3>地点来源</h3>'
replacement='''{place.features?.some(f=>f.sourceRefs.some(id=>{const src=data.sources.find(x=>x.id===id);return src&&(s.spoilerLimit===null||src.chapter<=s.spoilerLimit)}))&&<><h3>原著中的形与景</h3><ul className="architecture-features">{place.features.filter(f=>f.sourceRefs.some(id=>{const src=data.sources.find(x=>x.id===id);return src&&(s.spoilerLimit===null||src.chapter<=s.spoilerLimit)})).map(f=><li key={f.text}>{f.text}</li>)}</ul><p className="note">构件关系据原文整理；尺寸、雕纹与具体摆位为设计解释。</p></>}<h3>地点来源</h3>'''
if 'architecture-features' not in s:s=s.replace(needle,replacement)
s=s.replace('<p>拖动旋转 · 滚轮缩放 · 右键平移</p>','<p><span className="desktop-gesture">拖动旋转 · 滚轮缩放 · 右键平移</span><span className="mobile-gesture">单指旋转 · 双指缩放与平移</span></p>')
if '查看屋内陈设' not in s:s=s.replace('<h3>此景中的故事', '''{data.manifest.places.find(p=>p.id===place.id)?.featured&&<button className="interior-button" onClick={()=>useGarden.setState({hotspotId:s.hotspotId===place.id+'-study'?null:place.id+'-study'})}><Eye size={16}/>{s.hotspotId===place.id+'-study'?'回到完整院落':'查看屋内陈设'}</button>}<h3>此景中的故事''')
p.write_text(s,encoding='utf8')

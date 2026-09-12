from pathlib import Path
R=Path(__file__).resolve().parents[1]
p=R/'src/state/store.ts';s=p.read_text(encoding='utf8')
s=s.replace('data:CanonData|null;selectedPlaceId:',"timeOfDay:'day'|'night';galleryOpen:boolean;activeImageId:string|null;data:CanonData|null;selectedPlaceId:")
s=s.replace('create<State>((set,get)=>({data:null',"create<State>((set,get)=>({timeOfDay:'day',galleryOpen:false,activeImageId:null,data:null")
s=s.replace('indexOpen:!mobile','indexOpen:false');p.write_text(s,encoding='utf8')
p=R/'src/App.tsx';s=p.read_text(encoding='utf8')
s="import {AtmosphereControl,GalleryButton,PlaceReference,ReferenceGallery,ViewControls} from './panels/ReferenceExperience';\n"+s
s=s.replace('园中十二景','园中十五景').replace('十二处园景相连，一段红楼徐徐展开。','沿一湾曲水，走入红楼深处。')
s=s.replace('<div className="detail-subtitle">{place.theme}', '<PlaceReference placeId={place.id}/><ViewControls/><div className="detail-subtitle">{place.theme}')
s=s.replace('<div className="header-end">','<div className="header-end"><GalleryButton/>')
s=s.replace('<div className="scene-toolbar">','<AtmosphereControl/><div className="scene-toolbar">')
s=s.replace('<DetailPanel/><Settings/><SourcePage/>','<DetailPanel/><Settings/><SourcePage/><ReferenceGallery/>')
s=s.replace('环境光用于 Blender 视图，网页使用本地灯光。','环境光与本地灯光共同呈现材质，水面在精细模式下实时反射三维场景。')
s=s.replace('古建模块、庭院组合与植物为本项目程序化自建。','本轮三维场景依据用户确认的十五张生成图重做整体布局、植被与建筑。图录中的图片为 image_gen 生成的美术参考。古建模块、庭院组合与植物为本项目程序化自建。')
s=s.replace('viewBox="-132 -117 264 234"','viewBox="-152 -146 304 278"').replace('<ellipse cx="0" cy="0" rx="125" ry="112" fill="#e4e4d5"/>','<rect x="-143" y="-138" width="286" height="238" rx="6" fill="#e4e4d5"/>').replace('rx="34" ry="53"','rx="49" ry="65"')
p.write_text(s,encoding='utf8')
p=R/'index.html';s=p.read_text(encoding='utf8');comment='''<!-- THESIS: A continuous inhabited literary garden fills the viewport. OWN-WORLD: charcoal tile, warm timber, jade water, botanical greens and quiet ivory reading surfaces. STORY: enter, orbit, select a courtyard, inspect its rooms, open sourced literature and compare the approved reference. FIRST VIEWPORT: full-scale real WebGL landscape, distant main tower, foreground gates and water, a restrained top navigation and bottom route control. FORM: immersive garden, user-pinned reference world; seed 41ecba8d. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance -->'''
s=s.replace('<body>','<body>\n'+comment);p.write_text(s,encoding='utf8')
print('Reference controls and image/3D links installed.')

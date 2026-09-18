"""Publish local, attributed derivatives of the pinned Sun Wen original scans."""
import hashlib,json
from pathlib import Path
from PIL import Image

R=Path(__file__).resolve().parents[1]
provenance=json.loads((R/'references/sunwen/provenance.json').read_text())
scans={r['number']:r for r in provenance['files']}
choices=[
 (1,None,'大观园·孙温全景'),
 (44,'qujingtongyou','曲径通幽·青绿叠石'),
 (96,'xiaoxiangguan','潇湘馆·竹影粉墙'),
 (100,'yihongyuan','怡红院·朱栏蕉影'),
 (49,'hengwuyuan','蘅芜苑·花石配色参照'),
 (98,'qiushuangzhai','秋爽斋·彩梁疏窗'),
 (136,'daoxiangcun','稻香村·茅檐淡赭'),
 (92,'ouxiangxie','藕香榭·水阁青瓦'),
 (77,'dicuiting','滴翠亭·柳荫彩蝶'),
 (108,'luxuean','芦雪庵·雪中茅舍'),
 (146,'tubishanzhuang','凸碧山庄·山水层次参照'),
 (53,'aojingxiguan','凹晶溪馆·临水石栏参照'),
 (64,'daguanlou','大观楼·省亲筵宴彩绘参照'),
 (99,'longcuian','栊翠庵·疏林庭院'),
 (55,'nuanxiangwu','暖香坞·室内彩绘参照'),
]
out=R/'public/art';out.mkdir(exist_ok=True)
records=[];keep={'manifest.json'}
for n,(plate,pid,title) in enumerate(choices,1):
    row=scans[plate]
    source=R/row['file']
    digest=hashlib.sha256(source.read_bytes()).hexdigest()
    assert digest==row['sha256'],source
    image=Image.open(source).convert('RGB')
    asset=f'sunwen-{plate:03}'
    derivatives=[]
    for suffix,width in [('',1600),('-thumb',480)]:
        derivative=image.copy();derivative.thumbnail((width,1200 if not suffix else 480),Image.Resampling.LANCZOS)
        target=out/f'{asset}{suffix}.webp';derivative.save(target,'WEBP',quality=86,method=6)
        record={'file':target.relative_to(R).as_posix(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'width':derivative.width,'height':derivative.height}
        derivatives.append(record);keep.update([target.name,target.name+'.json'])
        Path(str(target)+'.json').write_text(json.dumps({'kind':'historical-painting','artist':'孙温','sourceFile':row['file'],'sourceSha256':digest,'sourceUrl':row['sourcePage'],'repositoryCommit':provenance['commit'],'operation':'Preserve full image; resize and encode WebP without recoloring or generated additions.',**record},ensure_ascii=False,indent=2)+'\n')
    records.append({'id':asset,'n':n,'title':title,'placeId':pid,'url':derivatives[0]['file'].removeprefix('public/'),'thumbnail':derivatives[1]['file'].removeprefix('public/'),'chapters':row['chapters'],'kind':'historical-painting','artist':'孙温','sourceTitle':row['title'],'sourceFile':row['file'],'sourceUrl':row['sourcePage'],'repositoryCommit':provenance['commit'],'sourceSha256':digest,'sha256':derivatives[0]['sha256'],'thumbnailSha256':derivatives[1]['sha256'],'width':derivatives[0]['width'],'height':derivatives[0]['height'],'provenance':'孙温《红楼梦》绘本原图的本地等比缩小版；色彩和构图未修改。用于三维美术参照，院落对照含设计转译。','rights':provenance['rights']})
# Retire the specifically superseded AI garden references. Other feature art
# (comics, story illustrations and dream generation) is outside this catalogue.
for path in out.iterdir():
    if path.is_file() and path.name not in keep:path.unlink()
(out/'manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
print('SUNWEN GALLERY',len(records),'local historical plates')

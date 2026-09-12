"""Reproduce the reviewed garden source downloads without rewriting their review."""
from pathlib import Path
import requests, json, hashlib, concurrent.futures
R=Path(__file__).resolve().parents[1]
IDS=['forest_ground_04','forest_ground_05','wood_cabinet_worn_long','mossy_rock','grass_medium_01','moss_01','fine_grained_wood','dark_wood','lacquered_cherry_wood','grey_roof_tiles','slate_floor_02','bark_willow','rosewood_veneer_02','white_sandstone_blocks_02','mossy_sandstone','forest_ground_06','fern_02','rock_moss_set_01','wood_table_001']


def save(entry,path):
    path.parent.mkdir(parents=True,exist_ok=True)
    if not path.exists():
        response=requests.get(entry['url'],timeout=(20,100));response.raise_for_status()
        data=response.content
        assert len(data)==entry['size'] and hashlib.md5(data).hexdigest()==entry['md5']
        path.write_bytes(data)
    data=path.read_bytes()
    assert len(data)==entry['size'] and hashlib.md5(data).hexdigest()==entry['md5']
    return hashlib.sha256(data).hexdigest()


assets=json.loads((R/'assets/manifest.json').read_text(encoding='utf-8'))
for aid in IDS:
    asset=next(a for a in assets if a['assetId']==aid)
    metadata=R/'references/upstream-notes'/f'{aid}-r9.json'
    if not metadata.exists():metadata=R/'references/upstream-notes'/f'{aid}-r8.json'
    if not metadata.exists():metadata=R/'references/upstream-notes'/f'{aid}-r7.json'
    files=json.loads(metadata.read_text(encoding='utf-8'))
    target=R/asset['sourceFile'];jobs=[]
    if target.suffix=='.gltf':
        entry=files['gltf']['1k']['gltf'];jobs=[(e,target.parent/rel) for rel,e in entry['include'].items()]
        if aid=='fern_02':
            for channel in ['diff','alpha']:
                key=next(k for k in files if k.lower().endswith('_'+channel) or k.lower() in [channel,{'diff':'diffuse'}.get(channel,channel)])
                e=files[key]['1k']['png'];jobs.append((e,target.parent/'textures'/e['url'].rsplit('/',1)[-1]))
    else:
        entry=files.get('diff',files.get('Diffuse'))['1k']['jpg']
        for key in ['nor_gl','rough']:
            actual=next((k for k in files if k.lower()==key),None)
            if actual:jobs.append((files[actual]['1k']['jpg'],R/'assets/source'/f'{aid}_{key}.jpg'))
    assert save(entry,target)==asset['sourceSha256']
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for (entry,path),digest in zip(jobs,pool.map(lambda job:save(*job),jobs)):
            dependency=next(d for d in asset['dependencies'] if d['file']==path.relative_to(R).as_posix())
            assert digest==dependency['sha256']
    print('Source verified:',aid,flush=True)

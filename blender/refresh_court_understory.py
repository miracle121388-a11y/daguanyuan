"""Add native linked bed plants and publish their actual transforms without re-exporting architecture."""
import bpy,sys,json,hashlib,datetime
from pathlib import Path
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'blender'))
from r9_understory import add_court_instances
from publish_manifest import publish
master=R/'blender/daguanyuan_master.blend'
layout=json.loads((R/'config/garden.layout.json').read_text(encoding='utf8'))
before_sha=hashlib.sha256(master.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(master),load_ui=False,use_scripts=False)
protected=set(bpy.data.collections['Manual_Adjustments'].all_objects)
def identity(ob):
 return (tuple(v for row in ob.matrix_world for v in row),ob.data.as_pointer() if ob.data else None,tuple(c.name for c in ob.users_collection))
before={o.name:identity(o) for o in bpy.data.objects}
collection=bpy.data.collections['Reference_Understory']
prototypes=[next(o for o in collection.objects if o.get('species')==i) for i in range(2)]
# Only the previously generated extension is replaceable; any manually shared
# object remains protected, along with the original forest and bamboo planting.
old=[o for o in collection.objects if o.get('plantingLayer')=='connected-court-ground']
assert not any(o in protected for o in old),'Manual bed edits require a separate generated collection'
for ob in old:before.pop(ob.name);bpy.data.objects.remove(ob,do_unlink=True)
rows=add_court_instances(layout,collection,prototypes)
bpy.context.view_layer.update()
assert all(name in bpy.data.objects and identity(bpy.data.objects[name])==value for name,value in before.items()),'An existing object, transform, mesh or collection changed'
bpy.ops.wm.save_as_mainfile(filepath=str(master))
publish(layout)
manifest=json.loads((R/'public/scene-manifest.json').read_text(encoding='utf8'))
assert len(manifest['understory'])==len(collection.objects)
counts={p:sum(row['placeId']==p for row in rows) for p in sorted({r['placeId'] for r in rows})}
report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'revision':layout['assetRevision'],'beforeMasterSha256':before_sha,'afterMasterSha256':hashlib.sha256(master.read_bytes()).hexdigest(),'existingObjectsPreserved':len(before),'manualObjectsPreserved':len(protected),'newLinkedInstances':len(rows),'perCourt':counts,'publishedInstances':len(manifest['understory']),'sourceMeshCount':len({o.data for o in collection.objects}),'rootOffsetMetres':.025,'method':'Existing authored bed ellipses, leaf-radius clearance from walks/channels, vertical ray against actual native terrain; all existing transforms/mesh links/collection membership preserved. Published positions come from saved native instances. Interpretation, not a botanical claim from the novel.','instances':rows}
short='r'+layout['assetRevision'].split('-r')[-1]
(R/f'reports/acceptance/{short}-court-understory.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print('NATIVE BED PLANTS PUBLISHED',counts,flush=True)

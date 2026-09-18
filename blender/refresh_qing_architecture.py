"""Update saved architecture without rebuilding trees, routes or hand edits."""
import bpy
import json
import sys
from pathlib import Path
from collections import defaultdict

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'blender'))
from export_scene import export_selected
from publish_manifest import publish

layout=json.loads((ROOT/'config/garden.layout.json').read_text(encoding='utf-8'))
config=json.loads((ROOT/'config/craft.materials.json').read_text(encoding='utf-8'))
palette=json.loads((ROOT/'config/qing.palette.json').read_text(encoding='utf-8'))
sunwen='--sunwen' in sys.argv
if sunwen:
    sunwen_spec=json.loads((ROOT/'config/garden.sunwen.json').read_text())
    layout['assetRevision']=sunwen_spec['assetRevision']
revision=sunwen_spec['revision'] if sunwen else palette['revision']

def role(m):return m.get('sunwenRole',m.name)
out=ROOT/f'assets/processed/architecture-{revision}'
out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blender/daguanyuan_master.blend'),load_ui=False,use_scripts=False)


def linear(hex_color):
    c=[int(hex_color.lstrip('#')[i:i+2],16)/255 for i in [0,2,4]]
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c)+(1,)


def material(name, color, roughness=.65, metallic=0):
    mat=bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes=True;nodes=mat.node_tree.nodes;nodes.clear()
    bs=nodes.new('ShaderNodeBsdfPrincipled');end=nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(bs.outputs[0],end.inputs['Surface'])
    bs.inputs['Base Color'].default_value=linear(color);mat.diffuse_color=linear(color)
    bs.inputs['Roughness'].default_value=roughness;bs.inputs['Metallic'].default_value=metallic
    mat['qingPalette']=revision
    return mat,bs


records=None
if '--lod-only' not in sys.argv:
    for role,setting in config['materials'].items():
        mat,bs=material(role,setting.get('pigment','#ffffff'),setting['roughness'])
        mat['craftSurface']=config['revision']
        for channel,socket in [('diff','Base Color'),('nor_gl','Normal'),('rough','Roughness')]:
            path=ROOT/f'assets/processed/materials-{config["revision"]}'/f'{role}_{channel}.png'
            if not path.exists():continue
            image=bpy.data.images.load(str(path),check_existing=False)
            image.colorspace_settings.name='sRGB' if channel=='diff' else 'Non-Color'
            image.name=f'{revision}_{role}_{channel}';image.pack()
            node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
            if channel=='nor_gl':
                normal=mat.node_tree.nodes.new('ShaderNodeNormalMap')
                normal.inputs['Strength'].default_value=setting.get('normalStrength',.10)
                mat.node_tree.links.new(node.outputs['Color'],normal.inputs['Color'])
                mat.node_tree.links.new(normal.outputs[0],bs.inputs[socket])
            else:mat.node_tree.links.new(node.outputs['Color'],bs.inputs[socket])
    for name,color,rough,metal in [
        ('qing_jade',palette['colors']['jade'],.5,0),('qing_azurite',palette['colors']['azurite'],.56,0),
        ('qing_clay',palette['colors']['clay'],.9,0),('gold',palette['colors']['gold'],.34,.55),
        ('screen',palette['colors']['paper'],.82,0),('paper',palette['colors']['paper'],.9,0),
        ('silk','#b84d60',.56,0),('ceramic','#3b8e97',.24,.05),
    ]:material(name,color,rough,metal)

    # Install only the footprint builders. The saved scene and hand-edit collection
    # remain in place; EnvelopeBatch discards all unrelated generated geometry.
    import reference_craft, r5_craft, r6_architecture, r7_architecture, r8_architecture
    for module in [reference_craft,r5_craft,r6_architecture,r7_architecture,r8_architecture]:module.install()
    from qing_enclosures import generate

    records=[]
    for place in layout['places']:
        root=bpy.data.objects[place['id']];collection=bpy.data.collections['Place_'+place['id']]
        for ob in list(root.children_recursive):
            if ob.get('enclosureRevision')==revision:bpy.data.objects.remove(ob,do_unlink=True)
        added,probes=generate(place,root,collection)
        roof_roles=['roof','tile','tilelight','tiledark']
        for ob in root.children_recursive:
            if ob.type!='MESH':continue
            if all(m.name in roof_roles or m.name.startswith('goldtile') or m.name=='goldroof' for m in ob.data.materials):ob['roof']=True
            if place['id'] in palette['formalRoofPlaces']:
                for i,mat in enumerate(ob.data.materials):
                    if mat.name in roof_roles:ob.data.materials[i]=bpy.data.materials['gold'+mat.name]
            if place['id'] in palette['rusticPlaces']:
                for i,mat in enumerate(ob.data.materials):
                    if mat.name in ['wood','darkwood','latticewood']:ob.data.materials[i]=bpy.data.materials['rusticwood']
        records.append({'placeId':place['id'],'addedMeshes':len(added),'probes':probes})
        position=root.location.copy();root.location=(0,0,0);bpy.context.view_layer.update()
        export_selected(ROOT/'public/models/places'/f'{place["id"]}.glb',[root]+list(root.children_recursive))
        root.location=position;bpy.context.view_layer.update()
        print('ENCLOSED DETAIL',place['id'],len(added),flush=True)

    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/daguanyuan_master.blend'))

# Emit only changed architecture for the low models. Their original botanical,
# terrain, board-floor, path paving, rock and water meshes stay in the final GLBs.
# Court paving was part of the old combined atlas mesh; re-export it explicitly.
keep_roles={'floorwood','paving','bankstone','limestone','gardenstone','water'}
plant_prefix=('botanical_','leaf','lightleaf','canopy','bark','bamboo','flower','creamflower','moss','reed')


def architecture(ob):
    if ob.type!='MESH' or not ob.data.materials or ob.get('sunwenOrnament') or ob.get('sunwenRetired'):return False
    if ob.get('enclosureRevision'):return True
    return not all(role(m) in keep_roles or role(m).startswith(plant_prefix) for m in ob.data.materials)


def low_objects(root, collection, far=False):
    groups=defaultdict(lambda:{'v':[],'f':[],'uv':[],'smooth':[],'roof':False,'envelope':False})
    bpy.context.view_layer.update()
    for ob in list(root.children_recursive):
        if not architecture(ob):continue
        ornament=all(role(m) in ['wood','rusticwood','gold','qing_jade','qing_azurite'] for m in ob.data.materials)
        protected=(bool(ob.get('preserveEnvelope')) and not ornament) or all(role(m) in ['roof','goldroof','plaster','clay','courtbase'] for m in ob.data.materials)
        modifier=None
        if not protected and len(ob.data.polygons)>200:
            modifier=ob.modifiers.new('QingArchitectureLOD','DECIMATE');modifier.ratio=.018 if far else .32
        bpy.context.view_layer.update();ev=ob.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh()
        matrix=root.matrix_world.inverted()@ob.matrix_world
        uv=mesh.uv_layers.active
        for polygon in mesh.polygons:
            mat=ob.data.materials[polygon.material_index]
            key=(mat.name,bool(ob.get('roof')),bool(ob.get('preserveEnvelope')) and protected)
            group=groups[key];offset=len(group['v'])
            group['v'].extend(tuple(matrix@mesh.vertices[i].co) for i in polygon.vertices)
            group['f'].append(tuple(range(offset,offset+len(polygon.vertices))))
            group['uv'].append([tuple(uv.data[i].uv) if uv else (0,0) for i in polygon.loop_indices])
            group['smooth'].append(polygon.use_smooth)
        ev.to_mesh_clear()
        if modifier:ob.modifiers.remove(modifier)
    result=[]
    for (name,roof,envelope),group in groups.items():
        mesh=bpy.data.meshes.new(f'r15_{root.name}_{name}');mesh.from_pydata(group['v'],[],group['f']);mesh.update()
        layer=mesh.uv_layers.new(name='UVMap')
        for poly,coords,smooth in zip(mesh.polygons,group['uv'],group['smooth']):
            poly.use_smooth=smooth
            for li,co in zip(poly.loop_indices,coords):layer.data[li].uv=co
        ob=bpy.data.objects.new(mesh.name,mesh);collection.objects.link(ob);ob.parent=root
        ob.data.materials.append(bpy.data.materials[name]);ob['roof']=roof;ob['preserveEnvelope']=envelope
        ob['qingArchitecture']=revision
        result.append(ob)
    return result


far_objects=[]
temporary=bpy.data.collections.new('Temporary_Qing_Export');bpy.context.scene.collection.children.link(temporary)
for place in layout['places']:
    root=bpy.data.objects[place['id']]
    low=low_objects(root,temporary)
    position=root.location.copy();root.location=(0,0,0);bpy.context.view_layer.update()
    export_selected(out/f'{place["id"]}.glb',[root]+low)
    root.location=position
    for ob in low:bpy.data.objects.remove(ob,do_unlink=True)
    far_objects.extend(low_objects(root,temporary,far=True))
    print('ENCLOSED MOBILE',place['id'],flush=True)
export_selected(out/'overview.glb',far_objects+[bpy.data.objects[p['id']] for p in layout['places']])
for ob in far_objects:bpy.data.objects.remove(ob,do_unlink=True)
bpy.data.collections.remove(temporary)
publish(layout)
if records is not None:
    (ROOT/f'reports/acceptance/{revision}-enclosure-generation.json').write_text(json.dumps({
        'revision':layout['assetRevision'],'wallThicknessMetres':.36,'windowBackingMetres':.035,
        'method':'Occupied rooms enclosed on incumbent footprints. Doors remain openings; windows have opaque backing. Open pavilions are excluded. All enclosure meshes bypass LOD simplification.',
        'places':records,
    },indent=2),encoding='utf-8')
print('QING ARCHITECTURE READY',sum(r['addedMeshes'] for r in records or []),flush=True)

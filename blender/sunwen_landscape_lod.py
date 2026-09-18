"""Simplify delivery leaves in an isolated scene; keep continuous ground intact."""
import bpy
from export_scene import export_selected


def export_low_beds(path, objects):
    original_scene=bpy.context.window.scene
    temporary=bpy.data.scenes.new('Temporary_Garden_LOD')
    bpy.context.window.scene=temporary
    copies=[];surfaces=[];owned_meshes=[]
    try:
        for ob in objects:
            clone=ob.copy();clone.parent=None;clone.matrix_world=ob.matrix_world.copy()
            temporary.collection.objects.link(clone)
            clone.hide_render=False;clone.hide_set(False)
            if ob.get('groundingSurface'):
                # Do not merge coloured ground with uncoloured foliage: Blender
                # would fill the latter's missing vertex colours with black.
                surfaces.append(clone);continue
            clone.data=ob.data.copy();owned_meshes.append(clone.data.name)
            modifier=clone.modifiers.new('Mobile_Bed_Detail','DECIMATE')
            modifier.ratio=ob.get('groundingLodRatio',.28 if '-bed-' in ob.name else .08)
            bpy.context.view_layer.objects.active=clone
            bpy.ops.object.modifier_apply(modifier=modifier.name)
            copies.append(clone)
        bpy.ops.object.select_all(action='DESELECT')
        for ob in copies:ob.select_set(True)
        bpy.context.view_layer.objects.active=copies[0]
        bpy.ops.object.join()
        joined=copies[0];joined.name='Sunwen_Tended_Beds_Low'
        for key in list(joined.keys()):del joined[key]
        joined['sunwenLandscape']=True
        export_selected(path,[joined]+surfaces)
    finally:
        bpy.context.window.scene=original_scene
        bpy.data.batch_remove(ids=list(temporary.objects))
        bpy.data.scenes.remove(temporary)
        for name in owned_meshes:
            mesh=bpy.data.meshes.get(name)
            if mesh and not mesh.users:bpy.data.meshes.remove(mesh)

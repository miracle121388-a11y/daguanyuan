"""Fit the reviewed CC BY standing Ming garment to the MPFB body rig."""
import bpy,math,numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1]
def smooth(x):
    x=max(0,min(1,x));return x*x*(3-2*x)
def create_cloth_rig(cid,anatomy,body):
    shoulder=anatomy.joints['joint-l-shoulder'];upper=(shoulder-anatomy.joints['joint-l-elbow']).length
    ad=bpy.data.armatures.new(cid+'_clothSkeleton');rig=bpy.data.objects.new(cid+'_clothRig',ad);bpy.context.scene.collection.objects.link(rig);rig.parent=body
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    anchor=ad.edit_bones.new(cid+'_clothBody');anchor.head=(0,0,0);anchor.tail=(0,.1,0)
    for side,label in [(-1,'left'),(1,'right')]:
        arm=ad.edit_bones.new(cid+'_cloth_'+label+'Arm');arm.head=(side*shoulder.x,shoulder.y,shoulder.z);arm.tail=arm.head+Vector((0,.1,0));arm.parent=anchor
        fore=ad.edit_bones.new(cid+'_cloth_'+label+'Forearm');fore.head=arm.head+Vector((0,-upper,0));fore.tail=fore.head+Vector((0,.1,0));fore.parent=arm
    bpy.ops.object.mode_set(mode='OBJECT')
    for part in ['leftArm','rightArm','leftForearm','rightForearm']:
        bone=rig.pose.bones[cid+'_cloth_'+part];bone.rotation_mode='XYZ'
        con=bone.constraints.new('COPY_ROTATION');con.target=bpy.data.objects[cid+'_'+part];con.target_space='LOCAL';con.owner_space='LOCAL'
    return rig

def install(cid,anatomy,body,high):
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/characters/style3d/ming-standing-clothing.glb'))
    imported=list(set(bpy.data.objects)-before)
    clothes=[o for o in imported if o.type=='MESH']
    palette={'daiyu':((.76,.90,.85),(.25,.43,.41)),'baochai':((1.,.93,.76),(.47,.35,.24)),'wangxifeng':((.68,.25,.24),(.32,.12,.17))}[cid]
    images={}
    materials={m for o in clothes for m in o.data.materials}
    for mat in materials:
        bsdf=mat.node_tree.nodes.get('Principled BSDF')
        if not bsdf:continue
        links=bsdf.inputs['Base Color'].links
        node=links[0].from_node if links else None
        if node and node.type=='TEX_IMAGE':
            original=node.image
            if original not in images:
                img=original.copy();img.name=cid+' embroidered silk'
                size=2048 if high else 1024
                if max(img.size)>size:img.scale(size,size)
                pixels=np.empty(len(img.pixels),dtype=np.float32);img.pixels.foreach_get(pixels);rgba=pixels.reshape(-1,4);rgb=rgba[:,:3]
                blue=(rgb[:,2]>rgb[:,0]*1.13)&(rgb[:,2]>.06)
                luminance=rgb.max(axis=1)
                rgb[blue]=luminance[blue,None]*np.array(palette[1])[None,:]/max(palette[1])
                pale=(rgb.min(axis=1)>.45)&~blue
                rgb[pale]*=np.array(palette[0])[None,:]
                rgba[:,3]=1;img.pixels.foreach_set(pixels)
                cache=ROOT/'.local/characters-ming-20260927'/f'{cid}-cloth-{len(images)}-{high}.jpg'
                img.filepath_raw=str(cache);img.file_format='JPEG';img.save()
                img=bpy.data.images.load(str(cache),check_existing=False);img.pack();images[original]=img
            node.image=images[original]
        for node in mat.node_tree.nodes:
            if node.type=='TEX_IMAGE' and node.image and not high and max(node.image.size)>1024:node.image.scale(1024,1024)
    shoulder=anatomy.joints['joint-l-shoulder'];upper=(shoulder-anatomy.joints['joint-l-elbow']).length
    height=anatomy.design['anatomy']['height'];scale=shoulder.x/.185
    arm_length=upper+anatomy.fore_length
    rig=create_cloth_rig(cid,anatomy,body)
    for obj in clothes:
        # Prepared asset deliberately exports Y-up coordinates without conversion.
        matname=obj.get('sourceMaterial','');world=obj.matrix_world.copy()
        obj.parent=body;obj.matrix_world=Matrix.Identity(4)
        obj.name=cid+'_ming_'+matname
        for mat in obj.data.materials:
            mat.use_backface_culling=True
            bsdf=mat.node_tree.nodes.get('Principled BSDF')
            for socket in ['Alpha','Emission Color']:
                if bsdf:
                    for link in list(bsdf.inputs[socket].links):mat.node_tree.links.remove(link)
            if bsdf:
                bsdf.inputs['Alpha'].default_value=1
                bsdf.inputs['Emission Color'].default_value=(0,0,0,1)
                bsdf.inputs['Roughness'].default_value=.65
        groups={n:obj.vertex_groups.new(name=n) for n in [cid+'_clothBody']+[cid+'_cloth_'+p for p in ['leftArm','rightArm','leftForearm','rightForearm']]}
        for v in obj.data.vertices:
            p=world@v.co
            # Importer rotates a glTF Y-up mesh into Blender Z-up.
            src=Vector((p.x,p.z,-p.y));side=1 if src.x>0 else -1
            threshold=.135+.055*(1-smooth((src.y-1.10)/.30))
            arm_w=smooth((abs(src.x)-threshold)/.08) if matname.startswith('12_front') else 0
            pivot=Vector((side*.185,1.425,0));relative=src-pivot
            rotated=Matrix.Rotation(-side*.40,3,'Z')@relative
            arm_p=Vector((side*shoulder.x+rotated.x*scale,shoulder.y+rotated.y*(arm_length/.65),shoulder.z+src.z*scale))
            # Preserve jacket length and the high skirt waistband, while locating
            # the standing collar at the actual body neck rather than head height.
            knots=[(0,.055),(.96,height*.50),(1.10,height*.585),(1.425,shoulder.y),(1.548,anatomy.joints['joint-neck'].y+.018)]
            y=src.y
            for (a,b),(c,d) in zip(knots,knots[1:]):
                if src.y<=c:y=b+(src.y-a)/(c-a)*(d-b);break
            else:y=knots[-1][1]+(src.y-knots[-1][0])*scale
            torso=Vector((src.x*scale,y,src.z*scale))
            v.co=torso.lerp(arm_p,arm_w)
            # Close the shoulder transition with continuously weighted cloth.
            fore_w=smooth((shoulder.y-upper+.055-v.co.y)/.11)
            label='right' if side>0 else 'left'
            weights={cid+'_clothBody':1-arm_w,cid+'_cloth_'+label+'Arm':arm_w*(1-fore_w),cid+'_cloth_'+label+'Forearm':arm_w*fore_w}
            for name,w in weights.items():
                if w>0:groups[name].add([v.index],w,'REPLACE')
        obj.data.normals_split_custom_set([(0,0,0)]*len(obj.data.loops))
        obj.data.update()
        bpy.context.view_layer.objects.active=obj
        if not high:
            dec=obj.modifiers.new('Mobile garment detail','DECIMATE');dec.ratio=.35;bpy.ops.object.modifier_apply(modifier=dec.name)
        mod=obj.modifiers.new('Continuous cloth skinning','ARMATURE');mod.object=rig
        for p in obj.data.polygons:p.use_smooth=True
    for obj in imported:
        if obj.type!='MESH':bpy.data.objects.remove(obj,do_unlink=True)
    return rig,clothes

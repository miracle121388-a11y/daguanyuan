"""Tactile joinery in the existing study and planted court margins.

Fixtures and wear are modeled interpretation; no invented literary quotations.
"""
import math
import interior_craft as craft
import r8_courtyard as courtyard
import spatial_world as world
import refined_modules as arch
from reference_world import transform


def install():
    from r12_botany import install as install_botany
    install_botany()
    old_desk=craft.desk
    def desk(b,x,y,z=1.5,w=4,d=1.3,marble=False):
        old_desk(b,x,y,z,w,d,marble)
        # Recessed drawer boards sit within the apron and carry real pulls.
        for side in [-1,1]:
            xx=x+side*w*.25;ww=w*.38
            b.box('darkwood',(xx,y-d/2-.006,z-.19),(ww+.05,.025,.19))
            b.box('furniture',(xx,y-d/2-.029,z-.19),(ww,.026,.155))
            for dx in [-.08,.08]:b.rod('gold',(xx+dx,y-d/2-.045,z-.19),(xx+dx,y-d/2-.084,z-.19),.009,8)
            b.rod('gold',(xx-.08,y-d/2-.084,z-.19),(xx+.08,y-d/2-.084,z-.19),.011,12)
        # A soft folded cloth: 3D drape and hems, distinct from polished wood.
        verts=[]
        for j in range(9):
            for i in range(13):
                u=i/12;v=j/8
                verts.append((x-w*.39+u*.55,y-.42+v*.36,z+.074+.011*math.sin(u*math.tau*2)+.006*math.sin(v*9+u*6)))
        b.mesh('bookcloth',verts,[(j*13+i,j*13+i+1,(j+1)*13+i+1,(j+1)*13+i) for j in range(8) for i in range(12)])
        # Closed storage lives against the study wall, clear of the seated camera.
    craft.desk=desk
    arch.desk=desk

    old_court=world.courtyard
    def planted_court(b,style):
        old_court(b,style)
        if style!='bamboo':return
        # Low plants rise gradually toward the original tall bamboo edge.
        for side in [-1,1]:
            for j in range(12):
                x=side*(5.2+.55*math.sin(j*2.1));y=-10+j*.93
                courtyard.fern(b,x,y,.9+.3*math.sin(j*1.7)**2,1200+j)
        # A low enclosed cabinet and a small ceramic group give the room depth.
        b.box('furniture',(-4.5,9.85,1.02),(1.8,.72,.84))
        b.box('darkwood',(-4.5,9.46,1.03),(1.7,.065,.65))
        for side in [-1,1]:
            xx=-4.5+side*.42
            b.box('furniture',(xx,9.40,1.03),(.79,.05,.59))
            b.rod('gold',(xx-side*.28,9.365,.99),(xx-side*.28,9.365,1.07),.014,12)
        for dx in [-.76,.76]:
            for dy in [-.27,.27]:b.box('darkwood',(-4.5+dx,9.85+dy,.67),(.10,.1,.30))
        arch.vase(b,-5.0,9.82,1.45,.19,'ceramic')
        transform(b,lambda:craft.bound_book(b,0,0,1.45,.45,.32,.06,9),(-4.26,9.8,0),.07)
    world.courtyard=planted_court
    import focal_botany,court_planting
    focal_botany.install()
    court_planting.install()

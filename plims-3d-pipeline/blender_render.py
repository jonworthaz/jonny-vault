import bpy, math
from mathutils import Vector
OUT="./plims_blender.png"
bpy.ops.wm.read_factory_settings(use_empty=True); sc=bpy.context.scene
half=[(-3.05,0.02),(-2.98,0.42),(-2.72,0.66),(-2.30,0.74),(-1.75,0.70),
      (-1.10,0.80),(-0.35,0.98),(0.45,1.08),(1.25,1.07),(1.95,0.97),
      (2.55,0.78),(2.92,0.48),(3.08,0.10)]
loop=half+[(x,-y) for (x,y) in reversed(half[1:-1])]; n=len(loop)
def mk(name,verts,faces):
    me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.update()
    ob=bpy.data.objects.new(name,me); sc.collection.objects.link(ob)
    for p in me.polygons: p.use_smooth=True
    return ob
def simple(name,base,rough,coat=0,sheen=0):
    m=bpy.data.materials.new(name); m.use_nodes=True; b=m.node_tree.nodes.get("Principled BSDF"); I=b.inputs
    I["Base Color"].default_value=(*base,1); I["Roughness"].default_value=rough
    if "Coat Weight" in I: I["Coat Weight"].default_value=coat
    if "Sheen Weight" in I: I["Sheen Weight"].default_value=sheen
    return m
def canvas_mat():
    m=bpy.data.materials.new("canvas"); m.use_nodes=True; nt=m.node_tree; N=nt.nodes; L=nt.links
    b=N.get("Principled BSDF"); I=b.inputs
    I["Base Color"].default_value=(0.91,0.88,0.80,1); I["Roughness"].default_value=0.92
    if "Sheen Weight" in I: I["Sheen Weight"].default_value=0.6
    tc=N.new("ShaderNodeTexCoord"); mp=N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value=(42,42,42)
    L.new(tc.outputs["Object"],mp.inputs["Vector"])
    w1=N.new("ShaderNodeTexWave"); w1.wave_type='BANDS'; w1.bands_direction='X'; w1.inputs["Scale"].default_value=1.0; w1.inputs["Distortion"].default_value=0.0
    w2=N.new("ShaderNodeTexWave"); w2.wave_type='BANDS'; w2.bands_direction='Y'; w2.inputs["Scale"].default_value=1.0; w2.inputs["Distortion"].default_value=0.0
    L.new(mp.outputs["Vector"],w1.inputs["Vector"]); L.new(mp.outputs["Vector"],w2.inputs["Vector"])
    mul=N.new("ShaderNodeMath"); mul.operation='MULTIPLY'
    L.new(w1.outputs["Fac"],mul.inputs[0]); L.new(w2.outputs["Fac"],mul.inputs[1])
    bump=N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value=0.7; bump.inputs["Distance"].default_value=0.11
    L.new(mul.outputs["Value"],bump.inputs["Height"]); L.new(bump.outputs["Normal"],b.inputs["Normal"])
    return m

SOLE_TOP=0.62; STRIPE_TOP=0.86
# sole
sv=[(x,y,0.0) for (x,y) in loop]+[(x,y,SOLE_TOP) for (x,y) in loop]
sf=[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]+[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
sole=mk("Sole",sv,sf); bv=sole.modifiers.new("b","BEVEL"); bv.width=0.12; bv.segments=3; bv.limit_method='ANGLE'
# stripe
tv=[(x*1.03,y*1.03,STRIPE_TOP-0.04) for (x,y) in loop]+[(x*1.03,y*1.03,STRIPE_TOP) for (x,y) in loop]
tf=[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]+[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
stripe=mk("Stripe",tv,tf); sbv=stripe.modifiers.new("b","BEVEL"); sbv.width=0.03; sbv.segments=2; sbv.limit_method='ANGLE'
# upper
def wA(x):
    w=0;best=1e9;wb=0
    for (px,py) in loop:
        d=abs(px-x)
        if d<0.2: w=max(w,abs(py))
        if d<best: best=d; wb=abs(py)
    return (w or wb)*0.9
kp=[(3.02,0.12),(2.5,0.5),(1.6,0.92),(0.7,1.16),(-0.2,1.3),(-1.0,1.24),(-1.8,1.02),(-2.4,0.74),(-3.0,0.56)]
def hp(x):
    if x>=kp[0][0]:return kp[0][1]
    if x<=kp[-1][0]:return kp[-1][1]
    for i in range(len(kp)-1):
        if x<=kp[i][0] and x>=kp[i+1][0]:
            t=(x-kp[i][0])/(kp[i+1][0]-kp[i][0]);s=t*t*(3-2*t);return kp[i][1]+(kp[i+1][1]-kp[i][1])*s
    return .5
def dip(x,th):
    if x>0.7 or x<-2.5:return 1
    top=max(0,1-abs(th-math.pi/2)/(math.pi*0.4));return 1-0.48*top
M=104;Nt=60;y0=0.6;uv=[]
for s in range(M+1):
    x=3.02+(-3.0-3.02)*(s/M);w=wA(x);h=hp(x)
    for a in range(Nt+1):
        th=math.pi*(a/Nt);uv.append((x,w*math.cos(th),y0+h*math.sin(th)*dip(x,th)))
uf=[]
for s in range(M):
    for a in range(Nt):
        uf.append((s*(Nt+1)+a,s*(Nt+1)+a+1,(s+1)*(Nt+1)+a+1,(s+1)*(Nt+1)+a))
upper=mk("Upper",uv,uf)
upper.modifiers.new("sm","SMOOTH").iterations=16
ss=upper.modifiers.new("ss","SUBSURF"); ss.levels=3; ss.render_levels=3

# ---- STITCHING along the foxing seam ----
def box(cx,cy,cz,ang,hl,hw,ht,V,F):
    o=len(V); c=math.cos(ang); s=math.sin(ang)
    for (lx,ly,lz) in [(-hl,-hw,-ht),(hl,-hw,-ht),(hl,hw,-ht),(-hl,hw,-ht),(-hl,-hw,ht),(hl,-hw,ht),(hl,hw,ht),(-hl,hw,ht)]:
        V.append((cx+lx*c-ly*s, cy+lx*s+ly*c, cz+lz))
    for f in [(0,1,2,3),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]:
        F.append(tuple(o+i for i in f))
# resample loop by arc length at scale ~0.92, z near stripe top
pts=[Vector((x*0.92,y*0.92,0)) for (x,y) in loop]
segs=[(pts[i],pts[(i+1)%n],(pts[(i+1)%n]-pts[i]).length) for i in range(n)]
total=sum(L for _,_,L in segs); SV=[];SF=[]; d=0; spacing=0.20
while d<total-1e-6:
    dd=d
    for a,b,L in segs:
        if dd<=L:
            t=dd/L; p=a.lerp(b,t); tng=(b-a).normalized(); ang=math.atan2(tng.y,tng.x)
            box(p.x,p.y,0.96,ang,0.07,0.02,0.02,SV,SF); break
        dd-=L
    d+=spacing
# toe-cap seam stitching (arch at a toe station)
xt=2.05; wt=wA(xt); ht=hp(xt)
for a in range(7,Nt-6,2):
    th=math.pi*(a/Nt); yv=wt*math.cos(th)*0.99; zv=y0+ht*math.sin(th)*dip(xt,th)+0.035
    box(xt,yv,zv,math.pi/2,0.055,0.017,0.017,SV,SF)
stitch=mk("Stitch",SV,SF)

# materials
sole.data.materials.append(simple("rubber",(0.028,0.032,0.038),0.42,coat=0.3))
stripe.data.materials.append(simple("persimmon",(0.88,0.33,0.23),0.38,coat=0.35))
upper.data.materials.append(canvas_mat())
stitch.data.materials.append(simple("thread",(0.77,0.73,0.63),0.65))

# world + lights + floor + cam
w=bpy.data.worlds.new("W"); sc.world=w; w.use_nodes=True
w.node_tree.nodes.get("Background").inputs[0].default_value=(0.86,0.87,0.89,1)
w.node_tree.nodes.get("Background").inputs[1].default_value=0.55
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-0.02)); bpy.context.active_object.data.materials.append(simple("floor",(0.92,0.92,0.9),0.55))
bpy.ops.object.empty_add(location=(0,0,0.9)); tgt=bpy.context.active_object
def area(loc,en,size):
    bpy.ops.object.light_add(type='AREA',location=loc);Lo=bpy.context.active_object;Lo.data.energy=en;Lo.data.size=size
    c=Lo.constraints.new('TRACK_TO');c.target=tgt;c.track_axis='TRACK_NEGATIVE_Z';c.up_axis='UP_Y'
area((6,-7,9),2600,9); area((-8,-2,5),900,12); area((-3,8,7),1400,9)
bpy.ops.object.camera_add(location=(8.5,-10.5,5.2)); cam=bpy.context.active_object; sc.camera=cam
cc=cam.constraints.new('TRACK_TO'); cc.target=tgt; cc.track_axis='TRACK_NEGATIVE_Z'; cc.up_axis='UP_Y'; cam.data.lens=72
sc.render.engine='CYCLES'; sc.cycles.device='CPU'; sc.cycles.samples=120; sc.cycles.use_denoising=True
sc.render.resolution_x=1000; sc.render.resolution_y=720; sc.render.filepath=OUT
import time;t0=time.time();bpy.ops.render.render(write_still=True);print("RENDER_DONE %.1fs"%(time.time()-t0))

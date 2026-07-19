import cadquery as cq
from cadquery import exporters
import math, traceback
OUT="."
S=44.0  # -> ~270mm length (UK7)
half=[(-3.05,0.02),(-2.98,0.42),(-2.72,0.66),(-2.30,0.74),(-1.75,0.70),
      (-1.10,0.80),(-0.35,0.98),(0.45,1.08),(1.25,1.07),(1.95,0.97),
      (2.55,0.78),(2.92,0.48),(3.08,0.10)]
loop=half+[(x,-y) for (x,y) in reversed(half[1:-1])]
loop_mm=[(x*S,y*S) for (x,y) in loop]
res={}
try:
    H=26.0
    sole=cq.Workplane("XY").spline(loop_mm, periodic=True).close().extrude(H)
    # toe spring: cut bottom-front with a big cylinder (axis along Y)
    R=520.0; cxx=120.0; ctop=9.0
    cyl=(cq.Workplane("XZ").workplane(offset=-200).center(cxx,-R+ctop).circle(R).extrude(400))
    sole=sole.cut(cyl)
    # heel bevel: small cylinder at back bottom
    R2=380.0; sole=sole.cut(cq.Workplane("XZ").workplane(offset=-200).center(-125,-R2+7).circle(R2).extrude(400))
    # round the top perimeter (foxing) - try, skip on failure
    for sel,r in [(">Z",3.0)]:
        try: sole=sole.edges(sel).fillet(r)
        except Exception as e: res["fillet_"+sel]="skip"
    exporters.export(sole, f"{OUT}/sole2.step")
    exporters.export(sole, f"{OUT}/sole2.stl")
    for name,pdir in [("side",(0,-1,0.0001)),("top",(0,0.0001,1)),("front",(1,0.0001,0)),("iso",(1,-1,0.8))]:
        exporters.export(sole, f"{OUT}/v_{name}.svg", exportType="SVG",
            opt={"projectionDir":pdir,"showAxes":False,"strokeWidth":0.6,"width":1000,
                 "marginLeft":40,"marginTop":40,"showHidden":False,"strokeColor":(32,36,42)})
    bb=sole.val().BoundingBox()
    res["ok"]=True; res["bbox_mm"]=[round(bb.xlen,1),round(bb.ylen,1),round(bb.zlen,1)]
except Exception as e:
    res["error"]=str(e); res["tb"]=traceback.format_exc()[-800:]
print(res)

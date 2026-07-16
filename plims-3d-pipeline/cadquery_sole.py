import cadquery as cq
from cadquery import exporters
import traceback
OUT="/tmp/claude-0/-home-user-jonny-vault/a9061542-977a-59b5-b544-1df21a83ae98/scratchpad/cad"
SCALE=10.0
half=[(-3.05,0.02),(-2.98,0.42),(-2.72,0.66),(-2.30,0.74),(-1.75,0.70),
      (-1.10,0.80),(-0.35,0.98),(0.45,1.08),(1.25,1.07),(1.95,0.97),
      (2.55,0.78),(2.92,0.48),(3.08,0.10)]
loop=half+[(x,-y) for (x,y) in reversed(half[1:-1])]
loop_mm=[(x*SCALE,y*SCALE) for (x,y) in loop]
res={}
try:
    sole=(cq.Workplane("XY").spline(loop_mm, periodic=True).close().extrude(28))
    exporters.export(sole, f"{OUT}/plims_sole.step")
    exporters.export(sole, f"{OUT}/plims_sole.stl")
    views={"side":(0,-1,0.0001),"top":(0,0.0001,1),"front":(1,0,0.0001)}
    for name,pdir in views.items():
        exporters.export(sole, f"{OUT}/sole_{name}.svg", exportType="SVG",
            opt={"projectionDir":pdir,"showAxes":False,"strokeWidth":0.5,
                 "width":900,"marginLeft":40,"marginTop":40,
                 "showHidden":False,"strokeColor":(32,36,42)})
    bb=sole.val().BoundingBox()
    res["ok"]=True; res["bbox_mm"]=[round(bb.xlen,1),round(bb.ylen,1),round(bb.zlen,1)]
except Exception as e:
    res["error"]=str(e); res["tb"]=traceback.format_exc()
print(res)

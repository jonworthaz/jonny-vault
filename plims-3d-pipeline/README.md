# plims — 3D / CAD pipeline

Reproducible scripts for the plims footwear 3D + CAD work. Two engines, both
driven from Python and runnable headless (no GUI, no cloud service):

| Script | Engine | Produces |
|---|---|---|
| [`cadquery_sole.py`](./cadquery_sole.py) | **CadQuery 2.8** (OpenCascade) | A real **solid** sole → `plims_sole.step`, `plims_sole.stl`, and projected technical drawings (`sole_side/top/front.svg`) |
| [`blender_render.py`](./blender_render.py) | **Blender `bpy` 5.0** (Cycles) | A shaded plimsoll render → `plims_blender.png` (woven-canvas material, topstitch geometry, rubber sole, persimmon foxing stripe) |

Sample outputs committed here: [`plims_sole.step`](./plims_sole.step) (open in any
CAD app), [`sole_top.svg`](./sole_top.svg) (real CAD-projected footprint),
[`sample_render.png`](./sample_render.png).

## Setup

```bash
pip install cadquery bpy       # cadquery 2.8+, bpy 5.0 (Python 3.11)
```

## Run

```bash
python cadquery_sole.py        # → STEP + STL + SVG technical views
python blender_render.py       # → Cycles render PNG (~60s on CPU)
```

Both scripts write to the working directory (paths are relative).

## What this is — and isn't

- **Real:** the CAD solid (STEP/STL, factory-openable), the projected 2D
  drawings, and the Cycles render pipeline (materials, procedural canvas weave,
  stitch geometry, studio lighting).
- **Stylised:** the *geometry* is generated procedurally, so the upper is smooth
  but "pillowy" — no true toe-cap or heel-counter. Procedural code has a ceiling
  for organic footwear.

## The upgrade path to photoreal

The engine is done; the missing inputs are assets. Drop these in and
`blender_render.py` renders them for real:

1. **A real mesh** — a footwear designer's `.glb`/`.obj`, or a **phone scan**
   (Polycam / KIRI Engine) of an actual plimsoll. Biggest single unlock.
2. **PBR texture maps** — canvas / knit / rubber (albedo + normal + roughness),
   e.g. CC0 from ambientCG or Poly Haven.
3. **An HDRI** — a studio `.hdr` (Poly Haven) for real reflections + lighting.

## Related

- Interactive web viewer (Three.js, self-contained): [`../plims-3d.html`](../plims-3d.html)
- 2D tech pack (6 styles, flats, specs): [`../plims-tech-pack.html`](../plims-tech-pack.html)
- Footwear consultant agent spec: [`../shoemaker-consultant-agent.md`](../shoemaker-consultant-agent.md)

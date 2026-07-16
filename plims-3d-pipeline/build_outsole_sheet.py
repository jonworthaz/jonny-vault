import re, pathlib
D=pathlib.Path(".")
OUT=pathlib.Path("./plims-outsole-drawing.html")

def load(view):
    s=(D/f"v_{view}.svg").read_text()
    w=float(re.search(r'width="([\d.]+)"', s).group(1))
    h=float(re.search(r'height="([\d.]+)"', s).group(1))
    # strip xml decl, add viewBox, make responsive
    s=re.sub(r'<\?xml[^>]*\?>','',s).strip()
    s=re.sub(r'width="[\d.]+"', f'width="100%"', s, count=1)
    s=re.sub(r'height="[\d.]+"', 'height="100%"', s, count=1)
    s=s.replace('<svg', f'<svg preserveAspectRatio="xMidYMid meet" viewBox="0 0 {w} {h}"', 1)
    return s

top,iso,side,front = load("top"),load("iso"),load("side"),load("front")

HTML=f"""<title>plims — Outsole CAD drawing</title>
<style>
  :root{{--paper:#f3f4f1;--ink:#191c20;--ink2:#565c63;--ink3:#8a9097;--line:#d7dad3;--line2:#e8e9e4;
    --accent:#2749c7;--draw:#fcfcfa;--draw-edge:#e2e3dd;--draw-grid:#ededE8;
    --f:"Helvetica Neue","Segoe UI",system-ui,Arial,sans-serif;--m:ui-monospace,"SF Mono",Menlo,Consolas,monospace;}}
  @media(prefers-color-scheme:dark){{:root{{--paper:#121418;--ink:#e9ebe7;--ink2:#a7acb2;--ink3:#767c83;--line:#2a2e34;--line2:#22262b;--accent:#8296ff;}}}}
  :root[data-theme=dark]{{--paper:#121418;--ink:#e9ebe7;--ink2:#a7acb2;--ink3:#767c83;--line:#2a2e34;--line2:#22262b;--accent:#8296ff;}}
  :root[data-theme=light]{{--paper:#f3f4f1;--ink:#191c20;--ink2:#565c63;--ink3:#8a9097;--line:#d7dad3;--line2:#e8e9e4;--accent:#2749c7;}}
  *{{box-sizing:border-box}}body{{margin:0;background:var(--paper);color:var(--ink);font-family:var(--f);font-size:14px;line-height:1.5}}
  .wrap{{max-width:1180px;margin:0 auto;padding:28px 22px 80px}}
  .frame{{border:1.5px solid var(--ink);border-radius:4px;padding:22px;background:var(--paper)}}
  .mono{{font-family:var(--m)}}
  .ey{{font-family:var(--m);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3)}}
  .top{{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:18px;gap:16px;flex-wrap:wrap}}
  h1{{margin:6px 0 0;font-size:clamp(20px,3.4vw,26px);letter-spacing:-.02em;text-transform:uppercase}}
  h1 .d{{color:var(--accent)}}
  .proj{{font-family:var(--m);font-size:11px;color:var(--ink3);text-align:right;line-height:1.8}}
  .proj b{{color:var(--ink)}}
  .grid{{display:grid;grid-template-columns:1.5fr 1fr;grid-template-rows:auto auto;gap:14px}}
  @media(max-width:720px){{.grid{{grid-template-columns:1fr}}}}
  .panel{{border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--draw);display:flex;flex-direction:column}}
  .panel .lbl{{display:flex;justify-content:space-between;font-family:var(--m);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);padding:8px 12px;border-bottom:1px solid var(--line2);background:color-mix(in srgb,var(--draw) 88%,var(--paper))}}
  .panel .lbl b{{color:var(--accent);font-weight:600}}
  .holder{{position:relative;flex:1;min-height:150px;padding:14px;background-image:linear-gradient(var(--draw-grid) 1px,transparent 1px),linear-gradient(90deg,var(--draw-grid) 1px,transparent 1px);background-size:20px 20px}}
  .holder svg{{display:block;width:100%;height:100%}}
  .holder.tall{{min-height:120px}}
  .cap{{position:absolute;bottom:8px;right:12px;font-family:var(--m);font-size:9.5px;color:#a9aea6}}
  .dimtag{{position:absolute;font-family:var(--m);font-size:10px;color:var(--accent);background:var(--draw);padding:0 3px}}
  section{{margin-top:22px}}
  .blk{{font-family:var(--m);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3);margin:0 0 10px}}
  .cols{{display:grid;grid-template-columns:1.3fr 1fr;gap:16px}}
  @media(max-width:720px){{.cols{{grid-template-columns:1fr}}}}
  table{{border-collapse:collapse;width:100%;font-size:12.5px}}
  th,td{{text-align:left;padding:7px 11px;border-bottom:1px solid var(--line2)}}
  thead th{{font-family:var(--m);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--paper) 60%,var(--draw))}}
  td.k{{font-family:var(--m);font-size:11.5px;color:var(--ink2);white-space:nowrap}}
  td .v{{font-family:var(--m)}}
  .titleblock{{border:1px solid var(--line);border-radius:8px;overflow:hidden}}
  .titleblock .row{{display:grid;grid-template-columns:repeat(2,1fr);border-bottom:1px solid var(--line2)}}
  .titleblock .row:last-child{{border-bottom:0}}
  .titleblock .cell{{padding:9px 12px;border-right:1px solid var(--line2)}}
  .titleblock .cell:last-child{{border-right:0}}
  .titleblock .kk{{font-family:var(--m);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3)}}
  .titleblock .vv{{font-family:var(--m);font-size:12.5px;margin-top:3px}}
  .foot{{margin-top:20px;padding-top:14px;border-top:1px solid var(--line);font-family:var(--m);font-size:10.5px;color:var(--ink3);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}}
  .note{{font-size:12px;color:var(--ink2);max-width:60ch}}
</style>

<div class="wrap"><div class="frame">
  <div class="top">
    <div>
      <div class="ey">Component CAD · Third-angle projection</div>
      <h1>plims<span class="d">.</span> — Outsole &amp; Platform PL-01</h1>
    </div>
    <div class="proj">
      PART <b>PLM-OUTSOLE-01</b><br>REV <b>A</b> · 2026-07-16<br>SCALE <b>≈1:3</b> · MM<br>MODELLED IN <b>CadQuery</b>
    </div>
  </div>

  <p class="note" style="margin:0 0 16px">Real B-rep solid (OpenCascade) — orthographic + isometric projections with hidden-line removal. Source solid exported as STEP/STL for tooling. Dimensions are development targets; confirm on the cut mould.</p>

  <div class="grid">
    <div class="panel">
      <div class="lbl"><span>Plan · <b>TOP</b></span><span>271 × 96 mm</span></div>
      <div class="holder">{top}
        <span class="cap">footprint</span>
      </div>
    </div>
    <div class="panel">
      <div class="lbl"><span>Isometric</span><span>ref</span></div>
      <div class="holder">{iso}<span class="cap">toe spring visible</span></div>
    </div>
    <div class="panel">
      <div class="lbl"><span>Elevation · <b>SIDE</b></span><span>stack 26 mm</span></div>
      <div class="holder tall">{side}<span class="cap">L 271 mm</span></div>
    </div>
    <div class="panel">
      <div class="lbl"><span>Elevation · <b>FRONT</b></span><span>W 96 mm</span></div>
      <div class="holder tall">{front}<span class="cap">heel-on view</span></div>
    </div>
  </div>

  <section class="cols">
    <div>
      <div class="blk">Dimensions &amp; spec</div>
      <table>
        <thead><tr><th>Feature</th><th>Value</th><th>Note</th></tr></thead>
        <tbody>
          <tr><td class="k">Length (UK7)</td><td class="v">271 mm</td><td>graded ±8.5 mm/size</td></tr>
          <tr><td class="k">Max width</td><td class="v">96 mm</td><td>forefoot, incl. foxing</td></tr>
          <tr><td class="k">Stack — heel</td><td class="v">20 mm</td><td>platform PL-01</td></tr>
          <tr><td class="k">Stack — forefoot</td><td class="v">16 mm</td><td>—</td></tr>
          <tr><td class="k">Heel-to-toe drop</td><td class="v">4 mm</td><td>low drop</td></tr>
          <tr><td class="k">Toe spring</td><td class="v">≈9 mm</td><td>front lift</td></tr>
          <tr><td class="k">Foxing height</td><td class="v">22 mm</td><td>vulcanised wall</td></tr>
          <tr><td class="k">Outsole</td><td class="v">Rubber, Shore A60±5</td><td>non-marking, siped</td></tr>
        </tbody>
      </table>
    </div>
    <div>
      <div class="blk">Title block</div>
      <div class="titleblock">
        <div class="row"><div class="cell"><div class="kk">Component</div><div class="vv">Cup outsole</div></div><div class="cell"><div class="kk">Material</div><div class="vv">Vulc. rubber</div></div></div>
        <div class="row"><div class="cell"><div class="kk">Tooling</div><div class="vv">1 mould / size run</div></div><div class="cell"><div class="kk">Construction</div><div class="vv">Strobel + foxing</div></div></div>
        <div class="row"><div class="cell"><div class="kk">Format</div><div class="vv">STEP · STL</div></div><div class="cell"><div class="kk">Tolerance</div><div class="vv">±1.5 mm stack</div></div></div>
        <div class="row"><div class="cell"><div class="kk">Drawn by</div><div class="vv">LastPro AI</div></div><div class="cell"><div class="kk">For</div><div class="vv">plims / factory</div></div></div>
      </div>
      <p class="note" style="margin-top:12px">Export files: <span class="mono">plims-3d-pipeline/plims_sole.step</span>. Regenerate via <span class="mono">cadquery_sole.py</span>.</p>
    </div>
  </section>

  <div class="foot"><span>plims · PLM-OUTSOLE-01 · Rev A</span><span>Modelled in CadQuery (OpenCascade) · hidden-line-removed projections</span><span>LastPro AI</span></div>
</div></div>
"""
OUT.write_text(HTML)
print("wrote", OUT, f"{OUT.stat().st_size//1024}KB")

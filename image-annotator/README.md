# MarkUp — Image Annotation & Markup Tool

A lightweight, zero-dependency web tool for **marking up photos**: circle a
problem, highlight an area, draw on it, add text notes and numbered markers,
then **crop** and **save the result as a new image file**.

Built originally for a **car garage** workflow — photograph a car, circle the
parts that need changing, drop a numbered marker on each, and hand the customer
a clear annotated image plus an itemised report with estimated costs — but it
works for any "show me what's wrong" use case (property surveys, design review,
medical/teaching diagrams, bug reports, etc.).

## How to use

It runs entirely in the browser. Nothing is uploaded anywhere — every image
stays on your machine.

### Easiest: double-click the launcher (recommended — makes **Copy image** work)

- **macOS / Linux** → double-click **`start-mac-linux.command`**
- **Windows** → double-click **`start-windows.bat`**

A small window opens (leave it open) and the tool launches in your browser at
`http://localhost:8000`. Because it's served from `localhost`, the **Copy image**
button works reliably. Close that window when you're finished.

> Requires Python (already installed on most Macs/Linux; on Windows get it from
> [python.org](https://python.org) if prompted).

### Or just open the file

Double-click **`index.html`** (or `open index.html` on macOS / `xdg-open
index.html` on Linux). Everything works this way; **Copy image** works in most
modern browsers but can be blocked in some when opened as a bare file — if so,
use the launcher above (or **Save image**, which downloads the same picture).

## Features

| Tool | What it does |
|------|--------------|
| **Upload** | Pick a file, **drag & drop** onto the canvas, or **paste** (Ctrl/Cmd+V) an image |
| **Circle** | Drag to draw an ellipse around a problem |
| **1-click circle** | Turn it on, then **single-click** to drop a fixed-size circle exactly where you click. Size set by the *1-click circle size* slider |
| **Box** | Rectangle outline |
| **Highlight** | Semi-transparent colour wash over an area |
| **Arrow** | Point at a detail |
| **Draw** | Freehand pen |
| **Text box** | Click and type a note in a styled box — choose **box colour, text colour and corner radius** (default: white box, black text). Tick **Add arrow** to drag a leader line from the thing you're pointing at to where the box sits |
| **Number** | Drop auto-incrementing numbered markers (①②③…) that sync to the side panel |
| **Select** | Click an annotation to move it, recolour it, or delete it |
| **Pan** | Hand tool — drag to move the image around when zoomed in (or hold **Space** with any tool). Not the default. |

### Colour & line
- Seven quick **swatches** plus a **custom colour picker** for any colour you like.
- **Line thickness** slider controls stroke weight (and scales text size).
- Changing a swatch/colour while a mark is selected recolours that mark.

### Copy / paste out
- **Copy image** regenerates the flattened image (with all circles, notes etc.
  baked in) and puts it on your **clipboard** — paste straight into an email,
  chat, doc or ticket. (**Save image** still downloads a PNG.)

### Mobile & zoom
Fully responsive and touch-friendly:
- **Pinch to zoom** with two fingers, and **drag with two fingers to pan** — so
  you can zoom right in to mark up a small detail accurately, then zoom back out.
- One finger draws/annotates as normal.
- **Zoom buttons** (＋ ／ − ／ ⤢ fit-to-screen) sit in the corner of the canvas.
- On desktop: **Ctrl/Cmd + scroll** (or trackpad pinch) zooms; plain scroll pans.
- On phones the tools become a scrollable strip along the bottom, and the
  **Items** button (top right) slides in the markers/costs panel.

### Markers & costs panel
Each numbered marker gets a row in the right-hand panel where you add a **part
name**, a **note** (what's wrong / what to do) and an **estimated cost**. The
panel keeps a running **estimated total**.

### Crop & save
- **Crop** — drag a region, hit *Apply*; the image + annotations are baked into
  a new cropped picture you can keep annotating.
- **Save image** — downloads a flattened **PNG** with all markups burned in.
  Every save gets a **unique file name** (no overwrites), and if you've typed a
  **vehicle/job reference** in the top bar it's used in the file name —
  e.g. `ab12-cde-front-end-20260620-103045-01.png`.
- **Save as…** — choose the **file name and location** yourself via the
  browser's native save dialog (Chrome/Edge); elsewhere it asks for a name.
- **Export report (HTML)** — downloads a tidy report: the annotated image plus a
  table of every numbered item, its notes and costs, and the total.
- **Export spreadsheet (CSV)** — downloads the marked items as a `.csv` that
  opens straight in **Excel / Google Sheets** (job reference, each item's part
  name, notes and cost, plus the total).

### Shortcuts
`V` select · `G` / hold `Space` pan · `C` circle · `1` one-click circle ·
`R` box · `H` highlight · `A` arrow · `P` draw · `T` text box · `N` number ·
`Ctrl/Cmd+Z` undo · `Ctrl/Cmd+Shift+Z` / `Ctrl+Y` redo · `Delete` remove selected.

## Files
- `index.html` — markup / layout
- `styles.css` — styling
- `app.js` — the canvas annotation engine (no dependencies)

## Notes / possible next steps
- Everything is client-side; to share or store reports you'd add a backend.
- Annotations are vector objects re-rendered each frame, which is why undo/redo,
  move, recolour and "bake on crop/save" all work cleanly.
- Could add: resize handles for existing marks, saving an editable project file
  (JSON), blur/redact tool, and multi-image jobs.

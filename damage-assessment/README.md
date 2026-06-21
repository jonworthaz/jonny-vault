# Damage Assessment — multi-photo vehicle damage builder

A zero-dependency, single-page web tool for building a **vehicle damage
assessment across several photos**. Mark up each photo, attach part names,
notes and costs, then export one combined **PDF report** or **spreadsheet**
with a grand total. Pure vanilla JavaScript + HTML5 canvas — no build step,
no libraries, no CDN.

Open `index.html` in a browser to use it. (For clipboard "Copy image" on some
browsers you may need to serve the folder over `http://` — e.g.
`python3 -m http.server` — rather than opening the file directly.)

---

## Multi-photo workflow

1. **Add a photo** — click *Add photo*, or drag-and-drop / paste an image onto
   the canvas. The photo opens ready to mark up.
2. **Mark up the damage** using the tools (circle, box, highlight, arrow, draw,
   text, numbered markers).
3. **Name the photo** in the *Photo name* box at the top of the canvas
   (e.g. "Car front", "Car bonnet", "Car tyres"). The name appears under its
   filmstrip thumbnail and as a section heading in the report.
4. **Add more photos** — each new photo keeps its **own** annotations, undo/redo
   history, numbering counter and zoom/view. Use the **filmstrip** along the
   bottom of the canvas to switch between photos (the active one is highlighted).
   Hover a thumbnail and click ✕ to remove a photo.
5. **Record costs** in the *Marked items* panel (right side / ☰ Items on mobile)
   — each numbered item takes a part name, a note and an estimated cost.
6. **Export** a combined PDF report or CSV spreadsheet covering every photo,
   with per-photo subtotals and a grand total.

Switching photos automatically saves the current photo's work and restores the
one you switch to, so nothing is lost.

---

## Features

### Annotation tools
- **Select / move** — pick and drag any mark; recolour non-text marks via the swatches.
- **Pan** — drag the view when zoomed in (or hold **Space**).
- **Circle** (drag to size) and **1-click circle** (drop a fixed-size circle; size slider in the toolbar).
- **Box**, **Highlight**, **Arrow**, **Freehand draw**.
- **Text** notes with a coloured box, corner radius, and an optional leader arrow (drag from the target to where the box should sit).
- **Number** — drop numbered markers that become rows in the items panel.

### Auto-number every mark
- Toggle **Auto-number every mark** (off by default) in the toolbar.
- When **on**, *every* new annotation of any tool gets an auto-incrementing
  number badge plus a row in the items panel — just like the Number tool. The
  badge is drawn at the mark's top-left corner. The counter is per-photo.
- When **off**, only the Number tool creates numbered items (original behaviour).

### Naming
- Each photo has an editable name (default "Photo 1", "Photo 2", …, placeholder
  "e.g. Car front"). Shown in the name bar and under each filmstrip thumbnail.

### Vehicle details
- A collapsible **Vehicle details** bar (top-right toggle) captures the
  registration/reference, make, model, year and colour for the whole
  assessment. These appear in the PDF report header and the CSV. The
  registration stays in sync with the top-bar reference field.

### Currency
- Choose **Malaysian Ringgit (RM)** or **US Dollar ($)** in the items panel.
  Default is MYR. All totals, item rows, the CSV and the PDF report use the
  selected currency.

### Costs & totals
- The items panel shows a **per-photo total** and a **grand total across all
  photos**, updated live as you type costs.

### Zoom, pan & view
- Pinch to zoom and two-finger pan on touch devices; Ctrl/Cmd + wheel (or
  trackpad pinch) to zoom and plain wheel to pan on desktop; on-screen
  +/−/fit buttons. Each photo remembers its own zoom and position.

### Edit
- Per-photo **undo/redo** (toolbar buttons, floating buttons on the image, and
  Ctrl/Cmd+Z / Ctrl/Cmd+Y / Shift+Ctrl/Cmd+Z). Delete selected, clear all.

### Crop & save
- **Crop** applies to the current photo: it bakes the image + marks, crops the
  region, and replaces that photo's image in place.
- **Copy image** copies the flattened (annotated) current photo to the clipboard.
- **Save image** / **Save as…** download the flattened current photo as a PNG.
  File names are unique (vehicle reference + timestamp + counter).

---

## Exports

### Export spreadsheet (CSV)
One CSV covering **all photos**. Header carries the job reference and vehicle
details. Columns: **Photo name, #, Item / part, Notes, Estimated cost**. Rows are
grouped by photo, each photo has a **subtotal**, and the file ends with a
**GRAND TOTAL** across all photos. A UTF-8 BOM is included so Excel / Google
Sheets read symbols correctly. Uses the selected currency.

### Export PDF report
Builds a clean, print-ready combined HTML report and opens the browser's print
dialog — choose **"Save as PDF"**. For **each** photo, in order, it includes:
the photo name, the **flattened annotated image** (image with its marks baked
in, rendered off-screen), and a table of that photo's numbered items
(#, item, notes, cost) with a **per-photo subtotal**. The top shows the job /
vehicle reference, vehicle details and date; the report ends with a **grand
total** across all photos.

> If the browser blocks the pop-up used for printing, the report is downloaded
> as an HTML file instead — open it and print to PDF.

---

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| V | Select / move |
| G / Space | Pan (Space = hold to pan) |
| C | Circle |
| 1 | One-click circle |
| R | Box |
| H | Highlight |
| A | Arrow |
| P | Draw |
| T | Text |
| N | Number |
| Ctrl/Cmd+Z | Undo |
| Ctrl/Cmd+Y or Shift+Ctrl/Cmd+Z | Redo |
| Delete / Backspace | Delete selected |

---

## Architecture notes

- A `photos` array holds one record per photo:
  `{ id, name, image, annotations, nextId, nextNumber, selectedId, undoStack,
  redoStack, view }`.
- The module-level `state` (+ `view`) is the **active** photo's working set. The
  whole drawing / pointer / zoom engine operates only on `state.*` and `view`,
  unchanged from the original single-image tool.
- `commitCurrentPhoto()` copies `state` → `photos[activeIndex]`;
  `loadPhoto(i)` commits the current photo then restores another and re-renders.
- Adding a photo (upload / drop / paste) creates a new record and switches to it.
- Items are any annotation with a number (`a.n != null`) — that's the Number
  tool always, plus every mark when *Auto-number* is on.

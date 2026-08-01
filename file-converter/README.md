# File Converter

A self-contained, single-file **quick file converter** — part of the docked Toggle mini-app family
(shares the `markup-dock` shell: bottom-right launcher, compact pop-up panel, minimise `▾`,
maximise `⤢`, day/night theme). Accent: amber `#f59e0b`.

Drop, pick, or paste a file (or paste text / an image). It **detects the type** (by extension **and**
magic-byte sniffing), then offers **only the conversions it can genuinely perform in the browser** —
each producing a download (with a unique timestamped filename), a preview, and Copy where sensible.
Anything infeasible client-side is shown as a **labelled note, never a broken button**.

Everything runs **fully offline** except audio/video, which lazy-loads `ffmpeg.wasm` from a CDN on
first use (see below). No other network calls, CDNs, fonts, or fetches.

---

## Supported conversions (matrix)

| Category | Input | Produces | How |
|---|---|---|---|
| **Images** | PNG, JPEG, GIF, WebP, BMP | PNG · JPEG · WebP · BMP · GIF | `<canvas>` + `toBlob`; BMP & GIF via inline encoders |
| | SVG | PNG · JPEG · WebP · BMP · GIF | SVG drawn into canvas, then rasterised |
| **Text / data** | Markdown | HTML · Plain text | built-in Markdown subset |
| | HTML | Plain text | tag-strip + entity decode |
| | JSON | Pretty · Minify · CSV | `JSON.parse` + CSV writer |
| | CSV | JSON · TSV | quote-aware CSV parser |
| | TSV | CSV · JSON | " |
| | txt / xml / *any text* | Base64 encode/decode · URL encode/decode | utility buttons |
| **Audio / Video** | MP4 | WebM · Animated GIF · MP3 · WAV | **ffmpeg.wasm** (lazy) |
| | WebM | MP4 · Animated GIF · MP3 · WAV | " |
| | MOV, MKV | MP4 · MP3 · WAV | " |
| | MP3 | WAV | " |
| | WAV | MP3 | " |
| | OGG, M4A | MP3 · WAV | " |
| **3D / CAD** | STL (ASCII **or** binary) | OBJ | inline STL parser + OBJ writer |
| | OBJ | STL (ASCII) | inline OBJ parser + STL writer (computes normals) |
| | DXF | SVG | inline parser: `LINE`, `LWPOLYLINE`/`POLYLINE`, `CIRCLE`, `ARC` |

Quality slider (10–100%) applies to JPEG / WebP output.

### GIF output
Static, single-frame, **256-colour** GIF89a via an **embedded encoder** (median-cut colour
quantiser + a faithful inline LZW compressor). No CDN, no library.

### Audio / video (ffmpeg.wasm)
A/V conversions use **[ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) 0.11**, loaded from
`unpkg.com` the **first time** you press an A/V button (same lazy-load pattern as the Video
Stabiliser module — `createFFmpeg` + `corePath`, no COOP/COEP headers required).

- Needs **internet once** (then the browser caches it); the download is **heavy** (~25 MB core).
- Single-threaded — **short clips convert quickest**.
- Each run is wrapped in `try/catch`: if the engine can't load (offline) you get a clear
  *"needs internet the first time"* message and **all other categories keep working**.

---

## NOT convertible in-browser (labelled notes, not buttons)

| Type | Why | What to do |
|---|---|---|
| **DWG, STEP/STP, IGES, 3DS** | Real CAD kernels can't run in a browser | Use desktop CAD tools |
| **xlsx / xls** | Needs a full spreadsheet library | Export a **CSV** and convert that |
| **PDF** | Not feasible here | Use a desktop PDF app |
| **DOCX / DOC / PPTX / PPT** | Need desktop office tools | — |
| **HEIC / TIFF** | Browsers can't decode them | Convert to PNG/JPEG first (Preview / Photos / ImageMagick) |
| **ZIP** | Not a conversion target | Unzip locally |

These appear as greyed information notes when such a file is loaded — the app never shows a fake or
broken conversion button.

---

## Type detection

Detected by **file extension** and by **magic-byte sniffing** of the file's leading bytes for:
PNG, JPEG, GIF, WEBP, BMP, PDF, ZIP (incl. xlsx/docx which are ZIP under the hood), MP4/MOV/M4A
(ISO-BMFF `ftyp`), WEBM/MKV, MP3 (ID3 / frame sync), WAV, OGG, and SVG (leading-text sniff).
The info card shows the detected type and notes whether it was recognised *by content* or *by
extension*.

---

## Module contract

Implements the shared **Toggle module** contract (identical to `toggle-track` / `toggle-plan` /
`video-stabiliser`):

- **Posts** to the parent: `{ source:"toggle-module", module:"file-converter", type:"ready"|"open"|"close"|"change"|"export", … }`.
- **Accepts** host commands (both `{type:"module:xxx"}` and bare `{type:"xxx"}`): `open`, `close`,
  `setTheme{theme}`, `export`, `import`, `ping`.
- **Registers** `window.ToggleModules["file-converter"]` with
  `{ id, name, version, accent, open(), close(), setTheme(t), exportData(), importData(), on(cb) }`.
  (The module is stateless — files are transient — so `exportData()` returns a small descriptor and
  `importData()` is a no-op, keeping the contract shape consistent.)
- Dispatches `CustomEvent("togglemodule:change")` on activity.

`module.json`:

```json
{
  "id": "file-converter",
  "name": "File Converter",
  "version": "1.0",
  "accent": "#f59e0b",
  "entry": "index.html",
  "capabilities": ["open", "close", "setTheme"],
  "messageNamespace": "toggle-module"
}
```

### Size modes
Small launcher by default → click to open the compact panel → **maximise (⤢)** to
`min(920px, 96vw) × min(680px, 90vh)`. Append `?full=1` to the URL to open maximised.
Theme (day/night) is persisted to `localStorage`.

---

## Limits & notes

- Conversions are **in-memory** — large videos may exhaust browser memory; prefer short clips.
- GIF output is **static and 256-colour** (single frame; not animated from images).
- OBJ→STL **fan-triangulates** polygons and computes flat face normals; STL→OBJ **de-duplicates**
  vertices.
- DXF→SVG covers the common 2D entities only (`LINE`, `LWPOLYLINE`/`POLYLINE`, `CIRCLE`, `ARC`);
  blocks, text, splines, dimensions, layers/colours are not rendered.
- Markdown support is a **subset**: headings, bold/italic, inline code, fenced code blocks,
  unordered lists, links, horizontal rules, paragraphs.
- WebP/BMP clipboard **Copy** may be declined by some browsers (PNG is broadly supported); Download
  always works.
- The **only** external dependency is `ffmpeg.wasm`, and **only** on an A/V conversion. Images,
  text/data, 3D and detection are 100% offline.

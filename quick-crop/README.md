# Quick Crop — the world's fastest crop tool

A single-file, docked mini‑app for cropping an image and getting it onto your
clipboard (or disk) in seconds. Vanilla JS + HTML + CSS in one `index.html`,
**zero external dependencies, no CDNs, no network calls — fully offline.** Even
the GIF encoder is embedded inline.

It shares the `markup-dock` shell and the Toggle module contract used by
`toggle-track` / `toggle-plan`, so it drops into the same bottom‑right dock and
coexists with the other modules (everything is namespaced `qc*` / `.qc-`).

## The flow (paste → crop → copy in seconds)

1. Click the green ✂ launcher (bottom‑right) — or the panel auto‑opens the moment
   you give it an image.
2. **Get an image, instantly** — any of:
   - **Paste** with `Ctrl/⌘ V` (anywhere) — loads immediately and jumps straight
     into crop mode, panel maximised.
   - **Drag & drop** a file onto the panel (also accepts a dropped image URL or a
     `data:` image).
   - **Pick a file** with the 🖼 button.
3. A centred crop box (80% of the image, honouring the active aspect) appears with
   8 resize handles, a draggable interior, rule‑of‑thirds guides and a live dimmed
   overlay outside the selection. Live **W×H (in image pixels)** and **x/y**
   position show in the footer.
4. **Copy** (big primary button, `Enter`, `Ctrl/⌘ C`, or right‑click → Copy) puts
   the cropped PNG on your clipboard. A **Save ▾** menu writes a file.

No dialogs, no page reload, no round‑trips. That's the whole pitch: minimal
clicks.

## Shape presets

A compact row sets the selection shape and, where relevant, locks the aspect
ratio (aspect‑locked presets constrain every resize; **Free** is unconstrained):

| Preset | Behaviour |
|--------|-----------|
| **Free** | Freeform rectangle, no constraint |
| **1:1** | Square (locked) |
| **16:9 / 4:3 / 3:2** | Landscape ratios (locked) |
| **9:16** | Portrait (locked) |
| **◯ Circle/Ellipse** | Ellipse inscribed in the box — exports as **transparent PNG** |
| **▢ Rounded** | Rounded rectangle with a **radius slider** — exports as **transparent PNG** |

For **Circle/Ellipse** and **Rounded**, pixels outside the shape are transparent
in the export, so those default to PNG.

## Formats

Save from the **Save ▾** menu (last format is remembered):

- **PNG** — lossless, alpha. Best for shapes.
- **JPEG** — small, no alpha. Quality slider applies.
- **WEBP** — small, alpha. Quality slider applies. (Falls back with a notice if
  the browser can't encode WEBP.)
- **GIF** — produced by an **embedded GIF89a encoder** (no library). It is a
  **single static frame, quantised to 256 colours** via median‑cut with LZW
  compression.
- **BMP** — uncompressed 24‑bit.

Downloads use a unique name: `crop-YYYYMMDD-HHMMSS.ext`.

**Shapes + non‑alpha formats:** GIF, JPEG and BMP have no transparency. If you
save a circle/rounded crop as one of them, the area outside the shape is filled
with the **Fill** colour (pick it in the Save menu, default white) and a toast
warns you. For a transparent result, use PNG (or WEBP).

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Ctrl/⌘ V` | Paste image → crop |
| Arrow keys | Nudge selection 1px (`Alt`+arrow = 10px) |
| `Shift` + arrows | Resize selection (`Shift`+`Alt` = 10px) |
| `Enter` | Copy crop to clipboard |
| `Esc` | Reset selection to the full image |
| `Ctrl/⌘ C` | Copy crop to clipboard |

Right‑click the crop area for a context menu: **Copy**, **Copy & Save PNG**, and
**Save PNG / JPEG / WEBP / GIF / BMP**.

## Module contract

Matches the other Toggle modules exactly.

- **Posts to parent** (`window.parent.postMessage`) with
  `{ source:"toggle-module", module:"quick-crop", type }` where `type` is one of
  `ready | open | close | change | export`.
- **Accepts host commands** via `message` — both namespaced (`module:open`) and
  bare (`open`): `open`, `close`, `setTheme{theme}`, `ping`, `export`,
  `import{data}`.
- **Registers** `window.ToggleModules["quick-crop"]` with
  `{ id, name, version, accent, open(), close(), setTheme(t), exportData(),
  importData(obj), on(cb) }` and dispatches a `CustomEvent("togglemodule:change")`
  on every change.
- `module.json`:
  `{ id:"quick-crop", name:"Quick Crop", version:"1.0", accent:"#2bb673",
  entry:"index.html", capabilities:["open","close","setTheme"],
  messageNamespace:"toggle-module" }`.

`exportData` / `importData` persist the **minimal preferences** — last shape,
aspect ratio, corner radius, format, quality and fill colour — not image data
(use Copy/Save for pixels).

## Dock / size behaviour

- Collapsed → just the small ✂ launcher.
- Open → a compact panel; **Maximise (⤢)** expands to a comfortable working panel
  (`min(920px, 96vw)` × `min(680px, 90vh)`). Loading an image auto‑maximises.
- `?full=1` in the URL starts expanded.
- Day/night toggle (☀️/🌙), persisted to `localStorage` (`quick-crop:theme`);
  green accent `#2bb673` with a full light theme.
- The page is click‑through (`html,body{pointer-events:none}`); only the widget
  catches clicks, so it can sit over a host app.

## Limits & notes

- **Clipboard image copy needs a secure context** (https or `localhost`) and a
  browser that supports the async Clipboard API `ClipboardItem`. There's an
  `execCommand("copy")` fallback, but some browsers block it — in that case use
  Save. (Pasting an image *in* works everywhere.)
- **GIF is 256 colours, single frame** — expect banding on photos with many
  colours; that's inherent to the format, not a bug. PNG/WEBP are lossless/near‑
  lossless choices for those.
- WEBP encoding depends on the browser; if unavailable you get a notice.
- Dropping a remote `http(s)` image URL will attempt a network fetch (browser
  side) and may taint the canvas (cross‑origin) so Copy/Save can fail — `data:`
  URLs, pasted images and local files are the fully‑offline paths.
- Persistence stores preferences only, never the image.

All logic lives in the single inline `<script>` in `index.html`; the script
passes `node --check`, every id referenced by JS exists in the HTML, and the
embedded GIF encoder round‑trips exactly against a reference LZW decoder.

# Video Stabiliser

A self-contained, corner-docked mini-app that detects camera shake in a video and
(optionally) stabilises it. Part of the "Toggle" docked mini-app family — it shares
the `markup-dock` shell (bottom-right launcher FAB, click-through page, day/night
theme, maximise, module contract) and is namespaced under `vs*` ids / `vs-` classes
so it can live on the same page as the other modules.

Everything is inline in a single `index.html` (vanilla JS + HTML + CSS). The **only**
external dependency is **ffmpeg.wasm**, and it is lazy-loaded from a CDN the first time
you press **Stabilise** — nothing else ever touches the network.

## How it works

### 1. Load a video
File picker, drag-and-drop (anywhere on the panel), or paste a video file from the
clipboard. Accepts `mp4 / webm / mov / m4v / avi / mkv / ogv / 3gp` (anything the
browser `<video>` element can decode). Shows the clip with native controls plus its
filename, duration and resolution.

### 2. Offline shake detection (pure JS — no network, no ffmpeg)
Right after load the app analyses motion **entirely in-browser**:

- It seeks the `<video>` to 24–40 evenly-spaced timestamps and draws each frame into a
  small hidden `<canvas>` (160px wide, aspect-corrected).
- For each consecutive pair it computes the **mean absolute luma difference** per pixel.
- From the series it derives a **shake score 0–100** (mean motion weighted with a
  jitter / std-dev term so smooth pans score lower than genuine handheld shake), a plain
  verdict — e.g. *"⚠️ Significant camera shake detected — stabilising recommended"* vs
  *"✓ Looks fairly stable"* — and a tiny inline **sparkline** of per-interval motion.

This runs with zero network and works even if ffmpeg never loads.

### 3. Stabilise (ffmpeg.wasm, lazy-loaded)
The big **Stabilise** button loads **ffmpeg.wasm 0.11.x single-threaded** on first click:

- UMD build: `https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js`
- core: `corePath: "https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js"`

It uses the 0.11 API — `createFFmpeg({ log:false, corePath })` and `fetchFile` from the
same `@ffmpeg/ffmpeg` package. The 0.11 single-threaded core does **not** require
`SharedArrayBuffer` / COOP+COEP headers, so it works on plain static hosting like
**GitHub Pages** (which cannot set those headers).

The filter run is roughly:

```
ffmpeg -i in.<ext> -vf deshake -preset ultrafast -c:a copy out.mp4
```

If the audio copy is rejected by the mp4 muxer it automatically retries with
`-c:a aac`. Progress is shown from ffmpeg's `setProgress` ratio, and the result becomes
a Blob URL.

**Why `deshake` and not libvidstab?** The high-quality path is a two-pass
`vidstabdetect` → `vidstabtransform` (libvidstab) pipeline, but **libvidstab is usually
not compiled into the prebuilt ffmpeg.wasm cores**, so we use ffmpeg's built-in
**`deshake`** filter. It is a single-pass, best-effort stabiliser — good for light-to-
moderate handheld wobble, not a substitute for full libvidstab or optical stabilisation.

**Graceful degradation:** all ffmpeg use is wrapped in try/catch. If the engine can't
load (offline / CDN blocked) or errors, you get a clear message
(*"Stabilisation engine couldn't load — needs internet the first time"*) and detection,
comparison and the library keep working. The button shows a spinner while running and a
cancel flag stops it between stages.

### 4. Before / After comparison
The original ("Before") and stabilised ("After") clips show side by side (they stack
vertically on narrow screens). A **single transport** — one play/pause button and one
seek scrubber — drives both videos and keeps them time-aligned (After is nudged back
into sync if it drifts more than 0.25s).

### 5. Save for future viewing (IndexedDB)
**Save result** stores the stabilised **Blob in IndexedDB** as
`{id, name, createdAt, size, thumbnailDataURL, origName, blob}` (the thumbnail is a
small JPEG grabbed ~10% into the clip). The **Library** panel lists saved results with
thumbnail + name + date and persists across reloads. Clicking one reloads it into the
**After** slot; **⬇** downloads the file to disk; **✕** deletes it. IndexedDB is
guarded in try/catch — if it's unavailable the app degrades to in-memory storage and
download-only, with a clear note.

### 6. AI-optional hook (default OFF — never fakes AI)
An **✨ AI assist** control appears only when an AI bridge is detected: either
`window.ToggleAI.analyse(...)` exists, or the host has posted `{type:"ai:available"}`.
When present, it calls
`window.ToggleAI.analyse({ module, shakeScore, motion, duration, resolution })` and shows
whatever recommendation the bridge returns. When absent it stays hidden, and if invoked
without a real bridge it says *"AI not connected — using local tools only"*. It never
invents AI output.

## Module contract

Identical to the rest of the family (see `toggle-track` / `toggle-plan`):

- **On load** posts `{source:"toggle-module", module:"video-stabiliser", type:"ready", name, version, accent}`
  to the parent, and also posts `{...type:"open"|"close"|"change"}` on those events.
- **Listens** on `window` `message` for host commands, accepting both `module:xxx` and
  bare `xxx`: `open`, `close`, `setTheme{theme}`, `ping`, `export`, `import`, and
  `ai:available`.
- **Registers** `window.ToggleModules["video-stabiliser"] = {id, name, version, accent,
  open(), close(), setTheme(t), exportData(), importData(obj), on(cb)}` and dispatches a
  `CustomEvent("togglemodule:change")` on every change.
- `exportData()` / `importData()` operate on the **library index** (metadata + thumbnails
  only) so the JSON stays small and portable; the heavy video blobs live in IndexedDB.

`module.json` carries the manifest: `id`, `name`, `version`, `accent:#12b5a6`,
`entry:index.html`, `capabilities[]`, `messageNamespace:"toggle-module"`.

## Sizing

Starts as the small dock launcher. **⤢ Maximise** expands to a large working panel
(`min(1040px, 96vw)` × `min(720px, 90vh)`) because video needs room. `?full=1` in the
URL starts expanded.

## Known limits

- **`deshake` is basic.** It corrects light/moderate handheld shake only; strong shake,
  rolling shutter, or big low-frequency drift are beyond it. Proper two-pass libvidstab
  would be better but isn't in the prebuilt wasm cores.
- **ffmpeg.wasm is heavy and single-threaded.** It downloads ~25MB of wasm on first use
  (cached by the browser afterwards) and transcodes in the main thread — **short clips
  work best**; long / high-resolution videos are slow and memory-hungry.
- **Internet needed once** for the CDN fetch; everything else (load, detect, compare a
  previously-saved item, library, theme) works fully offline.
- **Detection samples ~24–40 frames**, not every frame — it's a fast heuristic, not a
  frame-exact motion analysis, and can be fooled by scene cuts or heavy in-frame motion
  (a busy scene reads as "movement").
- **Output is always MP4 (H.264/AAC).**
- Some browsers throttle/limit rapid `<video>` seeking; a safety timeout keeps analysis
  from hanging if a seek stalls (it just analyses fewer intervals).
- `exportData()` exports the library **index only** — the actual video blobs are not in
  the JSON (they'd be huge); use each item's **Download** to keep the files.

## Verification

- The inline `<script>` passes `node --check`.
- Every id referenced by JS exists in the HTML.
- The only external resources are the two ffmpeg.wasm CDN URLs, loaded only on the first
  Stabilise click — never at page load.

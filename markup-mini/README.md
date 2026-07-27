# Quick MarkUp — mini overlay

A **single-file, self-contained** cut-down version of the MarkUp tool, designed
to drop into a bigger app as a **quick-menu overlay**. Core markup only, small
footprint, panel at ~90% opacity so the host app faintly shows through.

## What it keeps (~90% of the everyday markup)
Upload / paste / drag an image, then **circle, box, highlight, arrow, freehand
draw, text and numbered markers**, with a colour row, thickness slider, undo,
clear, **copy image** and **save PNG**, plus a day/night toggle.

## What it drops (to stay small)
Crop, save-as, zoom/pan, multi-photo, item/cost panels, and PDF/CSV/Excel
reports. Use the full tools for those:
- Full single-image: `/markup/`
- Multi-photo damage assessment: `/damage-assessment/`

## Add it to your superapp

**Easiest — iframe:**
```html
<iframe src="https://jonworthaz.github.io/jonny-vault/markup-mini/"
        style="position:fixed;inset:0;border:0;width:100%;height:100%;z-index:9999"
        allow="clipboard-write"></iframe>
```
The overlay already dims the background and centres its panel. The close (✕)
button hides the overlay and posts `window.parent.postMessage({type:"quickmarkup:close"})`
so the host can remove the iframe.

**Or inline:** copy the `.mini-overlay` markup plus the `<style>` and `<script>`
blocks from `index.html` straight into your app. Everything is namespaced under
`mini-*` / `m*` ids and one IIFE, so it won't collide.

Notes: it's all client-side, no dependencies, nothing is uploaded. **Copy image**
needs a secure context (https/localhost) and `allow="clipboard-write"` on the
iframe; **Save PNG** always works.

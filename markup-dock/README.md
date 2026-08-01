# Quick MarkUp — desktop dock widget

A **corner-docked, non-blocking** version of the markup tool. A round launcher
button sits at the **bottom-right**; click it and a compact markup panel pops up
so you can annotate **while still working on other things** — there's no
full-screen backdrop, and the rest of the screen stays fully usable.

Same compact toolset as the mobile/mini build: upload / paste / drop an image,
then circle, box, highlight, arrow, draw, text and numbered markers, colour +
thickness, undo, clear, **copy image**, **save PNG**, and a day/night toggle.
Click **▾** (minimise) or the launcher to collapse back to just the button.

## Add it to your app / desktop

The page is **click-through** except for the widget itself, so embed it as a
bottom-right iframe sized to the expanded panel and the area around it stays
clickable:

```html
<iframe src="https://jonworthaz.github.io/jonny-vault/markup-dock/"
        style="position:fixed;right:0;bottom:0;width:440px;height:600px;border:0;background:transparent;z-index:99999"
        allow="clipboard-write"></iframe>
```

The widget posts messages to the host so it can react (e.g. resize/allow
pass-through): `quickmarkup:open` when the panel opens, `quickmarkup:close` when
minimised. Or lift the markup + `<style>`/`<script>` straight into your app —
everything is namespaced (`mini-*` / `m*` ids, one IIFE).

> To wrap it as a true always-on-top desktop overlay on Windows, load this page
> in a lightweight always-on-top web shell (e.g. an Electron/Tauri window with a
> transparent, frameless, always-on-top window) pointed at this URL or the local
> file.

Client-side only, no dependencies, nothing uploaded. **Copy image** needs a
secure context (https/localhost) and `allow="clipboard-write"`; **Save PNG**
always works.

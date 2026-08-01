# Toggle Track — mini time tracker

A self-contained, single-file time tracker (like a miniaturised Toggl Track) that
docks in the bottom-right corner of any page. Vanilla JS + HTML + CSS inline in one
`index.html`. Zero dependencies, no build step, fully offline.

Shares the corner-dock shell of `markup-dock` (click-through page, round launcher
FAB, compact pop-up panel, minimise, day/night toggle) with a pink-red accent
(`#e0407b`). Everything is namespaced under `tk*` ids and `tk-` CSS classes so it
can coexist on the same page with sibling modules (e.g. Toggle Plan).

## Features

- **Description + Project** inputs ("What are you working on?" + an optional project).
- **Start / Stop** button with a live **HH:MM:SS** timer updating every second.
- Press **Enter** in either input to start — or stop if a timer is running.
- On stop, saves an entry `{ id, desc, project, startISO, endISO, seconds }` and
  prepends it to the list.
- **Entries list** grouped by day (Today / Yesterday / weekday + date), each row
  showing description, a project chip, duration (`1:04:22`), the start–end times,
  a ▶ **resume** button (starts a fresh timer with the same desc/project) and a
  ✕ **delete**.
- A running **Today** total = today's entries + the live timer.
- The running timer **survives a page reload** — the start time is persisted, and
  on load the timer resumes counting from it.
- **Empty state** with a hint.

## Size modes

- **Mini (dock)** — default compact panel, `min(400px, 92vw) × min(520px, 80vh)`.
- **Desktop (expanded)** — the header **⤢ maximise** button toggles a larger panel
  `min(900px, 95vw) × min(640px, 88vh)` (button becomes **⤡ restore**).
- Append `?full=1` to the URL to start expanded.

## Persistence

All data is stored in `localStorage` under `toggle-track:v1` (theme under
`toggle-track:theme`). Every access is wrapped in `try/catch`, so it degrades
gracefully where storage is unavailable.

---

## Module contract (portability)

Toggle Track implements a shared **module contract** so a host app can embed and
drive it, whether via an iframe (postMessage) or injected into the same page
(inline JS API). Export/import move the data between hosts.

### 1. postMessage protocol (iframe embedding)

Messages the module **posts to the parent** (all include
`source:"toggle-module", module:"toggle-track"`):

| type     | extra fields                     | when                          |
|----------|----------------------------------|-------------------------------|
| `ready`  | `name, version, accent`          | on load, and in reply to ping |
| `open`   | —                                | panel opened                  |
| `close`  | —                                | panel minimised               |
| `change` | —                                | whenever data changes         |
| `export` | `data: <exportObject>`           | in reply to an export command |

> Note: for backwards-compat the module *also* posts the legacy
> `{type:"toggletrack:open"}` / `{type:"toggletrack:close"}` messages.

**Host commands** the module listens for on `window` `message`. It accepts both a
namespaced `{type:"module:open"}` and a bare `{type:"open"}`; unrelated messages
are ignored.

| command              | payload                       | effect                                 |
|----------------------|-------------------------------|----------------------------------------|
| `module:open`        | —                             | open the panel                         |
| `module:close`       | —                             | collapse to the launcher               |
| `module:setTheme`    | `{ theme:"light"\|"dark" }`   | apply + persist theme                  |
| `module:export`      | —                             | replies with an `export` message       |
| `module:import`      | `{ data:<exportObject> }`     | load data, persist, re-render          |
| `module:ping`        | —                             | replies with a `ready` message         |

```js
// host side
const f = document.querySelector("iframe");
f.contentWindow.postMessage({ type: "module:open" }, "*");
window.addEventListener("message", (e) => {
  if (e.data?.source === "toggle-module" && e.data.type === "export") {
    console.log("got data", e.data.data);
  }
});
f.contentWindow.postMessage({ type: "module:export" }, "*");
```

### 2. Inline JS API (same-page injection)

The module registers itself on a shared global registry:

```js
window.ToggleModules["toggle-track"] = {
  id, name, version, accent,
  open(), close(),
  setTheme("light" | "dark"),
  exportData(),          // -> export object (below)
  importData(object),    // -> boolean (accepts wrapper or bare data)
  on(cb)                 // cb(moduleId) fires on every data change
};
```

It also dispatches a `CustomEvent("togglemodule:change", { detail:{ module:"toggle-track" } })`
on `window` whenever data changes.

### 3. Export / import JSON shape

`exportData()` returns a plain, JSON-serialisable object:

```json
{
  "module": "toggle-track",
  "version": "1.0",
  "exportedAt": "2026-08-01T09:00:00.000Z",
  "data": {
    "entries": [
      { "id": "abc", "desc": "Design review", "project": "Acme",
        "startISO": "2026-08-01T08:00:00.000Z",
        "endISO":   "2026-08-01T09:04:22.000Z", "seconds": 3862 }
    ],
    "running": { "startISO": "2026-08-01T09:10:00.000Z", "desc": "Email", "project": "" }
  }
}
```

`importData()` is tolerant: it accepts the full wrapper above **or** the inner
`data` object directly, validates defensively, replaces state, persists, and
re-renders.

### 4. Export / Import UI

The header has **⤓ Export** (downloads the export object as a `.json` file) and
**⤒ Import** (pick a `.json` file → `importData`), so the same contract is usable
by a person, not only a host app.

### 5. Manifest

`module.json` lets a host discover the module:

```json
{ "id":"toggle-track", "name":"Toggle Track", "version":"1.0",
  "accent":"#e0407b", "entry":"index.html",
  "capabilities":["open","close","setTheme","export","import"],
  "messageNamespace":"toggle-module" }
```

## Embedding

```html
<iframe src="toggle-track/index.html" style="position:fixed;inset:0;border:0"
        allow="clipboard-write"></iframe>
```

The page inside is click-through except for the widget, so it can overlay a host
app. Or lift the markup + inline `<style>`/`<script>` straight into a host page.

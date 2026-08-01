# Toggle Plan — mini planner

A self-contained, single-file day planner (like a miniaturised Toggl Plan) that
docks in the bottom-right corner of any page. Vanilla JS + HTML + CSS inline in one
`index.html`. Zero dependencies, no build step, fully offline.

Shares the corner-dock shell of `markup-dock` (click-through page, round launcher
FAB, compact pop-up panel, minimise, day/night toggle) with an indigo accent
(`#5b6ffa`). Everything is namespaced under `pl*` ids and `pl-` CSS classes so it
can coexist on the same page with sibling modules (e.g. Toggle Track).

## Features

- **Quick-add row**: task name + a date input (defaults to today) + **Add**.
  Pressing **Enter** in either field also adds.
- Task model `{ id, name, dateISO (yyyy-mm-dd), done, order }`.
- Tasks are **grouped by day** with friendly headings: **Today**, **Tomorrow**,
  then weekday + date for later days. An **Overdue** group collects past-due
  incomplete tasks and is highlighted in the accent. Groups sort by date; within
  a group tasks keep insertion order.
- Each row: a **tick** to toggle done (done = struck through + dimmed), the task
  name, a ✕ **delete**, and a small coloured **left bar** for polish (accent for
  normal rows, warn-pink for overdue).
- Header **count summary**: `N today · M upcoming` (plus `K overdue` when any).
- **Hide completed** toggle.
- **Empty state** with a hint.

## Size modes

- **Mini (dock)** — default compact panel, `min(400px, 92vw) × min(520px, 80vh)`.
- **Desktop (expanded)** — the header **⤢ maximise** button toggles a larger panel
  `min(900px, 95vw) × min(640px, 88vh)` (button becomes **⤡ restore**).
- Append `?full=1` to the URL to start expanded.

## Persistence

All data is stored in `localStorage` under `toggle-plan:v1` (theme under
`toggle-plan:theme`). Every access is wrapped in `try/catch`.

---

## Module contract (portability)

Toggle Plan implements the same shared **module contract** as Toggle Track so a
host app can embed and drive it, via an iframe (postMessage) or injected into the
same page (inline JS API). Export/import move the data between hosts.

### 1. postMessage protocol (iframe embedding)

Messages the module **posts to the parent** (all include
`source:"toggle-module", module:"toggle-plan"`):

| type     | extra fields                     | when                          |
|----------|----------------------------------|-------------------------------|
| `ready`  | `name, version, accent`          | on load, and in reply to ping |
| `open`   | —                                | panel opened                  |
| `close`  | —                                | panel minimised               |
| `change` | —                                | whenever data changes         |
| `export` | `data: <exportObject>`           | in reply to an export command |

> Note: for backwards-compat the module *also* posts the legacy
> `{type:"toggleplan:open"}` / `{type:"toggleplan:close"}` messages.

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
f.contentWindow.postMessage({ type: "module:setTheme", theme: "light" }, "*");
window.addEventListener("message", (e) => {
  if (e.data?.source === "toggle-module" && e.data.type === "export") {
    console.log("plan data", e.data.data);
  }
});
```

### 2. Inline JS API (same-page injection)

```js
window.ToggleModules["toggle-plan"] = {
  id, name, version, accent,
  open(), close(),
  setTheme("light" | "dark"),
  exportData(),          // -> export object (below)
  importData(object),    // -> boolean (accepts wrapper or bare data)
  on(cb)                 // cb(moduleId) fires on every data change
};
```

It also dispatches a `CustomEvent("togglemodule:change", { detail:{ module:"toggle-plan" } })`
on `window` whenever data changes.

### 3. Export / import JSON shape

`exportData()` returns a plain, JSON-serialisable object:

```json
{
  "module": "toggle-plan",
  "version": "1.0",
  "exportedAt": "2026-08-01T09:00:00.000Z",
  "data": {
    "tasks": [
      { "id": "abc", "name": "Draft proposal", "dateISO": "2026-08-01",
        "done": false, "order": 1 }
    ],
    "hideDone": false
  }
}
```

`importData()` is tolerant: it accepts the full wrapper above **or** the inner
`data` object directly, validates each task defensively (name required, date
coerced to today if malformed, `order` regenerated if missing), replaces state,
persists, and re-renders.

### 4. Export / Import UI

The header has **⤓ Export** (downloads the export object as a `.json` file) and
**⤒ Import** (pick a `.json` file → `importData`), so the same contract is usable
by a person, not only a host app.

### 5. Manifest

`module.json` lets a host discover the module:

```json
{ "id":"toggle-plan", "name":"Toggle Plan", "version":"1.0",
  "accent":"#5b6ffa", "entry":"index.html",
  "capabilities":["open","close","setTheme","export","import"],
  "messageNamespace":"toggle-module" }
```

## Embedding

```html
<iframe src="toggle-plan/index.html" style="position:fixed;inset:0;border:0"></iframe>
```

The page inside is click-through except for the widget, so it can overlay a host
app. Or lift the markup + inline `<style>`/`<script>` straight into a host page.
Because ids/classes are prefixed `pl*` / `pl-`, Plan and Track can both be embedded
on one page at once without collisions.

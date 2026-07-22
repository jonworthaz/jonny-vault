# Base Reality — one app, many tools

The Wave-1 build of the [Base Reality catalog](../11-base-reality-catalog.md):
**one installable app** whose tools are **modules** sharing a single local data
store — rather than ten separate apps. Bundles become module unlocks; the
All-Access membership unlocks everything; new modules land inside the same app.

## The modules (Wave 1)

| Module | One job |
|---|---|
| **CSV Cleaner** | Dedupe, trim, normalise and fix a messy CSV |
| **Prompt Vault** | Save, tag, search and reuse AI prompts, with `{{variable}}` filling |
| **Screenshot Beautifier** | Raw screenshot → framed, padded, gradient-backed visual |
| **Renewal Radar** | Track subscriptions & renewals — totals, warnings, `.ics` calendar reminders |
| **Quote Builder** | Branded quotes & estimates — VAT, discounts, print-to-PDF, saved history |
| **PDF Toolkit** | Merge PDFs, extract pages, images → PDF (vendored [pdf-lib](https://pdf-lib.js.org/), MIT) |
| **Snippet Deck** | Floating always-on-top quick-button deck — click copies, Ctrl+V pastes anywhere (+ Ctrl+K command palette in the shell) |

## The shared source of truth

Every module reads and writes one namespaced local store (`localStorage`,
`br:*` keys):

- **Profile** (`shared:profile`) — business name, address, contact, currency,
  VAT rate. Set once in Settings; Quote Builder brands quotes with it, Renewal
  Radar uses its currency, every future module inherits it.
- **Clients** (`shared:clients`) — saving a quote adds its client to the shared
  list; future modules (Invoice Chaser, Client Portal…) start with your clients
  already there.
- **One backup** — Settings → Export produces a single JSON covering every
  module; import it on any device.

Nothing is uploaded anywhere. Local-first is the product promise.

## Three ways to run it

1. **Web** — open the app from the site (GitHub Pages / base-reality.com).
2. **Installed (recommended)** — it's a PWA: browser → *Install app* (or the
   ⬇ Install button in the header). You get a local desktop/phone app with its
   own icon and window that **works fully offline** — the service worker
   precaches everything, including the PDF engine.
3. **Fully local** — download this folder and double-click
   `start-windows.bat` / `start-mac-linux.command` (needs Python for the tiny
   local server). Same app, served from your own disk.

## The AI Bridge (core function)

`bridge/bridge.js` gives AI assistants on your computer a **direct connection**
to Base Reality via **MCP (Model Context Protocol)** — no cloud API keys, no
screen control, no browser puppeting. The assistant calls real functions over
a local pipe: read your data, search it, add snippets/prompts/clients, draft
quotes, track renewals.

Zero dependencies — it's one file, run by Node.

**Connect Claude Desktop** — add to `claude_desktop_config.json`
(Settings → Developer → Edit Config):

```json
{ "mcpServers": { "base-reality": {
    "command": "node",
    "args": ["/FULL/PATH/TO/base-reality/bridge/bridge.js"] } } }
```

**Connect ChatGPT desktop** — Settings → Connectors → Advanced → Developer
mode, add the same command as a local MCP server.
**Connect Gemini CLI** — add the same command block under `mcpServers` in
`~/.gemini/settings.json`.
**Other assistants** — anything MCP-capable works the same way; assistants
without MCP support have no honest "direct" path (that's a them limitation,
not a bridge one).

**Sync**: the bridge mirrors the app's store at `~/.base-reality/data.json`
and serves a loopback sync endpoint (`127.0.0.1:8137`). In the app:
Settings → AI Bridge → *Sync to bridge* / *Pull from bridge* (or tick
auto-sync). Run it standalone for sync with `node bridge/bridge.js` — when an
AI app launches it over stdio it exits with that app; run standalone it stays
up as a sync server.

**The other direction (planned):** a *Local Model Link* module connecting the
app to models running **on your machine** (Ollama / LM Studio, localhost
API) so modules can use local AI with zero cloud calls.

## Next up (reminders)

- **Recorder & Transcriber module** — audio + video + screen recording with
  transcription. Already built on Claude desktop; **port it in as a module**,
  don't rebuild. (Captured 2026-07-22.)
- **Image annotation module** — already built on the Claude desktop app (and
  as the vault's web MarkUp tool, `../image-annotator/`); **port/reuse it as
  a module**, don't rebuild. (Captured 2026-07-22.)

## Adding a module

Create `modules/<id>.js` that calls `BR.register({id, name, letter, color,
tag, tags, blurb, render(root), unmount?()})`, add a `<script>` tag in
`index.html` and the file path in `sw.js`'s `ASSETS`. **`tags` is required**
— an array covering function, role and sector (see catalog doc 11, ground
rule 5); the home-shelf search matches against it and bundle pages are built
from it. Use `BR.store` (namespaced), the
shared profile/clients, and `BR.money/esc/toast/download` helpers. Zero
dependencies unless vendored into `vendor/`.

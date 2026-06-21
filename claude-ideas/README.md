# Claude Ideas

The core system that takes an idea from a one-line capture all the way to a
**product brief** and a **buildable workflow** — a zero-dependency static web app.

It's the front door to the vault's tools: an **Idea Board**, an **Idea Research &
Launch** system, the **Medvi OS** framework, and the **Workflow Builder** (Forge),
all in one sidebar.

> **Naming:** the desktop version of Claude Code already ships a feature called
> *Claude Home*, so this is a **separate, standalone system named "Claude Ideas"**.
> For a full feature/architecture write-up — including how to apply this system to the
> real Claude Home — see [`SPEC.md`](./SPEC.md).

> The concept lives in the vault's [Build & Tooling idea board](../10-build-and-tooling-board.md) (entry #02).

## Run it

### Easiest: double-click the launcher
- **macOS / Linux** → **`start-mac-linux.command`**
- **Windows** → **`start-windows.bat`**

These serve the **parent folder** (so Claude Ideas can reach the sibling tools) and
open at `http://localhost:8020/claude-ideas/index.html`.

### Hosted
Deploys to GitHub Pages — Claude Ideas is the site root (`/` redirects to it), with
`/workflow-builder/` and `/image-annotator/` alongside.

## The tabs

| Tab | What it does |
|---|---|
| **Dashboard** | Quick summary — totals, pipeline counts by status, recently updated ideas |
| **Idea Board** | Every idea, stored and visible. Cards show a summary, status, score, tags. Search, filter by status/tag, add new |
| **Medvi OS** | The transferable operating system (seven functions, five laws) you develop ideas against |
| **Workflow Builder** | Forge, embedded — build reusable Claude Code workflows |
| **About** | How the system flows |

## Idea Research & Launch

Click any idea to open its drawer — the place to take it from raw idea to launch:

- **Status pipeline** — `Captured → Researching → Analysed → Validated → Building → Launched` (plus `Parked`).
- **Quick summary, Review, Analysis, Development** — structured free-text fields.
- **Research log** — timestamped notes with optional links.
- **Set to the Medvi OS** — a toggle that scores the idea against the eight-point
  Medvi checklist (recurring? high margin? AI-buildable? rides a wave? own
  acquisition + billing? retains? survives a screenshot?) and surfaces the gaps.
- **Workflows · files · agents** — attach a full product-development workflow
  (opens in the builder, **Forge**, and writes back live), plus files and agents.
  Each workflow can be **🔒 locked / 🔓 unlocked** — a locked workflow opens
  read-only in the builder until you unlock it.
- **Generate product brief** — exports a structured Markdown brief from everything
  captured (summary, Medvi OS fit, scores, research, analysis, development plan,
  workflow pipeline, files/agents).
- **Delete / amend** — full control over the idea.

## How it connects to Forge

Ideas and workflows share one local store (`claudeideas.ideas.v1`). When you edit an
idea's workflow, Claude Ideas opens Forge in **linked mode**
(`workflow-builder/index.html?ideaId=…&wfId=…`); Forge loads that workflow, and every
change writes straight back into the idea. Lock the workflow and Forge respects it —
a banner shows it's read-only with an **Unlock** button.

## Data

Everything is client-side and persists in your browser's local storage. Use
**Export data / Import data** in the sidebar to move it between machines or back it up.

## Files

- `index.html` — the shell (sidebar + views + drawer)
- `styles.css` — styling (shares the vault's dark theme)
- `data.js` — the Medvi OS framework + seed ideas (mirrored from boards 09 & 10)
- `app.js` — routing, idea store, the research/launch drawer, brief generator, Forge handoff

## Possible next steps

- Pull seed ideas directly from the Markdown boards instead of a snapshot.
- Per-idea scoring UI (currently scores are shown; editing is via the boards/import).
- Multiple workflows side-by-side; workflow templates per idea status.
- A shareable URL encoding of an idea, and cloud sync behind a backend.

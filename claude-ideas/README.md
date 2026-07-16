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
Deployed to GitHub Pages (branch deployment) at **`/claude-ideas/`**, with
`/workflow-builder/` and the other tools alongside. The site **root (`/`) is a tools
hub** that links here. Deep-link straight to a tab with `?view=` —
e.g. `/claude-ideas/?view=ideas` opens the Idea Board.

## The tabs

| Tab | What it does |
|---|---|
| **Dashboard** | Quick summary — dropbox count, totals, pipeline counts, **pipeline health** (gate kill rate, avg days/stage, stale items), recently updated |
| **Dropbox** | Low-friction inbox for quick ideas & doodles — type, drop text/images, or **dispatch** from an AI agent. Promote items onto the board |
| **Idea Board** | Every idea, stored and visible. Cards show a summary, status, gate score, latest decision, tags. Search, filter by status/tag, add new |
| **Medvi OS** | The transferable operating system (seven functions, five laws) — and the **weighted gate scorecard** ideas are scored against |
| **Learnings** | A searchable repository of every experiment and learning across all ideas |
| **Workflow Builder** | Forge, embedded — build reusable Claude Code workflows |
| **About** | How the system flows |

## Idea Research & Launch

Click any idea to open its drawer — the place to take it from raw idea to launch:

- **Status pipeline** — `Captured → Researching → Analysed → Validated → Building → Launched` (plus `Parked`). Transitions are logged for analytics.
- **Quick summary, Review, Analysis, Development** — structured free-text fields.
- **Brainstorm** — capture variants, derivatives and adjacent opportunities; prompt
  chips (Variants, Adjacent markets, 10× it, Riskiest assumption…) seed entries, and
  any note can be **↗ spun off into its own idea**.
- **Research log** — timestamped notes with optional links.
- **Medvi OS gate (stage-gate scoring)** — set an idea to the Medvi OS and score it
  **0–5 on weighted criteria** (recurring, margin, retains, screenshot — the heavy
  hitters — plus own-acquisition/billing, wave, AI-buildable). You get a **weighted
  gate score** and a verdict, then record a **Go / Hold / Recycle / Kill** decision
  with rationale. Decisions advance, hold, recycle or park the idea, and every review
  is kept as an **audit history**.
- **Experiments & learnings** — track hypotheses, type, status, success metric and
  outcome per idea. They roll up into the **Learnings** tab.
- **Workflows · files · agents** — attach a full product-development workflow
  (opens in the builder, **Forge**, and writes back live), plus files and agents.
  Each workflow can be **🔒 locked / 🔓 unlocked** — a locked workflow opens
  read-only in the builder until you unlock it.
- **Generate product brief** — exports a structured Markdown brief from everything
  captured (gate scorecard + decisions, scores, research, analysis, development plan,
  experiments/learnings, workflow pipeline, files/agents).
- **Delete / amend** — full control over the idea.

## Idea Dropbox & Claude dispatch

The **Dropbox** is a low-friction inbox for ideas that arrive from anywhere:

- **Type or drop** — a quick-capture box accepts text, and you can **drop text or
  image files** (doodles) straight in; each becomes a *quick idea* (`inbox: true`)
  that sits in the Dropbox until you **→ promote** it onto the board.
- **Claude dispatch** — tell Claude *“dispatch idea: <X> → idea board”* and it appends
  an entry to [`dropbox.json`](./dropbox.json); Claude Ideas **ingests new entries
  automatically on load** (deduped by id). One-off manual route: `?drop=your%20idea`.

## AI analysis (agent-driven)

The app is local-first and ships no LLM — **the agent is the analysis engine**, working
through the same JSON the app uses (see [`AGENT.md`](./AGENT.md)). An agent can take an
idea from raw capture to a gated, scored, brief-ready entry **with no human in the loop**:
score the Medvi-OS gate, brainstorm, propose experiments, record a Go/Hold/Recycle/Kill
decision, and write it back.

- **In-app bridge** — **✨ AI analyse** (per idea) and **✨ AI auto-fill** (whole dropbox)
  copy a ready-made prompt; paste it to Claude, then **Import data** to apply the result.
- **Import upserts by id**, so re-running an agent updates ideas in place. The agent's
  one-paragraph verdict shows on the idea with an ✨ AI badge.

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
- `data.js` — Medvi OS gate scorecard, decisions, experiment/brainstorm vocab, seed ideas
- `app.js` — routing, idea store, dropbox + dispatch, research/launch drawer, AI bridge, brief generator, Forge handoff
- `dropbox.json` — the dispatch inbox an agent appends to
- `AGENT.md` — the agent protocol (how an AI fills the board end-to-end)
- `SPEC.md` — full data model + port guide

## Possible next steps

- Pull seed ideas directly from the Markdown boards instead of a snapshot.
- Per-idea scoring UI (currently scores are shown; editing is via the boards/import).
- Multiple workflows side-by-side; workflow templates per idea status.
- A shareable URL encoding of an idea, and cloud sync behind a backend.

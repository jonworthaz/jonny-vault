# Claude Ideas — System Specification & Port Guide

A complete description of what was built, written so the same system can be
**applied to the real Claude Home** (the feature that ships in the desktop version of
Claude Code) or re-implemented on any stack.

> **Why this doc exists.** This system was first built as a tab *inside* a conceptual
> "Claude Home". Since the desktop Claude Code already ships a feature called **Claude
> Home**, the build was renamed and shipped as a **standalone system, "Claude Ideas"**,
> to avoid a clash. This spec captures the full design so the team can fold it into the
> real Claude Home if desired. The reference implementation is the code in this folder.

---

## 1. What it is

An **idea → launch** system in three layers:

1. **Idea Board** — store and see *all* ideas, with quick summaries, status, score and tags.
2. **Idea Research & Launch** — open any idea to review, research, analyse and develop it
   into a product; set it to the **Medvi OS**; attach **workflows / files / agents**;
   generate a **product brief**.
3. **Workflow Builder (Forge)** — build the actual development workflow (stages +
   agents/skills/tools/MCPs), editable per-idea and **lockable**, generating real Claude
   Code config.

Reference implementation: **zero-dependency static web app** (HTML + CSS + vanilla JS),
state in `localStorage`. No build step, no backend, no network calls.

---

## 2. Architecture at a glance

```
┌──────────────── Claude Ideas (claude-ideas/) ─────────────────┐
│  Sidebar: Dashboard · Idea Board · Medvi OS · Workflows · About │
│                                                                 │
│  Idea Board ──click──► Research & Launch drawer                 │
│        │                     │                                  │
│        │                     ├─ status pipeline                 │
│        │                     ├─ Medvi OS scored checklist       │
│        │                     ├─ research log / analysis / dev   │
│        │                     ├─ attachments (workflows/files/agents)
│        │                     └─ ► Generate product brief (.md)  │
│        ▼                                                         │
│  localStorage  key: "claudeideas.ideas.v1"   ◄────────────┐     │
└───────────────────────────────────────────────────────────┼─────┘
                                                             │ shared store
┌──────────── Forge (workflow-builder/) ────────────────────┼─────┐
│  Standalone builder  AND  linked mode (?ideaId&wfId) ──────┘     │
│  Linked mode loads idea.attachments.workflows[wfId].workflow,    │
│  writes every edit back, respects the per-workflow lock flag.    │
└─────────────────────────────────────────────────────────────────┘
```

Two apps, **one shared `localStorage` store**, linked by URL parameters. Same-origin is
the only requirement (both are served from the same site).

---

## 3. Data model

### 3.1 Store (`claudeideas.ideas.v1`)

```jsonc
{
  "ideas": [ Idea, ... ],
  "updated": 1718900000000          // epoch ms, set on every save
}
```

### 3.2 Idea

```jsonc
{
  "id": "ab12cd3",                  // stable unique id
  "title": "Creator content engine",
  "summary": "One-line quick summary shown on the card.",
  "source": "09-idea-board.md · #01 | manual",
  "tags": ["product", "lead"],
  "status": "Researching",          // one of STATUSES (see §4)
  "criteria": { "Demand": 5, "Intent": 4, ... },   // arbitrary label→score map
  "gates": { "compounds": true, "screenshot": true },
  "medviOS": true,                  // is it "set to the Medvi OS"
  "medviChecks": { "recurring": true, "margin": false, ... }, // checklist key→bool
  "medviNotes": "free text",
  "review": "free text",
  "research": [ { "id", "ts", "text", "url" } ],   // timestamped log
  "analysis": "free text",
  "development": "free text",
  "attachments": {
    "workflows": [ { "id", "name", "locked": false, "workflow": Workflow } ],
    "files":     [ { "id", "name", "note" } ],
    "agents":    [ { "id", "name", "note" } ]
  },
  "createdAt": 1718900000000,
  "updatedAt": 1718900000000
}
```

### 3.3 Workflow (Forge format — also the per-attachment payload)

```jsonc
{
  "name": "acme — build",
  "goal": "what we're doing",
  "stages": [
    {
      "id": "s1", "type": "implement", "title": "Implement", "icon": "⚙️",
      "instr": "free text",
      "elements": [ { "id", "kind": "agent|skill|tool|mcp", "name": "Edit" } ]
    }
  ]
}
```

`normalizeIdea()` fills every default, so partial / imported data is always safe to load.

---

## 4. The idea lifecycle (status pipeline)

`Captured → Researching → Analysed → Validated → Building → Launched` plus `Parked`.
Each status has a colour + hint (`STATUS_META`). The dashboard summarises counts per
status; the card border and badge use the status colour.

---

## 5. The Medvi OS framework

An idea can be **set to the Medvi OS** (`medviOS: true`). Doing so surfaces an 8-point
checklist (`MEDVI_OS.checklist`) and computes a *fit score* with surfaced gaps:

| key | question |
|---|---|
| recurring | Recurring by nature (bills monthly/annually)? |
| margin | High margin (can out-pay affiliates)? |
| aiBuildable | AI-buildable / runnable by a 2-person team? |
| wave | Rides an existing demand wave? |
| ownAcq | We own acquisition (affiliate-friendly)? |
| ownBilling | We own billing + the retention relationship? |
| retains | Genuinely good enough to retain? |
| screenshot | Would survive a screenshot (honest, compliant)? |

The framework data (seven functions, five laws, this checklist) lives in `data.js`
(`MEDVI_OS`) and is rendered read-only on the **Medvi OS** tab. It is derived from the
vault's `02-operating-system.md`.

---

## 6. Forge linked-mode protocol (the integration contract)

This is the key cross-app piece to reproduce in any host.

1. **Open:** the host navigates to the builder with
   `workflow-builder/index.html?ideaId=<id>&wfId=<wfId>`.
   (Claude Ideas first ensures `idea.attachments.workflows[wfId]` exists.)
2. **Load:** on init, if both params are present, the builder reads the shared store,
   finds the idea + workflow attachment, and loads `attachment.workflow` as its state.
   `READONLY = attachment.locked`.
3. **Write-back:** every autosave writes `state` back into that attachment's `workflow`
   (and bumps `idea.updatedAt`) instead of the builder's own standalone key.
4. **Lock:** when `READONLY`, all mutators are guarded (no-op + toast), inputs are
   disabled, and a banner shows "🔒 locked (read-only)" with an **Unlock** button that
   clears the flag and reloads.
5. **Return:** a "← Back" link to `../claude-ideas/index.html?idea=<id>`.

No params ⇒ the builder runs as the standalone tool (its own `forge.workflow.v1` key).

---

## 7. Feature → file map (reference implementation)

### `claude-ideas/`
| File | Responsibility |
|---|---|
| `index.html` | App shell: sidebar nav, main view container, idea drawer, modal, toast |
| `styles.css` | Dark theme (shared CSS variables), sidebar, cards, drawer, modal, responsive |
| `data.js` | `STATUSES`, `STATUS_META`, `MEDVI_OS` framework, `SEED_IDEAS` (mirrors boards 09/10) |
| `app.js` | Store load/save/normalize · router (`setView`/`render`) · dashboard · board (search/filter/cards) · Medvi OS tab · embedded Forge tab · **Research & Launch drawer** · attachments + lock · Forge handoff (`openForge`) · **product-brief generator** · export/import |
| `start-*.{command,bat}` | Local launchers — serve the **parent** folder (so sibling tools resolve) and open `/claude-ideas/` |

### `workflow-builder/` (Forge) — relevant additions
| Symbol | Responsibility |
|---|---|
| `IDEAS_KEY` | The shared store key (`claudeideas.ideas.v1`) |
| `initLinked() / writeBackLinked() / findLinkedWf()` | Linked-mode load + write-back |
| `renderBanner()` | Linked banner + Unlock + Back link |
| `guard()` | Read-only guard wrapping every mutator |

---

## 8. UI/UX summary

- **Sidebar tabs:** Dashboard, Idea Board, Medvi OS, Workflow Builder (embedded Forge),
  About. Plus Export/Import data.
- **Cards:** title, status badge, summary, tags (Medvi badge if set), score pill,
  workflow count, source. Click → drawer.
- **Drawer (Research & Launch):** editable title; status pipeline pills; quick summary;
  Medvi OS toggle + checklist + fit score; review; research log (add/remove entries);
  analysis (+ score chips); development; workflows (new/edit/lock/unlock/delete, with a
  stage preview); files & agents (add/remove); footer: delete idea · generate brief.
- **Product brief:** a single Markdown file assembled from everything captured — summary,
  Medvi OS fit + gaps, scores, research, analysis, development, the workflow pipeline,
  and files/agents.

---

## 9. Applying this to the real Claude Home

The reference build is intentionally framework-free so it ports cleanly. To fold it into
the desktop Claude Home:

1. **Add a sidebar entry "Ideas"** in Claude Home's existing nav, pointing at an Idea
   Board view.
2. **Reuse the data model in §3 verbatim.** It is plain JSON. Persist it wherever Claude
   Home keeps app state (its own settings/DB) instead of `localStorage` — only
   `loadStore()/saveStore()` need swapping.
3. **Reuse the Medvi OS framework (§5)** and the lifecycle (§4) as-is; they are data, not code.
4. **Reuse the lifecycle UI / drawer** — port the markup in `index.html` + `styles.css`
   and the render functions in `app.js`, or re-skin them in Claude Home's component
   system. The logic (render/bind/generate) is dependency-free and can be lifted directly.
5. **Wire workflows to Claude Home's own workflow surface.** If Claude Home has a native
   workflow/agent editor, replace the Forge handoff (§6) with a call into it, keeping the
   same contract: load a workflow object, write edits back to the idea, respect a lock flag.
   Otherwise embed Forge as done here.
6. **Brief generation (§8)** is pure string templating — drop it in unchanged.

### Honest limitations
- This document and the reference code are everything that can be produced from outside
  the desktop app. Directly modifying the shipped Claude Home isn't possible from here —
  this is a **port guide + working reference**, not an in-place patch.
- The desktop Claude Home's actual storage, component framework and workflow APIs are not
  known here; steps 2 and 5 are the integration points where its real APIs substitute for
  `localStorage` and Forge.

---

## 10. Test notes

The reference implementation was verified headlessly (Node, with stubbed DOM/storage):
seed/scoring/brief generation in Claude Ideas, and Forge linked-mode **load → write-back
→ lock (read-only guard)** round-trip. An in-browser click-through is the remaining
manual check.

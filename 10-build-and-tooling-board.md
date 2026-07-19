# 10 — Build & Tooling Idea Board

*A running board for **tooling, automation and Claude Home / agent-workflow**
ideas — the internal machine, not the customer-facing product. Separate from the
[product idea board (09)](./09-idea-board.md) because these aren't scored on
demand/CPC/affiliate fit; they're scored on **leverage**: how much founder time
they free, applied across every project.*

The vault's whole thesis is *automate or outsource everything except acquisition
and billing* ([02](./02-operating-system.md)). This board is where the "automate"
half gets designed.

## How an entry scores

| Criterion | What we're judging |
|---|---|
| **Leverage** | Time saved × number of projects it applies to |
| **Reusability** | One-off vs. applies to *any* project in Claude Home |
| **Build cost** | Effort to a useful v1 (favour zero-dependency, static where possible) |
| **Compounds?** | Does it get more valuable as we add projects/workflows? |

Status legend: 🟢 building / built · 🟡 designed, not started · 🔴 parked.

---

## The board

### 🟢 #01 — Visual workflow generator & builder for Claude Home
*Predefined builds from predefined skills, agents, planning/implementation/
evaluation workflows — seen visually, reviewed, defined and altered as needed.*

| Leverage | Reusability | Build cost | Compounds? |
|:--:|:--:|:--:|:--:|
| 5 | 5 (any project) | Low–med (static web app) | ✅ |

**The idea (as captured):** Claude Home should incorporate workflows that can be
easily altered, amended and changed, with **Tars at the helm recommending available
workflows**. Workflows are assembled by **dragging and dropping** different
sections, built according to requirements. A **workflow generator and builder** that
can be applied to **any project** in Claude Home — adding agents, skills, tools,
MCPs and other elements where necessary.

**Why it's top of the board:** it's the meta-tool — every other project benefits
from a faster, more consistent way to stand up its agent workflow. Pure leverage,
applies everywhere, compounds as the template library grows.

**v1 — built.** A zero-dependency static web app, deployed alongside the MarkUp
tool, lives in [`workflow-builder/`](./workflow-builder/):

- **Drag-and-drop canvas** — compose a pipeline of stages (plan → implement →
  review → test → ship); reorder by dragging, move elements between stages.
- **Palette** — stages, agents, skills, tools and MCP servers; ＋ Custom for your
  own. Drag onto a stage (or tap, on mobile).
- **Predefined builds** — Feature build · Bug fix · Research & report · Refactor ·
  Ship a PR. Load one, then alter/amend/reorder freely.
- **Tars** — a rule-based recommender (no API key) that matches your goal text to a
  template and flags structural gaps (no plan, code with no review, implement with
  no verify, ship with no security review, empty stages, missing tools…), each
  one-click to apply.
- **Generates real Claude Code config** — `CLAUDE.md` workflow section,
  `.claude/settings.json` (permissions + enabled MCP servers), `.mcp.json` stubs,
  and `.claude/agents` / `.claude/skills` stubs for custom elements — plus a
  one-file **setup bundle** you can hand to Claude Code to scaffold a project.
- **Re-openable** — autosaves locally; export/import `workflow.json` to edit later.

**Next steps (post-v1):** branching/parallel stages, per-stage model picker, hook
generation, importing the *actually installed* agents/skills/MCPs to populate the
palette, and a shareable URL encoding of a workflow.

### 🟢 #02 — Claude Ideas: idea → launch system *(separate from the desktop Claude Home)*
*The idea board as a real system — store every idea, then research, analyse and
develop it into a product, with the Medvi OS and a full workflow applied.*

| Leverage | Reusability | Build cost | Compounds? |
|:--:|:--:|:--:|:--:|
| 5 | 5 (any idea) | Med (static SPA) | ✅ |

**The idea (as captured):** an idea-board tab in the Claude Home sidebar that stores
and shows all ideas with a quick summary; ideas open an **Idea Research & Launch
system** to be reviewed, researched, analysed and developed into products; ideas can
be **set to the Medvi OS**, amended and deleted, and have **workflows, files and
agents applied** to take them through full product development — with the workflow
editable in the generator and **lockable/unlockable**.

**Naming:** the desktop version of Claude Code already ships a feature called
*Claude Home*, so this build ships as a **separate standalone system named
"Claude Ideas"** to avoid a clash. The full feature/architecture write-up —
[`claude-ideas/SPEC.md`](./claude-ideas/SPEC.md) — is written so the same system
can be *applied to* the real Claude Home if wanted.

**Review & improvements made (before building):**
- **Added a lifecycle, not just a list.** A status pipeline
  (`Captured → Researching → Analysed → Validated → Building → Launched`, + `Parked`)
  so the board *shows momentum*, and a dashboard that summarises it. The original
  ask was storage + visibility; a pipeline makes "visibility" actually decision-useful.
- **Turned "set to the Medvi OS" into a scored gate**, not a label — an 8-point
  checklist drawn straight from [02](./02-operating-system.md) (recurring? margin?
  AI-buildable? rides a wave? own acquisition + billing? retains? survives a
  screenshot?) with a fit score and surfaced gaps. That makes the OS *do work*.
- **Made the output tangible.** A one-click **product brief** generator (mirroring
  Forge's "generate real config" ethos) so research → an artifact, not just notes.
- **Made lock/unlock real across tools.** A locked workflow opens *read-only* in
  Forge (linked mode) with an Unlock control — not just a flag.
- **Seeded it with the existing boards** (09 + 10) so every idea is visible on first
  run, and added export/import so the data is portable.

**v1 — built.** A zero-dependency static SPA in [`claude-ideas/`](./claude-ideas/),
deployed to GitHub Pages at `/claude-ideas/` (the site root is a tools hub that links
to it; Forge and the MarkUp tools sit alongside). Sidebar tabs — Dashboard · Idea
Board · Medvi OS · Learnings · Workflow Builder ·
About. Ideas share one local store with Forge, so a workflow edited from an idea
writes straight back. See its [README](./claude-ideas/README.md) and
[SPEC.md](./claude-ideas/SPEC.md).

**v2 — NPD stage-gate (built).** After reviewing the design doc *"Designing a
Local-First Ideas & NPD Management System"*, the NPD core was folded in — but kept
opinionated and lean rather than copying the doc wholesale:
- **Weighted Medvi-OS gate scoring** (0–5 × weights → a gate score) with recorded
  **Go / Hold / Recycle / Kill** decisions, rationale and an audit history; decisions
  advance / recycle / park the idea.
- **Experiments & learnings** per idea, rolled up into a searchable **Learnings** tab.
- **Pipeline analytics** on the dashboard — gate kill rate, average days per stage,
  stale-item flags (from logged status transitions).
- **Deliberately skipped** (over-build for a solo founder): separate Concept/Project
  entities, a rules engine, knowledge graph/embeddings, plugins, and a desktop/SQLite
  rebuild. The full review + rationale is in the chat and [SPEC.md §5a](./claude-ideas/SPEC.md).

**Next steps (post-v1):** read seed ideas live from the Markdown boards, in-app
score editing, multiple workflows per idea, and cloud sync behind a backend.

### 🟡 #03 — Personalisation-to-print commerce flow *(engine for #11 and any custom-goods idea)*
*One reusable pipeline — **upload → AI colourise/restore → live "on-steel" preview →
checkout → hand-off to a metal print-on-demand partner** — that any personalised
physical-product idea can plug into, first applied to [09 #11](./09-idea-board.md) (steel wallet cards).*

| Leverage | Reusability | Build cost | Compounds? |
|:--:|:--:|:--:|:--:|
| 4 | 4 (any personalised-goods idea) | Med–high (image pipeline + payments + fulfilment) | ✅ |

- **The idea:** the customer-facing *digital layer* of #11, built as a generic engine
  rather than a one-off storefront. A buyer uploads a photo, the app colourises/restores
  it, previews it as a brushed-steel card at true wallet size (ID-1, 85.6 × 54 mm), takes
  payment, and drops a print-ready file to a fulfilment partner. Swap the substrate/mockup
  and the same flow sells prints, mugs, ornaments — anything print-on-demand.
- **Why:** it's the piece that lets a *physical* product still **own billing and the
  recurring relationship** (the #11 / #10 tension). Build it once, reuse the upload →
  transform → preview → pay → fulfil spine for every future personalised-goods idea.
- **v1 shape (smallest useful build):**
  - **Front end** — static SPA (matches the vault's zero-dependency ethos); client-side
    crop/zoom to the ID-1 card ratio; a **canvas/WebGL "steel finish" preview** (brushed-
    metal texture + specular sheen + sublimation-style contrast) so buyers see the result
    before paying.
  - **AI transform** — call a hosted image model via a **serverless function** (keys off
    the client): colourise (DeOldify), face-restore (GFPGAN/CodeFormer), upscale
    (Real-ESRGAN), chained. Replicate/Fal are the pragmatic hosts.
  - **Payments** — Stripe Checkout, or **Shopify** (already in the toolset; handles tax/
    shipping/orders for a physical good) with the customiser as an embedded app that adds
    the processed image as a custom line item.
  - **Storage** — signed uploads to object storage (Cloudflare R2 / Supabase); processed
    file + order metadata kept for the fulfilment feed.
  - **Fulfilment** — the crux, see the tech note below: a metal print-on-demand/dropship
    partner (API or CSV order feed), or an in-house **UV flatbed** rig for full colour on
    steel. **Validate colour-on-steel with physical samples before any of the software.**
- **The make-or-break (physical, not code):** "colourised on stainless steel" is a
  *process* claim. **Laser engraving is monochrome/tonal — it can't do colour.** True
  colour needs **UV flatbed printing directly onto steel**, or **dye-sublimation onto a
  polymer-coated metal** (ChromaLuxe-style; bare stainless won't sublimate). Prove one of
  those two gives a crisp, wallet-durable finish first — the software is worthless without it.
- **Fulfilment options (researched):** every way to outsource the physical print/pack/ship —
  POD dropship (Prodigi/Contrado), direct UK-lab white-label (Digitalab/CEWE/Print Photos),
  white-label commerce platforms, and bulk-blanks + 3PL — with a ranked, phased path and a
  supplier shortlist, is written up in
  [`research/steel-wallet-cards-outsourcing.md`](./research/steel-wallet-cards-outsourcing.md).

---

## Adding a new entry

```markdown
### 🟡 #NN — <name>
*<the leverage it creates, in a sentence>.*

| Leverage | Reusability | Build cost | Compounds? |
|:--:|:--:|:--:|:--:|
| ? | ? | ? | ?/✅/❌ |

- **The idea:** <what it is>
- **Why:** <whose time it frees, across how many projects>
- **v1 shape:** <smallest useful build — favour zero-dependency / static>
```

> Same discipline as the product board: capture freely, build only what compounds.
> Here the test isn't "would it survive a screenshot" — it's **"does it pay for its
> build cost in saved time across every project?"**

---

← Back to the index: [README](./README.md) · Product ideas: [09 — Idea Board](./09-idea-board.md)

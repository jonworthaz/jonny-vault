# CLAUDE.md

Guidance for AI assistants (Claude Code and others) working in this repository.

## What this repo is

**Project Vault** is two things in one repository:

1. **A strategy playbook** — a set of numbered Markdown documents (`01`–`10`)
   that reverse-engineer the Medvi subscription business and re-engineer it into
   a lean, non-health, geo-agnostic digital-subscription operating system.
2. **A suite of self-contained web tools** — each in its own directory, that
   support the playbook (idea → launch, agent building, workflow building, image
   markup). These are also deployed to **GitHub Pages**, where the repo root
   (`index.html`) acts as a tools hub.

There is **no build system, no package manager, no backend, and no test suite**.
Everything is either Markdown prose or a zero-dependency static web app (plain
HTML + CSS + vanilla JavaScript). `README.md` is the human entry point; start
there for the playbook, and this file for the tooling conventions.

## Repository layout

```
.
├── README.md                     # Human entry point — playbook index + tools index
├── index.html                    # GitHub Pages root: the tools hub landing page
├── .nojekyll                     # Tells GitHub Pages to serve files as-is (no Jekyll)
│
├── 01-medvi-teardown.md          # The playbook, read in numeric order:
├── 02-operating-system.md        #   01 research → 02 transferable OS → 03 plan →
├── 03-our-business-plan.md       #   04 growth → 05 tech/AI → 06 economics →
├── 04-growth-engine.md           #   07 guardrails → 08 roadmap → 09/10 boards
├── 05-tech-ai-stack.md
├── 06-economics-and-funnel.md
├── 07-guardrails.md
├── 08-roadmap.md
├── 09-idea-board.md              # Scored product-idea board (Markdown)
├── 10-build-and-tooling-board.md # Internal tooling / leverage ideas (Markdown)
│
├── packaging-consultant-agent.md # Worked example: the hand-built "PackPro AI" agent spec
├── agent-architect-prompt.md     # No-UI companion prompt for the Architect tool
│
├── claude-ideas/                 # "Claude Ideas" — idea → launch system
├── agent-architect/              # "Architect" — agent-creation wizard
├── workflow-builder/             # "Forge" — visual Claude Code workflow builder
├── image-annotator/              # "MarkUp" — image annotation / markup
├── damage-assessment/            # Multi-photo vehicle damage assessment tool
├── damage-assessment-large/      # High-visibility variant (larger text/controls)
└── landing/                      # Standalone landing-page experiment
```

## The tools

Each tool is an independent static web app. Naming: the directory is functional
(`workflow-builder`), the product name is branded (Forge). Both are used.

| Directory | Product | What it does | Persists to |
|---|---|---|---|
| `claude-ideas/` | Claude Ideas | Idea board → research/launch → Medvi-OS gate scoring → workflows | `localStorage` |
| `agent-architect/` | Architect | 6-step wizard: objective/JD → agent spec + master prompt + JSON blueprint | `localStorage` |
| `workflow-builder/` | Forge | Visual pipeline builder → generates CLAUDE.md / settings.json / .mcp.json stubs | `localStorage` |
| `image-annotator/` | MarkUp | Image annotation & markup, export | in-memory (session) |
| `damage-assessment/` | Damage Assessment | Multi-photo vehicle markup → combined PDF/CSV report | in-memory (session) |
| `damage-assessment-large/` | Damage Assessment (large) | Same app, high-visibility variant | in-memory (session) |

Note: `claude-ideas` and `workflow-builder` **share a `localStorage` store**
(`claudeideas.ideas.v1`) so Forge can operate on an idea in "linked mode".

## Conventions — read before touching a tool

These conventions are the point of the repo. Follow them; do not introduce
frameworks or build tooling.

- **Zero dependencies, no build step.** No npm, no bundler, no transpiler, no
  CDN `<script>` tags, no external fonts/libraries. Each tool must run by opening
  `index.html` directly from disk (`file://`). If you find yourself reaching for
  a package, stop.
- **Standard tool file set.** A typical tool folder is:
  - `index.html` — markup; links `styles.css` and `app.js`.
  - `styles.css` — all styling (plain CSS, no preprocessor).
  - `app.js` — all logic, wrapped in an IIFE with `"use strict";`.
  - `README.md` — what it is + how to run it.
  - `start-mac-linux.command` + `start-windows.bat` — optional double-click
    launchers that serve the folder via `python3 -m http.server` on a fixed port.
  - Some tools add extras: `claude-ideas/` has `SPEC.md` and `data.js` (seed
    data); `agent-architect/` embeds its archetype knowledge base in `app.js`.
- **Local-first, private by design.** Nothing is uploaded anywhere; no API keys,
  no accounts, no network calls. State lives in the browser (`localStorage`) or
  in memory. Preserve this — do not add analytics, telemetry, or remote calls.
- **Versioned storage keys.** Persistent state uses a namespaced, versioned key,
  e.g. `architect.blueprint.v1`, `forge.workflow.v1`, `claudeideas.ideas.v1`.
  If you change the shape of stored state incompatibly, bump the version suffix
  (and handle/migrate old data gracefully — loads are wrapped in try/catch and
  fall back to a default, never throw).
- **Fixed launcher ports.** Each launcher pins its own port so tools don't clash
  (Forge `8010`, Architect `8011`, etc.). Keep ports distinct if you add one.
- **Self-contained pages.** `index.html` (root) and `landing/` inline their CSS
  in a `<style>` block; the app tools use an external `styles.css`. Match the
  style of the file you are editing.
- **Design language.** Dark theme, CSS custom properties in `:root`
  (`--bg`, `--panel`, `--accent`, …), system font stack, emoji glyphs for icons.
  Reuse the existing variables rather than hard-coding colors.
- **Duplicated variants are intentional.** `damage-assessment/` and
  `damage-assessment-large/` share near-identical `app.js`. A change to shared
  behaviour generally needs to be applied to **both**; check before assuming one.

## Wiring a new tool in

When adding a tool, also register it so it is discoverable:

1. Create the tool folder following the standard file set above.
2. Add a card/link in the root **`index.html`** (the Pages tools hub).
3. Add a row to the **"The tools"** table in the root **`README.md`**.
4. If it relates to a playbook idea, cross-link the relevant `09`/`10` board doc.

## Deployment (GitHub Pages)

The site is served from the repo (root `index.html` is the hub; each tool is
reachable at `/<tool-dir>/`). `.nojekyll` disables Jekyll processing so files are
served verbatim. There is **no CI workflow** in `.github/` — Pages builds from
the branch directly, so **anything merged to the default branch goes live**.
Test tools by opening them locally before merging.

## Editing the playbook docs

- The numbered docs are meant to be read **in order**; keep cross-references and
  the numbering consistent if you add or reorder documents.
- Keep the **`07-guardrails.md`** posture intact: the whole thesis is copying
  Medvi's *engine* (own the customer + the recurring charge, automate/outsource
  the rest) while explicitly **not** copying the fraud (fake doctors, misbranding,
  compounded-drug vertical). Don't let edits drift the plan toward the lines that
  doc rules out.
- `README.md` mirrors both indexes (playbook docs + tools). Update it when you
  add, remove, or rename either.

## Working style in this repo

- Prefer small, self-contained changes scoped to a single tool or doc.
- Match the surrounding code exactly — this is vanilla JS with a deliberate
  no-framework stance; do not "modernise" it with a build step or dependencies.
- Verify a tool change by opening its `index.html` in a browser (or serving the
  folder with `python3 -m http.server`) and exercising the flow — there are no
  automated tests to rely on.

## Git / branch workflow

- Development happens on feature branches (e.g. `claude/<topic>`), merged to the
  default branch (`main`) via pull request. Commit history shows squash-merged
  PRs with concise, imperative subjects (e.g. "Add root landing page linking to
  both tools (#10)").
- Push with `git push -u origin <branch>`; open a **draft PR** for the branch if
  one is not already open.
- Because merges to `main` deploy to Pages immediately, keep `main` in a working,
  openable state.

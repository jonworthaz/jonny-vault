# Forge — Claude Code Workflow Builder

A lightweight, zero-dependency web tool for **designing reusable workflows** for
[Claude Code](https://claude.com/claude-code) — visually — and then **generating
the real config** to drop into any project.

Compose a pipeline of **stages** (plan → implement → review → test → ship), drag
**agents, skills, tools and MCP servers** onto each stage, let **Tars** (a built-in
recommender) suggest what's missing, then hit **Generate** to export a `CLAUDE.md`
workflow section, a `settings.json`, `.mcp.json` and agent/skill stubs.

> The idea behind it lives in the vault's [Build & Tooling idea board](../10-build-and-tooling-board.md).

## How to use

It runs entirely in the browser. Nothing is uploaded anywhere — workflows autosave
to your browser's local storage, and you can export/re-open them as `workflow.json`.

### Easiest: double-click the launcher

- **macOS / Linux** → double-click **`start-mac-linux.command`**
- **Windows** → double-click **`start-windows.bat`**

It serves the tool at `http://localhost:8010`. Or just open **`index.html`**
directly — everything works that way too.

### Hosted

It also deploys to GitHub Pages alongside the MarkUp tool, at
`https://<owner>.github.io/<repo>/workflow-builder/`.

## What you do

1. **Describe the goal** in the box at the top of the canvas — Tars reads it and
   recommends a matching template (e.g. "fix a bug" → the Bug fix pipeline).
2. **Pick a template** (a *predefined build*) from the left, or **drag stages**
   onto the canvas one at a time.
3. **Drag agents / skills / tools / MCPs** from the palette onto a stage. (On a
   phone, *tap* a palette item to add it to the selected stage.)
4. **Reorder** stages by dragging the ⠿ handle; **move** elements between stages
   by dragging their chips; remove anything with its **×**.
5. Edit each stage's **title** and **instructions** inline.
6. Follow **Tars'** recommendations on the right — each is one click to apply.
7. **Generate** → review the artifacts in tabs, copy/download individually, or
   grab the whole **setup bundle**.

## What it generates

| Artifact | Path | What it is |
|---|---|---|
| **Workflow contract** | `CLAUDE.md` | The pipeline written up as stages with their agents/skills/tools/MCPs — append to your project's `CLAUDE.md` |
| **Settings** | `.claude/settings.json` | `permissions.allow` derived from the tools/MCPs used, plus `enabledMcpjsonServers` |
| **MCP config** | `.mcp.json` | Stub server entries for the MCPs you used (fill in real package/command + env) |
| **Agent stubs** | `.claude/agents/*.md` | One scaffold per **custom** agent (built-ins need no file) |
| **Skill stubs** | `.claude/skills/*/SKILL.md` | One scaffold per **custom** skill |
| **Project file** | `workflow.json` | Re-openable Forge project — load it via **Open** to edit later |
| **Setup bundle** | `<name>-claude-setup.md` | All of the above in one Markdown file — hand it to Claude Code and say "create these files" |

Anything shown as `<…>` is a placeholder you fill in (e.g. real MCP package names,
agent descriptions). The generated permissions are sensible **starting points** —
review them before committing.

## Templates (predefined builds)

| Template | Pipeline |
|---|---|
| **Feature build** | Plan → Implement → Review → Test → Document |
| **Bug fix** | Reproduce & diagnose → Fix → Verify → Review |
| **Research & report** | Research → Synthesise → Review |
| **Refactor** | Map → Plan → Refactor → Verify → Review |
| **Ship a PR** | Implement → Review → Security → Ship |

Templates are starting points — load one, then alter, amend and reorder it freely.

## Building blocks

- **Stages:** Plan · Research · Explore/Map · Implement · Review · Test/Verify ·
  Security review · Document · Ship/PR · Custom.
- **Agents:** the built-ins (`general-purpose`, `Explore`, `Plan`, `code-review`)
  plus any custom agents you add.
- **Skills:** `code-review`, `verify`, `security-review`, `run`, `simplify`,
  `deep-research`, `init`, plus custom.
- **Tools:** `Read`, `Edit`, `Write`, `Bash`, `Grep`, `Glob`, `WebFetch`,
  `WebSearch`, `Task`.
- **MCP servers:** `github`, `Context7`, `playwright`, `filesystem`, plus custom.

Add your own with the **＋ Custom** buttons — custom agents/skills get stub files
in the export.

## Tars — the recommender

Tars is a rule-based assistant (no network, no API key) that watches the workflow
and suggests improvements you can apply in one click:

- Matches your **goal text** to a template.
- Flags **structural gaps** — no plan up front, code changes with no review, an
  implement stage with no verify, shipping without a security review.
- Flags **per-stage gaps** — empty stages, an Implement stage missing `Edit`/`Bash`,
  a Review stage missing the `code-review` skill, a `github` MCP with no Ship stage.

## Files

- `index.html` — layout
- `styles.css` — styling (shares the MarkUp dark theme)
- `app.js` — the builder engine, Tars recommender and config generators (no deps)

## Shortcuts

`Cmd/Ctrl+S` — open Generate · `Esc` — close the dialog.

## Notes / possible next steps

- Everything is client-side; the export is text/JSON you apply yourself (or via
  Claude Code). There's no write-back into your filesystem by design.
- Workflows are vector data re-rendered each change, so reorder/move/undo-by-edit
  all stay consistent and serialise cleanly to `workflow.json`.
- Could add: branching/parallel stages, a per-stage model picker, hook generation,
  importing your actual installed agents/skills/MCPs to populate the palette, and a
  shareable URL encoding of a workflow.

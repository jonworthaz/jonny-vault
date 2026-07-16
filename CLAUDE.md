# jonny-vault — working notes for Claude

A lean-subscription **playbook** (`01`–`08`), two **idea boards** (`09` product, `10`
tooling), and local-first **tools**: `claude-ideas/` (idea → launch system),
`workflow-builder/` (Forge), `image-annotator/` + `damage-assessment*/` (markup). The
site root (`index.html`) is a tools hub; everything deploys via GitHub Pages **branch
deployment** (no Actions workflow — don't reintroduce one).

## The idea → launch process

Ideas flow through **Claude Ideas** (`claude-ideas/`):

> **Dropbox** (capture) → **Idea Board** → **Research & Launch** (Medvi-OS gate scoring +
> Go / Hold / Recycle / Kill) → **workflow** (Forge) → **product brief**.

The **Medvi OS** (`02-operating-system.md`) *is* the gate scorecard. Every idea also faces
the two governing gates — **does it compound?** and **would it survive a screenshot?**
(`07-guardrails.md`). Prefer to **Kill/park** a weak idea over inflating it.

## How you (Claude) operate the board

- **Capture** — when the user says *"dispatch idea: X"* or drops a quick idea, run
  **`/dispatch-idea X`**: append it to `claude-ideas/dropbox.json`. It shows in the
  Dropbox tab on next load.
- **Analyse / fill** — run **`/fill-idea-board`** (or delegate to the **`idea-analyst`**
  agent) to take ideas from raw → gated, following `claude-ideas/AGENT.md`. Write results
  to `claude-ideas/board.json` and **bump its `version`**; the app ingests it on load
  (upsert by id, non-destructive).
- **Research** — use the **`idea-scout`** agent for market context before analysis.

This is designed to run **end-to-end without human intervention**: dispatch → analyse →
gate decision → promote, all as file/JSON edits the app picks up.

## Agents & commands (this repo's `.claude/`)

| Kind | Name | Purpose |
|---|---|---|
| Agent | `idea-analyst` | Full end-to-end analysis + gate of one idea |
| Agent | `idea-scout` | Market research for one idea |
| Command | `/dispatch-idea <text>` | Quick-capture to the dropbox |
| Command | `/fill-idea-board [filter]` | Autonomous analyse + fill loop |

## Conventions

- **Keep ids stable** when updating an idea (the store upserts by id). Never reuse a
  dispatch/board `id`.
- Match existing code style: **zero-dependency**, vanilla JS, the shared dark theme.
- Don't modify another tool's folder unless asked.
- The desktop **Claude Home** app port guide is `claude-ideas/SPEC.md`; the board's data
  contract + agent protocol is `claude-ideas/AGENT.md`.

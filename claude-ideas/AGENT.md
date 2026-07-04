# Claude Ideas — Agent Protocol

How an AI agent (e.g. Claude Code) fills and runs the idea board **end-to-end, with
no human in the loop**. Claude Ideas is a local-first static app — it has no built-in
LLM. The **agent is the analysis engine**; it reads and writes the same JSON the app
uses, so anything a human can do in the UI, an agent can do via files.

> Data model & gate scorecard: see [`SPEC.md`](./SPEC.md). This doc is the *operating
> procedure*.

## The two channels

| Channel | File | Use |
|---|---|---|
| **Dispatch (capture)** | `dropbox.json` | Drop raw one-line ideas. The app ingests new entries into the **Dropbox** on load (deduped by `id`). |
| **Board sync (analysis)** | `board.json` | `{ "version": n, "ideas": [ … ] }`. The app **auto-upserts these by `id` on load**, once per `version`. This is the hands-off path — write analysed ideas here and **bump `version`**; no human Import needed. |
| **Import (manual)** | any `*.json` | A `{ "ideas": [ … ] }` doc the user loads via **Import data** (also upserts by `id`). Use when you can't write to the repo. |

### Running inside Claude Code

This repo ships the board as first-class Claude Code process (see the root `CLAUDE.md`):
- **`/dispatch-idea <text>`** → appends to `dropbox.json` (capture).
- **`/fill-idea-board [filter]`** → the autonomous loop below, writing `board.json`.
- Agents **`idea-analyst`** (analyse + gate one idea) and **`idea-scout`** (market research).

A human triggers nothing in the autonomous path except, at most, one **Import** (and
even that can be skipped if you write directly to the store — see "Direct" below).

## Capture: dispatch a raw idea

Append to the `dispatch` array in `dropbox.json` with a **unique `id`**:

```json
{ "dispatch": [
  { "id": "2026-06-21-001", "text": "Sectioned sprouting kit with metered spray", "ts": 1718900000000 }
] }
```

On next load the app creates a quick idea (`inbox: true`) in the Dropbox. Dedup is by
`id`, so never reuse one. (The user can also say *“dispatch idea: X → idea board”* and
you append it here.)

## Analyse: take an idea from raw → gated

For each idea, produce an object matching this shape and emit `{ "ideas": [ … ] }`:

```jsonc
{
  "id": "<keep the existing id to update in place>",
  "title": "…", "summary": "…",
  "inbox": false,                       // false = promote onto the board
  "status": "Captured|Researching|Analysed|Validated|Building|Launched|Parked",
  "medviOS": true,
  "gateScores": {                       // 0–5 each; the Medvi OS *is* the gate
    "recurring": 0, "margin": 0, "retains": 0, "screenshot": 0,
    "ownAcq": 0, "ownBilling": 0, "wave": 0, "aiBuildable": 0
  },
  "gateReviews": [
    { "decision": "Go|Hold|Recycle|Kill", "score": 0, "rationale": "…", "stage": "…" }
  ],
  "brainstorm": [ { "text": "variant / derivative / adjacent market" } ],
  "experiments": [
    { "title": "…", "type": "Interview|Survey|Landing page|Prototype|Smoke test|Tech spike|Other",
      "status": "Planned", "hypothesis": "we believe…", "metric": "success metric" }
  ],
  "analysis": "competition, pricing headroom, risks",
  "development": "what to build, positioning, GTM",
  "aiAnalysis": "one-paragraph verdict (shown with an ✨ AI badge)"
}
```

### Scoring rubric (be honest)
Score each criterion 0–5 against the **five laws** and the **two gates** (see
[`02-operating-system.md`](../02-operating-system.md) / [`07-guardrails.md`](../07-guardrails.md)):
recurring · margin funds distribution · AI collapses cost · outsource regulated/
capital-heavy · ride a wave; and *does it compound?* / *would it survive a screenshot?*

The app computes a weighted % (weights in `SPEC.md §5`). Map score → decision:

| Weighted score | Decision | Set status |
|---|---|---|
| ≥ 80 | **Go** | advance one stage |
| 60–79 | **Hold** | stay |
| 40–59 | **Recycle** | back one stage |
| < 40 | **Kill** | `Parked` |

## The autonomous loop

```
1. Read dropbox.json (+ optionally the user's exported ideas).
2. For each un-analysed / inbox idea:
     a. brainstorm variants/derivatives/adjacent markets,
     b. score the 8 Medvi-OS criteria (0–5) with reasoning,
     c. record a gateReview (decision from the rubric) + set status,
     d. propose 1–3 experiments with hypotheses + metrics,
     e. write analysis, development and a one-paragraph aiAnalysis,
     f. set inbox:false to promote it.
3. Write { "version": n+1, "ideas": [ … ] } to board.json (the app auto-applies it),
   or emit it for Import. Keep ids stable so re-runs update in place.
```

## Direct write (fully hands-off)
The app persists to `localStorage["claudeideas.ideas.v1"]` as `{ "ideas": [...] }`.
In an automated/browser context you may write that key directly with the same shape;
the app reads it on load. The file channels above are the portable, repo-friendly path.

## Guarantees the app gives you
- **Upsert by `id`** on Import — safe to re-run; existing ideas update, new ones add.
- **Missing sub-item `id`s are auto-assigned** on load, so you can omit them.
- Unknown fields are ignored; omitted fields take sensible defaults.

---
description: Autonomously analyse dropbox + board ideas and fill the Claude Ideas board
---

Fill the **Idea Board** end-to-end, following `claude-ideas/AGENT.md`. Optional filter /
focus: $ARGUMENTS

1. Read `claude-ideas/dropbox.json` (raw dispatches) and `claude-ideas/board.json`
   (current analysed ideas). Optionally read the user's exported ideas if provided.
2. Pick the ideas to work: raw/un-analysed dropbox items, plus anything $ARGUMENTS names.
3. For each idea (they are independent — you may fan out):
   - optionally run the **`idea-scout`** agent first for market context;
   - run the **`idea-analyst`** agent to produce a board-ready JSON object (Medvi-OS gate
     scores + Go/Hold/Recycle/Kill decision, brainstorm, experiments, analysis,
     development, `aiAnalysis`, `status`, `inbox: false`).
4. Merge all results into `claude-ideas/board.json` as
   `{ "version": <increment>, "ideas": [ … ] }` — **upsert by `id`**, keep stable ids, and
   **bump `version`** so the app applies the update on next load.
5. Summarise: how many analysed, and each idea's gate score % and decision.

Run without asking between ideas unless something is genuinely ambiguous or trips a
guardrail (`07-guardrails.md`). Prefer an honest Kill/park over an inflated Go.

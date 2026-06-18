---
name: dashboard
description: Read and operate the engine's control dashboard — the single surface showing workflow, what's happening, what's needed, recommendations, outcomes/comments, token spend, and human takeover. Use to get oriented, brief a human, or decide what to do next.
allowed-tools: Read, Bash(node *)
---

# Control dashboard

The dashboard is the one place to understand and steer the whole system. It reads
state only — **rendering it costs zero tokens**.

```bash
node engine/src/cli.ts dashboard
```

## What it shows

1. **Mode & autonomy** — LIVE/OFFLINE and `auto`/`assist`/`paused` (with a
   HUMAN IN CONTROL banner when paused).
2. **Workflow** — the phase pipeline with ✓/· status on each milestone.
3. **What's happening** — recent activity (runs, successes, failures, blocks).
4. **What's needed** — pending approvals with the exact approve/reject commands.
5. **Recommendations** — derived from state (no model call).
6. **Comments — outcomes & what to improve** — success/failure/block counts and flagged issues.
7. **Tokens used** — calls, in/out, cache reads, est. cost vs. budget, by loop.
8. **Control — human takeover** — the commands below.

## Operating it

- Orient: `dashboard` → read the workflow + recommendations.
- Act on needs: `approve <id>` / `reject <id>` (approval never auto-executes spend/publish).
- Run work: `cycle` (full loop) or an individual loop.
- **Human takeover:** `takeover` pauses the engine (loops refuse to run); inspect
  and act manually; `handback [auto|assist]` returns control. State persists across
  the handoff, so takeover is seamless — nothing is lost.

Brief a human from the dashboard, don't paraphrase raw state. If asked "what's the
situation / what next", run `dashboard` and summarise its Recommendations and
What's needed sections.

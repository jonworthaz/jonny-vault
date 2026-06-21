---
name: run-engine
description: Operate the AI-run business engine — run the self-improving loops, read state, and resolve approval gates. Use when asked to run a cycle, generate creative, analyse metrics/economics, score niches, manage experiments, or review/approve proposed actions.
allowed-tools: Read, Bash(node *)
---

# Run the engine

The engine (`engine/`) is the AI-run operating system for this business. It runs
offline with zero dependencies (`node engine/src/cli.ts <command>`) and uses the
live Claude API when `ANTHROPIC_API_KEY` is set. See [engine/README.md](../../../engine/README.md).

Current state:

```bash
node engine/src/cli.ts status
```

## Commands

| Command | What it does |
|---|---|
| `node engine/src/cli.ts cycle` | Run one full self-improving cycle (all five loops) |
| `node engine/src/cli.ts niche` | Score Phase-0 niche candidates |
| `node engine/src/cli.ts select-niche "<name>"` | Commit to a niche after validation |
| `node engine/src/cli.ts creative <channel> [angle]` | Generate guardrail-checked ad copy |
| `node engine/src/cli.ts analyze [metrics.csv]` | Unit economics + scale gate |
| `node engine/src/cli.ts retention "reason;reason"` | Churn analysis → fixes |
| `node engine/src/cli.ts experiment new "<hyp>" --variants a,b --metric trial_to_paid` | Register an A/B test |
| `node engine/src/cli.ts experiment conclude <id> --winner a` | Promote the winner into memory |
| `node engine/src/cli.ts actions` | List proposed actions (the approval gates) |
| `node engine/src/cli.ts approve <id>` / `reject <id>` | Resolve a proposed action |
| `node engine/src/cli.ts learnings` | Show the accumulated memory |

## The two rules you must respect

1. **Approval gates.** Loops only ever *propose* spend/publish actions. Approving
   one marks it ready — it does **not** execute. Moving money or publishing
   requires a human to connect and trigger an integration. Never imply the engine
   acted autonomously when it only proposed.
2. **Compliance.** Creative output is auto-linted; never hand-edit `state.json` to
   force a blocked asset through. Use the `compliance-check` skill on anything you
   write yourself before proposing it.

## Reading results

After a `cycle`, summarise: the niche leader, how many creatives passed vs were
blocked, the scale-gate verdict (PASS = economics support a *throttled* paid test;
HOLD = fix retention first), and the count of pending approvals. Then list the
pending actions and ask the human which to approve.

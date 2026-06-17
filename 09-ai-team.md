# 09 — The AI Team (Agents & Skills)

*The "AI workforce" from the plan, made real inside Claude Code. Five custom
subagents and four custom skills, plus the built-in agents/skills we reuse rather
than rebuild.*

## How it fits together

```
                         You (approval gates)
                                 │
                    ai-entrepreneur 🟣 (strategy / direction)
                       skill: strategic-direction
                                 │  sets direction, delegates
   ┌──────────────┬──────────────┼──────────────┬──────────────┐
   ▼              ▼              ▼              ▼              ▼
niche-researcher copywriter  compliance-    growth-analyst  affiliate-
   │              │          reviewer 🔴      │             manager
   │              │              │            │              │
 skill:         skill:        skill:        skill:         (compliance
 niche-         compliance-   compliance-   unit-           gate on all
 validation     check         check         economics       partner copy)
   │              │              │            │
   └─ engine loop ┴─ engine loop ┴─ guardrails┴─ engine loop
      (niche)        (creative)    linter        (analysis)
```

Every function maps to an engine loop, an agent that owns it, and a skill that
encodes the procedure.

## Custom subagents (`.claude/agents/`)

| Agent | Owns | Tools | Reuses |
|---|---|---|---|
| **ai-entrepreneur** 🟣 | Strategy & direction; answers "what should we do" | Read, Grep, Glob, Bash, WebSearch, WebFetch | `strategic-direction` skill (opus); delegates to all specialists + `Plan` |
| **compliance-reviewer** 🔴 | The guardrail gate before anything ships | Read, Grep, Bash | `compliance-check` skill (opus, run proactively) |
| **growth-analyst** | Unit economics + the scale gate | Read, Bash, Grep | `unit-economics` skill |
| **copywriter** | Honest, converting copy (self-lints) | Read, Bash, Write | `compliance-check` skill |
| **niche-researcher** | Phase-0 demand validation | Read, Write, Bash, WebSearch, WebFetch | `niche-validation` skill + `deep-research`, `Explore` |
| **affiliate-manager** | The distribution moat (doc 04) | Read, Write, WebSearch | `compliance-reviewer` gate |

## Custom skills (`.claude/skills/`)

| Skill | What it does | Wraps |
|---|---|---|
| **strategic-direction** | Founder-grade framework for decisions & answers | the plan + engine state |
| **compliance-check** | Lints copy against doc 07 before it ships | `engine/src/guardrails.ts` |
| **run-engine** | Operate the loops + resolve approval gates | `engine/src/cli.ts` |
| **unit-economics** | Compute/interpret CAC, payback, LTV, the scale gate | `engine/src/loops/analysis.ts` |
| **niche-validation** | The Phase-0 sprint procedure | `niche` loop + research tools |

## Built-in agents & skills we reuse (don't rebuild)

The instruction was to use existing capabilities first and only build the gaps.
We lean on these as-is:

| Built-in | Where we use it |
|---|---|
| **`deep-research`** skill | Fact-checked niche/market research (called by niche-researcher) — this is what produced [01-medvi-teardown.md](./01-medvi-teardown.md) |
| **`Explore`** agent | Broad fan-out searches across the codebase/sources |
| **`general-purpose`** agent | Multi-step research/execution that doesn't fit a specialist |
| **`Plan`** agent | Designing implementation plans for the product MVP build |
| **`code-review`** skill | Reviewing changes to the engine before merge |
| **`security-review`** skill | Security pass on the engine (we hold emails + Stripe tokens) |

## Assignment map — function → who does it

| Business function | Loop | Custom agent | Built-in backup |
|---|---|---|---|
| Set direction / make the call | — | ai-entrepreneur | Plan |
| Pick the niche | niche | niche-researcher | deep-research, Explore |
| Write the copy | creative | copywriter | — |
| Approve the copy | creative | **compliance-reviewer** | — |
| Read the economics | analysis | growth-analyst | — |
| Cut churn | retention | growth-analyst (+ product) | — |
| Build distribution | — | affiliate-manager | — |
| Build the product/MVP | — | (you + `Plan` agent) | general-purpose |
| Keep the engine healthy | — | — | code-review, security-review |

## The rule that binds the whole team

Two invariants survive every delegation, on every agent:

1. **Compliance is not optional** — anything public clears the compliance-reviewer
   / `compliance-check` skill first ([07-guardrails.md](./07-guardrails.md)).
2. **The human holds the gates** — agents *propose* spend/publish; nothing moves
   money or goes public without your approval ([08-roadmap.md](./08-roadmap.md)).

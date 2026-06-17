# Lean Subscription Engine

The AI-run operating system for the business planned in the [vault](../README.md).
A set of **self-improving loops** that generate, measure, learn, and recommend —
with hard **approval gates** on anything that spends money or publishes externally,
and a built-in **compliance linter** so the AI structurally cannot ship the
Medvi-style failures (fake personas, deepfake testimonials, false claims).

> Honest by construction. The economics are computed in code (never hallucinated);
> the compliance rules block fraud before it can be stored; money and publishing
> always wait for a human.

## Quick start

```bash
cd engine

# Runs fully offline with deterministic synthesis — zero dependencies needed:
node src/cli.ts cycle
node src/cli.ts status

# To use the real Claude API for the generative/judgment work:
cp .env.example .env   # add ANTHROPIC_API_KEY
npm install            # optional: installs @anthropic-ai/sdk
node --env-file=.env src/cli.ts cycle
```

Requires Node ≥ 22.6 (uses native TypeScript type-stripping — no build step).

## The loops (the "AI workforce")

| Loop | What it does | What's deterministic vs AI |
|---|---|---|
| **Niche** | Scores candidate niches (Phase 0) | Weighted scoring in code; AI writes the rationale |
| **Creative** | Generates honest ad copy variants | AI writes copy; **guardrails linter** blocks non-compliant ones |
| **Analysis** | Unit economics + the scale gate | Math in code; AI writes the recommendation |
| **Retention** | Turns churn reasons into fixes | AI proposes; prioritisation logic in code |
| **Experiment** | Registers/concludes A/B tests | The learning memory — winners feed back into Creative |

## How it "self-improves"

`data/state.json` is the engine's memory. Every loop reads prior state and writes
back. Concluded experiments and analysis results become **learnings**, which are
injected into the Creative loop's prompt on the next run — so generation is biased
toward what has actually worked. Run `cycle` repeatedly and the state compounds.

## The two safety rails (non-negotiable)

1. **Compliance linter** (`src/guardrails.ts`) — every generated asset is checked
   against doc 07's do-not-cross list. `block`-severity hits are never stored.
2. **Approval gates** — loops only ever *propose* spend/publish actions
   (`status: pending`). `approve <id>` marks them ready; the engine still does not
   move money or publish on its own. That requires integrations a human connects.

## Commands

```
status                         Show engine state
cycle                          Run one full self-improving cycle
niche                          Score candidate niches
select-niche "<name>"          Commit to a niche after validation
creative <channel> [angle]     Generate guardrail-checked ad copy
analyze [metrics.csv]          Unit economics + scale gate
retention [reason;reason]      Analyse churn, propose fixes
experiment new "<hyp>" --variants a,b --metric trial_to_paid
experiment conclude <id> --winner a
actions | approve <id> | reject <id>
learnings
```

## Wiring it to the real world (next integration steps)

The engine is the brain; these are the hands it needs (all human-gated):

- **Stripe** — subscriptions + the `analyze` metrics feed.
- **Affiliate platform** (Rewardful/FirstPromoter/Tolt) — execute approved partner actions.
- **Ad platform** (Meta/TikTok) — execute approved, compliant creatives.
- **PostHog** — replace `metrics.sample.csv` with a live cohort export.

Each becomes a tool the orchestrator can call *after* approval — never before.

# 12 — Build Plan: making the platform successful

*How to take this from a working prototype to an effective, AI-operated platform.
Concrete phases, owners (which agent/module), success gates, and the token
discipline that keeps it viable.*

## North star

A business that an AI team **operates** day-to-day — generating substantiated,
revenue-driving direction and execution — while a human holds the
money/publish gates. Success = recurring revenue that clears the scale gate,
produced at a token cost that's a small fraction of contribution.

## Phase 0 — Validate (now)

**Goal:** pick the product on evidence, not vibes.
- Owner: `niche-researcher` (+ `deep-research`). Controller: `ai-entrepreneur`.
- Replace placeholder signals in `engine/data/niches.json` with real demand/CPC/
  competitor data; `node engine/src/cli.ts niche`; cheap fake-door demand test.
- **Gate:** one niche shows clear pull (>~10–15% landing→signup) → `select-niche`.

## Phase 1 — Build the machine

**Goal:** product MVP + funnel + billing, minimal spend.
- Owners: built-in `Plan` agent + you (engineer); `copywriter` for funnel copy
  (every asset cleared by `compliance-reviewer`).
- Wire **Stripe** (billing + the `analyze` metrics feed) and **PostHog**
  (replace `metrics.sample.csv` with a live cohort export).
- **Gate:** a real user can sign up, get value in the first session, and be billed.

## Phase 2 — Prove retention before spend

**Goal:** validate unit economics on a small, honest cohort.
- Owners: `affiliate-manager` (recruit 5–20 partners), `copywriter`, `growth-analyst`.
- Run cohorts; `analyze`; watch the scale gate (payback ≤3mo, M1≥70%, M3≥55%, M6≥50%).
- **Gate:** the engine reports PASS on a real cohort → only then approve paid spend.

## Phase 3 — Scale (Medvi mode, honest version)

**Goal:** turn up distribution on proven economics.
- Open the affiliate program; throttle paid social to proven payback; flood
  *honest* creative; start the SEO flywheel; add `support-agent` (wired) for volume.
- Controller continuously reads the dashboard and reallocates (model, hold, spend).

## The operating loop (ongoing)

| Cadence | What | Surface |
|---|---|---|
| Per change | Run the relevant loop / agent | `cycle` or single loop |
| Daily | Read the dashboard; resolve approvals | `dashboard`, `approve/reject` |
| Weekly | Cohort + token-cost review; rebalance models | `dashboard` token drivers |
| Each pass | Self-improvement pass | [doc 10](./10-improvement-prompt.md) |

## Token discipline (what keeps it viable)

- Frontier model only for strategy/analysis; budget/cheap models for high-volume
  loops; non-Claude models where they're cheaper-for-equal-quality (all switchable
  per module from the dashboard).
- Watch the **TOP DRIVER** on the dashboard; if a module dominates cost, downgrade
  its model, lower effort, or hold it.
- Keep prompts small (caching + state compaction); move long-lived knowledge to a
  memory layer (backlog) once live.

## Success metrics

1. Scale gate PASS on a real cohort (the go/no-go for spend).
2. LTV:CAC ≥ 3:1 with 6-month retention ≥ 50%.
3. AI operating cost (tokens) < ~5% of contribution margin.
4. Zero compliance incidents (the linter + reviewer hold the line).

## Top risks & mitigations

| Risk | Mitigation |
|---|---|
| Confident-but-wrong AI output | Economics/compliance computed in code; grounding rules; verifier step (backlog) |
| Token cost creep | Per-module model routing + dashboard cost drivers + budget warning |
| Compliance blow-up (the Medvi failure) | Hard linter + compliance-reviewer gate before anything ships |
| Over-automation | Human holds spend/publish gates; per-agent hold + global takeover |
| Churn (the real killer) | Gate spend on retention; retention loop prioritises activation |

## What's still missing (build next)

Wire `affiliate-manager` + `support-agent` to engine loops; add a memory/RAG
layer; add a verifier step; connect the live integrations. Tracked in
[11-landscape-and-gaps.md](./11-landscape-and-gaps.md) and surfaced live in the
dashboard's **WHAT'S MISSING** section.

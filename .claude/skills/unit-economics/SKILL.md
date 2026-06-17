---
name: unit-economics
description: Compute and interpret the business's unit economics and the scale gate — CAC, ARPU, contribution, payback, LTV, LTV:CAC, and retention thresholds. Use when analysing whether to turn on paid spend, reading a metrics cohort, or sanity-checking growth decisions.
allowed-tools: Read, Bash(node *)
---

# Unit economics & the scale gate

The economics are computed deterministically in code — never estimate them by
eye. Source of truth: `engine/src/loops/analysis.ts` and [06-economics-and-funnel.md](../../../06-economics-and-funnel.md).

Run the analysis on a cohort:

```bash
node engine/src/cli.ts analyze [path/to/metrics.csv]
```

(Defaults to `engine/data/metrics.sample.csv`. Replace with a live Stripe/PostHog export.)

## The formulas

```
contribution/mo = ARPU × grossMargin%
payback (months) = CAC ÷ contribution
monthly churn    = 1 − m6Retention^(1/6)
LTV              = contribution ÷ monthly churn
LTV:CAC          = LTV ÷ CAC
```

## The scale gate — ALL must pass before recommending paid spend

| Check | Threshold |
|---|---|
| Payback | ≤ 3 months |
| Month-1 retention | ≥ 70% |
| Month-3 retention | ≥ 55% |
| Month-6 retention | ≥ 50% |

(Thresholds live in `engine/src/config.ts → scaleGate`.)

## Interpreting the verdict

- **PASS** → economics support a **throttled** paid-spend test, scaled strictly to
  proven payback. It does not mean "spend freely."
- **HOLD** → the limiting factor is almost always **retention, not CAC**. Fix
  activation / time-to-value / output quality and re-run the cohort before any spend.

> The one rule: CAC is not the risk — churn is. A great CAC with bad retention is
> a bucket with a hole.

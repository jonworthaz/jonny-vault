---
name: niche-validation
description: Run the Phase-0 niche-validation sprint — score candidate niches, research real demand/CPC/competitor signals, and decide which product to build first. Use at the start of the project or when re-evaluating which niche to commit to.
allowed-tools: Read, Write, Bash(node *), WebSearch, WebFetch
---

# Niche validation (Phase 0)

Decide the exact product to build before building it. Source: [03-our-business-plan.md](../../../03-our-business-plan.md) and [08-roadmap.md](../../../08-roadmap.md) Phase 0.

## Step 1 — Score the current candidates

```bash
node engine/src/cli.ts niche
```

This weight-scores the candidates in `engine/data/niches.json` on demand, buyer
intent, pricing headroom, buildability, and affiliate fit.

## Step 2 — Replace placeholder signals with REAL data

The seed signals in `engine/data/niches.json` are placeholders. Gather real
evidence per candidate and update the numbers (0–100):

- **demand** — search-volume / social trend for the buyer's problem.
- **intent** — CPC of the money keywords (proxy for buyer intent + monetisation).
- **pricingHeadroom** — gap between competitor pricing and our cost to serve.
- **buildability** — how defensibly good we can make the AI output today.
- **affiliateFit** — is there an obvious pool of creators/affiliates for this audience?

For the research, prefer the existing tools rather than reinventing them:
- The built-in **`deep-research`** skill for a fact-checked, multi-source read on a niche.
- The **`Explore`** or **`general-purpose`** agent for broad fan-out searches.
- `WebSearch` / `WebFetch` directly for quick signal checks (CPC, competitor pricing).

Re-run `niche` after updating the signals.

## Step 3 — Validate demand cheaply

Stand up 3–5 fake-door landing pages (or do manual outreach to ~20 target buyers)
and measure landing→signup. **Gate:** one niche shows clear pull (>~10–15% conversion).

## Step 4 — Commit

```bash
node engine/src/cli.ts select-niche "<winning niche name>"
```

Future cycles then build the product/funnel for that niche. Don't auto-select —
the human confirms based on the sprint data.

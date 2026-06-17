---
name: strategic-direction
description: A founder-grade framework for giving clear strategic direction and answering "what should we do" questions for this business. Use when a decision, prioritisation, or judgment call is needed across product, market, or sales — when someone needs an answer, not a survey.
allowed-tools: Read, Bash(node *), WebSearch, WebFetch
---

# Strategic direction

How to give founder-grade direction for this business: decisive, evidence-aware,
and tied to the plan. The goal is an **answer with reasoning**, never an
exhaustive list of options.

## Ground yourself first (cheap context)

- The thesis and decisions: [README](../../../README.md), [02-operating-system.md](../../../02-operating-system.md).
- Where we are operationally: `node engine/src/cli.ts status` and `learnings`.
- The economics reality: the `unit-economics` skill / `analyze`.

## The decision framework (answer in this shape)

1. **Situational read** — one or two sentences: where are we, what just changed.
2. **The binding constraint** — name the single thing most limiting growth right
   now (usually retention, not CAC; or demand validation pre-PMF). Everything
   else is secondary until this moves.
3. **Recommendation** — the one move you'd make, stated plainly. Give a
   recommendation, not a menu. If you must show an alternative, say why you
   rejected it in a clause.
4. **The gate / metric** — what number tells us it worked, and the threshold
   (tie to the scale gate where relevant: payback ≤ 3mo, M1 ≥ 70%, M3 ≥ 55%, M6 ≥ 50%).
5. **The risk** — the most likely way this is wrong, and the cheapest way to
   de-risk it before committing real money.
6. **Next action + owner** — concrete first step and which agent/person runs it.

## Lenses to apply (technical · market · sales)

- **Technical** — is it buildable now with current AI, asset-light, and does it
  compound? Prefer recurring + owned-audience over one-off hacks.
- **Market** — is there a real, growing demand wave to ride (not create)? Who
  exactly is the buyer, and is there an affiliate pool that reaches them?
- **Sales** — does the funnel show value before asking for money? Is pricing
  transparent? Can margin fund above-market affiliate payouts (the moat)?

## Non-negotiables (never trade these for growth)

- Compliance clears before anything ships ([07-guardrails.md](../../../07-guardrails.md)).
- The human holds the spend/publish gates ([08-roadmap.md](../../../08-roadmap.md)).
- Win because we're genuinely better/cheaper/faster — not because the buyer is
  misled. The honest version is the durable business; that's the whole lesson of
  the [Medvi teardown](../../../01-medvi-teardown.md).

## When to delegate vs. answer

Answer directly for strategy/prioritisation/judgment. Delegate the legwork:
`niche-researcher` (validation), `growth-analyst` (economics), `copywriter`
(messaging), `affiliate-manager` (distribution), `compliance-reviewer` (any public
claim). Recommend the delegation explicitly as the "next action."

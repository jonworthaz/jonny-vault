# Project Vault — The Lean Subscription Playbook

> Reverse-engineered from Medvi (Matthew Gallagher), re-engineered for a
> **non-health, geo-agnostic, digital subscription** business — keeping the
> mechanics that made the money, removing the shortcuts that are now sinking it.

## What this is

Medvi reached ~$401M in year-one revenue with **2 people and ~$20k** by treating
every business function except two — **customer acquisition** and **the billing
relationship** — as something to outsource or automate. That operating system is
fully transferable. The compounded-drug vertical, the fake-doctor ads, and the
misbranding are *not* the source of the value — they're the source of the FDA
warning letter, FTC scrutiny, and class actions. We copy the engine, not the fraud.

## The decisions we've locked

| Decision | Choice | Why |
|---|---|---|
| Vertical | **Non-health digital subscription** | Removes the entire drug/medical regulatory minefield; keeps high margin + recurring revenue |
| Geography | **Online / geo-agnostic** | Digital products ship instantly worldwide; no inventory, customs, or shipping friction |
| Posture | **Build-then-decide** | Build the operating system + funnel on minimal spend, scale once early conversion data is in |

## The documents

| # | Doc | What it covers |
|---|---|---|
| 01 | [Medvi Teardown](./01-medvi-teardown.md) | The research — exactly how Medvi works, deconstructed |
| 02 | [The Operating System](./02-operating-system.md) | The transferable playbook, abstracted from the vertical |
| 03 | [Our Business Plan](./03-our-business-plan.md) | Concrete: what we build, who for, pricing, GTM |
| 04 | [The Growth Engine](./04-growth-engine.md) | Affiliate-first distribution + paid + AI content machine |
| 05 | [Tech & AI Stack](./05-tech-ai-stack.md) | What to build, tools, automations, what AI does |
| 06 | [Economics & Funnel](./06-economics-and-funnel.md) | Funnel design, unit economics model, targets |
| 07 | [Guardrails](./07-guardrails.md) | The lines we don't cross — designing around Medvi's mistakes |
| 08 | [Roadmap](./08-roadmap.md) | 90-day phased build, with build-then-decide gates |
| 09 | [The AI Team](./09-ai-team.md) | Agents & skills — the workforce, and the built-ins we reuse |
| 10 | [Improvement Prompt](./10-improvement-prompt.md) | Reusable prompt to run another self-improvement pass |
| 11 | [Landscape & Gaps](./11-landscape-and-gaps.md) | How we compare to other agent systems; what's next |
| — | [engine/](./engine/README.md) | **The build** — loops, **control dashboard**, compliance linter, approval gates, token routing |

## The build (`engine/`)

The plan is now executable. [`engine/`](./engine/README.md) is a runnable,
AI-run business operating system that implements the playbook above:

- **Self-improving loops** — niche scoring, creative generation, unit-economics
  analysis, churn analysis, and an experiment memory that feeds back into
  generation. State persists in `engine/data/state.json` and compounds each run.
- **Compliance linter** — every generated ad is checked against [doc 07](./07-guardrails.md)
  before it can be stored; Medvi-style fraud (fake personas, deepfakes, false
  claims) is blocked by construction.
- **Approval gates** — the AI only ever *proposes* spend/publish actions; nothing
  moves money or goes public without a human.

Runs offline with zero dependencies (`node engine/src/cli.ts cycle`), and uses
the live Claude API automatically when `ANTHROPIC_API_KEY` is set.

## The one-line thesis

> Own the customer and the recurring charge. Automate or outsource everything else.
> Win distribution by paying affiliates more than anyone else can afford to —
> which you can only do if your margin is real and your retention is honest.

Start at [01-medvi-teardown.md](./01-medvi-teardown.md), then read in order.

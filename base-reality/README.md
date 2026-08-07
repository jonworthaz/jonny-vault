# base-reality.com — The Website Development Platform

> Sell finished-looking websites to the small businesses and local traders
> least likely to already have one — by showing them *their own site, already
> built*, the moment they log in. The build is lazy: nothing is finished until
> they walk through the door we posted to them.

## What this is

A distribution-first web-design business. Instead of pitching a service and
*then* doing the work, we invert it:

1. We hold a database of local businesses, enriched from their public data
   (name, logo, trade, contact details, opening hours, a scrape of their
   existing site or listing).
2. Each business gets a **unique access code**, delivered **through the post**
   or dropped at their premises — not emailed, not cold-called.
3. When someone from that business logs in with the code, the platform
   **generates their website on the spot** from their data record and a
   trade-appropriate template — a real, near-finished preview, behind their
   private login.
4. They see *their* logo, *their* details, *their* trade, in a modern site that
   looks live. Then we ask: want this for £X/month? Say yes and we finish it.

The trick that makes the economics work: **we build 20–30 partial templates
once, not hundreds of bespoke sites.** The per-business "build" is data
injected into a template, computed only when they log in. We do hundreds of
mailers, but only spend real build effort on the ones that convert.

## Why it wins

- **The pitch is the product.** A local trader can't picture "a website we'll
  build". They *can* react to their own finished-looking site in front of them.
  Seeing beats describing — conversion follows.
- **Post beats inbox.** These businesses are drowning in cold email and ignore
  it. A physical card with a login code, addressed to the business, gets opened
  and gets tried. Distribution is the moat, not the code.
- **Lazy, near-zero marginal cost.** Templates are built once. Data injection is
  cheap. A business that never logs in cost us a stamp, not a build.
- **Honest.** We show them a proposal for *their* benefit, built from *their*
  public data, and we're upfront that it's a mockup until they say yes.

## The one-line thesis

> Don't sell them a website. Post them the keys to one that already looks built,
> and only truly build it when they turn the key.

## The documents

| # | Doc | What it covers |
|---|---|---|
| 01 | [The Concept](./01-concept.md) | The inverted model, the "unbuilt until login" mechanic, why post wins |
| 02 | [Architecture](./02-architecture.md) | Recommended login → data record → template → live preview design; the data pipeline; the 1–2-person stack |
| 03 | [Funnel & Economics](./03-funnel-economics.md) | The postal-drop funnel, pricing, unit economics of mail → login → sale |
| 04 | [Guardrails](./04-guardrails.md) | Scraped-data lawful basis, postal-marketing rules, brand/logo fair use, the honesty lines |

## How this relates to the main vault

The [lean-subscription playbook](../README.md) (docs 01–10) is about a
*geo-agnostic digital subscription* won on affiliates. **base-reality is the
opposite geometry on purpose**: local, physical distribution, one-off + recurring
revenue, a service productised into templates. It reuses the vault's core
disciplines — build-then-decide, honest funnels, guardrails as a growth document
— against a market the affiliate model can't reach.

Start at [01 — The Concept](./01-concept.md).

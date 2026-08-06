# Vertus.ai — Exploration

*A teardown in the vault's house style: what Vertus is, how the machine
actually works, which mechanics are transferable, and which claims are the
load-bearing risk. We copy the go-to-market engine, never the unverifiable
narrative.*

> Source note: vertus.ai blocks automated fetching, so this is assembled from
> public search results, finance trade-press placements, and the company's own
> copy. Treat every performance and capability figure below as
> **self-reported and un-audited** unless stated otherwise.

## Snapshot

| Metric | Figure |
|---|---|
| Entity | Vertus Limited |
| Founded | 2024 |
| Domicile | Isle of Man |
| Founders | Julius Franck, Alex Foster, Michal Prywata |
| Positioning | "Cognitive intelligence" / "superintelligence" for high-stakes finance |
| Core product | Institutional AI for asset management + a "Superintelligence Platform" (chat + API) |
| Headline tech | "Brain topology" — claimed non-transformer architecture; `8Mn-General` & `8Mn-Coding` models; a "proprietary financial LLM" |
| Claimed 2025 performance | 51.15% net annual return · 2.13 Sharpe · 11 winning months · ~9.91% max drawdown (recovered in 9 days) |
| Claimed scale | 1M+ trading strategies/day · >$1B daily trading volume |
| Access model | Licensing to regulated partners; waitlisted "due to demand" |
| Pedigree claims | "NASA, MIT, DoD, leading hedge funds, frontier labs across three continents" |

## What Vertus actually is

Strip the vocabulary and Vertus is a **quant-trading + AI-licensing company
wrapped in a superintelligence narrative**. There are three things being sold,
stacked:

```
LAYER 1 — THE NARRATIVE  (the moat they're betting on)
  "World's first superintelligence" · "brain topology" · "evolves toward
  consciousness" · founder pedigree (NASA / MIT / DoD)
        │
LAYER 2 — THE PRODUCT
  (a) Institutional algorithmic trading — proprietary quant portfolios
  (b) A "Superintelligence Platform" — reasoning/coding via chat + API
        │
LAYER 3 — THE BUSINESS MODEL  (where the money is)
  License the engine to regulated partners who keep their own brand,
  against high AUM minimums + recurring economics
```

The interesting part for *us* is not whether the superintelligence claims are
true. It's that Layers 1 and 3 are a **textbook owned-customer / owned-recurring
-charge playbook** — the exact thesis this vault is built on — executed in a
high-status B2B niche instead of a consumer one.

## The access / pricing ladder

Vertus gates access behind large minimums and a waitlist. Reported tiers:

| Tier | Commitment | What you get |
|---|---|---|
| License | min ~$10M AUM | Full AI-trading infrastructure, **keep your own brand**, access to proprietary quant portfolios |
| Custom | min ~$20M | Bespoke "superintelligence" training on your data + joint portfolio development |
| Managed | min ~$50M | Vertus-managed allocations |

The pattern: **scarcity as a feature.** High minimums + "we've paused intake,
you're waitlisted" turns the sales motion into status-granting rather than
status-seeking. The buyer feels selected.

## The mechanics worth studying (the copy list)

These are transferable to a non-finance, geo-agnostic digital subscription —
the vault's lane — with zero of the regulatory exposure.

1. **Sell the category, not the feature.** Vertus doesn't pitch "a faster
   model." It pitches "superintelligence." Owning a category word lets you set
   the comparison and the price. (Our analogue: name and own the outcome, not
   the tool.)
2. **White-label / license the engine; let partners own the front.** Partners
   keep their brand; Vertus keeps the IP and the recurring fee. This is "own
   the recurring charge, outsource the relationship's face" — the Medvi insight
   inverted for B2B.
3. **Scarcity + waitlist + high minimums.** Manufactured exclusivity raises
   willingness-to-pay and filters for serious buyers. Cheap to implement,
   compounding in effect.
4. **Founder-pedigree as a trust shortcut.** NASA / MIT / DoD / hedge-fund
   provenance does the credibility work that a track record would otherwise
   have to. Whether or not it's load-bearing, it is *cited everywhere*.
5. **Performance-as-marketing — one hero number.** "51% in 2025" and "$1B/day"
   are repeated as the headline. A single, memorable, repeatable metric beats a
   nuanced deck.
6. **An owned-media PR engine.** Vertus seeds near-identical "thought
   leadership" pieces across finance trade press (FinanceMagnates, TheStreet,
   Digital Isle of Man, MEXC, etc.) to manufacture third-party-looking
   credibility. Low marginal cost, high trust transfer.
7. **Regulated-partner distribution.** Rather than become regulated itself for
   every market, Vertus rides partners who already are — the asset-light
   "rent the regulated layer" move, same shape as Medvi renting telehealth.

## The load-bearing risk (the do-NOT-copy list)

This is the Vertus equivalent of Medvi's fake doctors and misbranding: the part
that produced the headlines *and* is the existential exposure. Separable from
the engine — so we leave it.

| Claim / choice | Why it's the risk |
|---|---|
| "World's first superintelligence" / "evolves toward consciousness" | Extraordinary, **unfalsifiable**, independently unverified. One credible debunk collapses the entire narrative-as-moat. |
| "Brain topology, not transformers" | Unfalsifiable technical mythology. Differentiation that can't be inspected can't be trusted by a sophisticated buyer for long. |
| 51% / 2.13 Sharpe / $1B-a-day | **Self-reported, un-audited.** Surfaced via pay-to-play "thought leadership" and partly self-reported tracking, not audited filings or a third-party verifier. |
| Isle of Man domicile + AUM gating | Light-touch jurisdiction + minimums that screen out retail scrutiny. Regulatory arbitrage is not a substitute for genuine compliance — it just delays the reckoning. |
| Pedigree name-drops without specifics | "NASA / MIT / DoD" with thin verifiable detail is a credibility liability if pressed. |

**The lesson, in one line:** Vertus is a clean demonstration that the
owned-engine + licensed-distribution + scarcity model works — *and* a warning
that staking your moat on claims you can't prove is the same trap, in a
different costume, as Medvi's fake credentials.

## What we keep

1. **Category ownership** — name and own the outcome we sell.
2. **License/white-label the engine** where it makes the buyer's life easier —
   we keep the IP and the recurring charge.
3. **Scarcity, waitlists, and tiered minimums** to raise WTP and qualify buyers.
4. **One hero metric**, honestly measured, repeated everywhere.
5. **An owned-media credibility engine** — but pointed at *verifiable* claims.
6. **Ride regulated/established partners** instead of becoming the regulated
   layer ourselves.

## What we explicitly refuse

- Claims we cannot independently substantiate. (Per [07 — Guardrails](./07-guardrails.md):
  if a debunk would sink us, we don't say it.)
- Performance figures presented as audited when they are self-reported.
- Jurisdiction-shopping as a stand-in for actually being compliant.

→ Compare with the original engine: [01 — Medvi Teardown](./01-medvi-teardown.md)
· Cross-check against [07 — Guardrails](./07-guardrails.md)

# 03 — Funnel & Economics

*The postal-drop funnel, the pricing, and the unit economics of
mail → login → sale.*

## The funnel

```
Mailer dropped (post or hand-delivered)   ← the unfair-advantage channel
   → Curiosity ("we built you a website")  ← it's about them, already done
   → Login with code                        ← the one action we need
   → Instant personalised preview            ← the "wow" (their logo, their trade)
   → Honest frame + offer                     ← "it's a proposal — want it live?"
   → Yes → checkout (build + monthly)          ← Stripe, transparent
   → Finishing round (edits, domain, hosting)   ← small, fast; the paid labour
   → Go live + care plan                         ← recurring revenue begins
```

Every stage is measurable because **the code ties each login to one mailer.** A
physical channel with digital-grade attribution.

## The four conversion gates (where money is won or lost)

| Gate | The number | The lever |
|---|---|---|
| **Deliver → Login** | % of mailed businesses that log in | Mailer creative + curiosity + local credibility |
| **Login → Impressed** | % who react positively to the preview | Data quality + Claude copy + template fit ([02](./02-architecture.md)) |
| **Impressed → Yes** | % who buy | Price framing + how "finished" it feels + trust |
| **Yes → Retained** | % still on the care plan at month 6 | Real hosting value + support + not over-promising |

The whole model lives or dies on **gate 1 (login rate)** and **gate 2 (preview
quality)**. Gate 1 is distribution; gate 2 is Claude. Obsess over both.

## Pricing

A one-off to build + a recurring care plan. Priced to undercut agencies badly on
the up-front (the barrier) while owning a modest, sticky recurring line.

| Component | Price (illustrative) | Notes |
|---|---|---|
| **Build / go-live** | **£149–£299 one-off** | Wildly below the £1,500+ agency norm — because it's template + data, not bespoke |
| **Care plan** | **£15–£29/month** | Hosting, domain, edits, backups, support — the recurring relationship |
| **Annual care** | **2 months free** | Pulls cash forward, cuts churn |
| Optional add-ons | booking, extra pages, SEO, e-com | Upsell after the first "yes" |

Rules we lock (from the vault's [pricing lessons](../03-our-business-plan.md)):

- **Transparent before payment** — build fee, monthly price, and renewal date
  shown in plain language *before* the card. No padded cadence, one-click cancel.
- **The low up-front is the whole unlock.** The barrier for these buyers is the
  £1,500 quote, not £19/month. Kill the barrier, keep the recurring.

## Unit economics — the mailer is the CAC

Unlike the vault's digital model (affiliate CAC), here **CAC is dominated by the
physical drop.** Illustrative, per mailer:

| Item | Illustrative |
|---|---|
| Print + postage per mailer | ~£0.60–£1.20 |
| Enrichment + generated copy per record | ~£0.05–£0.20 |
| **Cost per business reached** | **~£0.70–£1.40** |

Now run a cohort of **1,000 mailers** with deliberately conservative gates:

| Gate | Rate | Count |
|---|---|---|
| Mailed | — | 1,000 |
| Log in | 8% | 80 |
| Impressed by preview | 60% of logins | 48 |
| Buy | 25% of impressed | **12 sales** |

- **Cohort cost:** 1,000 × ~£1.00 ≈ **£1,000**.
- **Up-front revenue:** 12 × ~£199 ≈ **£2,388** → mailer cost repaid on day one
  from build fees alone.
- **Recurring added:** 12 × ~£19 ≈ **£228/month** of new care-plan MRR.
- **Effective CAC per customer:** £1,000 ÷ 12 ≈ **~£83** — fully covered by the
  first build fee, with the entire care plan as margin on top.

> The physical channel looks expensive per touch but is cheap per customer *when
> the preview converts* — because the up-front build fee alone repays the whole
> cohort's postage. The recurring line is then near-pure margin.

## Sensitivity — what actually moves the model

| If this changes | Effect | So focus on |
|---|---|---|
| Login rate 8% → 12% | +50% customers, same postage | **Mailer creative + curiosity hook** |
| Impressed rate 60% → 75% | +25% customers, £0 extra spend | **Claude copy + template quality** |
| Buy rate 25% → 35% | +40% customers | **Price framing + "finished" feel + trust** |
| Care-plan churn ↓ | Compounds every cohort | **Real hosting value + honest support** |

The cheapest levers (gates 2 and 3) are the quality ones — and they cost
generated pennies, not more postage. **Quality is a better growth investment than
volume** until the funnel is tuned.

## The scale gate (build-then-decide, applied)

Do **not** scale the mail volume until, from an initial test cohort:

- [ ] Login rate ≥ 6% (the physical channel is working), **and**
- [ ] Impressed-by-preview ≥ 50% (the product is credible), **and**
- [ ] Up-front revenue ≥ cohort mailer cost (self-funding acquisition), **and**
- [ ] Early care-plan churn is sane (month-1 retention ≥ 80%).

Hit all four → scale the drops geographically, trade by trade. Miss → fix the
mailer or the preview quality *before* buying more postage.

→ Continue: [04 — Guardrails](./04-guardrails.md)

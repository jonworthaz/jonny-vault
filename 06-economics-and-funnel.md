# 06 — Economics & Funnel

*The funnel design and the unit-economics model that decides whether we scale.*

## The funnel (Medvi's quiz funnel, generalised)

Medvi's quiz did two jobs: **qualify** the buyer and **commit** them before the
price. We copy the structure for a digital product.

```
Affiliate link / Ad
   → Landing page (one outcome, one promise)
   → "Quiz" / interactive demo  ← qualifies + shows value live
   → Result + tailored offer     ← personalised = higher conversion
   → Checkout (trial or intro)   ← card captured, step-up disclosed
   → Instant onboarding (AI)     ← first "win" within minutes
   → Lifecycle (email/SMS)       ← drive habit = retention
   → Renewal (30-day)            ← transparent
```

The "quiz" for an AI tool = a **live mini-demo**: the user gives one real input,
the product produces one real, impressive output, *then* asks for the card to
unlock more. Show value before asking for money. This converts far better than a
cold pricing page and is completely honest.

## The unit-economics model

The whole business reduces to four numbers:

| Symbol | Meaning | Target (illustrative) |
|---|---|---|
| **CAC** | Fully-loaded cost to acquire a paying customer (affiliate payout + ad spend ÷ conversions) | < $80 |
| **ARPU** | Avg revenue per user / month | ~$39 |
| **GM%** | Gross margin (≈100% minus model API cost) | ~90% |
| **Retention** | % still paying at month 6 | ≥ 50% |

Derived:
- **Monthly contribution** = ARPU × GM% ≈ $39 × 0.9 ≈ **$35**
- **Payback** = CAC ÷ contribution ≈ $80 ÷ $35 ≈ **~2.3 months**
- **LTV** (simple) = contribution ÷ monthly churn. At 50% 6-mo retention
  (~11% monthly churn): LTV ≈ $35 ÷ 0.11 ≈ **~$320** → **LTV:CAC ≈ 4:1** ✅

> The Medvi lesson restated: **CAC is not the risk — churn is.** A great CAC with
> bad retention is a bucket with a hole. For an AI product, retention = output
> quality + habit formation. Obsess over both.

## The scale gate (this is "build-then-decide", quantified)

Do **not** turn up paid spend until, from the affiliate + organic cohort:

- [ ] Payback ≤ 3 months, **and**
- [ ] Month-1 retention ≥ 70%, **and**
- [ ] Month-3 retention trending ≥ 55%, **and**
- [ ] At least one repeatable acquisition source.

Hit all four → scale aggressively (Medvi mode). Miss → fix product/retention
*before* spending, or re-pick the niche. This single discipline is what separates
a durable $400M business from a viral flameout.

## Sensitivity (why digital wins)

| Scenario | Medvi (drugs) | Us (digital) |
|---|---|---|
| Gross margin | ~50% | ~90%+ |
| Max affordable affiliate payout | Moderate | **High** (out-bid everyone) |
| Supply/regulatory shock | Severe (compounding ban) | Minimal |
| Marginal delivery cost | Real (pharmacy/ship) | ~$0 |

Same engine, structurally safer and *more* able to win the affiliate auction.

## Reporting cadence

Weekly, AI-generated from PostHog + Stripe:
- New trials, trial→paid %, new MRR, churned MRR, net MRR.
- CAC by channel, payback, cohort retention curves.
- Top affiliates, top creative, top churn reasons (from cancel survey).

→ Continue: [07 — Guardrails](./07-guardrails.md)

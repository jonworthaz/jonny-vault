# 02 — The Operating System

*The Medvi playbook abstracted from drugs/telehealth into a reusable system.*

## The principle

> A modern business has ~7 functions. You need to **own** the two that compound
> (acquisition, billing/retention) and **rent or automate** the other five.

| Function | Medvi | Our default |
|---|---|---|
| Product/delivery | Rented (pharmacy + doctors) | Rented/automated (white-label or AI-built) |
| Acquisition | **Owned** (affiliates + ads) | **Owned** |
| Creative production | Automated (AI) | Automated (AI) |
| Customer support | Automated (AI) | Automated (AI) + escalation |
| Billing | **Owned** (subscription) | **Owned** (Stripe) |
| Compliance/legal | Rented | Rented (advisor) + built-in by design |
| Ops/admin | Founder + AI | Founder + AI |

## The five laws of the lean engine

### 1. Recurring beats one-off
Subscription revenue compounds and makes high CACs survivable. Everything we
build must bill monthly (or annually) by default.

### 2. Margin funds distribution
Affiliates go where the payout is highest. You can only pay the highest payout if
your gross margin is large. **Digital products (≈100% margin) let us out-pay
everyone** without the drug-supply risk Medvi carries.

### 3. AI collapses fixed cost
Code, copy, design, video, support — all near-zero marginal cost. A 2-person team
can operate at the surface area of a 50-person team. Headcount is a liability
(the Watch Gang lesson), not an asset.

### 4. Outsource what's capital-intensive or regulated
Don't own inventory, warehouses, or licences if a partner will rent them. Stay
liquid and fast. For us (digital), there's barely anything to outsource — which
is *better* than Medvi, not worse.

### 5. Ride a wave; don't make one
Medvi rode Ozempic. Creating demand is expensive; capturing existing demand is
cheap. We pick a category with a visible, growing search/social tailwind.

## The reusable architecture

```
        ┌─────────────────────────────────────────┐
        │   ACQUISITION (owned)                     │
        │   • Affiliate network (core)              │
        │   • Paid social (scale lever)             │
        │   • AI content / SEO (compounding free)   │
        └───────────────────┬───────────────────────┘
                            │
        ┌───────────────────▼───────────────────────┐
        │   FUNNEL (owned)                           │
        │   Quiz/assessment → offer → checkout       │
        └───────────────────┬───────────────────────┘
                            │
        ┌───────────────────▼───────────────────────┐
        │   PRODUCT / DELIVERY (rented or AI-built)  │
        │   Digital tool / content / community       │
        └───────────────────┬───────────────────────┘
                            │
        ┌───────────────────▼───────────────────────┐
        │   BILLING + RETENTION (owned)              │
        │   Stripe subscription · AI support ·       │
        │   lifecycle email/SMS · win-back           │
        └─────────────────────────────────────────────┘
```

## Why digital is the superior substrate for this playbook

Medvi's hardest constraints — drug supply, shipping, pharmacy licensing,
regulatory exposure — **all live in the physical/medical delivery layer.** Move
the product to a digital subscription and:

- Gross margin goes from ~50% to ~95%+ → you can pay affiliates even more.
- Delivery is instant and global → truly geo-agnostic.
- No inventory, no fulfilment partner, no shipping complaints.
- The compliance surface shrinks from "drug misbranding" to "honest advertising
  + data protection" — both of which are easy to get right by design.

The only thing digital must earn that drugs didn't: **the product has to be
genuinely good enough to retain.** That's the whole game (see Economics).

→ Continue: [03 — Our Business Plan](./03-our-business-plan.md)

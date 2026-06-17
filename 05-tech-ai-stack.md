# 05 — Tech & AI Stack

*What to build, what to buy, and what the AI actually does. Designed for 1–2 people.*

## Principle

Buy/rent everything that isn't the core product. Build only the funnel, the
product's unique logic, and the billing glue. Use AI as the workforce.

## The stack

| Layer | Choice | Why |
|---|---|---|
| Landing/funnel | Next.js (AI-coded) or Framer/Webflow | Fast, conversion-optimised, geo-agnostic |
| App / product | Next.js + a serverless backend (Vercel/Cloudflare) | Cheap, scales to zero, global |
| Auth | Clerk / Supabase Auth | Off-the-shelf, secure |
| Database | Supabase / Postgres | Managed, simple |
| Payments + subscriptions | **Stripe Billing** | Owns the recurring relationship; affiliate tools integrate natively |
| AI inference | Claude API (primary) + others as needed | The product's brain; pick best model per task |
| Affiliate tracking | Rewardful / FirstPromoter / Tolt | Stripe-native attribution + payouts |
| Email/SMS lifecycle | Resend/Customer.io + Twilio | Onboarding, retention, win-back |
| Support | AI chat (LLM) + human escalation inbox | Medvi's "AI customer service", done honestly |
| Analytics | PostHog + Stripe metrics | Funnel, retention, cohort LTV |
| Ad creative | LLM (copy) + image/video models | The creative machine |

## What the AI does (the "employees")

| "Role" | Tool | Output |
|---|---|---|
| Engineer | Coding LLM (e.g. Claude Code) | Builds + maintains funnel, app, automations |
| Copywriter | LLM | Ads, landing pages, emails, product copy |
| Designer | Image models | Ad creative, social, brand assets |
| Video producer | Video models | Short-form ad variants (honest, labelled if synthetic) |
| Support agent | LLM + RAG over docs | Tier-1 support, 24/7, escalates edge cases |
| Analyst | LLM over PostHog/Stripe exports | Weekly cohort/funnel/retention readouts |
| The product itself | Claude API | The actual value the customer pays for |

> Use the latest, most capable models for anything customer-facing — output
> quality *is* the retention lever for an AI product.

## Build vs. buy summary

- **Build:** the funnel, the product's unique prompt/agent logic + UX, the
  Stripe↔affiliate↔lifecycle glue.
- **Buy:** auth, DB, payments, affiliate tracking, email/SMS, analytics, model APIs.
- **Outsource (spot):** legal/compliance review, brand/design polish, accountant.

## Data & security baseline (non-negotiable from day 1)

Medvi's partner leaked 1.6M records. Even with no health data, we hold emails,
payment tokens (via Stripe — we never store cards), and usage data.

- Stripe holds card data; we never touch raw PANs.
- Encrypt at rest + in transit; least-privilege access.
- A real privacy policy + cookie consent; honour deletion requests.
- If we ever touch EU/UK users (we will — geo-agnostic): **GDPR basics** —
  lawful basis, DPA with processors, breach plan. Cheap to do early, ruinous to retrofit.

## Cost envelope (to first revenue)

| Item | Monthly |
|---|---|
| Hosting/DB/auth | $0–$50 (scales to zero) |
| Model API | $50–$500 (usage-based) |
| Stripe | % of revenue only |
| Affiliate tool | $0–$50 |
| Email/SMS | $0–$50 |
| Domain/misc | ~$20 |
| **Total pre-ads** | **~$150–$700/mo** |

Mirrors Medvi's ~$20k-and-mostly-AI starting reality. The big variable spend
(ads) is switched on only after payback is proven.

→ Continue: [06 — Economics & Funnel](./06-economics-and-funnel.md)

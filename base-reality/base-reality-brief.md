# base-reality.com — Project Brief

*A self-contained brief for the base-reality.com website-development platform.
Portable: everything needed to pick this up in a fresh workspace (e.g. Cowork)
is in this one file — no external links required.*

---

## The idea in one line

> Don't sell local businesses a website. Post them a login code to a
> template-generated preview of *their own* site, and only truly build it when
> they log in and say yes.

## The market failure we exploit

Millions of small businesses and sole traders — plumbers, cafés, salons,
electricians, garages, groomers — have no website or a broken one. Not for lack
of wanting one, but because:

- They can't picture what they'd get, so the spend feels abstract and risky.
- Agencies quote £1,500–£5,000 up front for something invisible until it's done.
- The buying process is long (brief → mockups → revisions → sign-off) and they give up.
- They ignore the cold emails and calls that web shops use to reach them.

The value was never the code. It's **closing the imagination gap** and **reaching
a buyer who ignores every normal channel.**

## The inversion

| Traditional web dev | base-reality |
|---|---|
| Sell the promise, then build | Build the *preview*, then sell |
| Bespoke from a blank page | Data injected into pre-made templates |
| Reach buyers by email/ads (ignored) | Reach buyers by post (opened) |
| Customer must imagine the result | Customer sees their own site, already built |
| Cost incurred before any yes | Cost incurred (mostly) only after login/yes |

## How it works (end to end)

1. **Data** — hold a record per business, enriched from public info: logo, trade,
   contact, opening hours, services, brand colours, a scrape of their existing presence.
2. **Templates** — build **20–30 partial templates once** (by trade family ×
   aesthetic), not hundreds of bespoke sites. This is the only fixed-cost asset.
3. **Post, not email** — each business gets a **unique login code**, delivered by
   post or hand-dropped at the premises. Their inbox is noise; their letterbox isn't.
4. **Lazy generation** — on login, select a trade-appropriate template, inject
   their record + Claude-written copy, and render a live, near-finished preview.
5. **Close** — honest frame ("a proposal built from your public info, not yet
   live"), then the offer. Say yes → we finish it (edits, domain, hosting, go-live).

**The trick that makes the economics work:** templates are built once; the
per-business "build" is data injection computed only when they log in. Hundreds of
mailers, zero bespoke sites, until someone converts. A business that never logs in
cost a stamp, not a build.

---

## Is it actually possible?

Yes — and the "site that builds when they log in" is the *easy* part. It's
personalised mail-merge for websites:

```
login code → look up the business's data record → inject into a
trade-appropriate template → render the page
```

Two viable patterns:

- **Pre-generate everyone** — build all N as static pages at scrape time, gate
  behind login. Dead simple; static hosting is nearly free.
- **Lazy on-login** (the true "builds when they log in") — generate + cache on
  first login. Never-logged-in = never built.

**Honest nuance:** template + data injection is free and instant, so pre-render
that for everyone. The only "expensive" per-business step is bespoke copy — and
that's fractions of a penny with Claude. So "builds on login" is a great
*marketing* frame over a slightly softer truth: *the personalised site exists as
data + template and renders on login.*

**The real difficulty is not the tech** (that's ~20%). The 80% that decides
whether it makes money:

1. Data quality at scale (clean logo, real services, hours, photos).
2. Output that doesn't look like a template with a logo pasted on.
3. Physical distribution logistics (print, address, post — cost + ops).
4. Legal (scraping/GDPR, using their brand, unsolicited mail).
5. Fulfilment when they say yes (finishing, hosting, support, churn).

---

## The recommended architecture

**The pipeline (per business):**

```
Unique code (on the mailer)
  → look up the business's data record
  → select a trade-appropriate template
  → inject the record + Claude-written copy
  → render a live, near-finished preview (behind their login)
  → if yes: finish, add domain + hosting, go live
```

**The data record — the atomic unit** (the only per-business asset before conversion):

```json
{
  "id": "biz_04213",
  "code": "R7K2-9QWD",
  "status": "mailed",              // scraped → enriched → mailed → viewed → sold
  "business": {
    "name": "Ferndown Boiler Care",
    "trade": "plumbing_heating",   // drives template selection
    "blurb": "Gas-safe boiler installs & repairs across Ferndown.",
    "services": ["Boiler repair", "Installations", "Landlord certs"],
    "areas": ["Ferndown", "Wimborne", "Poole"]
  },
  "brand": { "logo_url": "…", "colours": ["#0a4d8c", "#f5a623"], "tone": "trusted, local" },
  "contact": { "phone": "…", "email": "…", "address": "…", "hours": {} },
  "source": { "scraped_from": "…", "captured": "2026-07-20", "confidence": 0.82 },
  "site": { "template": "trades-classic", "generated_copy": {}, "cached": true }
}
```

**Templates:** sets of slots (`{logo}`, `{services}`, `{hours}`, `{gallery}`,
`{cta}`) that **degrade gracefully** — no photos → that section collapses, never
breaks. Trade → template is a default, overridable per record.

**The data pipeline (supply side):**

```
Business discovery → Enrichment → Normalisation → Record + code → Mailer queue
```

**Where Claude does the real work** (the mechanism is trivial; quality is everything):

| Layer | Claude's job | Why it's the leverage point |
|---|---|---|
| Enrichment | Messy scrape → clean structured record | Removes the data-quality bottleneck |
| **Copywriting** | Bespoke homepage/about/services/SEO in *their* voice | Stops every site looking like the same template |
| Brand read (vision) | Logo/site screenshot → colours, style, template pick | Personalised design, no manual designer |
| Platform build | Claude Code builds templates, injection engine, login/admin | 1–2-person team ships a platform |
| Lifecycle | Drafts follow-ups, onboarding, edit-round comms | Cheap, high-leverage sales support |

**The stack (1–2 people, scales to zero):** Next.js on Vercel/Cloudflare
(templates + preview) · Supabase/Postgres (the record store *is* the backend) ·
code-redemption login · Claude API (enrich + copy + vision) · a prospecting/
enrichment data source · Make (pipeline automation) · a print/mail-house API ·
Figma/Canva (template + card design) · Stripe (one-off build + monthly care).

---

## Funnel & economics

**The funnel:**

```
Mailer dropped → Curiosity ("we built you a website") → Login with code
  → Instant personalised preview → Honest frame + offer → Yes → checkout
  → Finishing round (edits, domain, hosting) → Go live + care plan
```

Every stage is measurable — the unique code ties each login to one mailer.

**The four conversion gates (where money is won or lost):**

| Gate | The lever |
|---|---|
| Deliver → Login | Mailer creative + curiosity + local credibility |
| Login → Impressed | Data quality + Claude copy + template fit |
| Impressed → Yes | Price framing + how "finished" it feels + trust |
| Yes → Retained | Real hosting value + honest support |

Gate 1 is distribution; gate 2 is Claude. Those two decide the business.

**Pricing:** ~£149–£299 one-off build (vs the £1,500+ agency norm — killing the
barrier is the whole unlock) + £15–£29/month care plan (hosting, domain, edits,
support — the sticky recurring line). Transparent before payment; one-click cancel.

**Worked cohort — 1,000 mailers, deliberately conservative gates:**

| Gate | Rate | Count |
|---|---|---|
| Mailed | — | 1,000 |
| Log in | 8% | 80 |
| Impressed by preview | 60% of logins | 48 |
| Buy | 25% of impressed | **12 sales** |

- Cohort cost: 1,000 × ~£1.00 ≈ **£1,000** (print + postage + pennies of enrichment).
- Up-front revenue: 12 × ~£199 ≈ **£2,388** → postage repaid day one from build fees alone.
- Recurring added: 12 × ~£19 ≈ **£228/month** of new care-plan MRR (near-pure margin).
- Effective CAC: £1,000 ÷ 12 ≈ **~£83**, fully covered by the first build fee.

**The cheapest levers are the quality ones (gates 2 & 3)** — they cost generated
pennies, not more postage. Quality beats volume until the funnel is tuned.

**The scale gate (don't buy more postage until):** login rate ≥ 6%, impressed
≥ 50%, up-front revenue ≥ cohort mailer cost, month-1 retention ≥ 80%.

---

## Guardrails (the lines we don't cross)

This model holds scraped data, uses others' branding, and posts unsolicited —
all *before* consent. Handled cleanly, the honesty **is** the pitch. UK-first
framing; not legal advice — a solicitor reviews specifics before scaling.

| # | Line | Prevents |
|---|---|---|
| 1 | **Public-source data only, with a lawful basis** (documented legitimate-interest assessment; privacy info at first contact) | ICO complaint / "where did you get this?" |
| 2 | **Honest framing always** — preview clearly a *proposal, not yet live* | Deception, chargebacks, reputation |
| 3 | **Their brand used *for them*, not by us** — shown back in a private, login-gated proposal; never published, never in our own marketing | Copyright / trademark / passing-off exposure |
| 4 | **Easy, real opt-out** — one step, honoured immediately and permanently | Nuisance status, repeat-contact complaints |
| 5 | **Transparent pricing** — fees + renewal shown before payment; one-click cancel | Subscription-trap scrutiny |
| 6 | **Data protection by design** — minimal, encrypted, Stripe for cards, breach plan | A breach of our prospect list |
| 7 | **Accurate or absent** — low-confidence fields collapse rather than show wrong data | Showing a trader wrong info about themselves |

**Key specifics:**

- **UK GDPR:** business data often includes personal data (sole trader's name/
  mobile). Lawful basis = legitimate interests + a real LIA. **Article 14** notice
  required when you collect data *not from the person* — put a plain-language
  privacy line on the mailer + full notice at login (doubles as trust-building).
- **Post is the lighter-touch channel by design:** PECR (email/SMS/calls) does
  **not** govern addressed post — a genuine structural advantage. Still respect
  the Mailing Preference Service and suppress opt-outs first-time, forever.
- **Logo/content:** reproducing their material in a private proposal shown only to
  them, for their benefit, is the defensible use. Never publish it, never use it
  in our advertising, stop using it after a "no".

**The honesty frame (the login screen), which also converts best:**

> *"We've put together a website concept for **[Business]** using your publicly
> available information. It's a proposal — not live, not published, nothing is
> signed up. Take a look. If you like it, here's exactly what it costs to make it
> real. If not, tell us and we'll delete your details."*

**The test for every growth idea:** *"If this business saw exactly how we got
their data and what we did with it, would they be pleased — or feel intruded on?"*
If the second, change it.

---

## Where this sits vs. the main vault

The main vault playbook is a *geo-agnostic digital subscription* won on
affiliates. **base-reality is the opposite geometry on purpose:** local, physical
distribution, one-off + recurring revenue, a service productised into templates.
It reuses the same disciplines — build-then-decide, honest funnels, guardrails as
a growth document — against a market the affiliate model can't reach.

## Suggested next step

Prove the mechanic with a **tiny prototype**: one hardcoded business, login code
→ generated preview — so the "wow" is clickable, not just described. Then run one
small real mailer cohort against the scale gate above before building further.

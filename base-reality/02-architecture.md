# 02 — Architecture

*How a login turns into a finished-looking website. The recommended design,
the data pipeline, and the stack for a 1–2-person team.*

## The recommended model: code → record → template → render

The whole platform reduces to one pipeline, run per business:

```
Unique code (on the mailer)
  → look up the business's data record        (who they are)
  → select a trade-appropriate template        (what it should look like)
  → inject the record + Claude-written copy     (make it theirs)
  → render a live, near-finished preview        (the "wow", behind their login)
  → if yes: finish, add domain + hosting, go live
```

Nothing here is exotic. It is **personalised mail-merge for websites**. The
value isn't the mechanism — it's the *data quality* and *copy quality* poured
through it (see [where Claude works](#where-claude-does-the-real-work)).

## The data record (the atomic unit)

Every business is one record. This is the only per-business asset we hold before
they convert. Illustrative shape:

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
  "brand": {
    "logo_url": "…", "colours": ["#0a4d8c", "#f5a623"], "tone": "trusted, local"
  },
  "contact": { "phone": "…", "email": "…", "address": "…", "hours": {…} },
  "source": { "scraped_from": "…", "captured": "2026-07-20", "confidence": 0.82 },
  "site": { "template": "trades-classic", "generated_copy": {…}, "cached": true }
}
```

The record is the product. Templates are interchangeable; **the record is what
makes the site theirs.**

## Build once, inject forever: the template catalogue

- **20–30 templates**, organised by trade family (trades, food & drink, beauty &
  wellness, professional services, retail) × 2–3 aesthetics each.
- Each template is a set of **slots** (`{logo}`, `{services}`, `{hours}`,
  `{gallery}`, `{cta}`) that gracefully degrade — if a business has no photos,
  that section collapses instead of breaking.
- Templates are the **only fixed-cost build asset.** Everything else is data.
- Trade → template mapping is a default, overridable per record (a nicer template
  can be assigned to a high-value prospect).

> Fixed cost = the catalogue. Marginal cost = one data record + a few pennies of
> generated copy. That ratio is the entire business model.

## Where the "unbuilt until login" economics really land

Be precise about what costs what, so the model is honest:

| Step | When it runs | Cost |
|---|---|---|
| Scrape + enrich record | Batch, before mailing | Data/API — small, once |
| Template + data injection | Instant, on demand | ~£0 (rendering) |
| Claude-written bespoke copy | Batch pre-gen **or** on first login | Pennies per business |
| Real finishing (domain, hosting, edits) | **Only after they say yes** | The only real labour |

So the truthful version of "only built if they log in": the **expensive, human
part** — finishing and hosting a real site — happens only on conversion. The
cheap part (template + record + generated copy) can be pre-rendered so the
preview is instant. Never-logged-in businesses cost a **stamp**, not a build.

## The data pipeline (supply side)

```
Business discovery  →  Enrichment  →  Normalisation  →  Record + code  →  Mailer queue
```

- **Discovery / enrichment:** a prospecting/data source provides the raw business
  data (name, category, contact, site URL, listing). The **Vibe Prospecting**
  tool connected to this workspace is a natural fit for this layer — it is
  effectively the live version of the "scraped database" built in the earlier
  session.
- **Normalisation (Claude):** raw, messy fields → clean structured record.
  Classify the trade, extract a services list, write the blurb, infer tone, pull
  brand colours from the logo/site.
- **Code assignment:** generate a unique, unguessable code per record; print it
  on the mailer.
- **Mailer queue:** hand off to print/post (see [03 — Funnel & Economics](./03-funnel-economics.md)).

## Where Claude does the real work

The mechanism is trivial; the quality is everything, and quality is Claude's job.

| Layer | Claude's job | Why it's the leverage point |
|---|---|---|
| Enrichment | Messy scrape → clean structured record | Removes the data-quality bottleneck |
| **Copywriting** | Bespoke homepage/about/services/SEO in *their* voice | Stops every site looking like the same template |
| Brand read (vision) | Logo/site screenshot → colours, style, template pick | Personalised design with no manual designer |
| Platform build | Claude Code builds templates, injection engine, login/admin | 1–2-person team ships a platform |
| Lifecycle | Drafts the follow-ups, onboarding, edit-round comms | Cheap, high-leverage sales support |

## The stack (1–2 people, scales to zero)

Mirrors the vault's [tech stack](../05-tech-ai-stack.md) — buy everything that
isn't the core, build only the pipeline + templates + login glue.

| Layer | Choice | Why |
|---|---|---|
| Templates + preview app | Next.js on Vercel/Cloudflare | Fast render, scales to zero, cheap static hosting |
| Data record store | Supabase / Postgres | Managed; the record table is the whole backend |
| Login (code redemption) | Custom code check + Supabase Auth for saved sessions | Codes are the entry, not passwords |
| AI (enrich + copy + vision) | Claude API | The quality engine; the reason it converts |
| Data supply | Vibe Prospecting / enrichment source | Feeds the record pipeline |
| Automation glue | Make | new business → enrich → generate → assign code → queue mailer |
| Print & post | Print-on-demand / mail house API | Physical distribution without owning a press |
| Design assets | Figma / Canva | Template variants + the postal-card creative |
| Custom sites at go-live | Same template, promoted to real domain + hosting | Finishing is small because the 90% is the template |
| Payments | Stripe (one-off build + monthly hosting/care) | Owns the recurring relationship |
| Analytics | Code-level funnel: mailed → viewed → sold | Every login attributable to one mailer |

## The two hard problems this design must keep solving

1. **Output must not look generated.** The defence is Claude-written, per-business
   copy + brand-matched templates + graceful slots — not one template with a logo
   dropped in. Budget effort here; it *is* the conversion rate.
2. **Data must be good enough to be flattering.** A wrong phone number or a stale
   logo kills trust instantly. Confidence-score records; only mail the ones above
   a threshold; let low-confidence fields collapse rather than show wrong data.

→ Continue: [03 — Funnel & Economics](./03-funnel-economics.md)

# 11 — Revenue Engine: first pound, not first business

*PRD for the "earn enough to keep the lights on" request (Sept 2026). Problem,
success criteria, scope, constraints, plan, open questions. Nothing is built until
this is signed off — that's the vault's own rule.*

## 0. The constraint that shapes everything

**Claude cannot pay for Claude.** Billing, plan changes and any purchase are out of
bounds for the assistant by the user's own number-one rule, and the assistant has
no card, no legal entity and no bank account. The request "earn money to pay for
the subscription" therefore decomposes into two jobs with two owners:

| Job | Owner | Why |
|---|---|---|
| Build the thing that is sold, the page that sells it, the outreach kit, the reporting | Claude | Buildable, reversible, no money moves |
| Open the payments account, set the price live, send the first messages, take the money, pay the bill | Jonny | Only a human with a legal entity can own the billing relationship (law #4 of the OS, applied to us) |

If the second column doesn't happen, the first column earns £0. That is the honest
shape of it, and every option below is scored on how little of column two it needs.

## 1. Problem

The Claude Max subscription costs money every month and there is currently no
revenue anywhere in this vault to offset it.

**What exists today (audited 9 Sept 2026):**

- 10 open draft PRs. Every one is strategy docs or a local-only prototype.
  **Zero working billing code in any branch** — no Stripe, Gumroad, Lemon Squeezy,
  Paddle or payment link anywhere. The only "stripe" hits are a shoe-sole geometry.
- The crypto bot PR's own verdict is *reject* (no edge found after backtests).
- The AI-CEO framework is still pre-niche-selection. The SaaS candidates in doc 03
  are months from a first invoice.
- What *is* finished: ~14 zero-dependency web tools, of which three are genuinely
  sellable as-is (see §4).

Pattern to name plainly: **the vault is long on plans and short on invoices.**
Adding an eleventh strategy doc does nothing unless it ends in a live checkout.
This doc is written to be the last one before that.

## 2. Success criteria

| Metric | Target | Why this number |
|---|---|---|
| **North star** | Net margin ≥ the Max bill, every month | Max is $100/mo (5x) or $200/mo (20x), ≈ £80–£160 + VAT. Source: claude.com/pricing, checked 9 Sept 2026 |
| First pound | Within **14 days** of sign-off | Anything longer is a "business plan", not a fix for this problem |
| Break-even | Within **60 days** | 5–8 customers at £19/mo, or ~3 one-offs a month at £39–£79 |
| Founder time | ≤ 3 hrs/week after launch | Otherwise the subscription is being paid for with the founder's hours, which is the thing it's meant to save |

Explicitly **not** a success criterion: MRR growth curves, affiliate programs, or a
niche pick for the doc-03 SaaS. Those stay on the roadmap; this is a bridge.

## 3. Scope

**In:** package what already works, put a merchant-of-record checkout in front of
it, drive the first 20 conversations, report weekly.
**Out:** new backend, accounts/auth, a new product, paid ads, affiliate program,
anything from the 🟡 idea board. Those are Phase 2+ of doc 08 and stay there.

## 4. Options, ranked by time-to-first-pound

Scores from a sellability audit of every tool in the repo plus a scan of all open PRs.

| # | Option | Buyer | Price (GBP) | Column-two effort needed | Time to first £ | Verdict |
|---|---|---|---|---|---|---|
| **A** | **Sell `damage-assessment` as "Snag & Quote" for garages / bodyshops / fleet assessors** | Small trade businesses that produce damage paperwork | £19/mo or £79 lifetime | Open one payments account; send ~20 outreach messages (drafted for you) | **Days** | 🟢 **Lead** |
| **B** | Sell `agent-architect` as a one-off "AI agent spec generator" | Consultants, no-code builders | £29–£39 one-off | Same account; list it on the same store | Days (same store as A) | 🟢 **Second SKU** |
| **C** | Sell `image-annotator` (MarkUp) as the general-purpose sibling | Surveyors, QA, support teams | £9 one-off / £4/mo | Same store | Days | 🟡 Bundle with A, don't sell alone |
| **D** | Productised service: "your agent spec, reviewed by a human", built on B | Same as B, higher trust | £99–£149 per spec | Jonny reviews each one (~30 min) | 1–2 weeks | 🟡 Add once B sells |
| **E** | Base Reality (PRs #36/#37) | Local businesses | £149–£299 + £15–£39/mo | Real scraped data, mailer cohort, manual close | Weeks–months | 🔴 Not for this problem |
| **F** | Steel wallet cards / magnet refills (PR #28) | Consumers | AOV ladder | Fulfilment partner, print QA | Weeks–months | 🔴 Physical; fails law #1 until refills prove out |
| **G** | Any doc-03 SaaS candidate | — | £39/mo | Niche sprint, product build, Stripe Billing | Months | 🔴 Right long-term, wrong for a 14-day problem |

**Why A leads.** It is the most complete, most vertical tool in the repo: multi-photo
canvas markup, itemised costs, PDF and CSV export, all implemented and working with
no backend. It solves an actual paperwork chore for a buyer who already pays for
software. Five to eight garages at £19 covers Max 5x; that is a *recruitment*
problem, not a *build* problem — which is the right kind of problem to have.

**Why not just pick G.** Every tool in the vault says "recurring, ~95% margin,
affiliates". Correct for the business; wrong for this month. A is the bridge that
buys G the time to be done properly. Note the trade-off honestly: A is a small,
capped market and a one-off tier breaks law #1. Accepted, because the alternative
is £0.

## 5. Constraints and guardrails applied

- **Merchant of record, not raw Stripe.** Selling globally from the UK means VAT/
  sales tax in every buyer's jurisdiction. Gumroad and Lemon Squeezy act as merchant
  of record and handle that; Stripe alone leaves it with Jonny. Recommendation:
  **Lemon Squeezy** (license-key API usable from a static page, subscriptions +
  one-offs on one store). Gumroad is the fallback. **Jonny opens the account.**
- **Honest claims only** (doc 07). Copy says "mark up photos, itemise, export a PDF".
  No "AI-powered", no invented testimonials, no fake garages in screenshots.
- **Static-site reality.** A license gate on a static page is soft protection. The
  product is *updates + support + the paid build*, not DRM. State that plainly on
  the page rather than pretend otherwise.
- **Security before selling (user rule).** Both `file-converter` and
  `video-stabiliser` lazy-load `ffmpeg.wasm` from `unpkg.com`; they are excluded from
  the paid bundle until that dependency is pinned and hash-checked. The three lead
  tools make no network calls and hold no secrets — audited clean.
- **Comms in Jonny's name** need an explicit "proceed" per batch. Outreach is
  drafted, never sent, by Claude.
- **No spend by Claude.** Lead lists via the Vibe Prospecting connector only if it
  is within an existing free allowance; its `estimate-cost` is checked and shown
  first, and nothing is run without sign-off. Otherwise leads are hand-built from
  public directories.
- **Agents used for build work run on Sonnet/Haiku**, not Fable, to protect usage.

## 6. Plan (after sign-off)

| Day | Deliverable | Owner |
|---|---|---|
| 0 | Sign-off on product A(+B), price, brand name, MoR choice | Jonny |
| 0 | Open Lemon Squeezy (or Gumroad) account; create the two products; send Claude the two checkout URLs and the store ID | Jonny |
| 1 | `damage-assessment` polish for sale: proper PDF layout (not raw `window.print`), settings toggle to fold `damage-assessment-large` in, "Pro" build with license-key check, honest landing page with pricing + checkout link | Claude (Sonnet agents) |
| 2 | Architect: license gate + one-page sales page on the same store | Claude |
| 2 | Outreach kit: 20 named UK bodyshops/fleet firms, one 4-line email + one LinkedIn DM per target, drafted in Gmail as **drafts only** | Claude |
| 3 | Review drafts; press send on the first 10 | Jonny |
| 3–14 | Reply handling drafted by Claude; every reply and objection logged to §8 | Both |
| 7, 14 | Weekly readout: visits → checkout → paid, plus objections | Claude |
| 14 | **Gate:** ≥1 paying customer → continue, add D. 0 paying and 0 replies → price/pitch problem, iterate once. 0 paying after 2 iterations → kill A, escalate B/D | Both |

## 7. Open questions (need answers to start)

1. **Which Max tier** are we covering, 5x ($100) or 20x ($200)? Sets the target.
2. **Legal entity and payments:** is there a Shelle / sole-trader entity and an
   existing Stripe, Gumroad or Lemon Squeezy account, or does one need opening?
3. **Product sign-off:** A (damage-assessment) as lead, B (Architect) as second SKU?
   Or override.
4. **Pricing sign-off:** £19/mo + £79 lifetime for A; £29 one-off for B?
5. **Brand:** sell under Shelle (shelle.uk), "MarkUp Tools", or a new name?
6. **Why does damage-assessment exist?** If there's a garage, fleet or insurer
   contact behind it, that's the first customer and shortens Day 3 to Day 1.
7. **Outreach:** will Jonny send the first 10 messages personally, or is that a blocker?
8. **Is the GitHub Pages site actually live?** Could not be verified from the build
   sandbox (proxy). If not, the sales page needs a host (Pages is free and fine).

## 8. Learnings log (grows as we go)

- **2026-09-09 · audit.** 10 open draft PRs, 0 lines of billing code across all
  branches. Three tools (damage-assessment, agent-architect, image-annotator) are
  sellable without a backend. Two tools load ffmpeg.wasm from a CDN and fail the
  "offline / no remote code" claim. No secrets, no `eval`, no remote scripts elsewhere.
- **2026-09-09 · principle.** An assistant can build the shop but cannot own the
  till. Every revenue plan must name the human steps up front or it is fiction.

## GSCE prompt builder (for the next turn)

Fill this in and paste it back; it's the whole brief for the build.

```
GOAL      – e.g. "Cover Max 5x (£80/mo) within 60 days from tool sales."
SCOPE     – Products in: [A damage-assessment] [B Architect] [C MarkUp]. Out: [...]
CONSTRAINTS – MoR: [Lemon Squeezy | Gumroad]. Brand: [...]. Price: [...].
             Outreach: [I send | blocker]. Budget for leads: [£0 | existing credits].
EXPECTED  – Day-14 gate as in §6, weekly readout in this doc.
```

*(GSCE read as Goal · Scope · Constraints · Expected output — correct the expansion
if that's not what you meant by it.)*

---

← [10 — Build & Tooling Board](./10-build-and-tooling-board.md) · Index: [README](./README.md)

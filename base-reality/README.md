# Base Reality

**A website-development sales platform that inverts the usual order: we design
first, post the key through the letterbox, and only *finish* the build for
businesses that log in and say yes.**

A zero-dependency static web app, same as the vault's other tools — open
`index.html` or serve the folder; it also deploys to GitHub Pages at
`/base-reality/`.

## The model

Local traders — plumbers, bakers, barbers, garages — rarely have an effective
website, and cold-emailing them "we build websites" converts terribly. Base
Reality flips it:

1. **Scrape/compile a database** of local businesses: name, trade, contact
   details, logo, services, reviews — whatever their old site, Google Business
   Profile or public listings hold.
2. **Assign each business a unique access code** (`BR-XXXX-XXXX`) and a
   template family suited to its trade.
3. **Post a physical card** (or hand-deliver it) with the code and URL. Post
   gets opened; the mystery of "your website is already waiting" gets typed in.
4. **On login, the site builds itself** — the platform pours that company's
   data into one of the template families, applies their colours and logo, and
   plays a short "building your website…" reveal. It looks like a finished,
   bespoke design. In reality nothing was built until the moment they logged in.
5. **The claim flow closes**: a pricing panel (Launch £249 one-off / Grow
   £39-month / Custom) and a no-obligation interest form. Only businesses that
   register interest get a real, finished build.

So the cost of "designing a website for 500 companies" is the cost of a data
row and a stamp — the design work happens only for the ones that convert.

## What's in the prototype

| Piece | Where | What it does |
|---|---|---|
| Login screen | `index.html` → `app.js` | Access-code entry, deep links via `?code=BR-…` (for QR codes on the mailer) |
| Build reveal | `app.js` | Progress animation: "loading your profile → applying your branding → writing your pages" |
| Site generator | `app.js` (`RENDERERS`) | 5 template families, each themed per-company (colours, logo/monogram, copy, icons) |
| Preview chrome | `app.js` | Desktop/mobile toggle, "private preview built for X" bar, claim button |
| Claim flow | `app.js` | Pricing tiers + interest form; auto-opens softly after 25s on first visit |
| Ops dashboard | `?ops=1` | Company list, codes, viewed/claimed status, copy login link & mailer text per company |
| Database | `data.js` | `BR_COMPANIES` — 10 seeded demo businesses; **this is the drop-in point for the scraped list** |

Template families (`BR_TEMPLATES`): **Bold Trade** (trades/home services),
**Fresh Local** (food/flowers/shops), **Classic Craft** (makers/heritage),
**Sleek Pro** (professional/appointment-led), **Vivid Shop**
(barbers/gyms/pets). Five families × per-company branding, copy and section
data reads as a one-off design every time; growing toward the 20–30 variants
in the full concept just means adding renderers.

### Try it

Demo codes: `BR-7K2M-PLMB` (plumber, Bold Trade) · `BR-9D4V-BAKE` (bakery,
Fresh Local) · `BR-2Q8N-JOIN` (joinery, Classic Craft) · `BR-5T1X-PHYS`
(physio, Sleek Pro) · `BR-8H6R-BARB` (barber, Vivid Shop) — full list in
`?ops=1`.

## Plugging in the scraped database

`data.js` documents the record schema at the top. The scrape pipeline (from
the other session) should emit one record per business into `BR_COMPANIES`:
required fields are `id`, `code`, `name`, `trade`, `town`, `services`,
`colors`, `template`; everything else (`logoUrl`, `reviews`, `about`, `hours`,
`founded`…) is optional and the generator degrades gracefully — a monogram
logo is synthesised when no logo was scraped, taglines are invented per trade,
sections without data are skipped.

Codes must be **unguessable** (they gate another business's data) — generate
them randomly, never sequentially.

## Productionising (what changes when it's real)

- **State server-side.** Views/claims currently live in the visitor's
  `localStorage`; real version needs a tiny backend (or form endpoint) so *you*
  see who logged in and who claimed, and get notified instantly.
- **Database out of the bundle.** `data.js` ships every company to every
  visitor. Real version: code → serverless lookup returning only that
  company's record.
- **Notifications** — email/Slack ping on login is the sales trigger: call
  them while they're literally looking at their own new website.
- **Domain**: base-reality.com, previews on `view.base-reality.com/CODE`.

## Guardrails (the "engine, not the fraud" rules)

The vault's whole thesis is copying mechanics without the shortcuts that
attract regulators. For this model the lines are:

- **The mailer is a proposal, never an invoice.** The generated mailer text
  says explicitly: prepared speculatively, no charge, not an invoice, no
  obligation. Never imply the site exists, is owed, or is about to expire —
  that's the domain-scam pattern and it poisons the well.
- **Postal B2B marketing is legitimate** in the UK (PECR restricts email/SMS,
  not post). But sole traders and partnerships count as *individuals* under UK
  GDPR — so for them: source only publicly available business data, do a
  legitimate-interests assessment, include the "email us to be removed" line
  (already in the mailer), and honour it.
- **Their logo/branding in their own private preview** is low-risk — it's
  shown only to them, behind their code, `noindex`. Never publish a preview
  publicly, and get written sign-off before anything goes live.
- **One business per code, previews unguessable and unlisted.** The preview
  contains only data that business already publishes about itself.
- **Honest pricing on the claim screen** — no fake urgency, no pre-ticked
  boxes, "no payment now" stated in the form itself.

## Files

- `index.html` — shell
- `styles.css` — platform chrome (login, preview bar, modal, ops); generated
  sites carry their own self-contained styling inside the iframe
- `data.js` — template registry, offer/pricing config, company database
- `app.js` — login, reveal, the 5 site renderers, claim flow, ops view

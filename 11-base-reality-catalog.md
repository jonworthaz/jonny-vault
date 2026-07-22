# 11 — Base Reality: App Catalog & Store Strategy

*The plan and product catalog for **base-reality.com** — a storefront of small,
inexpensive, AI-built applications for personal, business and AI-related jobs,
with discounts for multi-app purchases.*

---

## 1. The model — and the one correction it needs

**The idea as captured:** host base-reality.com with lots of mini/small
inexpensive software applications, performing personal, business and AI-related
functions, with discounts for multi-software purchases.

**The tension with the vault:** law #1 of the [operating system](./02-operating-system.md)
is *recurring by nature*. A shelf of £9 one-off apps is a shop, not an engine —
every month starts at zero.

**The correction (proven by the market):** run it as a **membership catalog**,
not a shop. Setapp did exactly this — one flat fee (~$9.99/mo) for a whole
library of small apps, grew past **1 million users**, on the logic that *2–3
useful apps already beat the price and everything after is free*. Meanwhile
AppSumo shows the single-purchase market is real but works as **acquisition**,
not as the business.

> **Platform note:** Setapp is cited *only* as pricing-model evidence — it
> happens to sell Mac apps; we don't. Every Base Reality app is a **web app**,
> hosted at base-reality.com, running in any browser on any device (desktop,
> tablet, phone). That's the same platform-agnostic, geo-agnostic posture as
> the vault's locked decisions and the existing tools — no app stores, no
> per-platform builds, no 30% platform tax, instant updates for everyone.

So Base Reality's pricing has three layers, and the discounts you wanted are
the middle one:

| Layer | Offer | Role |
|---|---|---|
| **Singles** | £5–£29 one-time, or £3–£7/mo per app | Top of funnel — SEO + affiliate landing pages, one per app |
| **Bundles** | Pick 3 = 25% off · Pick 5 = 40% off · themed packs (Freelancer Pack, Creator Pack, AI Starter Pack) | The stated multi-buy discount — upsell at checkout |
| **All-Access** | ~£12–£15/mo or ~£99/yr for *everything, including every future app* | **The actual business.** Recurring, compounding — every new app raises the membership's value at zero marginal price |

Every app is a door; the membership is the house. Each new mini-app is
simultaneously a product, a landing page, an SEO surface, and an affiliate
offer — the catalog *compounds* (Gate 1) in a way no single app can.

**Why this is unusually buildable here:** every app below is small enough for
the AI build pipeline this vault already runs (Architect → spec, Forge →
workflow, zero-dependency static-first builds like MarkUp and Damage
Assessment). The store opens with **four apps already built**.

---

## 2. Ground rules for what gets on the shelf

1. **One job, done excellently** — an app earns its place with a single
   sentence: "it does X." If it needs a paragraph, it's two apps.
2. **Static-first, zero-dependency where possible** — same discipline as the
   existing tools; local-first, no backend until an app earns one.
3. **Screenshot-safe ([07](./07-guardrails.md))** — no medical, financial or
   legal *advice* apps. Drafting tools are framed as drafting tools ("prepares
   a draft for your review"), never as professional counsel. No income-claim
   marketing.
4. **Every app ships with its own landing page + before/after demo** — the
   catalog is also the marketing.

---

## 3. The catalog — ~90 candidate applications

*Price bands: **F** free (lead magnet) · **£** £5–£15 · **££** £15–£29 ·
**/m** subscription-worthy on its own. Apps marked ✅ already exist in this
vault and seed the store on day one.*

### A. Already built — the day-one shelf

| App | One job | Band |
|---|---|---|
| ✅ **MarkUp** | Annotate and mark up images in the browser | £ |
| ✅ **Damage Assessment** (+ large-text edition) | Photo-based damage capture → PDF report | ££ |
| ✅ **Architect** | Role or JD → best-practice AI agent spec (38 archetypes) | ££ /m |
| ✅ **Forge** | Visual AI workflow builder → real config | ££ /m |

### B. Personal productivity & life admin

| App | One job | Band |
|---|---|---|
| Inbox Digest | Daily AI summary + priority triage of your email | /m |
| Week Compiler | Calendar + tasks → one printable weekly plan | £ |
| Habit Ledger | Minimal habit tracker with streak analytics | £ |
| Decision Journal | Log decisions now, review outcomes later | £ |
| Renewal Radar | Tracks subscriptions & renewals, nags before you're charged | £ /m |
| Paper Cut | Photo of any document → named, filed, searchable | ££ |
| Life Admin OS | The recurring life checklist — MOT, insurance, passport, boiler | £ |
| Focus Blocks | Focus timer: pomodoro sessions + a proper end-of-day shutdown ritual *(free sibling of Time Tracker — same timer engine)* | F |
| Read-Later Digest | Saved articles → one weekly AI summary email | /m |
| Travel Pack | Booking emails → itinerary + packing checklist | £ |

### C. Money & personal finance *(drafting/tracking only — no advice)*

| App | One job | Band |
|---|---|---|
| Money Snapshot | Bank CSV → clean monthly spending report | £ |
| Invoice Chaser | Politely escalating reminders for unpaid invoices | £ /m |
| Rate Calculator | Income target → your real freelance day rate | F |
| Mileage Log | Trips → HMRC-ready mileage claim sheet | £ |
| Receipt Box | Photograph receipts → categorised expense sheet | £ /m |
| Net Worth Tracker | Assets − liabilities, tracked quarterly | £ |
| Side-Income Ledger | Small income streams + tax set-aside tracker | £ |

### D. Business ops & admin (freelancer / SMB)

| App | One job | Band |
|---|---|---|
| Quote Builder | Branded quote or estimate in minutes (trades-friendly) | ££ /m |
| Proposal Draft | Intake brief → tailored proposal *(mini of board [#07](./09-idea-board.md))* | ££ /m |
| Meeting → Minutes | Notes or transcript → minutes + owned actions | £ /m |
| SOP Writer | Describe a process once → a clean SOP doc | £ |
| Client Portal Lite | One page per client: files, status, next steps | ££ /m |
| Contract Starter | Plain-English standard agreements, marked *draft for review* | ££ |
| Rota Planner | Simple shift/rota planning for small teams | £ /m |
| Stock Count | Bare-bones inventory for micro-retail | £ |
| Job Sheet | Field job cards — photos, notes, signature *(pairs with Damage Assessment)* | ££ /m |
| Testimonial Collector | One link → collects, formats and publishes reviews | £ /m |
| Time Tracker | Toggl-style start/stop timers per client & project → timesheets and billable totals *(shares the client list; feeds Quote Builder & Invoice Chaser)* | ££ /m |

### E. Sales & marketing

| App | One job | Band |
|---|---|---|
| Lead Magnet Maker | Topic → polished PDF lead magnet | ££ |
| Outreach Personaliser | Honest, research-based first lines — not spam *(guardrails apply)* | /m |
| Follow-Up Engine | CRM-lite: never lose a warm thread again | £ /m |
| Landing Page in a Box | Fake-door & offer pages in minutes *(we dogfood this in Phase 0)* | ££ /m |
| UTM Builder + Link Book | Build, store and track campaign links | F |
| Review Reply Writer | On-brand replies to customer reviews *(mini of board [#05](./09-idea-board.md))* | £ /m |
| Local SEO Auditor | Scan a Google Business listing → fix list | ££ |
| Subject Line Tester | Score and iterate email subject lines | F |
| Competitor Watch | Monitors competitor pages, alerts on changes | /m |

### F. Content & creator tools

| App | One job | Band |
|---|---|---|
| Repurposer | One piece → platform-native variants *(mini of board [#01](./09-idea-board.md))* | /m |
| Hook Writer | Topic → 50 scroll-stopping openers | £ |
| Content Calendar Filler | Niche + cadence → a month of scheduled ideas | £ /m |
| Script Skeleton | Video/short outline with beats and B-roll cues | £ |
| Caption & Alt-Text Writer | Accessible, on-brand captions at batch speed | £ |
| Newsletter Compiler | A week of links/notes → a drafted issue | £ /m |
| Show Notes | Episode → notes, chapters, quotes *(mini of board [#06](./09-idea-board.md))* | £ /m |
| Carousel Maker | Text → LinkedIn/IG carousel slides | £ |
| Thumbnail Text Tester | A/B mock thumbnails before you publish | F |

### G. AI utilities *(the base-reality.com signature aisle)*

> **📌 Reminder — port from the Claude desktop build:** add a **Recorder &
> Transcriber** module to the Base Reality app: record **audio and video**
> in-app (screen/camera/mic) and **transcribe** recordings to text. This
> already exists as a Claude desktop build — port it in as a module rather
> than rebuilding from scratch. Feeds Meeting → Minutes and Show Notes
> directly. *(Captured 2026-07-22 — next module after Wave 1 hardening.)*

> **📌 Reminder — image annotation is already built (desktop app):** an
> **image annotation** tool exists as a Claude desktop build, alongside the
> vault's own web MarkUp tool ([`image-annotator/`](./image-annotator/)).
> When bringing annotation into the Base Reality app as a module, **port the
> existing desktop build / reuse MarkUp — do not rebuild from scratch.**
> Pairs with Screenshot Beautifier, Document Scanner and Site Visit Logger.
> *(Captured 2026-07-22.)*

| App | One job | Band |
|---|---|---|
| Recorder & Transcriber | Record audio/video/screen in-app → text transcript *(port of existing Claude desktop build)* | ££ /m |
| Prompt Vault | Save, organise, version and share prompts | £ /m |
| Prompt Improver | Rewrites any prompt to best practice, explains why | £ |
| Automation Recipe Finder | Describe a chore → a Make/Zapier-ready blueprint | ££ |
| AI Meeting Prep | Attendees + company → a one-page brief before the call | /m |
| Doc Q&A | Upload documents → ask questions, get cited answers | ££ /m |
| Tone Shifter | Rewrite anything in your saved brand voice | £ |
| Output Checker | Second-pass AI review: contradictions, unsupported claims | £ /m |
| Model Picker | Task in → recommended model/tool + est. cost out | F |
| First Result *(flagship)* | Guided path from "new to AI" → first working automation *(the productised form of board [#11](./09-idea-board.md))* | ££ /m |

### H. Documents & files

| App | One job | Band |
|---|---|---|
| PDF Toolkit | Merge, split, compress, reorder — locally | £ |
| CV Tailor | CV + job ad → honestly tailored CV *(no fabrication — guardrails)* | ££ |
| Cover Letter Draft | Role + your facts → a draft worth editing | £ |
| E-Sign Lite | Simple signature on any document | £ /m |
| Doc Redactor | Strip names, emails, numbers before sharing | £ |
| Convert Anything | The file-format converter that just works | £ |

### I. Web & technical utilities

| App | One job | Band |
|---|---|---|
| Screenshot Beautifier | Raw screenshot → framed, branded visual | £ |
| OG Image Generator | Page title → social share images, batch | £ |
| Broken Link Checker | Crawl your site, list what's dead | £ /m |
| Policy Generator | Privacy/terms/cookie drafts, marked for review | ££ |
| QR Studio | Branded QR codes with scan tracking | £ /m |
| Status Page Lite | A public "is it up?" page for your product | £ /m |
| Explain This Error | Paste any error/regex/cron → plain English | F |

### J. Design & visual

| App | One job | Band |
|---|---|---|
| Brand Kit Card | Logo + palette + fonts on one shareable page | £ |
| Mockup Placer | Screenshot → device/scene mockups | £ |
| Palette From Photo | Any image → a usable colour system | F |
| Watermark Batcher | Watermark a whole folder at once | £ |
| Icon Tinter | Recolour icon sets to your brand in bulk | £ |

### K. Data & light analytics

| App | One job | Band |
|---|---|---|
| CSV Cleaner | Dedupe, normalise, fix a messy CSV | £ |
| Sheet → Dashboard | Spreadsheet → shareable live dashboard | ££ /m |
| Survey Summariser | Free-text responses → themes + quotes | ££ |
| KPI Digest | Your numbers → a weekly plain-English email | /m |
| Price Tracker | Watch any product/page price, alert on drop | £ /m |

### L. Home, family & lifestyle *(no health claims — see guardrails)*

| App | One job | Band |
|---|---|---|
| Meal Planner | Preferences → weekly menu + shopping list | £ /m |
| Chore Rota | Fair-rotation household jobs board | F |
| Gift Tracker | Occasions, ideas, budgets — never caught out | £ |
| Plant Care Scheduler | Per-plant watering/feeding schedule *(digital layer of board [#10 VSC](./09-idea-board.md))* | £ /m |
| Home Inventory | Room-by-room contents log for insurance *(pairs with Damage Assessment)* | ££ |
| Pet Log | Vet dates, meds, weight, insurance in one place | £ |
| Garden Planner | Beds, seasons, what to sow this week | £ |

### N. Device-interactive apps *(camera · mic · GPS · sensors · NFC — the aisle
that makes the **installed** app matter)*

*These use the device hardware through standard web APIs, so they still ship as
modules in the one installable app — no app store needed. They're also the
strongest install driver: a camera/GPS tool feels wrong in a tab and right as
an app icon.*

| App | One job | Device APIs | Band |
|---|---|---|---|
| Document Scanner | Point camera at paper → cropped, cleaned page → PDF *(feeds PDF Toolkit & Paper Cut)* | Camera | ££ /m |
| Barcode Stock Scanner | Scan barcodes to count/track inventory *(upgrades Stock Count)* | Camera + barcode detection | ££ /m |
| Site Visit Logger | Geotagged, timestamped photos + notes per job/site *(pairs with Job Sheet & Damage Assessment — the trades "field pack")* | Camera + GPS | ££ /m |
| Auto Mileage Tracker | Tap start/stop → GPS-logged trip → HMRC-ready claim *(upgrades Mileage Log)* | GPS | £ /m |
| Voice Capture | Speak → transcribed note/task/idea, filed instantly | Mic + speech-to-text | £ /m |
| Teleprompter | Scrolling script with screen-stays-awake — creators film reading it | Wake Lock | £ |
| Spirit Level & Angle Finder | Phone as level, angle and slope gauge for trades/DIY | Motion sensors | £ |
| Colour Grabber | Point camera at anything → exact colour + palette *(feeds Palette From Photo)* | Camera | £ |
| Noise Meter | Live dB readings for venues/workplaces — honest indicative readings, not certified | Mic | £ |
| Interval Timer | Workout/work timers with vibration + notification cues | Vibration + notifications | F |
| Time-lapse Maker | Camera shoots on an interval → stitched time-lapse | Camera | £ |
| Tap Card | Your digital business card — shared by QR or an NFC tap | NFC *(Android)* + QR | £ |
| NFC Asset Tagger | Write/read NFC tags on tools & equipment — tap to see history | Web NFC *(Android)* | ££ |
| Read Aloud | Any saved article/doc read out in a chosen voice | Speech synthesis | £ |

**Platform upgrades to existing modules (same aisle):**
- **Renewal Radar → push notifications** — real renewal alerts on the device
  (installed PWA push; supported on Android and iOS 16.4+).
- **Share target** — register Base Reality in the manifest as a share
  destination, so any photo/file/link on the phone can be sent straight into
  the right module ("share → Base Reality → Document Scanner").
- **Recorder & Transcriber** (already queued from the Claude desktop build) —
  mic, camera *and* screen capture belong to this aisle.

**Support caveats (recorded honestly, per guardrails):** Web NFC and Web
Bluetooth are Chrome-on-Android only; barcode detection needs a small fallback
library on Safari; iOS allows push only for installed PWAs. Each listing page
states what works where — no over-claiming.

### M. Vertical mini-tools *(each = a testable slice of board [#04](./09-idea-board.md))*

| App | One job | Band |
|---|---|---|
| Tutor Lesson Planner | Topic + level → lesson plan + worksheet | ££ /m |
| Listing Writer | Property facts → compelling, honest listing copy | ££ /m |
| Menu Engineer | Menu + costs → profitability analysis | ££ |
| Salon Reminder | Booking reminders + rebooking nudges | £ /m |
| Airbnb Host Kit | Listing copy + house guide + review replies | ££ |
| Coach Session Logger | Session notes → progress record + next-session plan | £ /m |

---

## 4. Build order — first two waves

**Wave 1 (weeks 1–4): open the store. 🟢 built — see [`base-reality/`](./base-reality/).**
The four ✅ existing apps, plus six fast, high-search utilities that need no
backend: **PDF Toolkit · CSV Cleaner · Screenshot Beautifier · Prompt Vault ·
Quote Builder · Renewal Radar**. Ten apps is enough shelf for the membership to
make sense. Still to do: Stripe (single + bundle + membership SKUs) and one
landing page per app.

> **Architecture decision (locked at build):** Wave 1 shipped as **one
> installable app with modules**, not six separate apps. The Base Reality
> shell is a PWA (install from the browser → local app, fully offline) and
> every tool is a module sharing **one local data store** — business profile,
> client list and currency are entered once and used by every module, and one
> backup covers everything. Commercially this maps 1:1 to the pricing layers:
> singles = one module unlocked, bundles = several, All-Access = all of them —
> in one product. New modules land inside the app users already installed,
> which makes the membership *feel* like it compounds. Downloadable launchers
> (`start-windows.bat` / `start-mac-linux.command`) cover the fully-local case.

**Wave 2 (weeks 5–8): the money aisles.** The categories AppSumo proves
convert hardest — marketing, finance, AI writing: **Invoice Chaser · Lead
Magnet Maker · Proposal Draft · Testimonial Collector · Repurposer · Doc Q&A ·
First Result**. Wave 2 is chosen *by Wave 1's data*, not by preference —
whatever aisle sells, deepens.

**Standing rule:** every app records the same three numbers — visits, buys,
membership conversions. The catalog is a permanent Phase-0 machine: each app
is its own cheap demand test, and any app that outperforms the shelf becomes
a candidate to spin out as a standalone product on the [idea board](./09-idea-board.md).

---

## 5. How it scores (board entry: [#12](./09-idea-board.md))

| Demand | Intent | Headroom | Quality | Affiliate fit | Compounds? | Screenshot-safe? |
|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 4 | 3 | 4 | 4 | 4 | ✅ membership + every new app raises its value | ✅ |

- **Compounds** structurally: apps × landing pages × SEO × one growing membership.
- **Watch:** breadth is the risk — 90 mediocre apps lose to 10 excellent ones.
  The catalog above is a *menu*, not a promise; the waves and the three numbers
  decide what actually gets built.
- **Watch:** single cheap apps have near-zero switching costs; retention lives
  entirely in the membership. Price singles to make All-Access the obvious buy.

---

## 6. Market evidence (research, July 2026)

- Micro-SaaS solo founders commonly reach **$5k–50k/mo**; winning clusters are
  custom reporting, cross-system integration, and vertical workflow automation
  ([Hostinger](https://www.hostinger.com/tutorials/micro-saas-ideas),
  [Redwerk](https://redwerk.com/blog/micro-saas-ideas-that-print-money/)).
- Utility apps are the canonical solo play — "build once, sell forever"; median
  verified solo-dev app earns **$3k–8k MRR**
  ([BigIdeasDB](https://bigideasdb.com/profitable-mobile-app-ideas-2026)).
- One-time-purchase software is a real, underserved lane (e.g. Whisper-based
  transcriber at $79 one-off)
  ([Sonicribe](https://www.sonicribe.online/blog/best-one-time-purchase-software)).
- **Setapp validated the membership-catalog model**: ~$9.99/mo for 270+ apps,
  1M+ users; value logic = "2–3 apps beat the price"
  ([MacPaw](https://macpaw.com/setapp),
  [Setapp](https://setapp.com/app-reviews/setapp-vs-buying-apps-individually));
  notably it later added *individual* purchases on top — the two models feed
  each other ([Gadget Hacks](https://apple.gadgethacks.com/news/setapp-ditches-all-you-can-eat-model-for-app-subs/)).
- AppSumo's hardest-converting categories: **email/marketing, productivity,
  finance, AI writing/content, SEO** — Wave 2 is built from them
  ([HasThemes](https://hasthemes.com/blog/best-appsumo-deals/)).

---

← Back to the index: [README](./README.md) · Scored on the board: [09 — Idea Board](./09-idea-board.md)

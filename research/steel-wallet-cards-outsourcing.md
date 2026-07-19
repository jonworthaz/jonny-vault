# Research — Outsourcing the metal photo wallet card

*Support note for [09 #11](../09-idea-board.md) (product) and
[10 #03](../10-build-and-tooling-board.md) (the digital engine). Every fulfilment
option for selling a personalised **metal photo wallet card** without doing the
manufacturing yourself — ranked, with named UK partners and a phased path.*

Reference product (the thing we're cloning): a credit-card-size photo card —
**ID-1, 85.6 × 54 mm, ~1 mm, gloss** — e.g.
[Max Photo's metal wallet card](https://www.maxphoto.co.uk/photo-printing/metal-photo-wallet-cards).

---

## 0. The substrate reality (decides everything downstream)

"Metal photo card" in the consumer market almost always means **dye-sublimation on
coated aluminium** (ChromaLuxe-style) — *not* bare stainless steel. Sublimation gives
true photographic full colour but needs the polymer coating; **bare stainless can't be
sublimated**. Full colour on actual stainless requires **UV flatbed printing** instead.

- Want **photo-quality colour, cheapest, POD-ready today** → **coated aluminium (sublimation)**.
- Want the premium **"stainless steel forever"** story → **UV-printed stainless** (fewer
  suppliers, batch orders, higher cost).

Pick per product tier. The rest of this note covers both, flagged per supplier.

## 1. What we keep vs. what we outsource

Per the [Operating System](../02-operating-system.md): **own acquisition + billing**,
outsource everything else. Concretely:

| Keep in-house (the moat) | Outsource (the commodity) |
|---|---|
| Storefront + brand + marketing/acquisition | Printing onto metal |
| Checkout & the customer relationship (billing) | Packing |
| The customiser + AI colourise/restore ([10 #03](../10-build-and-tooling-board.md)) | Shipping & tracking |
| Order data / reorder prompts | Returns/reprints logistics |

Everything in the right column is a solved, buyable service. The models below differ only
in *how tightly you integrate* and *how much margin vs. control* you trade.

## 2. The five outsourcing models (ranked)

### 🥇 Model A — POD dropship via a print API *(recommended start — zero capex)*
You build the store; a print-on-demand partner prints, packs and ships **blind** (your
brand on the parcel) on every order. No inventory, no minimums, no kit.

- **[Prodigi](https://www.prodigi.com/products/wall-art/metal-prints/aluminium-prints/)**
  — **UK-HQ** (London/Cardiff/Harrogate/Alton). ChromaLuxe aluminium metal prints, **no
  MOQ**, blind dropship worldwide, **[Shopify app](https://www.prodigi.com/shopify-print-on-demand-app/)**
  *and* a **[Print API](https://www.prodigi.com/print-api/)**. Closest to turnkey — this is
  the default pilot partner. *(Confirm the smallest metal size / whether they'll cut to
  wallet ID-1; their catalogue leads with wall art.)*
- **[Contrado](https://www.contrado.co.uk/custom-metal-prints)** — UK (London), genuine
  white-label dropship + Shopify auto-fulfil, branded packaging, 1–2 day dispatch.
- **[Merchize](https://merchize.com/product/metal-wallet-card/)** — already lists a **metal
  wallet card**, no minimums, store integrations — but global (not UK), so check UK ship
  times/duties.
- **[Picanova B2B](https://b2b-shop-eu.picanova.com/en/)** — EU POD/white-label at scale.
- **Pros:** live in days, no capex, no risk. **Cons:** thinnest margin; you don't control
  the finish; substrate = their aluminium, not your stainless.
- **When:** Phase 0 validation, and probably the long-run engine for the mass tier.

### 🥈 Model B — Direct blind-dropship deal with a UK photo lab
Skip the marketplace markup: negotiate directly with a lab to fulfil your orders blind.
Better unit cost at volume, same "no inventory" benefit, a real human account.

- **[Digitalab](https://www.digitalab.co.uk/fulfilment/)** — UK lab, explicit **white-label
  fulfilment** (produce, pack, dispatch under your brand, no Digitalab trace).
- **[CEWE](https://www.cewe.co.uk/service/retail-partners.html)** — huge UK facility
  (Warwick), retail-partner / white-label programme; powers many retailers' photo services.
- **[Print Photos](https://www.printphotos.co.uk/products/personalised-metal-photo-wallet-card)**
  — UK, already makes the **exact** aluminium ID-1 card; small enough for a direct wholesale
  chat.
- **Pros:** better margin than Model A, still no stock, UK-made. **Cons:** needs volume to
  interest them; you build the order feed (API/CSV/email); more relationship management.
- **When:** once Phase 0 proves demand and Model A margin pinches.

### 🥉 Model C — White-label photo-commerce platform *(scale)*
The partner supplies not just print but a whole fulfilment/commerce backend you brand.

- **CEWE retail-partner programme**, **[Picanova B2B](https://b2b-shop-eu.picanova.com/en/)**,
  Photobox/commerce operations, **[Digitalab](https://www.digitalab.co.uk/fulfilment/)**.
- **Pros:** offload nearly all ops; proven at high volume. **Cons:** heavier contracts,
  min-volume commitments, less product-finish control; can dull the brand if not careful.
- **When:** only after product-market fit; an optimisation, not a starting point.

### Model D — Bulk blanks + UK micro-fulfilment / 3PL
Import **ChromaLuxe or steel blanks** in bulk; a print partner sublimates/UV-prints on
demand and a **3PL** warehouses & ships. Best margin, most control of the *finish* — but
you now own operations.

- Blanks: Alibaba/ChromaLuxe distributors. Print: a UK sublimation/UV bureau. Ship: any
  e-commerce 3PL.
- **Pros:** top margin & finish control; enables the premium **UV-on-stainless** tier.
  **Cons:** capex in stock, real ops, forecasting risk. **When:** proven scale only.

### Model E — In-house-lite *(the "not yet" baseline, for comparison)*
Buy a sublimation kit (~£few hundred) or a **UV flatbed** (~£15–40k) and print yourself.
Highest margin, but it's the opposite of outsourcing and imports all the ops. Listed only
as the margin ceiling to measure the outsourced models against. **Don't — until demand is
proven and Model B/D margins justify it.**

## 3. The integration layer (ties to [10 #03](../10-build-and-tooling-board.md))

Whichever fulfilment model, the software spine is the same:

```
Shopify store
  └─ Customiser page: upload → crop to ID-1 → AI colourise/restore → live "metal" preview
       └─ Checkout (Shopify owns billing/tax/shipping)
            └─ Order routing:  Prodigi API  |  partner CSV/webhook  |  email queue
                 └─ Print-ready asset + shipping address → fulfilment partner (blind)
```

- **Model A** = Prodigi's Shopify app/API does the routing for you.
- **Models B/D** = you build the order feed to the partner (start with a manual CSV/email
  queue; automate once volume justifies it).

## 4. Recommended phased path

1. **Phase 0 — validate (this month, £0 capex).** Shopify + **Prodigi** (or Contrado).
   Manual is fine: customiser → checkout → auto/hand-off to Prodigi. Goal: does anyone buy,
   and do they **reorder** on the next occasion? Prove that before anything else.
2. **Phase 1 — improve margin.** Negotiate a **direct blind-dropship deal** (Digitalab /
   CEWE / Print Photos). Add the premium **UV-on-stainless** tier via a metal-card maker
   ([13th Element](https://www.13thelement.co.uk/product/full-colour-metal-business-cards/),
   [Oh My Print](https://www.ohmyprintsolutions.com/shop/metal-business-cards/)).
3. **Phase 2 — scale.** White-label platform (Model C) or bulk-blanks + 3PL (Model D),
   whichever the numbers favour.

**Always order physical samples from any partner before selling their output** — the whole
pitch is "durable, forever"; a finish that scratches in a wallet kills it (and the
screenshot test in [07](../07-guardrails.md)).

## 5. Supplier shortlist

| Supplier | Model | UK? | Substrate | Integration | Notes |
|---|---|:--:|---|---|---|
| [Prodigi](https://www.prodigi.com/products/wall-art/metal-prints/aluminium-prints/) | A | ✅ | ChromaLuxe alu | Shopify app + API, blind, no MOQ | Default pilot partner |
| [Contrado](https://www.contrado.co.uk/custom-metal-prints) | A | ✅ | Alu/metal | Shopify auto-fulfil, white-label | 1–2 day dispatch |
| [Merchize](https://merchize.com/product/metal-wallet-card/) | A | ❌ (global) | Metal card | Store integrations, no MOQ | Lists exact product |
| [Digitalab](https://www.digitalab.co.uk/fulfilment/) | B/C | ✅ | Photo/metal | Negotiated white-label | UK lab, blind |
| [CEWE](https://www.cewe.co.uk/service/retail-partners.html) | B/C | ✅ | Photo/metal | Retail-partner programme | Warwick facility |
| [Print Photos](https://www.printphotos.co.uk/products/personalised-metal-photo-wallet-card) | B | ✅ | Alu (sublimation) | Direct wholesale chat | Exact ID-1 card today |
| [13th Element](https://www.13thelement.co.uk/product/full-colour-metal-business-cards/) | B/D | ✅ | **Stainless (UV)** | Batch/trade | Premium tier |
| [Oh My Print](https://www.ohmyprintsolutions.com/shop/metal-business-cards/) | B/D | ✅ | **Stainless (UV)** | Batch/trade | Premium tier |

### Questions to ask every supplier
1. Photographic **full colour** (not spot), and on which substrate — coated aluminium or
   stainless? What process (sublimation / UV)?
2. Will you **blind dropship** (no your-branding in the parcel)?
3. **Integration**: API, Shopify app, webhook, or CSV/email order feed?
4. **MOQ** and per-unit at 50 / 100 / 250 / 1000; setup or plate fees?
5. Turnaround & UK/international shipping options + tracking.
6. **Scratch/fade durability** spec or warranty (we're claiming "forever").
7. Reprint/returns policy for damaged-in-transit.

## 6. Economics & guardrails to keep honest

- **Margin reality.** A physical POD card nets far below the vault's ~95%-digital thesis
  ([03](../03-our-business-plan.md)); after print + ship + payment fees, protect margin with
  a **premium (stainless/UV) tier** and by owning the AI-colourise value-add, not by racing
  the aluminium commodity to the bottom.
- **Screenshot test ([07](../07-guardrails.md)).** Only claim "won't fade/scratch/peel" to
  the level the sample actually survives. No fake "handmade in our studio" if it's dropship —
  say "printed to order."
- **Photo rights & consent.** Customers upload images of real people (and restored old
  photos). Add a clear **content/rights term** (you confirm you have the right to print this
  image) and a takedown path — this is a real IP/abuse surface.
- **GDPR.** Uploaded photos are personal data. Store on signed/expiring URLs, delete after
  fulfilment + a short window, and name your processor(s) (Prodigi, storage host) in the
  privacy policy.

---

← Back: [09 #11 product](../09-idea-board.md) · [10 #03 engine](../10-build-and-tooling-board.md)

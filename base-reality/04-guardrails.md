# 04 — Guardrails

*The lines we don't cross. This model touches other people's data, brands, and
letterboxes before they've asked us to — so the risk model is the difference
between a clever business and a nuisance that gets shut down.*

> Not legal advice. This is our operating risk model; a solicitor reviews the
> specifics before we scale. UK-first framing (our starting market).

## Why this is a growth document

base-reality does three things regulators and businesses care about *before*
consent: it **holds scraped data**, it **uses their branding**, and it **posts to
them unsolicited**. Done carelessly, any one of these turns a warm "you built me
a website?!" into a cold "who are you and where did you get my logo?". Done
cleanly, the honesty *is* the pitch — it removes the "what's the catch" that
kills local sales. We treat trust as the conversion lever it is.

## The do-not-cross list

| # | Line | What it prevents |
|---|---|---|
| 1 | **Public-source data only, with a lawful basis.** We use business data from public sources, hold a documented legitimate-interest assessment, and provide privacy information at first contact. | An ICO complaint / "where did you get this?" |
| 2 | **Honest framing, always.** The preview is clearly labelled a *proposal built from public info, not yet live*. We never imply it's already published or that they've signed up. | Deception, chargebacks, reputation |
| 3 | **Their brand is used *for them*, not by us.** We show their logo/content back to them in a private, login-gated proposal. We never publish it, never use it in our own marketing, never pass ourselves off as them. | Copyright / trademark / passing-off exposure |
| 4 | **Easy, real opt-out.** One step to say "remove my data / don't contact me again", honoured immediately and permanently (suppression list). | Nuisance status, repeat-contact complaints |
| 5 | **Transparent pricing.** Build fee, monthly price, renewal date shown before payment. 30-day months, one-click cancel. | Subscription-trap scrutiny |
| 6 | **Data protection by design.** Minimal data, encrypted, access-controlled, Stripe for cards, a breach plan. | A data breach of our prospect list |
| 7 | **Accurate or absent.** Low-confidence fields collapse rather than display wrong info. We never invent details about a real business. | Showing a trader wrong/fabricated data about themselves |

## Scraped data & UK GDPR (line 1, expanded)

Business data often includes personal data (a sole trader's name, a personal
mobile, an owner's email). UK GDPR applies to that.

- **Lawful basis: legitimate interests**, backed by a written **LIA** balancing
  our interest (offering a relevant service) against their rights. Data about a
  business's public offering, used to propose a service to that business, is a
  reasonable fit — but the assessment must be real, not assumed.
- **Article 14 notice:** when you collect personal data *not from the person*,
  you must tell them — what you hold, why, the basis, and their rights — at the
  latest at first contact. **Put a plain-language privacy line on the mailer**
  and a full notice at the login screen. This doubles as trust-building.
- **Data minimisation:** hold only what a proposal needs. Don't hoard.
- **Rights:** honour access, objection, and erasure requests promptly.

## Postal marketing (line 4, expanded)

- **Post is the *lighter*-touch channel by design.** UK electronic-marketing
  rules (PECR — email/SMS/calls) do **not** govern addressed post, which is why
  we chose it. That's a genuine structural advantage, not a loophole to lean on.
- Still: respect the **Mailing Preference Service**, mark clearly who we are and
  how to opt out, and suppress anyone who asks — first time, forever.
- Hand-delivered drops at business premises are fine; be a professional caller,
  not a doorstep nuisance.

## Using their logo & content (line 3, expanded)

- **Copyright** in a logo, photos and site text belongs to the business (or their
  previous designer). Reproducing it in a **private proposal shown only to them,
  for their benefit** is the defensible use — it's *their* material, offered back.
- **Do not**: publish the mockup on a public URL, index it, use their brand in
  *our* advertising or portfolio, or keep using their assets after a "no".
- On go-live, the finished site uses assets they explicitly hand over or approve.
- If a business says "take my brand down", it comes down immediately.

## The honesty frame that also converts (line 2, expanded)

The login screen says, in plain words:

> *"We've put together a website concept for **[Business]** using your publicly
> available information. It's a proposal — not live, not published, nothing is
> signed up. Take a look. If you like it, here's exactly what it costs to make it
> real. If not, tell us and we'll delete your details."*

This is both the ethical floor and the highest-converting copy — it answers "is
this a scam?" before they can ask it.

## Data security baseline (from day one)

Mirrors the vault's [security baseline](../05-tech-ai-stack.md#data--security-baseline-non-negotiable-from-day-1). Our prospect
list *is* the sensitive asset:

- Encrypt at rest + in transit; least-privilege access to the record store.
- Stripe holds cards; we never store PANs.
- A suppression/erasure list that is honoured across the whole pipeline.
- A written breach + complaint response plan before we need it.

## The compliance bench (cheap insurance)

- A **data-protection / consumer-law review** of the LIA, privacy notices, mailer
  wording and login frame before scaling — a few hours, a few hundred pounds.
- Proper **terms, privacy policy, and refund policy** drafted once.
- A simple **opt-out + erasure workflow** wired into the pipeline, not bolted on.

## The test we apply to every growth idea

> "If this business saw exactly how we got their data and what we did with it,
> would they be *pleased* — or feel intruded on?" If it's the second, we change
> it. A proposal that delights is a sale; one that unsettles is a complaint.

← Back to [README](./README.md) · Start again at [01 — The Concept](./01-concept.md)

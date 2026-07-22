# Brief 02 — Fake-door landing pages
*Status: queued (opens when Brief 01 closes) · owner: CEO session*

- **Objective:** one honest fake-door landing page per shortlisted niche, in
  Brief 01's recommended order, with waitlist email capture and per-page
  signup measurement.
- **Serves the priority how?** Phase 0's demand-validation mechanism
  ([08-roadmap.md](../08-roadmap.md)).
- **Definition of done:**
  - Pages live on the existing GitHub Pages setup, one URL per niche.
  - Email capture works end-to-end (a real test signup is received/recorded).
  - Landing→signup conversion is measurable per page.
  - Copy passes the screenshot test ([07-guardrails.md](../07-guardrails.md)):
    honest "coming soon / join the waitlist" framing, no fake claims.
- **Verification:** `review-qa` walks each page on mobile and desktop, submits
  a test signup, and confirms it lands in the capture store/analytics.
- **Budget:** static HTML/CSS only, in this repo, matching the house
  zero-dependency style. Form endpoint may be a free tier service; no backend
  build, no frameworks.
- **Kill criteria:** n/a — the traffic test (Brief 03) carries the gate.

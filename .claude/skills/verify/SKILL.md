---
name: verify
description: Independently verify finished work against its brief before calling it done — enforces the "verified beats finished" rule. Use when a build completes, before reporting done, or when the user asks whether something actually works.
---

# /verify — no unverified "done"

You are running the Verify stage of the delivery loop
(00-ceo-operating-framework.md). Nothing is reported as "done" until this
stage produces evidence.

## Steps

1. **Find the brief.** Locate the active brief in `briefs/` for this work. If
   none exists, that's a framework breach — write a retroactive brief first
   (`/brief`), because you can't verify against a standard that was never set.
2. **Spawn the `review-qa` department** (Agent tool) with: the brief's full
   text, where the work lives (paths/URLs), and the builder's handover note if
   there is one. Verification must be independent — if this session built the
   work, it must not self-verify beyond smoke checks.
3. **Demand evidence per item.** The verdict comes back as Pass / Fail /
   Untestable for every definition-of-done item, with evidence. Reject a
   verdict of "looks good".
4. **Act on the verdict:**
   - All pass → append the Report to the brief, move it to `briefs/closed/`,
     and tell the user "done, verified" with the evidence summary.
   - Any fail → fix and re-verify the failed items, or report honestly:
     **"built, unverified"** / "built, N of M verified", with what remains.
5. **Never soften the language.** "Should work", "looks complete", and
   "essentially done" are banned phrases. It is either verified with evidence,
   or it is not done.

---
name: brief
description: Create a work brief before building anything — enforces the "no brief, no build" rule. Use at the start of any substantive task, or when the user asks to build/make/create something that has no brief yet.
---

# /brief — commission work properly

You are opening a brief under the CEO Operating Framework
(00-ceo-operating-framework.md). No substantive work starts without one.

## Steps

1. **Check the priority.** Read the "current priority" section of CLAUDE.md.
   If the proposed work does not serve it, say so plainly and offer to capture
   it on the right board instead (09 for products, 10 for tooling). Only the
   user can override the priority — record the override in the brief if they do.
2. **Draft the brief** from what the user asked, filling every field. Where the
   user's ask is vague, propose concrete values rather than asking six
   questions — then confirm the draft with them in one pass.
3. **Save it** to `briefs/NN-<slug>.md` (next free number) using the template
   below.
4. **Confirm scope out loud** — one sentence: what will exist when this is
   done, and how we'll know it works.
5. Only then begin the delivery loop: Plan → Build (spawn the `build` or
   `research` department) → Verify (`/verify`) → Report.

## Template

```markdown
# Brief NN — <name>
*Status: active · opened <date> · owner: CEO session*

- **Objective:** <the one outcome, in a sentence>
- **Serves the priority how?** <link it to CLAUDE.md's current priority, or
  record the user's explicit override>
- **Definition of done:** <observable, checkable outcomes — bullet each>
- **Verification:** <the concrete test/evidence that proves each outcome>
- **Budget:** <time-box, size cap (artefact ladder rung), spend cap if any>
- **Kill criteria:** <what result means stop and record the learning>
```

## Hard rules

- A brief whose definition of done can't be verified isn't ready — fix the
  brief, not the standard.
- Default budget is the lowest rung of the artefact ladder that can meet the
  objective (decision → doc → spreadsheet → static page → app).
- When the work finishes, append the Report (what shipped · evidence · what
  was cut · recommended next brief) and move the file to `briefs/closed/`.

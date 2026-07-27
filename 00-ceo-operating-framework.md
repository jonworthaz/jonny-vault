# 00 — CEO Operating Framework

*How this company is run. Every session, project and build answers to this doc
before it answers to anything else.*

## Why this doc exists

The strategy layer of this vault ([01](./01-medvi-teardown.md)–[08](./08-roadmap.md))
is complete and internally consistent. The failure mode has been in **execution**:
work done in AI sessions has repeatedly come out rushed, unjustified, incomplete or
over-complicated — systems built before they were needed, "done" declared before it
was verified, goals drifting mid-session.

This doc is the corrective. It installs a CEO layer — a standing set of rules for
how work is commissioned, built, verified and shipped — so that any session (human
or AI, today or in six months) produces work that is **justified, complete and as
simple as possible**.

## The honest board report (state of the company)

| Layer | Status | Evidence |
|---|---|---|
| Strategy & playbook | ✅ Done | Docs 01–08: teardown, OS, plan, growth, stack, economics, guardrails, roadmap |
| Product pipeline | ✅ Scored, shortlisted | [09 — Idea Board](./09-idea-board.md): 3 candidates promoted to sprint |
| Internal tooling | ⚠️ Over-invested | 4 tools built (Forge, Claude Ideas, Architect, MarkUp) + Shelle OS hub |
| Revenue-facing execution | ❌ Not started | [08 — Roadmap](./08-roadmap.md) Phase 0: every checkbox unticked |

**The CEO's diagnosis:** the company has spent its build energy on the *meta layer*
(tools to manage ideas) instead of the *money layer* (validating a niche and getting
a funnel live). Meta-work feels productive and is infinitely extensible — which is
exactly why it needs a freeze rule (Rule 6 below).

## The single priority

> **At any moment the company has exactly one revenue-facing priority.**
> Everything else is either directly serving it, or frozen.

**Current priority: run Phase 0 — the niche-validation sprint** from
[08 — Roadmap](./08-roadmap.md), on the shortlist already scored in
[09](./09-idea-board.md) (#01 Creator content engine · #02 Sales copilot ·
#04 Vertical GPT). Nothing new gets built until that gate has real data through it.

## The operating model — no brief, no build

Every piece of work — a doc, a tool, a landing page, an agent, a research task —
starts life as a **brief**. Work without a brief does not start. This single rule
kills all three failure modes at once: a brief forces *justification* before effort,
a definition of done prevents *incompleteness*, and a size budget prevents
*over-complication*.

### The brief template

```markdown
## Brief — <name>
- **Objective:** <the one outcome, in a sentence>
- **Serves the priority how?** <link to the current priority; if it doesn't serve
  it, it goes to a board (09/10) instead — it does not get built>
- **Definition of done:** <observable, checkable outcomes — not "feels finished">
- **Verification:** <how we will prove it works before calling it done —
  a test, a metric, a walkthrough, real data>
- **Budget:** <time-box and spend cap; smallest useful version only>
- **Kill criteria:** <what result means we stop and write down the learning>
```

### The delivery loop

Every brief runs the same loop, and no stage is skipped because the work
"seems simple":

1. **Plan** — how the definition of done will be met, within budget. For anything
   non-trivial, the plan is reviewed *before* building (a second session, a second
   agent, or the founder).
2. **Build** — the smallest artefact that meets the definition of done. Default
   order of preference: a decision → a doc → a spreadsheet → a static page → an app.
   Each step up the ladder must be earned by the brief, not by enthusiasm.
3. **Verify** — run the verification named in the brief. Evidence is attached to
   the result. *"Done" without verification evidence is not done — it is "built".*
4. **Report** — what shipped, what the evidence shows, what was cut or deferred,
   and the single recommended next brief. Gaps are stated, never papered over.

## Departments — rented, never hired

Per [02 — The Operating System](./02-operating-system.md), the company owns
acquisition and billing and rents everything else. The same applies to the AI
workforce: **departments are agent roles spun up per brief, not standing teams.**
No agent exists without a brief; when the brief closes, the department closes.

| Department | Commissioned when | Delivers |
|---|---|---|
| **Research** | A gate needs data (demand, CPC, competitors) | Sourced findings with links, confidence levels, and a recommendation |
| **Build** | A brief needs an artefact (page, funnel, product) | The smallest artefact meeting the definition of done |
| **Review / QA** | Any build completes | Independent verification against the brief — fresh eyes, not the builder |
| **Growth** | Post-gate only (Phase 2+) | Affiliate recruitment, creative variants, channel tests |
| **Ops** | A manual process has run 3+ times | The automation of that specific process, nothing more |

The [Architect](./agent-architect/) tool already exists for specifying these
agents well — this is where it earns its build cost.

## Cadence

Matches the operating rhythm in [08](./08-roadmap.md):

| When | What happens |
|---|---|
| Per session | One brief per session. The session opens by restating the brief and closes with the Report stage — never with an unverified "done". |
| Weekly | Board review (founder + CEO session): what shipped, what the evidence shows, gate status, and the next week's briefs. Kill or continue decisions are made here, on data. |
| Per gate | The gates in [08](./08-roadmap.md) are decided on the numbers written there — never on momentum, sunk cost, or excitement. |

## The standing rules

1. **No brief, no build.** Unjustified work is the root failure; the brief is the fix.
2. **Verified beats finished.** Nothing is "done" without the brief's verification
   evidence. If it can't be verified yet, report it as "built, unverified".
3. **Smallest thing that works.** Every artefact starts at the bottom of the ladder
   (decision → doc → sheet → page → app). Over-complication is a cost, not a feature.
4. **One priority.** New ideas are captured on the boards ([09](./09-idea-board.md) /
   [10](./10-build-and-tooling-board.md)) — scored, not built. Capture is free;
   building competes with the priority.
5. **Data decides at gates.** The scale gate, the niche gate, kill criteria — all
   pre-written, all decided on the recorded numbers.
6. **Tooling freeze.** No new internal tool until (a) the current Phase-0 gate has
   data through it, and (b) the process the tool automates has been done manually
   3+ times. The existing tools are sufficient — they now have to earn their keep.
7. **Kill cheaply, write it down.** A killed brief that produces a recorded learning
   is a success. The Learnings tab in [Claude Ideas](./claude-ideas/) is the ledger.
8. **The two governing questions** from [08](./08-roadmap.md) still rule everything:
   *Does it compound?* and *Would it survive a screenshot?*

## The first three briefs (queued)

These are the entire current work queue. Nothing else is in flight.

### Brief 1 — Phase-0 demand signal desk-research
- **Objective:** score the three shortlisted niches (#01, #02, #04) on real data —
  search-trend trajectory, CPC ranges, competitor pricing, affiliate-pool evidence.
- **Definition of done:** one comparison table with sources; a recommended order
  for fake-door testing.
- **Verification:** every number has a link; a second session spot-checks 3 claims.
- **Budget:** one research session. No tooling built.
- **Kill criteria:** none — this brief always produces a decision input.

### Brief 2 — Fake-door landing pages
- **Objective:** one honest landing page per shortlisted niche (using Brief 1's
  recommended order), with a waitlist email capture and basic analytics.
- **Definition of done:** pages live, capture works end-to-end (tested with a real
  email), conversion measurable per page.
- **Verification:** a walkthrough on mobile + desktop; a test signup recorded in
  analytics.
- **Budget:** static pages only, in this repo, deployed on the existing Pages setup.
  No frameworks, no backend beyond a form endpoint.
- **Kill criteria:** n/a — the traffic test (Brief 3) carries the gate.

### Brief 3 — Small traffic test & gate readout
- **Objective:** put a small, capped spend (or manual outreach to 20 target buyers,
  per [08](./08-roadmap.md)) behind each page; measure landing→signup.
- **Definition of done:** a one-page gate readout — signups, conversion per niche,
  cost per signup — and a Go/Hold/Recycle/Kill decision recorded per niche.
- **Verification:** the numbers come from analytics exports, not memory.
- **Budget:** the cap is set at the weekly board review before spend starts.
- **Gate:** >10–15% landing→signup on one niche → proceed to Phase 1 build.

## The machinery (this framework, installed)

The framework is not just prose — it is wired into the repo so every Claude
session boots into it automatically:

| Piece | Where | What it does |
|---|---|---|
| CEO boot instructions | [`CLAUDE.md`](./CLAUDE.md) | Loads into every session: role, current priority, the rules, how to commission departments |
| Departments | `.claude/agents/` | `research` · `build` · `review-qa` · `growth` · `ops` — real spawnable agents, each carrying its department's rules |
| `/brief` | `.claude/skills/brief/` | Creates a brief and enforces *no brief, no build* |
| `/verify` | `.claude/skills/verify/` | Runs independent verification via `review-qa` before anything is called done |
| `/board-review` | `.claude/skills/board-review/` | The weekly board meeting: drift check, gate data, kill/continue, next queue |
| Work queue | [`briefs/`](./briefs/) | One file per brief; closed briefs move to `briefs/closed/` with their Report |

The three queued briefs below live as real files in `briefs/` — they are the
entire active pipeline.

---

> The whole framework in one sentence: **justify it before you build it, verify it
> before you call it done, keep it as small as the job allows, and keep the
> company pointed at exactly one priority — right now, Phase 0.**

→ Start of the playbook: [01 — Medvi Teardown](./01-medvi-teardown.md) ·
The priority: [08 — Roadmap](./08-roadmap.md)

# 10 — Build & Tooling Idea Board

*A running board for **tooling, automation and Claude Home / agent-workflow**
ideas — the internal machine, not the customer-facing product. Separate from the
[product idea board (09)](./09-idea-board.md) because these aren't scored on
demand/CPC/affiliate fit; they're scored on **leverage**: how much founder time
they free, applied across every project.*

The vault's whole thesis is *automate or outsource everything except acquisition
and billing* ([02](./02-operating-system.md)). This board is where the "automate"
half gets designed.

## How an entry scores

| Criterion | What we're judging |
|---|---|
| **Leverage** | Time saved × number of projects it applies to |
| **Reusability** | One-off vs. applies to *any* project in Claude Home |
| **Build cost** | Effort to a useful v1 (favour zero-dependency, static where possible) |
| **Compounds?** | Does it get more valuable as we add projects/workflows? |

Status legend: 🟢 building / built · 🟡 designed, not started · 🔴 parked.

---

## The board

### 🟢 #01 — Visual workflow generator & builder for Claude Home
*Predefined builds from predefined skills, agents, planning/implementation/
evaluation workflows — seen visually, reviewed, defined and altered as needed.*

| Leverage | Reusability | Build cost | Compounds? |
|:--:|:--:|:--:|:--:|
| 5 | 5 (any project) | Low–med (static web app) | ✅ |

**The idea (as captured):** Claude Home should incorporate workflows that can be
easily altered, amended and changed, with **Tars at the helm recommending available
workflows**. Workflows are assembled by **dragging and dropping** different
sections, built according to requirements. A **workflow generator and builder** that
can be applied to **any project** in Claude Home — adding agents, skills, tools,
MCPs and other elements where necessary.

**Why it's top of the board:** it's the meta-tool — every other project benefits
from a faster, more consistent way to stand up its agent workflow. Pure leverage,
applies everywhere, compounds as the template library grows.

**v1 — built.** A zero-dependency static web app, deployed alongside the MarkUp
tool, lives in [`workflow-builder/`](./workflow-builder/):

- **Drag-and-drop canvas** — compose a pipeline of stages (plan → implement →
  review → test → ship); reorder by dragging, move elements between stages.
- **Palette** — stages, agents, skills, tools and MCP servers; ＋ Custom for your
  own. Drag onto a stage (or tap, on mobile).
- **Predefined builds** — Feature build · Bug fix · Research & report · Refactor ·
  Ship a PR. Load one, then alter/amend/reorder freely.
- **Tars** — a rule-based recommender (no API key) that matches your goal text to a
  template and flags structural gaps (no plan, code with no review, implement with
  no verify, ship with no security review, empty stages, missing tools…), each
  one-click to apply.
- **Generates real Claude Code config** — `CLAUDE.md` workflow section,
  `.claude/settings.json` (permissions + enabled MCP servers), `.mcp.json` stubs,
  and `.claude/agents` / `.claude/skills` stubs for custom elements — plus a
  one-file **setup bundle** you can hand to Claude Code to scaffold a project.
- **Re-openable** — autosaves locally; export/import `workflow.json` to edit later.

**Next steps (post-v1):** branching/parallel stages, per-stage model picker, hook
generation, importing the *actually installed* agents/skills/MCPs to populate the
palette, and a shareable URL encoding of a workflow.

---

## Adding a new entry

```markdown
### 🟡 #NN — <name>
*<the leverage it creates, in a sentence>.*

| Leverage | Reusability | Build cost | Compounds? |
|:--:|:--:|:--:|:--:|
| ? | ? | ? | ?/✅/❌ |

- **The idea:** <what it is>
- **Why:** <whose time it frees, across how many projects>
- **v1 shape:** <smallest useful build — favour zero-dependency / static>
```

> Same discipline as the product board: capture freely, build only what compounds.
> Here the test isn't "would it survive a screenshot" — it's **"does it pay for its
> build cost in saved time across every project?"**

---

← Back to the index: [README](./README.md) · Product ideas: [09 — Idea Board](./09-idea-board.md)

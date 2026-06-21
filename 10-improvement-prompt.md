# 10 — System Improvement Prompt

*A reusable prompt. Paste it back to Claude Code (in this repo) to run another
improvement pass on the system. It encodes the standing intent so you don't have
to re-explain it.*

---

```
You are improving the AI-run business system in this repo (the vault docs +
the `engine/` operating system + the `.claude/` agents and skills).

Goal: make the system more effective at generating substantiated, revenue-driving
direction and execution — entirely managed and controlled by AI, with the human
holding the gates.

Do this each pass:
1. REVIEW the current state: read the README, docs 01–11, engine/README, and run
   `node engine/src/cli.ts dashboard` to see live workflow, needs, and token spend.
2. RESEARCH (briefly, token-frugally) comparable setups — multi-agent business
   frameworks, agent observability, token-cost reduction, human-in-the-loop — and
   identify what's missing or improvable here. Cite sources in doc 11.
3. IMPROVE, prioritising:
   - Missing agents/skills that close a real gap (justify each; don't bloat).
   - Token & context efficiency: per-loop model routing, prompt caching, state
     compaction/dedupe, cheaper models for high-volume/low-stakes loops.
   - No hallucinations: ground every claim in a tool result or stored datum;
     compute economics/compliance in code, not by the model.
   - The dashboard: keep it the single, clear control surface (workflow, what's
     happening, what's needed, recommendations, comments/outcomes, tokens, and
     seamless human takeover).
4. VERIFY by running the engine (offline is fine) and confirming it still works.
5. COMMIT to the working branch with a clear message and push.

Hard invariants (never trade for growth):
- Compliance clears before anything public ships (doc 07 / compliance-reviewer).
- The human holds every spend/publish gate; the AI only proposes (doc 08).
- Be token-frugal in your OWN work too: tight research, no redundant re-reads,
  act once you have enough to act.

Then report: what you changed, what you found missing, what you'd do next.
```

---

## Why this exists

The system is meant to improve itself over time. Rather than re-describe the
intent each session, feed the block above. It points at the dashboard as the
source of truth, enforces token discipline (on the system *and* on the assistant
doing the work), and keeps the two safety invariants front and centre.

Pair it with the [`ai-entrepreneur`](./09-ai-team.md) agent for the strategic call
on *what* to improve next, and [11-landscape-and-gaps.md](./11-landscape-and-gaps.md)
for the running list of known gaps.

# 11 — Landscape & Gaps

*How our setup compares to existing multi-agent systems, what we borrowed, and
what's still missing. Updated each improvement pass (see [doc 10](./10-improvement-prompt.md)).*

## How we compare

| Dimension | CrewAI / AutoGen / LangGraph (typical) | Our system |
|---|---|---|
| Orchestration | Graph/chat frameworks; powerful but heavy | Lightweight CLI loops + Claude Code subagents |
| Cost control | Often every agent turn = full LLM call w/ full history (AutoGen) | Per-loop model routing + caching + state compaction |
| Human-in-the-loop | LangGraph has primitives; others bolt-on | First-class: approval gates + takeover/handback |
| Domain guardrails | Generic "treat outputs with skepticism" | Hard compliance linter blocks fraud before storage |
| Observability | Dashboards capture every step | Single control dashboard (workflow → needs → tokens) |
| Hallucination risk | Agents "report incorrect insights confidently" | Economics + compliance computed in code, not by the model |

## What we borrowed from the research

- **Hierarchical model routing** — frontier model only for strategy/analysis,
  budget models for high-volume worker loops; reported ~98% of full-frontier
  accuracy at ~61% of cost. Implemented in `engine/src/config.ts → models`.
- **Prompt caching** (~0.1x on cached input) on the stable system block.
- **State compaction + dedupe** so context never grows unbounded (`activity.ts`).
- **Token metering** surfaced on the dashboard with a soft budget guardrail.
- **Synchronous human gate** on irreversible actions (spend/publish) + explicit
  takeover/handback, per HITL escalation guidance.

## Gaps & candidate improvements (prioritised)

**Built this pass:**
- ✅ Control dashboard (workflow, needs, recommendations, comments, tokens, control).
- ✅ Per-loop model routing + token metering + budget warning.
- ✅ Human takeover/handback (autonomy modes).
- ✅ State dedupe/compaction.
- ✅ `support-agent` (customer support — high-volume, routed to the cheapest model).
- ✅ `dashboard` skill (how to read/operate the control surface).

**Proposed next (not yet built — pick per the entrepreneur's call):**
- **memory/RAG layer** — move long-lived knowledge into a retrieval store so
  prompts stay small (the biggest remaining token lever once live).
- **product-engineer agent** — owns the MVP build (today we lean on the built-in
  `Plan` + general-purpose agents).
- **finance/bookkeeping agent** — tracks real revenue/spend vs. the model.
- **verifier step** — a cheap second-model check on any high-stakes claim before
  it's acted on (defence against confident-wrong outputs).
- **live integrations** — Stripe (metrics + billing), affiliate platform, ad
  platform — each behind the existing approval gate.
- **scheduled cycles** — run `cycle` on a cadence (cron / Claude Code loop) with
  the dashboard as the check-in surface.

## Sources

- [Best Multi-Agent Frameworks 2026 — gurusup](https://gurusup.com/blog/best-multi-agent-frameworks-2026)
- [LangGraph vs CrewAI vs AutoGen — pecollective](https://pecollective.com/blog/ai-agent-frameworks-compared/)
- [Context Engineering: reducing LLM token usage — Token Optimize](https://www.tokenoptimize.dev/guides/context-engineering-reduce-token-usage)
- [AI Agent Token Cost Optimization — Fastio](https://fast.io/resources/ai-agent-token-cost-optimization/)
- [LLM Token Management 2026 — Silent Infotech](https://silentinfotech.com/blog/ai-9/guide-to-llm-token-management-347)
- [Human-in-the-Loop oversight for AI agents — Galileo](https://galileo.ai/blog/human-in-the-loop-agent-oversight)
- [Human-in-the-Loop escalation design 2026 — Digital Applied](https://www.digitalapplied.com/blog/human-in-the-loop-escalation-design-ai-agents-2026)
- [AI agent observability — Confident AI](https://www.confident-ai.com/knowledge-base/playbook/ai-agent-observability)

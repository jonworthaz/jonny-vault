import { id } from "../store.ts";
import { complete } from "../llm.ts";
import { lintCopy } from "../guardrails.ts";
import { markByLoop } from "../components.ts";
import type { EngineState, ProposedAction, Learning } from "../types.ts";

// Affiliate loop — owned by the affiliate-manager module. Drafts target partner
// pools + one honest recruitment outreach message (the distribution moat, doc 04),
// runs the outreach through the guardrails, and proposes a gated recruitment action.
// Wired to the registry as loop "affiliate" → tokens attribute to affiliate-manager.

export async function runAffiliateLoop(state: EngineState): Promise<string[]> {
  const product = state.selectedNiche ?? "an AI-powered subscription tool";

  const draft = await complete({
    loop: "affiliate",
    state,
    system:
      "You are a partnerships lead. Recurring ~30-40% (or high CPA) commissions; our margin lets us out-pay competitors. " +
      "Outreach must be honest and require partners to disclose the paid relationship (#ad). " +
      "Return: (a) 3 partner pools to target, then a line '---', then (b) ONE short outreach message including the disclosure requirement.",
    prompt: `Product: ${product}. Draft 3 partner pools and one honest recruitment outreach message.`,
    maxTokens: 600,
    offline: () =>
      `Partner pools:\n- Niche newsletters in the buyer's space\n- YouTube/TikTok creators who serve the same audience\n- Micro-communities (Discords, subreddits) where the buyer hangs out\n---\nOutreach: "Hi {name} — your audience would genuinely use ${product}. We pay the highest recurring commission in the category and supply ready-made, honest creative. Partners must add a clear #ad disclosure. Want a link to try it free first?"`,
  });

  const lint = lintCopy(draft);
  const action: ProposedAction = {
    id: id("act"),
    loop: "affiliate",
    kind: "config",
    summary: "Launch affiliate recruitment (target pools + outreach)",
    detail: draft.trim(),
    requiresApproval: true,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  state.proposedActions.unshift(action);

  const learning: Learning = {
    id: id("learn"),
    loop: "affiliate",
    ts: new Date().toISOString(),
    insight: "Affiliate recruitment drafted (pools + honest outreach with disclosure).",
    confidence: 0.5,
  };
  state.learnings.unshift(learning);
  markByLoop(state, "affiliate", "Drafted partner pools + outreach");

  return [
    `Affiliate loop: drafted partner pools + outreach. Compliance: ${lint.pass ? "PASS" : "BLOCKED — " + lint.notes.join("; ")}`,
    draft.trim(),
    `Proposed action ${action.id}: ${action.summary} (pending approval).`,
  ];
}

import { id } from "../store.ts";
import { complete } from "../llm.ts";
import { lintCopy } from "../guardrails.ts";
import { markByLoop } from "../components.ts";
import type { EngineState, Learning } from "../types.ts";

// Support loop — owned by the support-agent module (cheapest model). Drafts an
// honest reply to a customer question + a candidate FAQ entry, runs it through
// the guardrails, and surfaces recurring questions as retention/activation input.
// Wired to the registry as loop "support" → tokens attribute to support-agent.

export async function runSupportLoop(state: EngineState, question?: string): Promise<string[]> {
  const q = question ?? "When am I billed, and how do I cancel?";

  const reply = await complete({
    loop: "support",
    state,
    system:
      "You are a customer-support agent. Be honest, concrete, and brief. Never invent prices, features, or policies — " +
      "if unsure, say so and escalate. Be transparent about billing (intro price, step-up, renewal date, one-click cancel). " +
      "Don't claim to be human. Return: the reply, then a line '---', then a one-line FAQ entry.",
    prompt: `Customer question: "${q}". Draft an honest reply and a FAQ entry.`,
    maxTokens: 400,
    offline: () =>
      `Reply: Your first month is the intro price; it renews monthly at the standard rate on the same date each month. You can cancel anytime in one click from Settings → Billing — no email or call needed. Want me to point you to the exact screen?\n---\nFAQ: Billing renews monthly on your signup date; cancel anytime in one click under Settings → Billing.`,
  });

  const lint = lintCopy(reply);
  const learning: Learning = {
    id: id("learn"),
    loop: "support",
    ts: new Date().toISOString(),
    insight: `Support handled: "${q}". Recurring questions → feed onboarding/retention.`,
    confidence: 0.5,
  };
  state.learnings.unshift(learning);
  markByLoop(state, "support", `Answered: "${q.slice(0, 40)}"`);

  return [
    `Support loop. Compliance: ${lint.pass ? "PASS" : "BLOCKED — " + lint.notes.join("; ")}`,
    reply.trim(),
  ];
}

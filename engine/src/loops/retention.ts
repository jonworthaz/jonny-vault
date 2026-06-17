import { id } from "../store.ts";
import { complete } from "../llm.ts";
import type { EngineState, Learning, ProposedAction } from "../types.ts";

// Retention / Churn Loop. Takes cancellation reasons (from a cancel survey) and
// proposes concrete product/lifecycle fixes — because per doc 06, churn is the
// thing that decides whether the whole model works.

// In a real deployment these come from your cancel-survey data. Seeded here so
// the loop is runnable; pass real reasons via the CLI.
const DEFAULT_REASONS = [
  "Too expensive after the intro price",
  "Didn't get value fast enough",
  "Output quality wasn't good enough",
  "Only needed it once",
];

export async function runRetentionLoop(state: EngineState, reasons?: string[]): Promise<string[]> {
  const churnReasons = reasons && reasons.length ? reasons : DEFAULT_REASONS;

  const fixes = await complete({
    system:
      "You are a retention/lifecycle product lead for a subscription business. For each churn reason, " +
      "propose ONE concrete, honest, shippable fix (no dark patterns, no hiding the cancel button). " +
      "Return a short bulleted list, one fix per reason.",
    prompt:
      `Cancellation reasons from the cancel survey:\n` +
      churnReasons.map((r) => `- ${r}`).join("\n") +
      `\n\nPropose one honest fix per reason. Prioritise the fix likely to move 6-month retention most.`,
    maxTokens: 600,
    offline: () =>
      [
        "- Intro-price shock → show the post-trial price clearly before payment and email a value recap pre-renewal.",
        "- Slow time-to-value → redesign onboarding to deliver one real 'win' within the first session.",
        "- Output quality → upgrade the model/prompt for the core job; add a quick feedback thumb to catch misses.",
        "- One-time need → add an annual plan + a lighter 'occasional use' tier so the relationship survives.",
        "Highest-leverage: fix time-to-value first — activation drives m1, and m1 gates everything downstream.",
      ].join("\n"),
  });

  const action: ProposedAction = {
    id: id("act"),
    loop: "retention",
    kind: "config",
    summary: "Ship the highest-leverage retention fix",
    detail: fixes.trim(),
    requiresApproval: true,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  state.proposedActions.unshift(action);

  const learning: Learning = {
    id: id("learn"),
    loop: "retention",
    ts: new Date().toISOString(),
    insight: `Top churn drivers analysed (${churnReasons.length}); activation/time-to-value prioritised as the retention lever.`,
    confidence: 0.6,
  };
  state.learnings.unshift(learning);

  return [
    `Analysed ${churnReasons.length} churn reasons.`,
    fixes.trim(),
    `Proposed action ${action.id}: ${action.summary} (pending approval).`,
  ];
}

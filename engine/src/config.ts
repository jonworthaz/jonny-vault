import type { Effort } from "./types.ts";

// Central config. Two cost levers, both informed by the research in
// 11-landscape-and-gaps.md:
//   1. Hierarchical model routing — frontier model only for strategy/analysis,
//      budget model for high-volume worker loops (~98% accuracy at ~61% cost).
//   2. Prompt caching (in llm.ts) + state compaction (in store.ts).

const DEFAULT_MODEL = process.env.ENGINE_MODEL ?? "claude-opus-4-8";

export const CONFIG = {
  // Per-loop model routing. Override the default with ENGINE_MODEL.
  models: {
    strategy: "claude-opus-4-8", // judgment-heavy → frontier
    analysis: "claude-opus-4-8", // economics decisions → frontier
    creative: "claude-sonnet-4-6", // high-volume copy → budget
    retention: "claude-sonnet-4-6",
    niche: "claude-sonnet-4-6",
    support: "claude-haiku-4-5", // highest-volume, lowest-stakes → cheapest
    default: DEFAULT_MODEL,
  } as Record<string, string>,

  effort: (process.env.ENGINE_EFFORT ?? "medium") as Effort,

  // Approximate USD per 1M tokens, for the dashboard cost estimate.
  pricing: {
    "claude-opus-4-8": { input: 5, output: 25 },
    "claude-sonnet-4-6": { input: 3, output: 15 },
    "claude-haiku-4-5": { input: 1, output: 5 },
    "claude-fable-5": { input: 10, output: 50 },
  } as Record<string, { input: number; output: number }>,

  // Soft monthly spend guardrail — the dashboard warns past this; it does not block.
  tokenBudgetUsd: Number(process.env.ENGINE_BUDGET_USD ?? 50),

  targets: { cac: 80, arpu: 39, grossMarginPct: 0.9 },

  scaleGate: {
    maxPaybackMonths: 3,
    minM1Retention: 0.7,
    minM3Retention: 0.55,
    minM6Retention: 0.5,
  },

  nicheWeights: {
    demand: 0.25,
    intent: 0.25,
    pricingHeadroom: 0.2,
    buildability: 0.15,
    affiliateFit: 0.15,
  },
} as const;

export function modelFor(loop?: string): string {
  if (!loop) return CONFIG.models.default;
  return CONFIG.models[loop] ?? CONFIG.models.default;
}

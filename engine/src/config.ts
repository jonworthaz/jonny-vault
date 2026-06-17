import type { Effort } from "./types.ts";

// Central config. The scale gate thresholds mirror doc 06 (Economics & Funnel):
// these are the bars that must be cleared on the affiliate/organic cohort before
// any paid spend is approved. The whole "build-then-decide" discipline lives here.
export const CONFIG = {
  model: process.env.ENGINE_MODEL ?? "claude-opus-4-8",
  effort: (process.env.ENGINE_EFFORT ?? "medium") as Effort,

  // Targets used to sanity-check incoming metrics (illustrative, from doc 06).
  targets: {
    cac: 80,
    arpu: 39,
    grossMarginPct: 0.9,
  },

  // The scale gate. All four must pass to recommend turning on paid spend.
  scaleGate: {
    maxPaybackMonths: 3,
    minM1Retention: 0.7,
    minM3Retention: 0.55,
    minM6Retention: 0.5,
  },

  // Niche scoring weights (must sum to 1). Drives the Phase 0 selection loop.
  nicheWeights: {
    demand: 0.25,
    intent: 0.25,
    pricingHeadroom: 0.2,
    buildability: 0.15,
    affiliateFit: 0.15,
  },
} as const;

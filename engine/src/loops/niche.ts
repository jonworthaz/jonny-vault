import { readFileSync } from "node:fs";
import { CONFIG } from "../config.ts";
import { dataPath, id } from "../store.ts";
import { complete } from "../llm.ts";
import type { EngineState, NicheScore, Learning } from "../types.ts";

// Niche Selection Loop (Phase 0). Deterministic weighted scoring of candidate
// niches from their signals; the AI adds a one-line strategic rationale per niche.

interface Candidate {
  name: string;
  job: string;
  signals: {
    demand: number;
    intent: number;
    pricingHeadroom: number;
    buildability: number;
    affiliateFit: number;
  };
}

function loadCandidates(): Candidate[] {
  const raw = JSON.parse(readFileSync(dataPath("niches.json"), "utf8"));
  return raw.candidates as Candidate[];
}

function score(c: Candidate): number {
  const w = CONFIG.nicheWeights;
  const s = c.signals;
  return Math.round(
    s.demand * w.demand +
      s.intent * w.intent +
      s.pricingHeadroom * w.pricingHeadroom +
      s.buildability * w.buildability +
      s.affiliateFit * w.affiliateFit,
  );
}

export async function runNicheLoop(state: EngineState): Promise<string[]> {
  const candidates = loadCandidates();
  const ranked = candidates
    .map((c) => ({ c, total: score(c) }))
    .sort((a, b) => b.total - a.total);

  const top = ranked[0];
  const rationale = await complete({
    system:
      "You are a pragmatic product strategist for a lean, AI-run, non-health digital subscription business. " +
      "Be concrete and honest. One tight paragraph, no hype.",
    prompt:
      `Candidate niches scored 0-100 (higher = better):\n` +
      ranked.map((r) => `- ${r.c.name} (${r.total}): ${r.c.job}`).join("\n") +
      `\n\nIn 2-3 sentences, explain why "${top.c.name}" is the strongest first niche to build, and the single biggest risk to validate.`,
    maxTokens: 400,
    loop: "niche",
    state,
    offline: () =>
      `${top.c.name} ranks highest (${top.total}) on a weighted blend of demand, buyer intent, pricing headroom, ` +
      `buildability, and affiliate fit — it does a daily-use job, which drives retention, and has an obvious affiliate pool. ` +
      `Biggest risk to validate in the Phase 0 sprint: whether the AI output is good enough that users keep paying past month 1.`,
  });

  const scores: NicheScore[] = ranked.map((r) => ({
    name: r.c.name,
    job: r.c.job,
    demand: r.c.signals.demand,
    intent: r.c.signals.intent,
    pricingHeadroom: r.c.signals.pricingHeadroom,
    buildability: r.c.signals.buildability,
    affiliateFit: r.c.signals.affiliateFit,
    total: r.total,
    rationale: r.c.name === top.c.name ? rationale.trim() : "",
  }));

  state.nicheScores = scores;

  const learning: Learning = {
    id: id("learn"),
    loop: "niche",
    ts: new Date().toISOString(),
    insight: `Top niche candidate: ${top.c.name} (score ${top.total}). ${rationale.trim()}`,
    confidence: 0.5,
  };
  state.learnings.unshift(learning);

  return [
    `Scored ${scores.length} niches. Leader: ${top.c.name} (${top.total}).`,
    ...ranked.map((r) => `  ${r.total.toString().padStart(3)}  ${r.c.name}`),
    `Rationale: ${rationale.trim()}`,
    `Note: niche is NOT auto-selected — run \`select-niche "<name>"\` after the validation sprint.`,
  ];
}

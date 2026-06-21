import { id } from "../store.ts";
import type { EngineState, Experiment, Learning } from "../types.ts";

// Experiment Loop = the learning memory. Register a hypothesis + variants;
// conclude it with a winner. Concluding promotes the winner into `learnings`,
// which the creative loop reads on its next run — closing the self-improvement
// loop (measure -> learn -> bias future generation toward winners).

export function registerExperiment(
  state: EngineState,
  hypothesis: string,
  variants: string[],
  metric: string,
): string[] {
  const exp: Experiment = {
    id: id("exp"),
    hypothesis,
    variants,
    metric,
    status: "running",
    createdAt: new Date().toISOString(),
  };
  state.experiments.unshift(exp);
  return [
    `Registered experiment ${exp.id} (running).`,
    `  Hypothesis: ${hypothesis}`,
    `  Variants: ${variants.join(" | ")}`,
    `  Metric: ${metric}`,
  ];
}

export function concludeExperiment(
  state: EngineState,
  expId: string,
  winner: string,
  result?: string,
): string[] {
  const exp = state.experiments.find((e) => e.id === expId);
  if (!exp) return [`No experiment ${expId}.`];
  if (!exp.variants.includes(winner)) {
    return [`Winner "${winner}" is not one of the variants: ${exp.variants.join(", ")}`];
  }
  exp.status = "concluded";
  exp.winner = winner;
  exp.result = result;
  exp.concludedAt = new Date().toISOString();

  const learning: Learning = {
    id: id("learn"),
    loop: "experiment",
    ts: new Date().toISOString(),
    insight: `Winner for ${exp.metric}: "${winner}" (${exp.hypothesis}).${result ? " " + result : ""}`,
    confidence: 0.8,
  };
  state.learnings.unshift(learning);

  return [
    `Concluded ${exp.id}. Winner: ${winner}.`,
    `Promoted to learnings — future creative generation will favour this.`,
  ];
}

// Cycle housekeeping: surface any experiments still running so they aren't forgotten.
export function experimentStatus(state: EngineState): string[] {
  const running = state.experiments.filter((e) => e.status === "running");
  if (!running.length) return ["No running experiments. Register one to start learning."];
  return [`${running.length} experiment(s) running:`, ...running.map((e) => `  ${e.id} — ${e.metric}: ${e.hypothesis}`)];
}

import { loadState, saveState, id } from "./store.ts";
import { isLive } from "./llm.ts";
import type { EngineState, Learning } from "./types.ts";
import { runNicheLoop } from "./loops/niche.ts";
import { runCreativeLoop } from "./loops/creative.ts";
import { runAnalysisLoop } from "./loops/analysis.ts";
import { runRetentionLoop } from "./loops/retention.ts";
import { experimentStatus } from "./loops/experiment.ts";

// The orchestrator runs loops, persists state, and enforces the one hard rule:
// nothing that spends money or publishes externally executes without human
// approval. Loops only ever PROPOSE such actions.

function banner(title: string): string {
  const mode = isLive() ? "LIVE (Claude API)" : "OFFLINE (deterministic)";
  return `\n=== ${title}  [${mode}] ===`;
}

// One full self-improving cycle. Reads prior state, runs each loop, persists.
export async function runCycle(): Promise<string> {
  const state = loadState();
  const out: string[] = [banner("SELF-IMPROVING CYCLE")];

  // 1. Niche scoring (only if we haven't committed to one yet).
  if (!state.selectedNiche) {
    out.push("\n[1/5] Niche selection");
    out.push(...(await runNicheLoop(state)));
  } else {
    out.push(`\n[1/5] Niche selection — skipped (selected: ${state.selectedNiche}).`);
  }

  // 2. Creative generation (honest copy, guardrail-checked).
  out.push("\n[2/5] Creative generation");
  out.push(...(await runCreativeLoop(state, "paid-social")));

  // 3. Performance analysis + scale gate.
  out.push("\n[3/5] Performance analysis");
  out.push(...(await runAnalysisLoop(state)));

  // 4. Retention / churn analysis.
  out.push("\n[4/5] Retention analysis");
  out.push(...(await runRetentionLoop(state)));

  // 5. Experiment housekeeping.
  out.push("\n[5/5] Experiments");
  out.push(...experimentStatus(state));

  // Cap unbounded growth of in-memory logs so state.json stays readable.
  state.learnings = state.learnings.slice(0, 50);
  state.creatives = state.creatives.slice(0, 50);
  state.proposedActions = state.proposedActions.slice(0, 50);

  const summary: Learning = {
    id: id("learn"),
    loop: "cycle",
    ts: new Date().toISOString(),
    insight: `Cycle complete. ${state.proposedActions.filter((a) => a.status === "pending").length} action(s) pending approval.`,
    confidence: 1,
  };
  state.learnings.unshift(summary);

  saveState(state);
  out.push(
    `\nCycle saved. Pending approvals: ${state.proposedActions.filter((a) => a.status === "pending").length}. ` +
      `Review with \`actions\`, approve with \`approve <id>\`.`,
  );
  return out.join("\n");
}

export function approveAction(state: EngineState, actionId: string, approve: boolean): string {
  const a = state.proposedActions.find((x) => x.id === actionId);
  if (!a) return `No action ${actionId}.`;
  a.status = approve ? "approved" : "rejected";
  // NOTE: approval does not auto-execute. Spend/publish require real integrations
  // (ad account, affiliate platform) that a human must connect and trigger.
  return `Action ${actionId} ${a.status}. ${approve ? "Ready for a human/integration to execute — the engine will not move money or publish on its own." : ""}`;
}

export { loadState, saveState };
export type { EngineState };

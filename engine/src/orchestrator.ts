import { loadState, persist, id } from "./store.ts";
import { isLive } from "./llm.ts";
import { logActivity } from "./activity.ts";
import { markByLoop } from "./components.ts";
import type { EngineState, Learning } from "./types.ts";
import { runNicheLoop } from "./loops/niche.ts";
import { runCreativeLoop } from "./loops/creative.ts";
import { runAnalysisLoop } from "./loops/analysis.ts";
import { runRetentionLoop } from "./loops/retention.ts";
import { runAffiliateLoop } from "./loops/affiliate.ts";
import { runSupportLoop } from "./loops/support.ts";
import { experimentStatus } from "./loops/experiment.ts";

// The orchestrator runs loops, persists state (with token metering + compaction),
// and enforces two invariants: (1) nothing that spends money or publishes executes
// without human approval; (2) when autonomy is "paused", the engine runs nothing.

function banner(title: string): string {
  return `\n=== ${title}  [${isLive() ? "LIVE" : "OFFLINE"}] ===`;
}

export async function runCycle(): Promise<string> {
  const state = loadState();

  if (state.autonomy === "paused") {
    return "⏸ Engine is PAUSED (human in control). Run `handback` to resume, then `cycle`.";
  }

  const out: string[] = [banner("SELF-IMPROVING CYCLE")];
  logActivity(state, "cycle", "run", "Cycle started.");

  if (!state.selectedNiche) {
    out.push("\n[1/7] Niche selection");
    out.push(...(await runNicheLoop(state)));
    logActivity(state, "niche", "success", `Scored ${state.nicheScores.length} niches.`);
    markByLoop(state, "niche", `Scored ${state.nicheScores.length} niches`);
  } else {
    out.push(`\n[1/7] Niche selection — skipped (selected: ${state.selectedNiche}).`);
  }

  out.push("\n[2/7] Creative generation");
  const before = state.creatives.length;
  const creativeLines = await runCreativeLoop(state, "paid-social");
  out.push(...creativeLines);
  const stored = state.creatives.length - before;
  const blocked = creativeLines.filter((l) => l.includes("BLOCKED")).length;
  logActivity(state, "creative", blocked ? "block" : "success", `${stored} stored, ${blocked} blocked by guardrails.`);
  markByLoop(state, "creative", `${stored} stored, ${blocked} blocked`);

  out.push("\n[3/7] Performance analysis");
  out.push(...(await runAnalysisLoop(state)));
  logActivity(state, "analysis", "success", "Economics + scale gate evaluated.");
  markByLoop(state, "analysis", "Economics + scale gate evaluated");

  out.push("\n[4/7] Retention analysis");
  out.push(...(await runRetentionLoop(state)));
  logActivity(state, "retention", "success", "Churn analysed; fix proposed.");
  markByLoop(state, "retention", "Churn analysed; fix proposed");

  out.push("\n[5/7] Affiliate recruitment");
  out.push(...(await runAffiliateLoop(state)));
  logActivity(state, "affiliate", "success", "Partner pools + outreach drafted.");

  out.push("\n[6/7] Support");
  out.push(...(await runSupportLoop(state)));
  logActivity(state, "support", "success", "Support reply + FAQ drafted.");

  out.push("\n[7/7] Experiments");
  out.push(...experimentStatus(state));

  const pending = state.proposedActions.filter((a) => a.status === "pending").length;
  const summary: Learning = {
    id: id("learn"),
    loop: "cycle",
    ts: new Date().toISOString(),
    insight: `Cycle complete. ${pending} action(s) pending approval.`,
    confidence: 1,
  };
  state.learnings.unshift(summary);
  logActivity(state, "cycle", "success", `Cycle complete. ${pending} pending approval(s).`);

  persist(state); // meters tokens, compacts, saves
  out.push(`\nCycle saved. Pending approvals: ${pending}. View \`dashboard\`; approve with \`approve <id>\`.`);
  return out.join("\n");
}

export function approveAction(state: EngineState, actionId: string, approve: boolean): string {
  const a = state.proposedActions.find((x) => x.id === actionId);
  if (!a) return `No action ${actionId}.`;
  a.status = approve ? "approved" : "rejected";
  logActivity(state, a.loop, "approval", `${approve ? "Approved" : "Rejected"}: ${a.summary}`);
  return `Action ${actionId} ${a.status}. ${approve ? "Ready for a human/integration to execute — the engine will not move money or publish on its own." : ""}`;
}

export { loadState, persist };
export type { EngineState };

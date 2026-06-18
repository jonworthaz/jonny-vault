import { CONFIG } from "./config.ts";
import { isLive } from "./llm.ts";
import { computeEconomics } from "./loops/analysis.ts";
import type { EngineState } from "./types.ts";

// The dashboard. Renders the whole system at a glance from state — workflow,
// what's happening, what's needed, recommendations, an activity/comments log,
// token spend, and the human-takeover controls. Pure read of state → ZERO tokens.

function bar(label: string, ok: boolean): string {
  return `  ${ok ? "✓" : "·"} ${label}`;
}

function section(title: string): string {
  return `\n┌─ ${title} ${"─".repeat(Math.max(0, 56 - title.length))}`;
}

export function renderDashboard(state: EngineState): string {
  const out: string[] = [];
  const mode = isLive() ? "LIVE (Claude API)" : "OFFLINE (deterministic)";
  const m = state.metricsHistory[state.metricsHistory.length - 1];
  const econ = m ? computeEconomics(m) : null;
  const pending = state.proposedActions.filter((a) => a.status === "pending");

  // ── Header + autonomy banner ────────────────────────────────────────────
  out.push("╔══════════════════════════════════════════════════════════╗");
  out.push("║  LEAN SUBSCRIPTION ENGINE — CONTROL DASHBOARD              ║");
  out.push("╚══════════════════════════════════════════════════════════╝");
  out.push(`Mode: ${mode}   Autonomy: ${state.autonomy.toUpperCase()}   Updated: ${state.updatedAt}`);
  if (state.autonomy === "paused") {
    out.push("");
    out.push("  ████ HUMAN IN CONTROL ████  The engine will not run loops.");
    out.push("  Inspect/approve actions below, then `handback` to resume.");
  }

  // ── Workflow / phase ──────────────────────────────────────────────────────
  out.push(section("WORKFLOW"));
  out.push("  Phase 0 Validate → Phase 1 Build → Phase 2 Prove → Phase 3 Scale");
  out.push(bar(`Niche selected (${state.selectedNiche ?? "none"})`, Boolean(state.selectedNiche)));
  out.push(bar(`Niches scored (${state.nicheScores.length})`, state.nicheScores.length > 0));
  out.push(bar(`Compliant creatives (${state.creatives.length})`, state.creatives.length > 0));
  out.push(bar(`Metrics analysed (${state.metricsHistory.length})`, state.metricsHistory.length > 0));
  out.push(bar(`Scale gate PASS`, Boolean(econ?.gate.pass)));
  out.push(bar(`Experiments concluded (${state.experiments.filter((e) => e.status === "concluded").length})`, state.experiments.some((e) => e.status === "concluded")));

  // ── What's happening ──────────────────────────────────────────────────────
  out.push(section("WHAT'S HAPPENING (recent)"));
  const recent = state.activity.slice(0, 8);
  if (!recent.length) out.push("  (no activity yet — run `cycle`)");
  for (const a of recent) {
    const icon = { success: "✓", failure: "✗", block: "⛔", approval: "✅", control: "⏯", run: "▶", note: "•" }[a.kind] ?? "•";
    out.push(`  ${icon} [${a.loop}] ${a.message}`);
  }

  // ── What's needed (approval gates) ────────────────────────────────────────
  out.push(section("WHAT'S NEEDED — pending approvals"));
  if (!pending.length) out.push("  (nothing waiting on you)");
  for (const a of pending) out.push(`  ${a.id}  (${a.kind}) ${a.summary}\n      → approve ${a.id}  |  reject ${a.id}`);

  // ── Recommendations (derived; no tokens) ──────────────────────────────────
  out.push(section("RECOMMENDATIONS"));
  const recs: string[] = [];
  if (state.autonomy === "paused") recs.push("Engine is paused — `handback` to resume autonomous loops.");
  if (!state.selectedNiche) recs.push("Run niche validation → `select-niche \"<name>\"` once a winner is clear.");
  if (!state.metricsHistory.length) recs.push("Wire a metrics export (Stripe/PostHog) and run `analyze`.");
  if (econ && !econ.gate.pass) {
    const fails = [!econ.gate.payback && "payback", !econ.gate.m1 && "M1", !econ.gate.m3 && "M3", !econ.gate.m6 && "M6"].filter(Boolean);
    recs.push(`Scale gate HOLD (failing: ${fails.join(", ")}) — fix retention/activation before any paid spend.`);
  }
  if (econ?.gate.pass) recs.push("Scale gate PASS — approve a throttled paid-spend test scaled to payback.");
  if (pending.length) recs.push(`Review ${pending.length} pending action(s) above.`);
  if (state.tokens.estCostUsd > CONFIG.tokenBudgetUsd) recs.push(`⚠ Token spend ($${state.tokens.estCostUsd.toFixed(2)}) over budget ($${CONFIG.tokenBudgetUsd}). Lower effort / use cheaper loop models.`);
  if (!recs.length) recs.push("On track — run a `cycle` to keep the loops compounding.");
  recs.forEach((r) => out.push(`  → ${r}`));

  // ── Comments / log: outcomes & what to improve ────────────────────────────
  out.push(section("COMMENTS — outcomes & what to improve"));
  const successes = state.activity.filter((a) => a.kind === "success").length;
  const failures = state.activity.filter((a) => a.kind === "failure").length;
  const blocks = state.activity.filter((a) => a.kind === "block").length;
  out.push(`  Successes: ${successes}   Failures: ${failures}   Compliance blocks: ${blocks}`);
  const improve: string[] = [];
  if (blocks) improve.push(`${blocks} asset(s) blocked by guardrails — tighten copy briefs.`);
  if (failures) improve.push(`${failures} failed step(s) — check the activity log.`);
  if (econ && !econ.gate.pass) improve.push("Retention is the binding constraint — prioritise activation.");
  if (!improve.length) improve.push("No outstanding issues flagged.");
  improve.forEach((i) => out.push(`  ✎ ${i}`));

  // ── Tokens ────────────────────────────────────────────────────────────────
  out.push(section("TOKENS USED"));
  const t = state.tokens;
  out.push(`  Calls: ${t.calls}   In: ${t.input.toLocaleString()}   Out: ${t.output.toLocaleString()}   Cache read: ${t.cacheRead.toLocaleString()}`);
  out.push(`  Est. cost: $${t.estCostUsd.toFixed(4)} / budget $${CONFIG.tokenBudgetUsd}` + (isLive() ? "" : "   (offline = $0; metering starts when ANTHROPIC_API_KEY is set)"));
  const byLoop = Object.entries(t.byLoop).sort((a, b) => b[1].estCostUsd - a[1].estCostUsd);
  if (byLoop.length) out.push("  By loop: " + byLoop.map(([l, b]) => `${l} $${b.estCostUsd.toFixed(3)}`).join("  "));

  // ── Human takeover ────────────────────────────────────────────────────────
  out.push(section("CONTROL — human takeover"));
  out.push("  takeover            Pause the engine; you take manual control");
  out.push("  handback [auto]     Return control to the engine (assist|auto)");
  out.push("  approve <id> / reject <id>   Resolve a pending action");
  out.push("  cycle               Run one full self-improving cycle");
  out.push("");
  return out.join("\n");
}

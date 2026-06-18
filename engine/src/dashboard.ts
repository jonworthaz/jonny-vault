import { CONFIG } from "./config.ts";
import { isLive, customConfigured } from "./llm.ts";
import { computeEconomics } from "./loops/analysis.ts";
import { COMPONENTS, defOf, stateOf } from "./components.ts";
import type { EngineState } from "./types.ts";

// The control dashboard. Renders the whole modular system from state — workflow,
// each business module (agent/function) with its model, status, tokens and
// controls, the token cost drivers, agent actions, available skills, what's
// missing, and the human-takeover controls. Pure read → ZERO tokens.

function section(title: string): string {
  return `\n┌─ ${title} ${"─".repeat(Math.max(0, 56 - title.length))}`;
}
function tick(ok: boolean): string {
  return ok ? "✓" : "·";
}

export function renderDashboard(state: EngineState): string {
  const out: string[] = [];
  const mode = isLive() ? (customConfigured() ? "LIVE (Claude + custom)" : "LIVE (Claude API)") : "OFFLINE (deterministic)";
  const m = state.metricsHistory[state.metricsHistory.length - 1];
  const econ = m ? computeEconomics(m) : null;
  const pending = state.proposedActions.filter((a) => a.status === "pending");
  const tok = state.tokens;

  // ── Header ────────────────────────────────────────────────────────────────
  out.push("╔══════════════════════════════════════════════════════════╗");
  out.push("║  LEAN SUBSCRIPTION ENGINE — MODULAR CONTROL DASHBOARD     ║");
  out.push("╚══════════════════════════════════════════════════════════╝");
  out.push(`Mode: ${mode}   Autonomy: ${state.autonomy.toUpperCase()}   Updated: ${state.updatedAt}`);
  if (state.autonomy === "paused") {
    out.push("  ████ HUMAN IN CONTROL (engine paused) ████  → `handback` to resume.");
  }

  // ── Entrepreneur control ──────────────────────────────────────────────────
  const ent = stateOf(state, "entrepreneur");
  out.push(section("CONTROLLER — AI Entrepreneur"));
  out.push(`  🟣 ai-entrepreneur   model: ${ent?.model}   directs every module below.`);
  out.push("  It reads this dashboard as its source of truth and routes work to the");
  out.push("  specialist modules; it proposes, you approve. (Runs in Claude Code.)");

  // ── Business modules (modular components) ─────────────────────────────────
  out.push(section("BUSINESS MODULES (agents & functions)"));
  for (const def of COMPONENTS) {
    if (def.key === "entrepreneur") continue;
    const st = stateOf(state, def.key);
    const t = tok.byLoop[def.key];
    const status = st?.status === "on-hold" ? "ON-HOLD" : "active ";
    const cost = t ? `$${t.estCostUsd.toFixed(4)}` : "$0.0000";
    const prov = st?.provider === "custom" ? " (custom)" : "";
    out.push(`  [${status}] ${def.key.padEnd(20)} ${(st?.model ?? def.defaultModel)}${prov}   ${cost}`);
    out.push(`      role: ${def.role}${def.loop ? ` · loop: ${def.loop}` : ""}${def.skills.length ? ` · skills: ${def.skills.join(", ")}` : ""}`);
    if (st?.lastAction) out.push(`      last: "${st.lastAction}"`);
    if (def.note) out.push(`      note: ${def.note}`);
    out.push(`      controls: ${st?.status === "on-hold" ? `resume ${def.key}` : `hold ${def.key}`} | model ${def.key} <id> [--provider custom]`);
  }

  // ── Token breakdown / cost drivers ────────────────────────────────────────
  out.push(section("TOKEN USAGE — cost drivers"));
  out.push(`  Total: ${tok.calls} calls · in ${tok.input.toLocaleString()} · out ${tok.output.toLocaleString()} · est $${tok.estCostUsd.toFixed(4)} / budget $${CONFIG.tokenBudgetUsd}`);
  const drivers = Object.entries(tok.byLoop).sort((a, b) => b[1].estCostUsd - a[1].estCostUsd);
  if (!drivers.length) {
    out.push("  (no model spend yet" + (isLive() ? "" : " — offline = $0; metering starts with ANTHROPIC_API_KEY or CUSTOM_LLM_BASE_URL") + ")");
  } else {
    drivers.forEach(([k, b], i) => {
      const label = defOf(k)?.label ?? k;
      const flag = i === 0 ? "  ◀ TOP DRIVER" : "";
      out.push(`  ${i === 0 ? "▲" : " "} ${k.padEnd(20)} $${b.estCostUsd.toFixed(4)}  (${b.calls} calls, ${b.input.toLocaleString()} in)${flag}`);
    });
  }
  if (tok.estCostUsd > CONFIG.tokenBudgetUsd) out.push(`  ⚠ Over budget — lower effort, route the top driver to a cheaper model, or hold it.`);

  // ── Agent actions ─────────────────────────────────────────────────────────
  out.push(section("AGENT ACTIONS (recent)"));
  const acted = COMPONENTS.filter((d) => stateOf(state, d.key)?.lastAction)
    .map((d) => ({ d, st: stateOf(state, d.key)! }))
    .sort((a, b) => (b.st.lastActionTs ?? "").localeCompare(a.st.lastActionTs ?? ""));
  if (!acted.length) out.push("  (no agent actions yet — run `cycle`)");
  for (const { d, st } of acted.slice(0, 8)) out.push(`  • ${d.key}: ${st.lastAction}`);

  // ── Workflow ──────────────────────────────────────────────────────────────
  out.push(section("WORKFLOW"));
  out.push("  Phase 0 Validate → 1 Build → 2 Prove → 3 Scale");
  out.push(`  ${tick(Boolean(state.selectedNiche))} niche selected (${state.selectedNiche ?? "none"})   ${tick(state.creatives.length > 0)} creatives (${state.creatives.length})   ${tick(state.metricsHistory.length > 0)} metrics (${state.metricsHistory.length})   ${tick(Boolean(econ?.gate.pass))} gate PASS`);

  // ── What's needed ─────────────────────────────────────────────────────────
  out.push(section("WHAT'S NEEDED — pending approvals"));
  if (!pending.length) out.push("  (nothing waiting on you)");
  for (const a of pending) out.push(`  ${a.id} (${a.kind}) ${a.summary}  → approve ${a.id} | reject ${a.id}`);

  // ── Recommendations ───────────────────────────────────────────────────────
  out.push(section("RECOMMENDATIONS"));
  const recs: string[] = [];
  if (state.autonomy === "paused") recs.push("Engine paused — `handback` to resume.");
  if (!state.selectedNiche) recs.push("Validate niches → `select-niche \"<name>\"`.");
  if (!state.metricsHistory.length) recs.push("Wire a metrics export and `analyze`.");
  if (econ && !econ.gate.pass) recs.push("Scale gate HOLD — fix retention before paid spend.");
  if (econ?.gate.pass) recs.push("Gate PASS — approve a throttled paid-spend test.");
  if (pending.length) recs.push(`Review ${pending.length} pending action(s).`);
  if (!recs.length) recs.push("On track — run a `cycle`.");
  recs.forEach((r) => out.push(`  → ${r}`));

  // ── Comments / outcomes ───────────────────────────────────────────────────
  out.push(section("COMMENTS — outcomes & what to improve"));
  const s = (k: string) => state.activity.filter((a) => a.kind === k).length;
  out.push(`  Successes: ${s("success")}   Failures: ${s("failure")}   Compliance blocks: ${s("block")}`);
  const onHold = state.components.filter((c) => c.status === "on-hold").map((c) => c.key);
  if (onHold.length) out.push(`  ✎ On hold (human-controlled): ${onHold.join(", ")}`);
  if (s("block")) out.push("  ✎ Guardrails blocked assets — tighten the copy brief.");
  if (econ && !econ.gate.pass) out.push("  ✎ Retention is the binding constraint.");

  // ── Available skills (modular) ────────────────────────────────────────────
  out.push(section("SKILLS (modular)"));
  const skills = new Map<string, string[]>();
  for (const d of COMPONENTS) for (const sk of d.skills) skills.set(sk, [...(skills.get(sk) ?? []), d.key]);
  for (const [sk, users] of skills) out.push(`  • ${sk.padEnd(20)} used by: ${users.join(", ")}`);
  out.push("  add/edit/remove skills → .claude/skills/<name>/SKILL.md");

  // ── What's missing ────────────────────────────────────────────────────────
  out.push(section("WHAT'S MISSING"));
  const unwired = COMPONENTS.filter((d) => d.role === "agent" && d.loop === null && d.key !== "compliance-reviewer");
  unwired.forEach((d) => out.push(`  ○ ${d.key} — defined but not wired to an engine loop yet`));
  out.push("  ○ memory/RAG layer (biggest token lever once live)");
  out.push("  ○ verifier step (second-model check on high-stakes claims)");
  out.push("  ○ live integrations: Stripe (metrics+billing), affiliate platform, ad platform");
  out.push("  → full backlog: 11-landscape-and-gaps.md");

  // ── Control ───────────────────────────────────────────────────────────────
  out.push(section("CONTROL"));
  out.push("  cycle                          run one full self-improving cycle");
  out.push("  hold <key> | resume <key>      put a module on hold / resume it (per-agent takeover)");
  out.push("  model <key> <id> [--provider custom]   change a module's model (Claude or non-Claude)");
  out.push("  takeover | handback [auto]     pause / resume the WHOLE engine");
  out.push("  approve <id> | reject <id>     resolve a pending action");
  out.push("  components                     list modules (raw)");
  out.push("  add/remove agents → .claude/agents + engine/src/components.ts");
  out.push("");
  return out.join("\n");
}

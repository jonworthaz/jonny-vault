import { readFileSync, existsSync } from "node:fs";
import { CONFIG } from "../config.ts";
import { dataPath, id } from "../store.ts";
import { complete } from "../llm.ts";
import type { EngineState, MetricsSnapshot, ProposedAction, Learning } from "../types.ts";

// Performance Analysis Loop. Unit economics are computed deterministically
// (you never want these hallucinated). The AI turns the numbers into a plain
// recommendation. The scale-gate decision drives whether a "turn on paid spend"
// action is proposed.

function parseCsv(path: string): MetricsSnapshot[] {
  const lines = readFileSync(path, "utf8").trim().split(/\r?\n/);
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = cells[i]));
    return {
      ts: row.ts,
      trials: Number(row.trials),
      trialToPaid: Number(row.trialToPaid),
      newMrr: Number(row.newMrr),
      churnedMrr: Number(row.churnedMrr),
      cac: Number(row.cac),
      arpu: Number(row.arpu),
      grossMarginPct: Number(row.grossMarginPct),
      m1Retention: Number(row.m1Retention),
      m3Retention: Number(row.m3Retention),
      m6Retention: Number(row.m6Retention),
    };
  });
}

export interface Economics {
  contribution: number;
  paybackMonths: number;
  monthlyChurn: number;
  ltv: number;
  ltvCac: number;
  gate: { payback: boolean; m1: boolean; m3: boolean; m6: boolean; pass: boolean };
}

export function computeEconomics(m: MetricsSnapshot): Economics {
  const contribution = m.arpu * m.grossMarginPct;
  const paybackMonths = contribution > 0 ? m.cac / contribution : Infinity;
  const monthlyChurn = m.m6Retention > 0 ? 1 - Math.pow(m.m6Retention, 1 / 6) : 1;
  const ltv = monthlyChurn > 0 ? contribution / monthlyChurn : Infinity;
  const ltvCac = m.cac > 0 ? ltv / m.cac : Infinity;
  const g = CONFIG.scaleGate;
  const gate = {
    payback: paybackMonths <= g.maxPaybackMonths,
    m1: m.m1Retention >= g.minM1Retention,
    m3: m.m3Retention >= g.minM3Retention,
    m6: m.m6Retention >= g.minM6Retention,
    pass: false,
  };
  gate.pass = gate.payback && gate.m1 && gate.m3 && gate.m6;
  return { contribution, paybackMonths, monthlyChurn, ltv, ltvCac, gate };
}

export async function runAnalysisLoop(state: EngineState, csvArg?: string): Promise<string[]> {
  const path = csvArg ?? dataPath("metrics.sample.csv");
  if (!existsSync(path)) return [`No metrics file at ${path}.`];

  const rows = parseCsv(path);
  const latest = rows[rows.length - 1];
  state.metricsHistory = rows;

  const e = computeEconomics(latest);
  const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "∞");

  const recommendation = await complete({
    system:
      "You are a sharp growth analyst. Given unit economics, give a 2-3 sentence recommendation. " +
      "Be direct. The core rule: CAC is not the risk, churn is. Do not invent numbers.",
    prompt:
      `Latest cohort (${latest.ts}):\n` +
      `CAC $${latest.cac}, ARPU $${latest.arpu}, GM ${(latest.grossMarginPct * 100).toFixed(0)}%\n` +
      `Contribution/mo $${fmt(e.contribution)}, payback ${fmt(e.paybackMonths)} mo, LTV $${fmt(e.ltv)}, LTV:CAC ${fmt(e.ltvCac)}:1\n` +
      `Retention m1 ${(latest.m1Retention * 100).toFixed(0)}%, m3 ${(latest.m3Retention * 100).toFixed(0)}%, m6 ${(latest.m6Retention * 100).toFixed(0)}%\n` +
      `Scale gate passed: ${e.gate.pass}. What should we do next?`,
    maxTokens: 400,
    loop: "analysis",
    offline: () =>
      e.gate.pass
        ? `Unit economics clear the gate (payback ${fmt(e.paybackMonths)}mo, LTV:CAC ${fmt(e.ltvCac)}:1). ` +
          `Approve a throttled paid-spend test scaled strictly to payback, and keep watching m3/m6 retention.`
        : `Gate not yet cleared — the limiting factor is retention, not CAC. Fix onboarding/activation and product ` +
          `before spending; re-run the cohort. Do not scale paid spend.`,
  });

  const lines = [
    `Metrics: ${rows.length} snapshots. Latest ${latest.ts}.`,
    `  Contribution/mo: $${fmt(e.contribution)}   Payback: ${fmt(e.paybackMonths)} mo`,
    `  LTV: $${fmt(e.ltv)}   LTV:CAC: ${fmt(e.ltvCac)}:1   Monthly churn: ${(e.monthlyChurn * 100).toFixed(1)}%`,
    `  Gate — payback ${e.gate.payback ? "✓" : "✗"}  m1 ${e.gate.m1 ? "✓" : "✗"}  m3 ${e.gate.m3 ? "✓" : "✗"}  m6 ${e.gate.m6 ? "✓" : "✗"}  => ${e.gate.pass ? "PASS" : "HOLD"}`,
    `  Recommendation: ${recommendation.trim()}`,
  ];

  if (e.gate.pass) {
    const action: ProposedAction = {
      id: id("act"),
      loop: "analysis",
      kind: "spend",
      summary: "Turn on a throttled paid-spend test",
      detail: `Scale gate passed at ${latest.ts}. Recommend a small paid test capped to proven payback (≤${CONFIG.scaleGate.maxPaybackMonths}mo). Requires human approval before any money moves.`,
      requiresApproval: true,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    state.proposedActions.unshift(action);
    lines.push(`Proposed action ${action.id}: ${action.summary} (pending approval).`);
  }

  const learning: Learning = {
    id: id("learn"),
    loop: "analysis",
    ts: new Date().toISOString(),
    insight: `Gate ${e.gate.pass ? "PASS" : "HOLD"} @ ${latest.ts}: payback ${fmt(e.paybackMonths)}mo, LTV:CAC ${fmt(e.ltvCac)}:1, m6 ${(latest.m6Retention * 100).toFixed(0)}%.`,
    confidence: 0.7,
  };
  state.learnings.unshift(learning);

  return lines;
}

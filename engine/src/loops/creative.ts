import { id } from "../store.ts";
import { complete, extractJSON } from "../llm.ts";
import { lintCopy } from "../guardrails.ts";
import type { EngineState, CreativeAsset, ProposedAction } from "../types.ts";

// Creative Generation Loop. The AI writes honest ad copy variants; every variant
// is run through the guardrails linter; only passing variants are stored.
// Publishing is a gated ProposedAction — the AI never auto-publishes.
//
// Self-improvement: recent winning learnings/experiments are injected into the
// prompt so each cycle's copy is biased toward what has worked.

interface RawAsset {
  angle: string;
  headline: string;
  body: string;
  cta: string;
  disclosure: string;
}

function recentContext(state: EngineState): string {
  const wins = state.experiments
    .filter((e) => e.status === "concluded" && e.winner)
    .slice(0, 3)
    .map((e) => `- Winning approach: "${e.winner}" for ${e.metric} (${e.hypothesis})`);
  const learnings = state.learnings.slice(0, 3).map((l) => `- ${l.insight}`);
  const lines = [...wins, ...learnings];
  return lines.length ? `What has worked so far:\n${lines.join("\n")}\n` : "";
}

export async function runCreativeLoop(
  state: EngineState,
  channel: string,
  angle?: string,
): Promise<string[]> {
  const product = state.selectedNiche ?? "an AI-powered subscription tool";
  const ctx = recentContext(state);

  const raw = await complete({
    system:
      "You are a senior direct-response copywriter for a lean, honest subscription business. " +
      "HARD RULES (non-negotiable): no fabricated testimonials, no invented experts or doctors, " +
      "no absolute/guaranteed/cure claims, no fake scarcity. Every claim must be defensible. " +
      "Include a clear paid-relationship disclosure when relevant. Return ONLY JSON: an array of " +
      "3 objects with keys angle, headline, body, cta, disclosure.",
    prompt:
      `${ctx}\nProduct: ${product}\nChannel: ${channel}\n` +
      (angle ? `Angle to explore: ${angle}\n` : "") +
      `Write 3 honest, high-converting ad variants. Keep body under 280 chars.`,
    maxTokens: 1200,
    loop: "creative",
    offline: () =>
      JSON.stringify([
        {
          angle: angle ?? "time-saved",
          headline: `Do a week of ${channel} work in an afternoon`,
          body: `${product} turns one input into a finished batch you can actually ship. Start with a $1 trial, cancel in one click.`,
          cta: "Try it for $1",
          disclosure: "",
        },
        {
          angle: "specific-outcome",
          headline: `From blank page to done, in minutes`,
          body: `Give it one brief; get usable output back. Honest pricing, no lock-in. See a live demo before you pay.`,
          cta: "See the live demo",
          disclosure: "",
        },
        {
          angle: "affiliate-friendly",
          headline: `Recommend the tool, earn recurring`,
          body: `Partners earn a recurring share for every customer they bring. Real product, real payouts.`,
          cta: "Join the partner program",
          disclosure: "#ad — this post is from a paid partner who earns a commission.",
        },
      ]),
  });

  const parsed = extractJSON<RawAsset[]>(raw) ?? [];
  const results: string[] = [];
  let stored = 0;
  let blocked = 0;

  for (const a of parsed) {
    const text = `${a.headline}\n${a.body}\n${a.cta}\n${a.disclosure ?? ""}`;
    const lint = lintCopy(text);
    const asset: CreativeAsset = {
      id: id("cre"),
      channel,
      angle: a.angle ?? angle ?? "general",
      headline: a.headline ?? "",
      body: a.body ?? "",
      cta: a.cta ?? "",
      disclosure: a.disclosure ?? "",
      compliancePass: lint.pass,
      complianceNotes: lint.notes,
      createdAt: new Date().toISOString(),
    };
    if (lint.pass) {
      state.creatives.unshift(asset);
      stored++;
      results.push(`  ✓ [${asset.angle}] "${asset.headline}"`);
    } else {
      blocked++;
      results.push(`  ✗ BLOCKED [${asset.angle}] "${asset.headline}" — ${lint.notes.join("; ")}`);
    }
  }

  if (stored > 0) {
    const action: ProposedAction = {
      id: id("act"),
      loop: "creative",
      kind: "publish",
      summary: `Publish ${stored} compliant ${channel} ad variant(s)`,
      detail: `Generated ${stored + blocked} variants; ${stored} passed guardrails, ${blocked} blocked. Review and approve before any spend.`,
      requiresApproval: true,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    state.proposedActions.unshift(action);
    results.push(`Proposed action ${action.id}: ${action.summary} (pending approval).`);
  }

  return [`Creative loop on "${channel}": ${stored} stored, ${blocked} blocked by guardrails.`, ...results];
}

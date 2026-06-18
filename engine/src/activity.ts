import type { EngineState, ActivityKind, TokenUsage, LoopTokens } from "./types.ts";

// Activity log + token accounting helpers. The dashboard reads these to show
// "what happened" (actions, successes, failures, needs-to-improve) and token spend.

export function logActivity(
  state: EngineState,
  loop: string,
  kind: ActivityKind,
  message: string,
): void {
  state.activity.unshift({ ts: new Date().toISOString(), loop, kind, message });
  state.activity = state.activity.slice(0, 100);
}

// Merge a drained usage delta into cumulative state.tokens.
export function applyUsage(state: EngineState, delta: TokenUsage): void {
  const t = state.tokens;
  t.input += delta.input;
  t.output += delta.output;
  t.cacheRead += delta.cacheRead;
  t.cacheWrite += delta.cacheWrite;
  t.calls += delta.calls;
  t.estCostUsd += delta.estCostUsd;
  for (const [loop, d] of Object.entries(delta.byLoop)) {
    const b: LoopTokens = (t.byLoop[loop] ??= { input: 0, output: 0, calls: 0, estCostUsd: 0 });
    b.input += d.input;
    b.output += d.output;
    b.calls += d.calls;
    b.estCostUsd += d.estCostUsd;
  }
}

// Context hygiene: dedupe identical learnings (keep newest) and cap log sizes so
// state.json — and any prompt that embeds it — never grows unbounded.
export function compactState(state: EngineState): void {
  const seen = new Set<string>();
  state.learnings = state.learnings.filter((l) => {
    const key = `${l.loop}:${l.insight}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  state.learnings = state.learnings.slice(0, 50);
  state.creatives = state.creatives.slice(0, 50);
  state.proposedActions = state.proposedActions.slice(0, 50);
  state.activity = state.activity.slice(0, 100);
}

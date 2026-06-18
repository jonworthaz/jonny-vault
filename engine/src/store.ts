import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { EngineState, TokenUsage } from "./types.ts";
import { drainUsage } from "./llm.ts";
import { applyUsage, compactState } from "./activity.ts";

// Persistent state = the engine's memory. Every loop reads prior state and
// writes back, so each run builds on the last — this is what makes the loops
// "self-improving" rather than stateless one-shots.

const DATA_DIR = join(import.meta.dirname, "..", "data");
const STATE_PATH = join(DATA_DIR, "state.json");

function zeroTokens(): TokenUsage {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0, estCostUsd: 0, byLoop: {} };
}

function emptyState(): EngineState {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    autonomy: "assist",
    selectedNiche: undefined,
    learnings: [],
    experiments: [],
    proposedActions: [],
    creatives: [],
    nicheScores: [],
    metricsHistory: [],
    activity: [],
    tokens: zeroTokens(),
  };
}

export function loadState(): EngineState {
  if (!existsSync(STATE_PATH)) return emptyState();
  try {
    const raw = readFileSync(STATE_PATH, "utf8");
    return { ...emptyState(), ...(JSON.parse(raw) as Partial<EngineState>) } as EngineState;
  } catch {
    return emptyState();
  }
}

// Plain save (no usage flush) — used by read-only/control commands.
export function saveState(state: EngineState): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  state.updatedAt = new Date().toISOString();
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n", "utf8");
}

// Drain any LLM token usage into state, compact, then save. Use after any
// command that may have made model calls.
export function persist(state: EngineState): void {
  applyUsage(state, drainUsage());
  compactState(state);
  saveState(state);
}

export function dataPath(file: string): string {
  return join(DATA_DIR, file);
}

export function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

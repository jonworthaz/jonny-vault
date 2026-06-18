import { CONFIG, modelFor } from "./config.ts";
import type { EngineState, ComponentState, Provider } from "./types.ts";

// The modular component registry. Each entry is a "part of the business" the
// dashboard can show and control: an agent or a function, optionally bound to an
// engine loop (which is what generates metered tokens). Runtime state (status,
// model, provider, last action) lives in EngineState.components; these are the
// static definitions.

export interface ComponentDef {
  key: string;
  label: string;
  role: "control" | "agent" | "function";
  loop: string | null; // the engine loop this component owns (token attribution)
  owner?: string; // agent that owns it, if different
  skills: string[];
  defaultModel: string;
  defaultProvider: Provider;
  removable: boolean;
  note?: string; // e.g. "available, not yet wired to a loop"
}

export const COMPONENTS: ComponentDef[] = [
  {
    key: "entrepreneur",
    label: "AI Entrepreneur (controller)",
    role: "control",
    loop: null,
    skills: ["strategic-direction", "dashboard"],
    defaultModel: CONFIG.models.strategy,
    defaultProvider: "anthropic",
    removable: false,
    note: "controls all components; runs in Claude Code, not metered by the engine",
  },
  {
    key: "niche-researcher",
    label: "Niche Researcher",
    role: "agent",
    loop: "niche",
    skills: ["niche-validation"],
    defaultModel: CONFIG.models.niche,
    defaultProvider: "anthropic",
    removable: true,
  },
  {
    key: "copywriter",
    label: "Copywriter",
    role: "agent",
    loop: "creative",
    skills: ["compliance-check"],
    defaultModel: CONFIG.models.creative,
    defaultProvider: "anthropic",
    removable: true,
  },
  {
    key: "growth-analyst",
    label: "Growth Analyst",
    role: "agent",
    loop: "analysis",
    skills: ["unit-economics"],
    defaultModel: CONFIG.models.analysis,
    defaultProvider: "anthropic",
    removable: true,
  },
  {
    key: "retention",
    label: "Retention (growth-analyst)",
    role: "function",
    loop: "retention",
    owner: "growth-analyst",
    skills: [],
    defaultModel: CONFIG.models.retention,
    defaultProvider: "anthropic",
    removable: true,
  },
  {
    key: "compliance-reviewer",
    label: "Compliance Reviewer (code-based gate)",
    role: "agent",
    loop: null,
    skills: ["compliance-check"],
    defaultModel: CONFIG.models.strategy,
    defaultProvider: "anthropic",
    removable: false,
    note: "guardrails run in code (engine/src/guardrails.ts) — near-zero engine tokens",
  },
  {
    key: "affiliate-manager",
    label: "Affiliate Manager",
    role: "agent",
    loop: null,
    skills: [],
    defaultModel: CONFIG.models.default,
    defaultProvider: "anthropic",
    removable: true,
    note: "available, not yet wired to an engine loop",
  },
  {
    key: "support-agent",
    label: "Support Agent",
    role: "agent",
    loop: null,
    skills: ["compliance-check"],
    defaultModel: CONFIG.models.support,
    defaultProvider: "anthropic",
    removable: true,
    note: "available, not yet wired to an engine loop",
  },
];

export function defOf(key: string): ComponentDef | undefined {
  return COMPONENTS.find((c) => c.key === key);
}

export function compForLoop(loopKey: string): ComponentDef | undefined {
  return COMPONENTS.find((c) => c.loop === loopKey);
}

export function stateOf(state: EngineState, key: string): ComponentState | undefined {
  return state.components.find((c) => c.key === key);
}

// Auto-migrate: add any component missing from state with its defaults. Runs on
// load, so existing state.json files gain new components automatically.
export function ensureComponents(state: EngineState): void {
  if (!Array.isArray(state.components)) state.components = [];
  for (const def of COMPONENTS) {
    if (!state.components.find((c) => c.key === def.key)) {
      state.components.push({
        key: def.key,
        status: "active",
        model: def.defaultModel,
        provider: def.defaultProvider,
      });
    }
  }
}

export interface Route {
  key: string;
  model: string;
  provider: Provider;
  onHold: boolean;
}

// Resolve which model/provider a loop should use, honouring runtime overrides
// (model changes, hold) set via the dashboard.
export function resolveRoute(state: EngineState, loopKey: string): Route {
  const def = compForLoop(loopKey);
  if (!def) return { key: loopKey, model: modelFor(loopKey), provider: "anthropic", onHold: false };
  const st = stateOf(state, def.key);
  return {
    key: def.key,
    model: st?.model ?? def.defaultModel,
    provider: st?.provider ?? def.defaultProvider,
    onHold: st?.status === "on-hold",
  };
}

export function mark(state: EngineState, key: string, action: string): void {
  const st = stateOf(state, key);
  if (st) {
    st.lastAction = action;
    st.lastActionTs = new Date().toISOString();
  }
}

export function markByLoop(state: EngineState, loopKey: string, action: string): void {
  const def = compForLoop(loopKey);
  if (def) mark(state, def.key, action);
}

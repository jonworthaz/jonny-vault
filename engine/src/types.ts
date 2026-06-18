// Shared types for the engine. Kept erasable (no enums/namespaces) so the files
// run directly under Node's type stripping (`node src/cli.ts`).

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export type ActionKind = "spend" | "publish" | "config" | "experiment";
export type ActionStatus = "pending" | "approved" | "rejected" | "executed";

// Autonomy / human-takeover mode.
//   auto   — engine runs loops freely (still gates spend/publish for approval)
//   assist — default; engine runs when asked, proposes actions
//   paused — HUMAN IN CONTROL; the engine will not run loops until handed back
export type Autonomy = "auto" | "assist" | "paused";

export type ActivityKind =
  | "run"
  | "success"
  | "failure"
  | "block"
  | "approval"
  | "control"
  | "note";

export interface ActivityEntry {
  ts: string;
  loop: string;
  kind: ActivityKind;
  message: string;
}

export interface LoopTokens {
  input: number;
  output: number;
  calls: number;
  estCostUsd: number;
}

export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  calls: number;
  estCostUsd: number;
  byLoop: Record<string, LoopTokens>;
}

export interface Learning {
  id: string;
  loop: string;
  ts: string;
  insight: string;
  confidence: number; // 0..1
}

export interface Experiment {
  id: string;
  hypothesis: string;
  variants: string[];
  metric: string;
  status: "proposed" | "running" | "concluded";
  winner?: string;
  result?: string;
  createdAt: string;
  concludedAt?: string;
}

// Anything that spends money or publishes externally becomes a proposed action
// behind a human approval gate. The AI never auto-executes these.
export interface ProposedAction {
  id: string;
  loop: string;
  kind: ActionKind;
  summary: string;
  detail: string;
  requiresApproval: boolean;
  status: ActionStatus;
  createdAt: string;
}

export interface CreativeAsset {
  id: string;
  channel: string;
  angle: string;
  headline: string;
  body: string;
  cta: string;
  disclosure: string;
  compliancePass: boolean;
  complianceNotes: string[];
  createdAt: string;
}

export interface NicheScore {
  name: string;
  job: string;
  demand: number;
  intent: number;
  pricingHeadroom: number;
  buildability: number;
  affiliateFit: number;
  total: number;
  rationale: string;
}

export interface MetricsSnapshot {
  ts: string;
  trials: number;
  trialToPaid: number; // 0..1
  newMrr: number;
  churnedMrr: number;
  cac: number;
  arpu: number;
  grossMarginPct: number; // 0..1
  m1Retention: number; // 0..1
  m3Retention: number; // 0..1
  m6Retention: number; // 0..1
}

export interface EngineState {
  version: number;
  updatedAt: string;
  autonomy: Autonomy;
  selectedNiche?: string;
  learnings: Learning[];
  experiments: Experiment[];
  proposedActions: ProposedAction[];
  creatives: CreativeAsset[];
  nicheScores: NicheScore[];
  metricsHistory: MetricsSnapshot[];
  activity: ActivityEntry[];
  tokens: TokenUsage;
}

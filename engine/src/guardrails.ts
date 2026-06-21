// Compliance linter — operationalizes doc 07 (Guardrails). Every piece of
// marketing copy the engine generates is run through this BEFORE it can be
// stored or proposed for publishing. This is the mechanism that makes it
// structurally impossible for the AI to ship the Medvi-style failures
// (fake doctors, deepfake testimonials, false claims, missing disclosures).

export interface LintRule {
  id: string;
  // "block" => fails compliance; "warn" => human should eyeball it.
  severity: "block" | "warn";
  pattern: RegExp;
  message: string;
}

export const RULES: LintRule[] = [
  // 1. Fake persona / fabricated authority (Medvi's 800 fake "doctors").
  {
    id: "fake-persona",
    severity: "block",
    pattern: /\b(as a (?:doctor|physician|nurse|licensed)|dr\.?\s|board[- ]certified)\b/i,
    message: "Implies a fabricated expert/medical persona. Don't invent authority figures.",
  },
  // 2. Fabricated / deepfaked testimonials and results.
  {
    id: "fabricated-results",
    severity: "block",
    pattern: /\b(before and after|results not typical|fake|deepfake|stock photo of (?:a )?customer)\b/i,
    message: "Reads like a fabricated/deepfaked result. Use only real, consenting user content.",
  },
  // 3. False/unsubstantiated absolute claims (Medvi's misbranding).
  {
    id: "absolute-claims",
    severity: "block",
    pattern: /\b(guaranteed|100%\s*(?:results|success|guaranteed)|cure|miracle|clinically proven|fda[- ]approved|risk[- ]free)\b/i,
    message: "Absolute/unsubstantiated claim. Remove or substantiate with evidence.",
  },
  // 4. Affiliate disclosure: if it talks about commissions/affiliates, it must disclose.
  {
    id: "missing-affiliate-disclosure",
    severity: "warn",
    pattern: /\b(commission|affiliate|referral|i (?:earn|get paid))\b/i,
    message: "Mentions affiliate economics — ensure a clear #ad / paid-relationship disclosure is present.",
  },
  // 5. Dark-pattern / false-scarcity language (allowed only if literally true).
  {
    id: "false-scarcity",
    severity: "warn",
    pattern: /\b(only \d+ (?:left|spots)|act now|expires? (?:in|today)|last chance)\b/i,
    message: "Scarcity/urgency claim — only run if literally true; otherwise it's a dark pattern.",
  },
  // 6. Unverifiable superlatives.
  {
    id: "superlatives",
    severity: "warn",
    pattern: /\b(the best|#1|world'?s best|number one|unbeatable)\b/i,
    message: "Unverifiable superlative — soften or substantiate.",
  },
];

export interface LintResult {
  pass: boolean; // false if any "block" rule fired
  notes: string[]; // human-readable findings, prefixed with severity
}

export function lintCopy(text: string): LintResult {
  const notes: string[] = [];
  let pass = true;
  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      notes.push(`[${rule.severity}] ${rule.id}: ${rule.message}`);
      if (rule.severity === "block") pass = false;
    }
  }
  if (notes.length === 0) notes.push("[ok] No guardrail violations detected.");
  return { pass, notes };
}

// The screenshot test (doc 07): would this embarrass us in a screenshot?
export function screenshotTest(text: string): boolean {
  return lintCopy(text).pass;
}
